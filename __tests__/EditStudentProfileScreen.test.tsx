import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {EditStudentProfileScreen} from '../src/screens/student/EditStudentProfileScreen';
import {useAuth} from '../src/context/AuthContext';
import {updateStudentProfile} from '../src/services/studentService';

jest.mock('../src/context/AuthContext', () => ({useAuth: jest.fn()}));
jest.mock('../src/services/studentService', () => ({
  updateStudentProfile: jest.fn(),
}));
jest.mock('react-native-paper', () => {
  const actual = jest.requireActual('react-native-paper');

  return {
    ...actual,
    Portal: ({children}: {children: React.ReactNode}) => children,
  };
});
jest.mock('../src/components/AppHeader', () => ({AppHeader: () => null}));
jest.mock('../src/components/Screen', () => ({
  Screen: ({children}: {children: React.ReactNode}) => {
    const react = require('react');
    const {View} = require('react-native');
    return react.createElement(View, null, children);
  },
}));
jest.mock('../src/components/AppButton', () => ({
  AppButton: ({children, onPress}: {children: React.ReactNode; onPress: () => void}) => {
    const react = require('react');
    const {Pressable, Text} = require('react-native');
    return react.createElement(
      Pressable,
      {accessibilityLabel: 'Save Changes', onPress},
      react.createElement(Text, null, children),
    );
  },
}));

const mockedUseAuth = useAuth as jest.Mock;
const mockedUpdateStudentProfile = updateStudentProfile as jest.Mock;
const refreshProfile = jest.fn();
const navigation = {goBack: jest.fn()};

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockedUseAuth.mockReturnValue({
    refreshProfile,
    student: {
      id: 'student-1',
      contactNumber: '09123456789',
      dateOfBirth: '2012-05-15',
      gender: 'Female',
    },
  });
  mockedUpdateStudentProfile.mockResolvedValue(undefined);
  refreshProfile.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.useRealTimers();
});

it('saves only student-editable profile fields and returns to the profile', async () => {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(
      <EditStudentProfileScreen
        navigation={navigation as never}
        route={{params: {}} as never}
      />,
    );
  });

  await act(async () => {
    tree.root.findByProps({accessibilityLabel: 'Select Male'}).props.onPress();
  });
  await act(async () => {
    tree.root.findByProps({accessibilityLabel: 'Save Changes'}).props.onPress();
  });

  expect(mockedUpdateStudentProfile).toHaveBeenCalledWith('student-1', {
    contactNumber: '09123456789',
    dateOfBirth: '2012-05-15',
    gender: 'Male',
  });
  expect(refreshProfile).toHaveBeenCalledTimes(1);
  expect(tree.root.findByProps({accessibilityLabel: 'Profile updated'})).toBeTruthy();
  expect(navigation.goBack).not.toHaveBeenCalled();

  await act(async () => {
    jest.advanceTimersByTime(1400);
  });
  expect(navigation.goBack).toHaveBeenCalledTimes(1);
});
