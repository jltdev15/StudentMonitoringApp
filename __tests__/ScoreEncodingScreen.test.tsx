import React from 'react';
import {Modal} from 'react-native';
import renderer, {act} from 'react-test-renderer';
import {ScoreEncodingScreen} from '../src/screens/teacher/ScoreEncodingScreen';
import {useAuth} from '../src/context/AuthContext';
import {getSubmissionsByActivity} from '../src/services/activityService';
import {getStudentsByClass} from '../src/services/studentService';

jest.mock('../src/context/AuthContext', () => ({useAuth: jest.fn()}));
jest.mock('../src/services/activityService', () => ({
  getSubmissionsByActivity: jest.fn(),
  saveSubmissionBatch: jest.fn(),
}));
jest.mock('../src/services/studentService', () => ({
  getStudentsByClass: jest.fn(),
}));
jest.mock('../src/components/AppHeader', () => ({
  AppHeader: () => null,
}));
jest.mock('../src/components/AppCard', () => ({
  AppCard: ({children}: {children: React.ReactNode}) => {
    const react = require('react');
    const {View} = require('react-native');
    return react.createElement(View, null, children);
  },
}));
jest.mock('../src/components/AppButton', () => ({
  AppButton: ({children}: {children: React.ReactNode}) => {
    const react = require('react');
    const {Text} = require('react-native');
    return react.createElement(Text, null, children);
  },
}));
jest.mock('../src/components/AppTextInput', () => ({
  AppTextInput: ({label}: {label: string}) => {
    const react = require('react');
    const {Text} = require('react-native');
    return react.createElement(Text, null, label);
  },
}));
jest.mock('../src/components/StatusBadge', () => ({
  StatusBadge: ({status}: {status: string}) => {
    const react = require('react');
    const {Text} = require('react-native');
    return react.createElement(Text, null, status);
  },
}));
jest.mock('../src/components/Screen', () => ({
  Screen: ({children}: {children: React.ReactNode}) => {
    const react = require('react');
    const {View} = require('react-native');
    return react.createElement(View, null, children);
  },
}));
jest.mock('react-native-paper', () => ({
  Button: ({children}: {children: React.ReactNode}) => {
    const react = require('react');
    const {Text} = require('react-native');
    return react.createElement(Text, null, children);
  },
  Text: ({children}: {children: React.ReactNode}) => {
    const react = require('react');
    const {Text} = require('react-native');
    return react.createElement(Text, null, children);
  },
}));

const mockedUseAuth = useAuth as jest.Mock;
const mockedGetStudentsByClass = getStudentsByClass as jest.Mock;
const mockedGetSubmissionsByActivity = getSubmissionsByActivity as jest.Mock;

const activity = {
  id: 'activity-1',
  classId: 'class-1',
  title: 'Photo output',
  description: '',
  dueDate: new Date(),
  totalPoints: 100,
  createdBy: 'teacher-1',
  status: 'active' as const,
};

const renderScreen = async () => {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(
      <ScoreEncodingScreen
        route={{params: {activity}} as never}
        navigation={{} as never}
      />,
    );
  });
  return tree;
};

const renderedText = (tree: renderer.ReactTestRenderer) =>
  JSON.stringify(tree.toJSON());

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseAuth.mockReturnValue({profile: {uid: 'teacher-1'}});
  mockedGetStudentsByClass.mockResolvedValue([
    {
      id: 'student-1',
      fullName: 'Maria Santos',
      studentNumber: '2026-001',
      email: '',
      contactNumber: '',
      guardianName: '',
      guardianContact: '',
      classIds: ['class-1'],
      status: 'active',
      userId: 'student-user',
    },
  ]);
});

it('shows a student attachment thumbnail and opens the image viewer', async () => {
  mockedGetSubmissionsByActivity.mockResolvedValue([
    {
      id: 'activity-1_student-1',
      activityId: 'activity-1',
      classId: 'class-1',
      studentId: 'student-1',
      status: 'submitted',
      score: null,
      remarks: '',
      checkedBy: '',
      submittedAt: null,
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
    },
  ]);

  const tree = await renderScreen();
  expect(renderedText(tree)).toContain('Submitted Images');

  await act(async () => {
    tree.root
      .findByProps({accessibilityLabel: 'View output.jpg'})
      .props.onPress();
  });
  expect(tree.root.findByType(Modal).props.visible).toBe(true);

  await act(async () => {
    tree.root
      .findByProps({accessibilityLabel: 'Close image viewer'})
      .props.onPress();
  });
  expect(tree.root.findByType(Modal).props.visible).toBe(false);
});

it('keeps score and remarks controls available without image attachments', async () => {
  mockedGetSubmissionsByActivity.mockResolvedValue([]);

  const tree = await renderScreen();
  const text = renderedText(tree);

  expect(text).toContain('Maria Santos');
  expect(text).toContain('Score');
  expect(text).toContain('Remarks');
  expect(text).not.toContain('Submitted Images');
});

it('sorts students alphabetically by full name', async () => {
  mockedGetStudentsByClass.mockResolvedValue([
    {
      id: 'student-2',
      fullName: 'Zara Cruz',
      studentNumber: '2026-002',
      email: '',
      contactNumber: '',
      guardianName: '',
      guardianContact: '',
      classIds: ['class-1'],
      status: 'active',
      userId: 'student-user-2',
    },
    {
      id: 'student-3',
      fullName: 'Aaron Reyes',
      studentNumber: '2026-003',
      email: '',
      contactNumber: '',
      guardianName: '',
      guardianContact: '',
      classIds: ['class-1'],
      status: 'active',
      userId: 'student-user-3',
    },
  ]);
  mockedGetSubmissionsByActivity.mockResolvedValue([]);

  const tree = await renderScreen();
  const text = renderedText(tree);

  expect(text.indexOf('Aaron Reyes')).toBeLessThan(text.indexOf('Zara Cruz'));
});
