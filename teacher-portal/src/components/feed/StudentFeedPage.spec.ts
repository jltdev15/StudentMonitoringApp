import {mount} from '@vue/test-utils';
import {vi} from 'vitest';
import StudentFeedPage from './StudentFeedPage.vue';

const service = vi.hoisted(() => ({
  subscribeFeedPosts: vi.fn(),
  getOlderFeedPosts: vi.fn(),
}));

vi.mock('../../services/feed.service', () => ({
  ...service,
  createStudentPost: vi.fn(),
  STUDENT_FEED_POST_PRESETS: {},
}));

describe('StudentFeedPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows a neutral empty state without an announcement placeholder', async () => {
    service.subscribeFeedPosts.mockImplementation(onValue => { onValue([], null, false); return vi.fn(); });
    const wrapper = mount(StudentFeedPage, {
      props: {studentUserId: 'student-user'},
      global: {stubs: {FeedPostCard: true}},
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('No school updates yet');
    expect(wrapper.text()).not.toContain('No announcements');
    expect(wrapper.get('.feed-sticky-controls').find('.feed-page-intro').exists()).toBe(true);
    expect(wrapper.get('.feed-sticky-controls').find('.feed-filter-bar').exists()).toBe(true);
    expect(wrapper.get('.feed-context-rail').attributes('aria-label')).toBe('About the school feed');
    expect(wrapper.findComponent({name: 'StudentFeedComposer'}).exists()).toBe(true);
  });

  it('renders every sanitized post returned by the global feed', async () => {
    service.subscribeFeedPosts.mockImplementation(onValue => {
      onValue([
        {id: 'one', type: 'attendance', sourceId: 'one', title: 'Attendance update', body: '12 present', likeCount: 0, commentCount: 0},
        {id: 'two', type: 'announcement', sourceId: 'two', title: 'School update', body: 'Welcome', likeCount: 0, commentCount: 0},
      ], null, false);
      return vi.fn();
    });
    const wrapper = mount(StudentFeedPage, {
      props: {studentUserId: 'student-user'},
      global: {stubs: {FeedPostCard: {template: '<article class="stub-feed-post" />'}}},
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('.stub-feed-post')).toHaveLength(2);
  });

  it('filters posts without changing the subscribed feed data', async () => {
    service.subscribeFeedPosts.mockImplementation(onValue => {
      onValue([
        {id: 'one', type: 'achievement', sourceId: 'one', title: 'Achievement', body: 'Passed', likeCount: 0, commentCount: 0},
        {id: 'two', type: 'announcement', sourceId: 'two', title: 'School update', body: 'Welcome', likeCount: 0, commentCount: 0},
      ], null, false);
      return vi.fn();
    });
    const wrapper = mount(StudentFeedPage, {
      props: {studentUserId: 'student-user'},
      global: {stubs: {FeedPostCard: {props: ['post'], template: '<article class="stub-feed-post">{{ post.type }}</article>'}}},
    });
    await wrapper.vm.$nextTick();
    const achievementFilter = wrapper.findAll('.feed-filter-bar button').find(button => button.text().includes('Achievements'));
    expect(achievementFilter).toBeTruthy();
    await achievementFilter!.trigger('click');
    expect(wrapper.findAll('.stub-feed-post')).toHaveLength(1);
    expect(wrapper.get('.stub-feed-post').text()).toBe('achievement');
  });
});
