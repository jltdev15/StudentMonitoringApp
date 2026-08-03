import {flushPromises, mount} from '@vue/test-utils';
import {vi} from 'vitest';
import FeedPostCard from './FeedPostCard.vue';
import type {FeedPost} from '../../types';

const service = vi.hoisted(() => ({
  updateFeedLike: vi.fn(async () => {}),
  updateFeedComment: vi.fn(async () => {}),
  updateStudentPost: vi.fn(async () => {}),
  deleteStudentPost: vi.fn(async () => {}),
  subscribeFeedComments: vi.fn((_postId, onValue) => { onValue([]); return vi.fn(); }),
  subscribeOwnFeedLike: vi.fn((_postId, _userId, onValue) => { onValue(false); return vi.fn(); }),
  subscribeOwnFeedComment: vi.fn((_postId, _userId, onValue) => { onValue(null); return vi.fn(); }),
}));

vi.mock('../../services/feed.service', () => ({
  FEED_COMMENT_LABELS: {
    congratulations: 'Congratulations! 🎉',
    great_job: 'Great job! 👏',
    well_done: 'Well done! ⭐',
    keep_it_up: 'Keep it up! 💪',
    proud_of_you: 'Proud of you! 🙌',
  },
  STUDENT_FEED_POST_PRESETS: {
    ready_to_learn: 'Ready to learn and make today count! 📚',
    grateful: 'Grateful for another day of learning together. 🙌',
  },
  ...service,
}));

const achievement: FeedPost = {
  id: 'achievement_activity-1',
  sourceId: 'activity-1',
  type: 'achievement',
  title: 'Activity Achievers',
  body: 'Congratulations to the students who passed!',
  activityCategory: 'quiz',
  totalPoints: 25,
  achieverResults: [
    {name: 'DELA CRUZ, JUAN L.', score: 22},
    {name: 'SANTOS, MARIA A.', score: 25},
    {name: 'REYES, ALEX B.', score: 18},
    {name: 'CRUZ, JAMIE C.', score: 17},
    {name: 'LIM, PAT L.', score: 16},
    {name: 'MENDOZA, CHRIS M.', score: 15},
  ],
  achieverCount: 6,
  likeCount: 2,
  commentCount: 0,
};

