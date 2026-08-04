<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue';
import type {FeedAchiever, FeedComment, FeedCommentKey, FeedPost, StudentFeedPostPresetKey} from '../../types';
import {
  deleteStudentPost,
  FEED_COMMENT_LABELS,
  STUDENT_FEED_POST_PRESETS,
  subscribeFeedComments,
  subscribeOwnFeedComment,
  subscribeOwnFeedLike,
  updateFeedComment,
  updateFeedLike,
  updateStudentPost,
} from '../../services/feed.service';

const props = defineProps<{post: FeedPost; studentUserId: string; currentStudentPhotoUrl?: string; currentStudentFullName?: string}>();
const liked = ref(false);
const comments = ref<FeedComment[]>([]);
const ownComment = ref<FeedComment | null>(null);
const showCommentPicker = ref(false);
const showAllComments = ref(false);
const showAllAchievers = ref(false);
const showFullBody = ref(false);
const likeBusy = ref(false);
const commentBusy = ref(false);
const actionBusy = computed(() => likeBusy.value || commentBusy.value);
const managementBusy = ref(false);
const actionError = ref('');
const editing = ref(false);
const editPreset = ref<StudentFeedPostPresetKey | ''>(props.post.presetKey || '');
const showDeleteConfirmation = ref(false);
const showOwnerMenu = ref(false);
const avatarFailed = ref(false);
const displayedLikeCount = ref(props.post.likeCount || 0);
const displayedCommentCount = ref(props.post.commentCount || 0);
let stopComments = () => {};
let stopLike = () => {};
let stopOwnComment = () => {};

watch(() => props.post.likeCount, value => { displayedLikeCount.value = value || 0; });
watch(() => props.post.commentCount, value => { displayedCommentCount.value = value || 0; });
watch(() => [props.post.authorPhotoUrl, props.currentStudentPhotoUrl], () => { avatarFailed.value = false; });

const postIcon = computed(() => ({achievement: 'emoji_events', attendance: 'how_to_reg', announcement: 'campaign', student: 'sentiment_satisfied'}[props.post.type]));
const studentPostAuthorName = computed(() => props.post.authorId === props.studentUserId
  ? props.currentStudentFullName?.trim() || props.post.authorLabel || 'Student'
  : props.post.authorLabel || 'Student');
const postLabel = computed(() => props.post.type === 'student'
  ? studentPostAuthorName.value
  : ({achievement: 'School achievement', attendance: 'Class attendance', announcement: 'Teacher announcement'}[props.post.type]));
const canManagePost = computed(() => props.post.type === 'student' && props.post.authorId === props.studentUserId);
const studentPostPhotoUrl = computed(() => {
  if (props.post.type !== 'student' || avatarFailed.value) return '';
  return props.post.authorPhotoUrl?.trim()
    || (props.post.authorId === props.studentUserId ? props.currentStudentPhotoUrl?.trim() : '')
    || '';
});
const rankedAchievers = computed<FeedAchiever[]>(() => {
  const results = props.post.achieverResults?.length
    ? props.post.achieverResults
    : (props.post.achievers || []).map(name => ({name, score: null}));
  return [...results].sort((first, second) =>
    (second.score ?? Number.NEGATIVE_INFINITY) - (first.score ?? Number.NEGATIVE_INFINITY)
      || first.name.localeCompare(second.name),
  );
});
const podiumScores = computed(() => [...new Set(
  rankedAchievers.value
    .map(achiever => achiever.score)
    .filter((score): score is number => score !== null),
)].slice(0, 3));
const visibleAchievers = computed(() => showAllAchievers.value ? rankedAchievers.value : rankedAchievers.value.slice(0, 5));
const visibleComments = computed(() => showAllComments.value ? comments.value : comments.value.slice(0, 3));
const hiddenAchievers = computed(() => Math.max(0, rankedAchievers.value.length - visibleAchievers.value.length));
const canCollapseBody = computed(() => props.post.type === 'announcement' && props.post.body.trim().length > 320);
const achieverCount = computed(() => props.post.achieverCount || rankedAchievers.value.length);
const activityCategoryLabel = computed(() => {
  if (props.post.activityCategory === 'peta') return 'PETA';
  if (props.post.activityCategory === 'quiz') return 'Quiz';
  if (props.post.activityCategory === 'coding') return 'Coding';
  if (props.post.activityCategory === 'lecture') return 'Lecture';
  const searchable = `${props.post.activityTitle || ''} ${props.post.body}`;
  if (/coding|programming|\bcode\b|website/i.test(searchable)) return 'Coding';
  if (/quiz|test|exam|summative/i.test(searchable)) return 'Quiz';
  return 'Activity';
});

