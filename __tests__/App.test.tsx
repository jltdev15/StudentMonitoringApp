/**
 * @format
 */

import 'react-native';
import React from 'react';
import renderer, {act} from 'react-test-renderer';
import App from '../App';
import {
  completeOnboarding,
  hasCompletedOnboarding,
} from '../src/services/onboardingService';

jest.mock('../src/context/AuthContext', () => ({
  AuthProvider: ({children}: {children: React.ReactNode}) => children,
}));

jest.mock('react-native-safe-area-context', () => {
  const react = require('react');
  const {View} = require('react-native');
  return {
    SafeAreaProvider: ({children}: {children: React.ReactNode}) =>
      react.createElement(View, null, children),
    SafeAreaView: ({children}: {children: React.ReactNode}) =>
      react.createElement(View, null, children),
  };
});

jest.mock('react-native-paper', () => {
  const react = require('react');
  const {Text} = require('react-native');
  return {
    MD3LightTheme: {colors: {}},
    PaperProvider: ({children}: {children: React.ReactNode}) => children,
    Text: ({children, ...props}: {children: React.ReactNode}) =>
      react.createElement(Text, props, children),
  };
});

jest.mock('../src/navigation/RootNavigator', () => ({
  RootNavigator: () => {
    const react = require('react');
    const {Text} = require('react-native');
    return react.createElement(Text, null, 'Login flow');
  },
}));

jest.mock('../src/services/onboardingService', () => ({
  completeOnboarding: jest.fn(),
  hasCompletedOnboarding: jest.fn(),
}));

const mockedCompleteOnboarding = completeOnboarding as jest.Mock;
const mockedHasCompletedOnboarding = hasCompletedOnboarding as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockedCompleteOnboarding.mockResolvedValue(undefined);
});

it('shows onboarding on a first launch, then opens the normal app flow', async () => {
  mockedHasCompletedOnboarding.mockResolvedValue(false);
  let tree!: renderer.ReactTestRenderer;

  await act(async () => {
    tree = renderer.create(<App />);
    await Promise.resolve();
  });

  expect(mockedHasCompletedOnboarding).toHaveBeenCalledTimes(1);
  expect(
    tree.root.findByProps({accessibilityLabel: 'Continue to notifications'}),
  ).toBeTruthy();

  await act(async () => {
    tree.root
      .findByProps({accessibilityLabel: 'Skip onboarding'})
      .props.onPress();
  });

  expect(mockedCompleteOnboarding).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(tree.toJSON())).toContain('Login flow');
});
