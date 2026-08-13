<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref} from 'vue';
import type {FeedPost, FeedPostType} from '../../types';
import {getOlderFeedPosts, subscribeFeedPosts, type FeedCursor} from '../../services/feed.service';
import FeedPostCard from './FeedPostCard.vue';
import StudentFeedComposer from './StudentFeedComposer.vue';
import TeacherFeedComposer from './TeacherFeedComposer.vue';

const props = defineProps<{viewerUserId: string; viewerRole: 'student' | 'teacher'; viewerPhotoUrl?: string; viewerFullName?: string}>();
const posts = ref<FeedPost[]>([]);
const cursor = ref<FeedCursor>(null);
const hasMore = ref(false);
const loading = ref(true);
const loadingMore = ref(false);
const error = ref('');
type FeedFilter = 'all' | FeedPostType;
const activeFilter = ref<FeedFilter>('all');
const filterOptions: {id: FeedFilter; label: string}[] = [
  {id: 'all', label: 'All updates'},
  {id: 'achievement', label: 'Achievements'},
  {id: 'attendance', label: 'Attendance'},
  {id: 'announcement', label: 'Announcements'},
  {id: 'student', label: 'Student posts'},
  {id: 'teacher', label: 'Teacher posts'},
];
let stopFeed = () => {};

const postCounts = computed(() => posts.value.reduce<Record<FeedFilter, number>>((counts, post) => {
  counts.all += 1;
  counts[post.type] += 1;
  return counts;
}, {all: 0, achievement: 0, attendance: 0, announcement: 0, student: 0, teacher: 0}));
const visiblePosts = computed(() => activeFilter.value === 'all'
  ? posts.value
  : posts.value.filter(post => post.type === activeFilter.value));

function startFeed() {
  stopFeed();
  loading.value = true;
  error.value = '';
  stopFeed = subscribeFeedPosts((value, nextCursor, more) => {
    const olderPosts = posts.value.slice(10);
    const incomingIds = new Set(value.map(item => item.id));
    posts.value = [...value, ...olderPosts.filter(item => !incomingIds.has(item.id))];
    if (!olderPosts.length) {
      cursor.value = nextCursor;
      hasMore.value = more;
    }
    loading.value = false;
  }, value => {
    error.value = value.message || 'Could not load the feed.';
    loading.value = false;
  });
}

async function loadMore() {
  if (!hasMore.value || loadingMore.value) return;
  loadingMore.value = true;
  error.value = '';
  try {
    const page = await getOlderFeedPosts(cursor.value);
    const existingIds = new Set(posts.value.map(item => item.id));
    posts.value.push(...page.posts.filter(item => !existingIds.has(item.id)));
    cursor.value = page.cursor;
    hasMore.value = page.hasMore;
  } catch (value) {
    error.value = value instanceof Error ? value.message : 'Could not load more updates.';
  } finally {
    loadingMore.value = false;
  }
}

onMounted(startFeed);
onBeforeUnmount(() => stopFeed());
</script>

<template>
  <section class="page student-feed-page">
    <div class="student-feed-layout">
      <main class="student-feed-main">
        <div class="feed-sticky-controls">
          <header class="feed-page-intro">
            <div><p class="eyebrow">SCHOOL COMMUNITY</p><h2>School feed</h2><p>News, recognition, and attendance highlights from across the campus.</p></div>
            <span class="feed-live-status"><i aria-hidden="true"></i>Live updates</span>
          </header>

          <nav class="feed-filter-bar" aria-label="Filter school feed">
            <button
              v-for="filter in filterOptions"
              :key="filter.id"
              type="button"
              :class="{active: activeFilter === filter.id}"
              :aria-pressed="activeFilter === filter.id"
              @click="activeFilter = filter.id"
            ><span>{{ filter.label }}</span><b>{{ postCounts[filter.id] }}</b></button>
          </nav>
        </div>

        <StudentFeedComposer v-if="props.viewerRole === 'student'" />
        <TeacherFeedComposer v-else />

        <div class="student-feed-column">
          <div v-if="loading" class="feed-loading" aria-live="polite"><span></span><span></span><span></span><p>Loading school updates…</p></div>
          <div v-else-if="error && !posts.length" class="empty-state feed-error-state"><b>!</b><h3>Feed unavailable</h3><p>{{ error }}</p><button type="button" class="primary" @click="startFeed">Try again</button></div>
          <div v-else-if="!posts.length" class="empty-state"><b>≋</b><h3>No school updates yet</h3><p>New achievements and class updates will appear here.</p></div>
          <template v-else>
            <div v-if="!visiblePosts.length" class="feed-filter-empty"><span class="material-symbols-outlined" aria-hidden="true">filter_list_off</span><strong>No posts in this view</strong><p>Choose another feed filter to see recent school updates.</p></div>
            <FeedPostCard v-for="post in visiblePosts" :key="post.id" :post="post" :viewer-user-id="viewerUserId" :viewer-role="viewerRole" :viewer-photo-url="viewerPhotoUrl" :viewer-full-name="viewerFullName" />
            <p v-if="error" class="feed-page-error" role="alert">{{ error }}</p>
            <button v-if="hasMore" type="button" class="secondary feed-load-more" :disabled="loadingMore" @click="loadMore">{{ loadingMore ? 'Loading…' : 'Load older posts' }}</button>
            <p v-else-if="visiblePosts.length" class="feed-end-copy">You’re up to date.</p>
          </template>
        </div>
      </main>

      <aside class="feed-context-rail" aria-label="About the school feed">
        <section class="feed-rail-card">
          <span class="feed-rail-icon material-symbols-outlined" aria-hidden="true">groups</span>
          <h3>One school community</h3>
          <p>This feed is shared by active students and teachers across all grades and sections.</p>
        </section>
        <section class="feed-rail-card feed-rail-guide">
          <h3>What appears here</h3>
          <ul>
            <li><span class="material-symbols-outlined" aria-hidden="true">emoji_events</span><div><strong>Achievements</strong><small>Students who reached the passing mark.</small></div></li>
            <li><span class="material-symbols-outlined" aria-hidden="true">how_to_reg</span><div><strong>Attendance</strong><small>Class-session participation totals.</small></div></li>
            <li><span class="material-symbols-outlined" aria-hidden="true">campaign</span><div><strong>Announcements</strong><small>School-wide updates from teachers.</small></div></li>
            <li><span class="material-symbols-outlined" aria-hidden="true">sentiment_satisfied</span><div><strong>Student posts</strong><small>Positive updates selected from approved messages.</small></div></li>
            <li><span class="material-symbols-outlined" aria-hidden="true">person</span><div><strong>Teacher posts</strong><small>Titled school updates written by teachers.</small></div></li>
          </ul>
        </section>
        <p v-if="props.viewerRole === 'teacher'" class="feed-privacy-note"><span class="material-symbols-outlined" aria-hidden="true">shield</span>Teachers may remove inappropriate student posts.</p>
        <p class="feed-privacy-note"><span class="material-symbols-outlined" aria-hidden="true">leaderboard</span>Achievement results are ranked by recorded score.</p>
      </aside>
    </div>
  </section>
</template>
