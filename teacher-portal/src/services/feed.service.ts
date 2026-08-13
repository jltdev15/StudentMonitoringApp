import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import {httpsCallable} from 'firebase/functions';
import {db, functions} from '../firebase';
import type {FeedComment, FeedCommentKey, FeedPost, StudentFeedPostPresetKey} from '../types';

export const FEED_PAGE_SIZE = 10;
export const FEED_COMMENT_LABELS: Record<FeedCommentKey, string> = {
  congratulations: 'Congratulations! 🎉',
  great_job: 'Great job! 👏',
  well_done: 'Well done! ⭐',
  keep_it_up: 'Keep it up! 💪',
  proud_of_you: 'Proud of you! 🙌',
};
export const STUDENT_FEED_POST_PRESETS: Record<StudentFeedPostPresetKey, string> = {
  ready_to_learn: 'Ready to learn and make today count! 📚',
  good_luck: 'Good luck with your activities, everyone! 💪',
  proud_of_class: 'Proud of our class—let’s keep doing our best! 🌟',
  congratulations: 'Congratulations to everyone on your hard work! 🎉',
  grateful: 'Grateful for another day of learning together. 🙌',
};

export type FeedCursor = QueryDocumentSnapshot<DocumentData> | null;

const feedRecord = (snapshot: QueryDocumentSnapshot<DocumentData>) => ({
  id: snapshot.id,
  likeCount: 0,
  commentCount: 0,
  ...snapshot.data(),
}) as FeedPost;

const commentRecord = (snapshot: QueryDocumentSnapshot<DocumentData>) => ({
  id: snapshot.id,
  ...snapshot.data(),
}) as FeedComment;

export const subscribeFeedPosts = (
  onValue: (posts: FeedPost[], cursor: FeedCursor, hasMore: boolean) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  query(collection(db, 'feedPosts'), orderBy('publishedAt', 'desc'), limit(FEED_PAGE_SIZE)),
  snapshot => onValue(
    snapshot.docs.map(feedRecord),
    snapshot.docs[snapshot.docs.length - 1] ?? null,
    snapshot.size === FEED_PAGE_SIZE,
  ),
  value => onError(value instanceof Error ? value : new Error('Could not load the feed.')),
);

export const getOlderFeedPosts = async (cursor: FeedCursor) => {
  if (!cursor) return {posts: [] as FeedPost[], cursor: null as FeedCursor, hasMore: false};
  const snapshot = await getDocs(query(
    collection(db, 'feedPosts'),
    orderBy('publishedAt', 'desc'),
    startAfter(cursor),
    limit(FEED_PAGE_SIZE),
  ));
  return {
    posts: snapshot.docs.map(feedRecord),
    cursor: snapshot.docs[snapshot.docs.length - 1] ?? null,
    hasMore: snapshot.size === FEED_PAGE_SIZE,
  };
};

export const subscribeFeedComments = (
  postId: string,
  onValue: (comments: FeedComment[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  query(collection(db, 'feedPosts', postId, 'comments'), orderBy('updatedAt', 'desc'), limit(50)),
  snapshot => onValue(snapshot.docs.map(commentRecord)),
  value => onError(value instanceof Error ? value : new Error('Could not load comments.')),
);

export const subscribeOwnFeedLike = (postId: string, userId: string, onValue: (liked: boolean) => void) =>
  onSnapshot(doc(db, 'feedPosts', postId, 'likes', userId), snapshot => onValue(snapshot.exists()));

export const subscribeOwnFeedComment = (postId: string, userId: string, onValue: (comment: FeedComment | null) => void) =>
  onSnapshot(doc(db, 'feedPosts', postId, 'comments', userId), snapshot => onValue(
    snapshot.exists() ? ({id: snapshot.id, ...snapshot.data()} as FeedComment) : null,
  ));

const setLike = httpsCallable<{postId: string; liked: boolean}, {liked: boolean}>(functions, 'setFeedLike');
const setComment = httpsCallable<{postId: string; commentKey: FeedCommentKey | null}, {commentKey: FeedCommentKey | null}>(functions, 'setFeedComment');
const createPost = httpsCallable<{presetKey: StudentFeedPostPresetKey}, {postId: string}>(functions, 'createStudentFeedPost');
const updatePost = httpsCallable<{postId: string; presetKey: StudentFeedPostPresetKey}, {postId: string}>(functions, 'updateStudentFeedPost');
const deletePost = httpsCallable<{postId: string}, {postId: string}>(functions, 'deleteStudentFeedPost');
const createTeacherFeedPost = httpsCallable<{message: string}, {postId: string}>(functions, 'createTeacherFeedPost');
const updateTeacherFeedPost = httpsCallable<{postId: string; message: string}, {postId: string}>(functions, 'updateTeacherFeedPost');
const deleteTeacherFeedPost = httpsCallable<{postId: string}, {postId: string}>(functions, 'deleteTeacherFeedPost');
const moderateStudentFeedPost = httpsCallable<{postId: string}, {postId: string}>(functions, 'moderateStudentFeedPost');

export const updateFeedLike = async (postId: string, liked: boolean) => {
  await setLike({postId, liked});
};

export const updateFeedComment = async (postId: string, commentKey: FeedCommentKey | null) => {
  await setComment({postId, commentKey});
};

export const createStudentPost = async (presetKey: StudentFeedPostPresetKey) => {
  const result = await createPost({presetKey});
  return result.data.postId;
};

export const updateStudentPost = async (postId: string, presetKey: StudentFeedPostPresetKey) => {
  await updatePost({postId, presetKey});
};

export const deleteStudentPost = async (postId: string) => {
  await deletePost({postId});
};

export const createTeacherPost = async (message: string) => {
  const result = await createTeacherFeedPost({message});
  return result.data.postId;
};

export const updateTeacherPost = async (postId: string, message: string) => {
  await updateTeacherFeedPost({postId, message});
};

export const deleteTeacherPost = async (postId: string) => {
  await deleteTeacherFeedPost({postId});
};

export const moderateStudentPost = async (postId: string) => {
  await moderateStudentFeedPost({postId});
};
