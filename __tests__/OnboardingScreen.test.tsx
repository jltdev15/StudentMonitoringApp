import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {OnboardingScreen} from '../src/screens/OnboardingScreen';

jest.mock('react-native-safe-area-context', () => {
  const react = require('react');
  const {View} = require('react-native');
  return {
    SafeAreaView: ({children}: {children: React.ReactNode}) =>
      react.createElement(View, null, children),
  };
});

const renderScreen = async ({
  onComplete = jest.fn(() => Promise.resolve()),
  requestNotificationPermission = jest.fn(() => Promise.resolve()),
}: Partial<React.ComponentProps<typeof OnboardingScreen>> = {}) => {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(
      <OnboardingScreen
        onComplete={onComplete}
        requestNotificationPermission={requestNotificationPermission}
      />,
    );
  });
  return {onComplete, requestNotificationPermission, tree};
};

it('moves through all three onboarding pages and updates the active indicator', async () => {
  const {tree} = await renderScreen();

  expect(tree.root.findByProps({accessibilityLabel: 'Onboarding page 1 of 3'})).toBeTruthy();
  expect(JSON.stringify(tree.toJSON())).toContain('Welcome to');

  await act(async () => {
    tree.root
      .findByProps({accessibilityLabel: 'Continue to notifications'})
      .props.onPress();
  });

  expect(tree.root.findByProps({accessibilityLabel: 'Onboarding page 2 of 3'})).toBeTruthy();
  expect(JSON.stringify(tree.toJSON())).toContain('Stay Updated');

  await act(async () => {
    tree.root.findByProps({accessibilityLabel: 'Not Now'}).props.onPress();
  });

  expect(tree.root.findByProps({accessibilityLabel: 'Onboarding page 3 of 3'})).toBeTruthy();
  expect(JSON.stringify(tree.toJSON())).toContain('Your Journey,');
});

it('requests permission and advances even when the request fails', async () => {
  const warningSpy = jest.spyOn(console, 'warn').mockImplementation();
  const requestNotificationPermission = jest.fn(() =>
    Promise.reject(new Error('Permission request failed')),
  );
  const {tree} = await renderScreen({requestNotificationPermission});

  await act(async () => {
    tree.root
      .findByProps({accessibilityLabel: 'Continue to notifications'})
      .props.onPress();
  });
  await act(async () => {
    tree.root
      .findByProps({accessibilityLabel: 'Enable Notifications'})
      .props.onPress();
  });

  expect(requestNotificationPermission).toHaveBeenCalledTimes(1);
  expect(tree.root.findByProps({accessibilityLabel: 'Onboarding page 3 of 3'})).toBeTruthy();
  warningSpy.mockRestore();
});

it.each(['Skip onboarding', 'Finish onboarding'])(
  'completes onboarding from %s',
  async accessibilityLabel => {
    const onComplete = jest.fn(() => Promise.resolve());
    const {tree} = await renderScreen({onComplete});

    if (accessibilityLabel === 'Finish onboarding') {
      await act(async () => {
        tree.root
          .findByProps({accessibilityLabel: 'Continue to notifications'})
          .props.onPress();
      });
      await act(async () => {
        tree.root.findByProps({accessibilityLabel: 'Not Now'}).props.onPress();
      });
    }

    await act(async () => {
      tree.root.findByProps({accessibilityLabel}).props.onPress();
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  },
);
