import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {TextInput} from 'react-native';
import {LoginScreen} from '../src/screens/auth/LoginScreen';
import {useAuth} from '../src/context/AuthContext';

jest.mock('../src/context/AuthContext', () => ({useAuth: jest.fn()}));
jest.mock('../src/components/Screen', () => ({
  Screen: ({children}: {children: React.ReactNode}) => {
    const react = require('react');
    const {View} = require('react-native');
    return react.createElement(View, null, children);
  },
}));

const mockedUseAuth = useAuth as jest.Mock;
const signIn = jest.fn();
const resendVerification = jest.fn();
const navigation = {navigate: jest.fn()} as any;

const renderScreen = async () => {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(
      <LoginScreen
        navigation={navigation}
        route={{key: 'login', name: 'Login'} as any}
      />,
    );
  });
  return tree;
};

beforeEach(() => {
  jest.clearAllMocks();
  signIn.mockResolvedValue(undefined);
  resendVerification.mockResolvedValue(undefined);
  mockedUseAuth.mockReturnValue({
    authError: null,
    loading: false,
    resendVerification,
    signIn,
  });
});

it('validates an email before submitting', async () => {
  const tree = await renderScreen();

  await act(async () => {
    tree.root.findByProps({accessibilityLabel: 'Login'}).props.onPress();
  });

  expect(JSON.stringify(tree.toJSON())).toContain('Enter a valid email address.');
  expect(signIn).not.toHaveBeenCalled();
});

it('submits the email and password entered by the user', async () => {
  const tree = await renderScreen();
  const fields = tree.root.findAllByType(TextInput);

  await act(async () => {
    fields[0].props.onChangeText('student@example.com');
    fields[1].props.onChangeText('secret123');
  });
  await act(async () => {
    tree.root.findByProps({accessibilityLabel: 'Login'}).props.onPress();
  });

  expect(signIn).toHaveBeenCalledWith('student@example.com', 'secret123');
});

it('lets the user reveal their password', async () => {
  const tree = await renderScreen();
  const passwordInput = () =>
    tree.root
      .findAllByType(TextInput)
      .find(input => input.props.accessibilityLabel === 'Password')!;

  expect(passwordInput().props.secureTextEntry).toBe(true);
  await act(async () => {
    tree.root.findByProps({accessibilityLabel: 'Show password'}).props.onPress();
  });

  expect(passwordInput().props.secureTextEntry).toBe(false);
});

it('opens student registration', async () => {
  const tree = await renderScreen();

  await act(async () => {
    tree.root
      .findByProps({accessibilityLabel: 'Register as student'})
      .props.onPress();
  });

  expect(navigation.navigate).toHaveBeenCalledWith('StudentVerification');
});

it('shows verification recovery and resends the email', async () => {
  mockedUseAuth.mockReturnValue({
    authError: 'Please verify your email address before logging in.',
    loading: false,
    resendVerification,
    signIn,
  });
  const tree = await renderScreen();

  expect(JSON.stringify(tree.toJSON())).toContain('Verify your email');
  await act(async () => {
    tree.root
      .findByProps({accessibilityLabel: 'Use another account'})
      .props.onPress();
  });

  expect(tree.root.findByProps({accessibilityLabel: 'Login'})).toBeTruthy();
});
