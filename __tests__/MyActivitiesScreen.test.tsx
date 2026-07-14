import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {MyActivitiesScreen} from '../src/screens/student/MyActivitiesScreen';
import {useAuth} from '../src/context/AuthContext';
import {
  getActivitiesForClasses,
  getSubmissionsByStudent,
} from '../src/services/activityService';

jest.mock('../src/context/AuthContext', () => ({useAuth: jest.fn()}));
jest.mock('../src/services/activityService', () => ({
  getActivitiesForClasses: jest.fn(),
  getSubmissionsByStudent: jest.fn(),
}));
jest.mock('../src/components/AppHeader', () => ({AppHeader: () => null}));
jest.mock('../src/components/AppCard', () => ({
  AppCard: ({children}: {children: React.ReactNode}) => {
    const react = require('react');
    const {View} = require('react-native');
    return react.createElement(View, null, children);
  },
}));
jest.mock('../src/components/Screen', () => ({
  Screen: ({children}: {children: React.ReactNode}) => {
    const react = require('react');
    const {View} = require('react-native');
    return react.createElement(View, null, children);
  },
}));
jest.mock('../src/components/StatusBadge', () => ({
  StatusBadge: ({status}: {status: string}) => status,
}));
jest.mock('../src/components/LoadingState', () => ({
  LoadingState: () => null,
}));
jest.mock('../src/components/EmptyState', () => ({EmptyState: () => null}));

const mockedUseAuth = useAuth as jest.Mock;
const mockedGetActivities = getActivitiesForClasses as jest.Mock;
const mockedGetSubmissions = getSubmissionsByStudent as jest.Mock;

const activity = {
  id: 'activity-1',
  classId: 'class-1',
  title: 'Photo output',
  description: '',
  dueDate: new Date(),
  totalPoints: 100,
  createdBy: 'teacher-1',
  acceptsImageAttachments: true,
  status: 'active' as const,
};

const submittedActivity = {
  id: 'activity-1_student-1',
  activityId: 'activity-1',
  classId: 'class-1',
  studentId: 'student-1',
  status: 'submitted' as const,
  score: null,
  remarks: '',
  checkedBy: '',
  submittedAt: new Date(),
  attachments: [
    {
      id: 'attachment-1',
      storagePath: 'activity-submissions/activity-1/student-1/output.jpg',
      downloadUrl: 'https://example.com/output.jpg',
      fileName: 'output.jpg',
      contentType: 'image/jpeg',
      order: 0,
    },
  ],
};

const renderedText = (tree: renderer.ReactTestRenderer) =>
  JSON.stringify(tree.toJSON());

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseAuth.mockReturnValue({
    profile: {
      classIds: ['class-1'],
      studentId: 'student-1',
    },
    student: null,
  });
  mockedGetActivities.mockResolvedValue([activity]);
  mockedGetSubmissions.mockResolvedValue([submittedActivity]);
});

it('reloads submissions whenever the activity screen regains focus', async () => {
  let focusHandler: (() => void | Promise<void>) | undefined;
  const removeFocusListener = jest.fn();
  const navigation = {
    addListener: jest.fn((_event: string, handler: () => void) => {
      focusHandler = handler;
      return removeFocusListener;
    }),
    navigate: jest.fn(),
  };

  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(
      <MyActivitiesScreen
        navigation={navigation as never}
        route={{} as never}
      />,
    );
  });

  await act(async () => {
    await focusHandler?.();
  });

  expect(mockedGetSubmissions).toHaveBeenCalledWith('student-1');
  expect(renderedText(tree)).toContain('submitted');
  expect(renderedText(tree)).toContain('View or replace images');

  await act(async () => {
    await focusHandler?.();
  });
  expect(mockedGetSubmissions).toHaveBeenCalledTimes(2);

  await act(async () => {
    tree.unmount();
  });
  expect(removeFocusListener).toHaveBeenCalledTimes(1);
});

it('keeps a scored submission viewable without offering replacement', async () => {
  mockedGetSubmissions.mockResolvedValue([
    {...submittedActivity, score: 95, checkedBy: 'teacher-1'},
  ]);
  let focusHandler: (() => void | Promise<void>) | undefined;
  const navigation = {
    addListener: jest.fn((_event: string, handler: () => void) => {
      focusHandler = handler;
      return jest.fn();
    }),
    navigate: jest.fn(),
  };

  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(
      <MyActivitiesScreen
        navigation={navigation as never}
        route={{} as never}
      />,
    );
  });
  await act(async () => {
    await focusHandler?.();
  });

  expect(renderedText(tree)).toContain('View submitted images');
  expect(renderedText(tree)).not.toContain('View or replace images');

  await act(async () => {
    tree.root
      .findByProps({
        accessibilityLabel: 'View submitted images for Photo output',
      })
      .props.onPress();
  });
  expect(navigation.navigate).toHaveBeenCalledWith('SubmitActivity', {
    activity,
  });
});