function initialFor(value: string) {
  return value.trim().slice(0, 1).toUpperCase() || 'S';
}

function achieverScoreLabel(achiever: FeedAchiever) {
  if (achiever.score === null) return 'Score available after feed refresh';
  return props.post.totalPoints ? `${achiever.score} / ${props.post.totalPoints}` : String(achiever.score);
}

function achieverTierClass(achiever: FeedAchiever) {
  if (achiever.score === null) return '';
  const tier = podiumScores.value.indexOf(achiever.score);
  return ['tier-gold', 'tier-silver', 'tier-bronze'][tier] || '';
}

function timestampDate(value: FeedPost['publishedAt']) {
  if (!value) return null;
  if (value instanceof Date) return value;
  return 'toDate' in value ? value.toDate() : null;
}

const publishedLabel = computed(() => {
  const value = timestampDate(props.post.publishedAt);
  if (!value) return 'Recently';
  return new Intl.DateTimeFormat('en-PH', {dateStyle: 'medium', timeStyle: 'short'}).format(value);
});

const sessionDateLabel = computed(() => {
  if (!props.post.sessionDate) return '';
  return new Intl.DateTimeFormat('en-PH', {dateStyle: 'long', timeZone: 'Asia/Manila'})
    .format(new Date(`${props.post.sessionDate}T12:00:00+08:00`));
});

async function toggleLike() {
  if (likeBusy.value) return;
  const previous = liked.value;
  liked.value = !previous;
  displayedLikeCount.value = Math.max(0, displayedLikeCount.value + (liked.value ? 1 : -1));
  likeBusy.value = true;
  actionError.value = '';
  try {
    await updateFeedLike(props.post.id, liked.value);
  } catch (value) {
    liked.value = previous;
    displayedLikeCount.value = Math.max(0, displayedLikeCount.value + (previous ? 1 : -1));
    actionError.value = value instanceof Error ? value.message : 'Could not update your like.';
  } finally {
    likeBusy.value = false;
  }
}

async function chooseComment(commentKey: FeedCommentKey | null) {
  if (commentBusy.value) return;
  const previousComment = ownComment.value;
  const previousComments = [...comments.value];
  const previousCount = displayedCommentCount.value;
  const optimisticComment: FeedComment | null = commentKey ? {
    id: props.studentUserId,
    displayName: props.currentStudentFullName?.trim() || 'You',
    commentKey,
    comment: FEED_COMMENT_LABELS[commentKey],
  } : null;

  ownComment.value = optimisticComment;
  comments.value = previousComments.filter(item => item.id !== props.studentUserId);
  if (optimisticComment) comments.value.unshift(optimisticComment);
  displayedCommentCount.value = Math.max(0, previousCount + (!previousComment && optimisticComment ? 1 : 0) - (previousComment && !optimisticComment ? 1 : 0));
  commentBusy.value = true;
  actionError.value = '';
  showCommentPicker.value = false;
  try {
    await updateFeedComment(props.post.id, commentKey);
  } catch (value) {
    ownComment.value = previousComment;
    comments.value = previousComments;
    displayedCommentCount.value = previousCount;
    actionError.value = value instanceof Error ? value.message : 'Could not update your comment.';
  } finally {
    commentBusy.value = false;
  }
}

function beginEditing() {
  showOwnerMenu.value = false;
  editPreset.value = props.post.presetKey || '';
  editing.value = true;
  actionError.value = '';
}

async function saveEdit() {
  if (!editPreset.value || managementBusy.value) return;
  managementBusy.value = true;
  actionError.value = '';
  try {
    await updateStudentPost(props.post.id, editPreset.value);
    editing.value = false;
  } catch (value) {
    actionError.value = value instanceof Error ? value.message : 'Could not update your post.';
  } finally {
    managementBusy.value = false;
  }
}

async function confirmDelete() {
  if (managementBusy.value) return;
  managementBusy.value = true;
  actionError.value = '';
  try {
    await deleteStudentPost(props.post.id);
    showDeleteConfirmation.value = false;
  } catch (value) {
    actionError.value = value instanceof Error ? value.message : 'Could not delete your post.';
    showDeleteConfirmation.value = false;
  } finally {
    managementBusy.value = false;
  }
}

onMounted(() => {
  stopComments = subscribeFeedComments(props.post.id, value => {
    if (!commentBusy.value) comments.value = value;
  }, value => { actionError.value = value.message; });
  stopLike = subscribeOwnFeedLike(props.post.id, props.studentUserId, value => {
    if (!likeBusy.value) liked.value = value;
  });
  stopOwnComment = subscribeOwnFeedComment(props.post.id, props.studentUserId, value => {
    if (!commentBusy.value) ownComment.value = value;
  });
  document.addEventListener('click', closeOwnerMenu);
});

