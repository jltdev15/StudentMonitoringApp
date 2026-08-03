import {createPinia, setActivePinia} from 'pinia';
import {mount} from '@vue/test-utils';
import GlobalFeedback from './GlobalFeedback.vue';
import {useNotificationStore} from '../../stores/notifications';

describe('GlobalFeedback', () => {
  it('announces success and error feedback', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const wrapper = mount(GlobalFeedback, {global: {plugins: [pinia]}});
    const store = useNotificationStore();
    store.success('Saved');
    await wrapper.vm.$nextTick();
    expect(wrapper.get('[aria-live="polite"]').text()).toContain('Saved');
    store.failure('Failed');
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Failed');
    expect(wrapper.text()).not.toContain('Saved');
  });
});
