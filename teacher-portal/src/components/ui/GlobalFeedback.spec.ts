import {createPinia, setActivePinia} from 'pinia';
import {mount} from '@vue/test-utils';
import GlobalFeedback from './GlobalFeedback.vue';
import {useNotificationStore} from '../../stores/notifications';

describe('GlobalFeedback', () => {
  it('announces success and replaces it with error feedback', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const wrapper = mount(GlobalFeedback, {global: {plugins: [pinia]}});
    const store = useNotificationStore();
    store.success('Saved');
    await wrapper.vm.$nextTick();
    expect(wrapper.get('[role="status"]').text()).toContain('Saved');
    store.failure('Failed');
    await wrapper.vm.$nextTick();
    expect(wrapper.get('[role="alert"]').text()).toContain('Failed');
    expect(wrapper.text()).not.toContain('Saved');
  });

  it('allows the current notification to be dismissed', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const wrapper = mount(GlobalFeedback, {global: {plugins: [pinia]}});
    const store = useNotificationStore();
    store.success('Activity updated successfully.');
    await wrapper.vm.$nextTick();

    await wrapper.get('button[aria-label="Dismiss notification"]').trigger('click');

    expect(store.message).toBe('');
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
  });
});
