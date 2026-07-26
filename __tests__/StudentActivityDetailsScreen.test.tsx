import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {StudentActivityDetailsScreen} from '../src/screens/student/StudentActivityDetailsScreen';
import {useAuth} from '../src/context/AuthContext';
import {getActivitySubmission} from '../src/services/activityService';

jest.mock('../src/context/AuthContext', () => ({useAuth: jest.fn()}));
jest.mock('../src/services/activityService', () => ({
  getActivitySubmission: jest.fn(),
}));
jest.mock('../src/components/AppHeader', () => ({AppHeader: () => null}));
jest.mock('../src/components/LoadingState', () => ({LoadingState: () => null}));
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
      {accessibilityLabel: String(children), onPress},
      react.createElement(Text, null, children),
    );
  },
}));

const mockedUseAuth = useAuth as jest.Mock;
const mockedGetActivitySubmission = getActivitySubmission as jest.Mock;
const navigation = {navigate: jest.fn()};
const activity = {
  acceptsImageAttachments: true,
  activityCategory: 'coding' as const,
  classId: 'class-1',
  createdBy: 'teacher-1',
  description: 'Build a simple calculator.',
  dueDate: new Date('2026-07-30T12:00:00'),
  id: 'activity-1',
  status: 'active' as const,
  title: 'Calculator Project',
  totalPoints: 25,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseAuth.mockReturnValue({
    profile: {studentId: 'student-1'},
    student: null,
  });
  mockedGetActivitySubmission.mockResolvedValue({
    activityId: 'activity-1',
    remarks: 'Great progress so far.',
    score: 22,
    status: 'submitted',
  });
});

it('shows activity details and routes to image submission when available', async () => {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(
      <StudentActivityDetailsScreen
        navigation={navigation as never}
        route={{params: {activity}} as never}
      />,
    );
  });

  const text = JSON.stringify(tree.toJSON());
  expect(text).toContain('Calculator Project');
  expect(text).toContain('Coding');
  expect(text).toContain('22/25');
  expect(text).toContain('Great progress so far.');

  await act(async () => {
    tree.root
      .findByProps({accessibilityLabel: 'Update Image Submission'})
      .props.onPress();
  });
  expect(navigation.navigate).toHaveBeenCalledWith('SubmitActivity', {activity});
});
