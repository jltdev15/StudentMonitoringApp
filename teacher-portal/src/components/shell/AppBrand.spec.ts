import {mount} from '@vue/test-utils';
import AppBrand from './AppBrand.vue';

describe('AppBrand', () => {
  it('renders an accessible product mark and configurable label', () => {
    const wrapper = mount(AppBrand, {props: {label: 'PORTAL'}});
    expect(wrapper.get('img').attributes('alt')).toBe('ClassTrack');
    expect(wrapper.text()).toContain('PORTAL');
  });

  it('can mark the image as decorative', () => {
    const wrapper = mount(AppBrand, {props: {decorative: true}});
    expect(wrapper.get('img').attributes('alt')).toBe('');
  });
});
