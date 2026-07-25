import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {StudentTabBar} from '../src/navigation/StudentNavigator';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({bottom: 0, left: 0, right: 0, top: 0}),
}));

const routes = [
  {key: 'DashboardTab-key', name: 'DashboardTab'},
  {key: 'AttendanceTab-key', name: 'AttendanceTab'},
  {key: 'ActivitiesTab-key', name: 'ActivitiesTab'},
  {key: 'AnnouncementsTab-key', name: 'AnnouncementsTab'},
  {key: 'ProfileTab-key', name: 'ProfileTab'},
];

const descriptors = Object.fromEntries(
  routes.map(route => [
    route.key,
    {options: {title: route.name === 'AnnouncementsTab' ? 'News' : route.name.replace('Tab', '')}},
  ]),
);

const navigation = {
  emit: jest.fn(() => ({defaultPrevented: false})),
  navigate: jest.fn(),
};

const renderTabBar = async (index = 0) => {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(
      <StudentTabBar
        descriptors={descriptors as any}
        insets={{bottom: 0, left: 0, right: 0, top: 0}}
        navigation={navigation as any}
        state={{index, routes} as any}
      />,
    );
  });
  return tree;
};

beforeEach(() => {
  jest.clearAllMocks();
});

it('renders all five student tabs and marks the selected tab', async () => {
  const tree = await renderTabBar();

  expect(tree.root.findByProps({accessibilityLabel: 'Dashboard tab'}).props.accessibilityState).toEqual({selected: true});
  expect(tree.root.findByProps({accessibilityLabel: 'Attendance tab'})).toBeTruthy();
  expect(tree.root.findByProps({accessibilityLabel: 'Activities tab'})).toBeTruthy();
  expect(tree.root.findByProps({accessibilityLabel: 'News tab'})).toBeTruthy();
  expect(tree.root.findByProps({accessibilityLabel: 'Profile tab'})).toBeTruthy();
});

it('opens another tab without dispatching navigation for the current tab', async () => {
  const tree = await renderTabBar();

  await act(async () => {
    tree.root.findByProps({accessibilityLabel: 'Dashboard tab'}).props.onPress();
    tree.root.findByProps({accessibilityLabel: 'Activities tab'}).props.onPress();
  });

  expect(navigation.navigate).toHaveBeenCalledTimes(1);
  expect(navigation.navigate).toHaveBeenCalledWith('ActivitiesTab');
  expect(navigation.emit).toHaveBeenCalledWith(
    expect.objectContaining({type: 'tabPress', target: 'ActivitiesTab-key'}),
  );
});