function closeOwnerMenu() {
  showOwnerMenu.value = false;
}

onBeforeUnmount(() => { stopComments(); stopLike(); stopOwnComment(); document.removeEventListener('click', closeOwnerMenu); });
</script>

<template>
  <article class="feed-post-card" :class="`feed-post-${post.type}`">
    <header class="feed-post-header">
      <img v-if="studentPostPhotoUrl" class="feed-post-icon feed-post-avatar" :src="studentPostPhotoUrl" :alt="`${studentPostAuthorName} profile photo`" @error="avatarFailed = true" />
      <span v-else class="feed-post-icon material-symbols-outlined" aria-hidden="true">{{ postIcon }}</span>
      <div class="feed-post-byline">
        <strong>{{ postLabel }}</strong>
        <span v-if="post.type !== 'student'">{{ post.authorLabel || post.classLabel || 'PORTAL' }}</span>
        <time v-else>{{ publishedLabel }}</time>
      </div>
      <div class="feed-post-meta">
        <time v-if="post.type !== 'student'">{{ publishedLabel }}</time>
        <div v-if="canManagePost" class="feed-owner-menu" @click.stop>
          <button type="button" class="feed-owner-menu-trigger" :aria-expanded="showOwnerMenu" aria-label="More options for your post" :disabled="managementBusy" @click="showOwnerMenu = !showOwnerMenu"><span class="material-symbols-outlined" aria-hidden="true">more_horiz</span></button>
          <div v-if="showOwnerMenu" class="feed-owner-menu-popover" role="menu">
            <button type="button" role="menuitem" :disabled="managementBusy" aria-label="Edit your post" @click="beginEditing"><span class="material-symbols-outlined" aria-hidden="true">edit</span>Edit post</button>
            <button type="button" role="menuitem" class="delete" :disabled="managementBusy" aria-label="Delete your post" @click="showOwnerMenu = false; showDeleteConfirmation = true"><span class="material-symbols-outlined" aria-hidden="true">delete</span>Delete post</button>
          </div>
        </div>
      </div>
    </header>

    <div class="feed-post-content">
      <span v-if="post.type === 'announcement'" class="feed-type-chip">{{ post.announcementType || 'General' }}</span>
      <span v-else-if="post.type === 'achievement'" class="feed-type-chip feed-activity-type">{{ activityCategoryLabel }}</span>
      <h3 v-if="post.type !== 'student'">{{ post.title }}</h3>
      <form v-if="editing" class="feed-post-edit-form" @submit.prevent="saveEdit">
        <label :for="`edit-post-${post.id}`">Approved message</label>
        <select :id="`edit-post-${post.id}`" v-model="editPreset" :disabled="managementBusy">
          <option value="" disabled>Choose a message</option>
          <option v-for="(message, key) in STUDENT_FEED_POST_PRESETS" :key="key" :value="key">{{ message }}</option>
        </select>
        <div><button type="button" class="secondary" :disabled="managementBusy" @click="editing = false">Cancel</button><button type="submit" class="primary" :disabled="!editPreset || managementBusy">{{ managementBusy ? 'Saving…' : 'Save changes' }}</button></div>
      </form>
      <p v-else :class="{'feed-post-body-collapsed': canCollapseBody && !showFullBody}">{{ post.body }}</p>
      <button
        v-if="canCollapseBody"
        type="button"
        class="feed-body-toggle"
        :aria-expanded="showFullBody"
        @click="showFullBody = !showFullBody"
      >{{ showFullBody ? 'Show less' : 'Read more' }}</button>

      <div v-if="post.type === 'achievement' && rankedAchievers.length" class="feed-achievers">
        <div class="feed-achievement-overview">
          <span class="feed-achievement-rank-icon material-symbols-outlined" aria-hidden="true">leaderboard</span>
          <div><strong>{{ achieverCount }} {{ achieverCount === 1 ? 'student' : 'students' }} ranked</strong><small>Ordered from highest to lowest recorded score</small></div>
        </div>
        <ol class="feed-achiever-ranking" aria-label="Achievement ranking">
          <li v-for="(achiever, index) in visibleAchievers" :key="`${achiever.name}-${index}`" :class="achieverTierClass(achiever)">
            <span class="feed-achiever-position" :aria-label="`Rank ${index + 1}`">{{ index + 1 }}</span>
            <span class="feed-achiever-avatar" aria-hidden="true">{{ initialFor(achiever.name) }}</span>
            <strong>{{ achiever.name }}</strong>
            <span class="feed-achiever-score">{{ achieverScoreLabel(achiever) }}</span>
          </li>
        </ol>
        <button v-if="hiddenAchievers" type="button" class="feed-achievers-toggle" @click="showAllAchievers = true">View {{ hiddenAchievers }} more</button>
        <button v-else-if="showAllAchievers && rankedAchievers.length > 5" type="button" class="feed-achievers-toggle" @click="showAllAchievers = false">Show fewer results</button>
      </div>

      <div v-if="post.type === 'attendance'" class="feed-attendance-summary">
        <strong>{{ post.presentCount || 0 }}</strong>
        <div><span>Present students</span><small>{{ post.classLabel }}<template v-if="sessionDateLabel"> · {{ sessionDateLabel }}</template></small></div>
      </div>
    </div>

    <div class="feed-engagement-counts" aria-live="polite">
      <span>{{ displayedLikeCount }} {{ displayedLikeCount === 1 ? 'like' : 'likes' }}</span>
      <span>{{ displayedCommentCount }} {{ displayedCommentCount === 1 ? 'comment' : 'comments' }}</span>
    </div>
    <div class="feed-post-actions">
      <button type="button" :class="{active: liked}" :aria-pressed="liked" :aria-busy="likeBusy" :aria-label="liked ? 'Unlike this post' : 'Like this post'" :title="liked ? 'Unlike' : 'Like'" @click="toggleLike"><span class="material-symbols-outlined" aria-hidden="true">thumb_up</span></button>
      <button type="button" :class="{active: ownComment}" :aria-expanded="showCommentPicker" :aria-busy="commentBusy" :aria-label="ownComment ? 'Change your comment' : 'Comment on this post'" title="Comment" @click="showCommentPicker = true"><span class="material-symbols-outlined" aria-hidden="true">chat_bubble</span></button>
    </div>

    <div v-if="visibleComments.length" class="feed-comments">
      <div v-for="comment in visibleComments" :key="comment.id" class="feed-comment"><span class="feed-comment-avatar" aria-hidden="true">{{ initialFor(comment.displayName) }}</span><div><strong>{{ comment.displayName }}</strong><span>{{ comment.comment }}</span></div></div>
      <button v-if="comments.length > 3" type="button" class="feed-comments-toggle" @click="showAllComments = !showAllComments">{{ showAllComments ? 'Show fewer comments' : `View all ${comments.length} comments` }}</button>
    </div>
    <p v-if="actionError" class="feed-action-error" role="alert">{{ actionError }}</p>

    <Teleport to="body">
      <div v-if="showCommentPicker" class="modal-backdrop feed-comment-backdrop" role="presentation" @click.self="showCommentPicker = false">
        <section class="feed-comment-dialog" role="dialog" aria-modal="true" :aria-labelledby="`comment-title-${post.id}`">
          <header><div><span class="material-symbols-outlined" aria-hidden="true">chat_bubble</span><div><h2 :id="`comment-title-${post.id}`">Choose a response</h2><p>Comments use approved messages to keep the school feed positive.</p></div></div><button type="button" aria-label="Close comment dialog" @click="showCommentPicker = false">×</button></header>
          <div class="feed-comment-options">
            <button v-for="(label, key) in FEED_COMMENT_LABELS" :key="key" type="button" :class="{selected: ownComment?.commentKey === key}" :aria-pressed="ownComment?.commentKey === key" :disabled="actionBusy" @click="chooseComment(key as FeedCommentKey)"><span>{{ label }}</span><span v-if="ownComment?.commentKey === key" class="material-symbols-outlined" aria-hidden="true">check_circle</span></button>
          </div>
          <footer><button v-if="ownComment" type="button" class="remove-comment" :disabled="actionBusy" @click="chooseComment(null)">Remove my comment</button><button type="button" class="secondary" @click="showCommentPicker = false">Cancel</button></footer>
        </section>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showDeleteConfirmation" class="modal-backdrop feed-delete-backdrop" role="presentation" @click.self="showDeleteConfirmation = false">
        <section class="feed-delete-dialog" role="alertdialog" aria-modal="true" :aria-labelledby="`delete-title-${post.id}`" :aria-describedby="`delete-copy-${post.id}`">
          <span class="material-symbols-outlined" aria-hidden="true">delete</span>
          <h2 :id="`delete-title-${post.id}`">Delete this post?</h2>
          <p :id="`delete-copy-${post.id}`">This removes your update and its likes and comments from the school feed. This action cannot be undone.</p>
          <div><button type="button" class="secondary" :disabled="managementBusy" @click="showDeleteConfirmation = false">Keep post</button><button type="button" class="danger" :disabled="managementBusy" @click="confirmDelete">{{ managementBusy ? 'Deleting…' : 'Delete post' }}</button></div>
        </section>
      </div>
    </Teleport>
  </article>
</template>