describe('FeedPostCard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ranks achievers by score, shows full names and scores, and expands remaining results', async () => {
    const wrapper = mount(FeedPostCard, {props: {post: achievement, studentUserId: 'student-user'}});
    expect(wrapper.text()).toContain('Activity Achievers');
    expect(wrapper.text()).toContain('Quiz');
    const visibleRows = wrapper.findAll('.feed-achiever-ranking li');
    expect(visibleRows[0].text()).toContain('SANTOS, MARIA A.');
    expect(visibleRows[0].text()).toContain('25 / 25');
    expect(wrapper.text()).toContain('DELA CRUZ, JUAN L.');
    expect(wrapper.text()).not.toContain('MENDOZA, CHRIS M.');
    await wrapper.get('.feed-achievers button').trigger('click');
    expect(wrapper.text()).toContain('MENDOZA, CHRIS M.');
  });

  it('uses the same podium tier color for students with tied scores', () => {
    const tiedAchievement: FeedPost = {
      ...achievement,
      achieverResults: [
        {name: 'DELA CRUZ, JUAN L.', score: 25},
        {name: 'SANTOS, MARIA A.', score: 25},
        {name: 'REYES, ALEX B.', score: 22},
        {name: 'CRUZ, JAMIE C.', score: 20},
      ],
      achieverCount: 4,
    };
    const wrapper = mount(FeedPostCard, {props: {post: tiedAchievement, studentUserId: 'student-user'}});
    const rows = wrapper.findAll('.feed-achiever-ranking li');

    expect(rows[0].classes()).toContain('tier-gold');
    expect(rows[1].classes()).toContain('tier-gold');
    expect(rows[2].classes()).toContain('tier-silver');
    expect(rows[3].classes()).toContain('tier-bronze');
  });

  it('toggles a like and offers only approved comments', async () => {
    const wrapper = mount(FeedPostCard, {props: {post: achievement, studentUserId: 'student-user'}});
    const actions = wrapper.findAll('.feed-post-actions button');
    expect(actions[0].attributes('aria-label')).toBe('Like this post');
    expect(actions[1].attributes('aria-label')).toBe('Comment on this post');
    expect(actions[0].text()).toBe('thumb_up');
    expect(actions[1].text()).toBe('chat_bubble');
    await actions[0].trigger('click');
    expect(actions[0].attributes('aria-pressed')).toBe('true');
    expect(wrapper.text()).toContain('3 likes');
    await flushPromises();
    expect(service.updateFeedLike).toHaveBeenCalledWith(achievement.id, true);

    await actions[1].trigger('click');
    expect(document.body.textContent).toContain('Choose a response');
    expect(document.body.textContent).toContain('Congratulations! 🎉');
    expect(document.body.querySelector('.feed-comment-dialog input')).toBeNull();
    const approved = Array.from(document.body.querySelectorAll<HTMLButtonElement>('.feed-comment-options button'))[0];
    approved.click();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('1 comment');
    expect(wrapper.text()).toContain('Congratulations! 🎉');
    await flushPromises();
    expect(service.updateFeedComment).toHaveBeenCalledWith(achievement.id, 'congratulations');
    wrapper.unmount();
  });

  it('uses the loaded icon font and collapses long announcements', async () => {
    const announcement: FeedPost = {
      id: 'announcement-1',
      sourceId: 'announcement-1',
      type: 'announcement',
      title: 'School update',
      body: 'A'.repeat(360),
      likeCount: 0,
      commentCount: 0,
    };
    const wrapper = mount(FeedPostCard, {props: {post: announcement, studentUserId: 'student-user'}});

    expect(wrapper.get('.feed-post-icon').classes()).toContain('material-symbols-outlined');
    expect(wrapper.get('.feed-post-content > p').classes()).toContain('feed-post-body-collapsed');
    await wrapper.get('.feed-body-toggle').trigger('click');
    expect(wrapper.get('.feed-post-content > p').classes()).not.toContain('feed-post-body-collapsed');
  });

  it('renders a student preset post with the server-provided author', () => {
    const studentPost: FeedPost = {
      id: 'student-post-1',
      sourceId: 'student-post-1',
      type: 'student',
      title: 'Student update',
      body: 'Ready to learn and make today count! 📚',
      authorLabel: 'Juan D.',
      authorId: 'student-user',
      presetKey: 'ready_to_learn',
      likeCount: 0,
      commentCount: 0,
    };
    const wrapper = mount(FeedPostCard, {props: {post: studentPost, studentUserId: 'student-user', currentStudentPhotoUrl: 'https://storage.example/juan.webp', currentStudentFullName: 'DELA CRUZ, JUAN L.'}});
    expect(wrapper.get('.feed-post-byline strong').text()).toBe('DELA CRUZ, JUAN L.');
    expect(wrapper.find('.feed-post-byline span').exists()).toBe(false);
    expect(wrapper.find('.feed-post-content h3').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Student update');
    expect(wrapper.text()).toContain('DELA CRUZ, JUAN L.');
    expect(wrapper.text()).toContain(studentPost.body);
    expect(wrapper.get('.feed-post-avatar').attributes('src')).toBe('https://storage.example/juan.webp');
    expect(wrapper.get('.feed-post-avatar').attributes('alt')).toBe('DELA CRUZ, JUAN L. profile photo');
    expect(wrapper.find('.feed-owner-menu').exists()).toBe(true);
  });

  it('lets only the author edit with presets and delete after confirmation', async () => {
    const studentPost: FeedPost = {
      id: 'student-post-1', sourceId: 'student-post-1', type: 'student', title: 'Student update',
      body: 'Ready to learn and make today count! 📚', authorLabel: 'Juan D.', authorId: 'student-user',
      presetKey: 'ready_to_learn', likeCount: 0, commentCount: 0,
    };
    const wrapper = mount(FeedPostCard, {props: {post: studentPost, studentUserId: 'student-user'}});

    await wrapper.get('[aria-label="More options for your post"]').trigger('click');
    await wrapper.get('[aria-label="Edit your post"]').trigger('click');
    await wrapper.get('.feed-post-edit-form select').setValue('grateful');
    await wrapper.get('.feed-post-edit-form').trigger('submit');
    await flushPromises();
    expect(service.updateStudentPost).toHaveBeenCalledWith(studentPost.id, 'grateful');

    await wrapper.get('[aria-label="More options for your post"]').trigger('click');
    await wrapper.get('[aria-label="Delete your post"]').trigger('click');
    expect(document.body.textContent).toContain('Delete this post?');
    const deleteButton = Array.from(document.body.querySelectorAll('button')).find(button => button.textContent === 'Delete post');
    deleteButton?.click();
    await flushPromises();
    expect(service.deleteStudentPost).toHaveBeenCalledWith(studentPost.id);
    wrapper.unmount();

    const otherStudent = mount(FeedPostCard, {props: {post: studentPost, studentUserId: 'someone-else'}});
    expect(otherStudent.find('.feed-owner-menu').exists()).toBe(false);
  });
});
