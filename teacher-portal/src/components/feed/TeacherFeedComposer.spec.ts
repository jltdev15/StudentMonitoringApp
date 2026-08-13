import {flushPromises, mount} from '@vue/test-utils';
import {vi} from 'vitest';
import TeacherFeedComposer from './TeacherFeedComposer.vue';

const service = vi.hoisted(() => ({createTeacherPost: vi.fn(async () => 'post-1')}));
vi.mock('../../services/feed.service', () => service);

describe('TeacherFeedComposer', () => {
  it('requires a message and publishes a valid post', async () => {
    const wrapper = mount(TeacherFeedComposer);
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined();
    await wrapper.get('textarea').setValue('Classes resume tomorrow.');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(service.createTeacherPost).toHaveBeenCalledWith('Classes resume tomorrow.');
    expect(wrapper.text()).toContain('shared with the school');
  });
});
