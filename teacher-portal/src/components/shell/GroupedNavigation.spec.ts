import {mount} from '@vue/test-utils';
import {defineComponent, h} from 'vue';
import GroupedNavigation from './GroupedNavigation.vue';
import {activeNavigationItem, getNavigationGroups} from './navigation';

function visibleButtonLabel(button: Element): string {
  const content = button.cloneNode(true) as Element;
  content.querySelectorAll('[aria-hidden="true"]').forEach(icon => icon.remove());
  return content.textContent?.trim() || '';
}

describe('GroupedNavigation', () => {
  it('shows teacher categories and destinations in the approved order', () => {
    const wrapper = mount(GroupedNavigation, {props: {groups: getNavigationGroups('teacher'), idPrefix: 'desktop'}});
    expect(wrapper.get('nav').attributes('aria-label')).toBe('Primary navigation');
    expect(wrapper.findAll('h2').map(heading => heading.text())).toEqual(['Workspace', 'Teaching', 'Communication', 'Insights & tools']);
    expect(wrapper.findAll('section').map(section => section.findAll('button').map(button => visibleButtonLabel(button.element)))).toEqual([
      ['Overview'],
      ['Classes', 'Students', 'Attendance', 'Activities'],
      ['Feed', 'Announcements'],
      ['Reports', 'Utilities'],
    ]);
  });

  it('shows student categories without teacher-only destinations', () => {
    const wrapper = mount(GroupedNavigation, {props: {groups: getNavigationGroups('student'), idPrefix: 'student'}});
    expect(wrapper.findAll('h2').map(heading => heading.text())).toEqual(['Communication', 'Learning']);
    expect(wrapper.findAll('section').map(section => section.findAll('button').map(button => visibleButtonLabel(button.element)))).toEqual([
      ['Feed', 'Announcements'],
      ['My Classes', 'Activities & Scores', 'My Attendance'],
    ]);
    expect(wrapper.findAll('button')).toHaveLength(5);
  });

  it('labels each group and hides icons from assistive technology', () => {
    const wrapper = mount(GroupedNavigation, {props: {groups: getNavigationGroups('teacher'), idPrefix: 'desktop'}});
    wrapper.findAll('section').forEach(section => {
      expect(section.attributes('aria-labelledby')).toBe(section.get('h2').attributes('id'));
      expect(section.get('h2').attributes('id')).toMatch(/^desktop-/);
    });
    wrapper.findAll('button').forEach(button => {
      expect(button.attributes('type')).toBe('button');
      expect(button.get('i').attributes('aria-hidden')).toBe('true');
    });
    expect(visibleButtonLabel(wrapper.get('button').element)).toBe('Overview');
  });

  it('marks only the selected destination as the current page', async () => {
    const wrapper = mount(GroupedNavigation, {props: {groups: getNavigationGroups('teacher'), activeId: 'classes', idPrefix: 'desktop'}});
    expect(wrapper.findAll('[aria-current="page"]')).toHaveLength(1);
    expect(visibleButtonLabel(wrapper.get('[aria-current="page"]').element)).toBe('Classes');
    expect(wrapper.get('[aria-current="page"]').classes()).toContain('active');
    await wrapper.setProps({activeId: undefined});
    expect(wrapper.findAll('[aria-current]')).toHaveLength(0);
    expect(wrapper.findAll('button.active')).toHaveLength(0);
  });

  it.each([
    ['student-profile', 'students', 'Students', 'teacher'],
    ['submit-activity', 'activities', 'Activities & Scores', 'student'],
    ['review-quiz', 'activities', 'Activities & Scores', 'student'],
  ] as const)('highlights the parent destination for %s', (view, expectedId, expectedLabel, role) => {
    const activeId = activeNavigationItem(view);
    expect(activeId).toBe(expectedId);
    const wrapper = mount(GroupedNavigation, {props: {groups: getNavigationGroups(role), activeId, idPrefix: 'desktop'}});
    expect(visibleButtonLabel(wrapper.get('[aria-current="page"]').element)).toBe(expectedLabel);
  });

  it('preserves ordinary destinations and leaves standalone screens unselected', () => {
    getNavigationGroups('teacher').flatMap(group => group.items).forEach(item => {
      expect(activeNavigationItem(item.id)).toBe(item.id);
    });
    expect(activeNavigationItem('profile')).toBeUndefined();
    expect(activeNavigationItem('take-quiz')).toBeUndefined();
    expect(activeNavigationItem('unknown')).toBeUndefined();
  });

  it('emits the destination ID when a user selects an item', async () => {
    const wrapper = mount(GroupedNavigation, {props: {groups: getNavigationGroups('student'), idPrefix: 'mobile'}});
    const buttons = wrapper.findAll('button');
    await buttons[3].trigger('click');
    expect(wrapper.emitted('select')).toEqual([['activities']]);
  });

  it('keeps heading references unique when desktop and mobile navigation coexist', () => {
    const groups = getNavigationGroups('teacher');
    const wrapper = mount(defineComponent({
      render: () => h('div', [
        h(GroupedNavigation, {groups, idPrefix: 'desktop'}),
        h(GroupedNavigation, {groups, idPrefix: 'mobile'}),
      ]),
    }));
    const headingIds = wrapper.findAll('h2').map(heading => heading.attributes('id'));
    expect(headingIds).toHaveLength(8);
    expect(new Set(headingIds).size).toBe(8);
    wrapper.findAll('section').forEach(section => {
      const reference = section.attributes('aria-labelledby');
      expect(section.get('h2').attributes('id')).toBe(reference);
      expect(wrapper.findAll(`[id="${reference}"]`)).toHaveLength(1);
    });
  });
});
