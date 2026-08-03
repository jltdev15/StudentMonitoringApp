import {createPinia} from 'pinia';
import {mount} from '@vue/test-utils';
import App from './App.vue';

describe('App', () => {
  it('renders the active route and global feedback host', () => {
    const wrapper = mount(App, {global: {plugins: [createPinia()], stubs: {RouterView: {template: '<div data-route />'}}}});
    expect(wrapper.find('[data-route]').exists()).toBe(true);
    expect(wrapper.find('[aria-live="polite"]').exists()).toBe(true);
  });
});
