import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {AppHeader} from '../src/components/AppHeader';
import {useNavigation} from '@react-navigation/native';

jest.mock('@react-navigation/native', () => ({useNavigation: jest.fn()}));
jest.mock('react-native-paper', () => ({
  Text: ({children, ...props}: {children: React.ReactNode}) => {
    const react = require('react');
    const {Text} = require('react-native');
    return react.createElement(Text, props, children);
  },
}));

const mockedUseNavigation = useNavigation as jest.Mock;
const navigation = {canGoBack: jest.fn(), goBack: jest.fn()};

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseNavigation.mockReturnValue(navigation);
});

it('shows a navigable page title inline with its back button', async () => {
  navigation.canGoBack.mockReturnValue(true);
  let tree!: renderer.ReactTestRenderer;

  await act(async () => {
    tree = renderer.create(
      <AppHeader title="Activity Details" subtitle="Review submissions." />,
    );
  });

  expect(
    tree.root.findByProps({testID: 'app-header-inline-title'}).props.children,
  ).toBe('Activity Details');
  expect(() =>
    tree.root.findByProps({testID: 'app-header-hero-title'}),
  ).toThrow();

  await act(async () => {
    tree.root.findByProps({accessibilityLabel: 'Go back'}).props.onPress();
  });
  expect(navigation.goBack).toHaveBeenCalledTimes(1);
});

it('keeps a root-page title in the hero layout', async () => {
  navigation.canGoBack.mockReturnValue(false);
  let tree!: renderer.ReactTestRenderer;

  await act(async () => {
    tree = renderer.create(
      <AppHeader title="Classes" subtitle="Manage classes." />,
    );
  });

  expect(
    tree.root.findByProps({testID: 'app-header-hero-title'}).props.children,
  ).toBe('Classes');
  expect(() =>
    tree.root.findByProps({testID: 'app-header-inline-title'}),
  ).toThrow();
});

it('keeps an optional right-side action beside an inline title', async () => {
  navigation.canGoBack.mockReturnValue(true);
  let tree!: renderer.ReactTestRenderer;

  await act(async () => {
    tree = renderer.create(
      <AppHeader
        title="Edit Class"
        rightIcon="content-save-outline"
        onRightPress={jest.fn()}
      />,
    );
  });

  expect(
    tree.root.findByProps({testID: 'app-header-inline-title'}),
  ).toBeTruthy();
  expect(
    tree.root.findByProps({accessibilityLabel: 'content-save-outline'}),
  ).toBeTruthy();
});
