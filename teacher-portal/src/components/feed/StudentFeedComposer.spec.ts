import {flushPromises, mount} from '@vue/test-utils';
import {vi} from 'vitest';
import StudentFeedComposer from './StudentFeedComposer.vue';

const service = vi.hoisted(() => ({createStudentPost: vi.fn(async () => 'post-1')}));
vi.mock('../../services/feed.service', () => ({
  createStudentPost: service.createStudentPost,
  STUDENT_FEED_POST_PRESETS: {
    ready_to_learn: 'Ready to learn and make today count! 📚',
    good_luck: 'Good luck with your activities, everyone! 💪',
    proud_of_class: 'Proud of our class—let’s keep doing our best! 🌟',
    congratulations: 'Congratulations to everyone on your hard work! 🎉',
    grateful: 'Grateful for another day of learning together. 🙌',
  },
}));

describe('StudentFeedComposer', () => {
  beforeEach(() => vi.clearAllMocks());

  it('offers only preset messages and publishes the selected key', async () => {
    const wrapper = mount(StudentFeedComposer);
    expect(wrapper.find('textarea').exists()).toBe(false);
    expect(wrapper.findAll('option')).toHaveLength(6);
    expect(wrapper.get('button').attributes('disabled')).toBeDefined();

    await wrapper.get('select').setValue('good_luck');
    expect(wrapper.text()).toContain('Good luck with your activities, everyone!');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(service.createStudentPost).toHaveBeenCalledWith('good_luck');
    expect(wrapper.text()).toContain('shared with the school community');
    expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('');
  });

  it('keeps a friendly error when posting fails', async () => {
    service.createStudentPost.mockRejectedValueOnce(new Error('resource-exhausted: wait a few minutes'));
    const wrapper = mount(StudentFeedComposer);
    await wrapper.get('select').setValue('grateful');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toContain('wait a few minutes');
  });
});
