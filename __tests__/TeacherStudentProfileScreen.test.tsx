import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {TeacherStudentProfileScreen} from '../src/screens/teacher/TeacherStudentProfileScreen';
import {
  getActivitiesForClasses,
  getSubmissionsByStudent,
} from '../src/services/activityService';
import {getStudentAttendance} from '../src/services/attendanceService';

jest.mock('../src/services/activityService', () => ({
  getActivitiesForClasses: jest.fn(),
  getSubmissionsByStudent: jest.fn(),
}));
jest.mock('../src/services/attendanceService', () => ({
  getStudentAttendance: jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({bottom: 0, left: 0, right: 0, top: 0}),
}));
jest.mock('../src/components/AppHeader', () => ({
  AppHeader: ({title}: {title: string}) => {
    const react = require('react');
    const {Text} = require('react-native');
    return react.createElement(Text, null, title);
  },
}));
jest.mock('../src/components/AppCard', () => ({
  AppCard: ({children}: {children: React.ReactNode}) => {
    const react = require('react');
    const {View} = require('react-native');
    return react.createElement(View, null, children);
  },
}));
jest.mock('../src/components/EmptyState', () => ({
  EmptyState: ({title}: {title: string}) => {
    const react = require('react');
    const {Text} = require('react-native');
    return react.createElement(Text, null, title);
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
  StatusBadge: ({status}: {status: string}) => {
    const react = require('react');
    const {Text} = require('react-native');
    return react.createElement(Text, null, status);
  },
}));

const mockedGetActivitiesForClasses = getActivitiesForClasses as jest.Mock;
const mockedGetSubmissionsByStudent = getSubmissionsByStudent as jest.Mock;
const mockedGetStudentAttendance = getStudentAttendance as jest.Mock;

const student = {
  id: 'student-1',
  userId: 'user-1',
  studentNumber: '2026-001',
  fullName: 'Maria Santos',
  email: 'maria@example.com',
  contactNumber: '09171234567',
  guardianName: 'Ana Santos',
  guardianContact: '09179876543',
  classIds: ['class-1'],
  status: 'active' as const,
};

const renderScreen = async () => {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(
      <TeacherStudentProfileScreen
        navigation={{} as never}
        route={{params: {student}} as never}
      />,
    );
  });
  return tree;
};

const renderedText = (tree: renderer.ReactTestRenderer) =>
  tree.root
    .findAll(node => typeof node.props.children === 'string')
    .map(node => node.props.children)
    .join(' ');

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetStudentAttendance.mockResolvedValue([
    {
      id: 'attendance-1',
      classId: 'class-1',
      studentId: 'student-1',
      date: '2026-07-13',
      status: 'present',
      remarks: 'On time',
      recordedBy: 'teacher-1',
    },
  ]);
  mockedGetActivitiesForClasses.mockResolvedValue([
    {
      id: 'activity-1',
      classId: 'class-1',
      title: 'Science Project',
      description: '',
      dueDate: new Date('2026-07-15'),
      totalPoints: 50,
      createdBy: 'teacher-1',
      status: 'active',
    },
    {
      id: 'activity-2',
      classId: 'class-1',
      title: 'Reading Log',
      description: '',
      dueDate: new Date('2026-07-14'),
      totalPoints: 25,
      createdBy: 'teacher-1',
      status: 'active',
    },
  ]);
  mockedGetSubmissionsByStudent.mockResolvedValue([
    {
      id: 'activity-1_student-1',
      activityId: 'activity-1',
      classId: 'class-1',
      studentId: 'student-1',
      status: 'submitted',
      score: 45,
      remarks: 'Great work',
      checkedBy: 'teacher-1',
      submittedAt: new Date(),
    },
  ]);
});

it('shows student information, attendance, and activities with missing fallback', async () => {
  const tree = await renderScreen();
  const text = renderedText(tree);

  expect(text).toContain('Maria Santos');
  expect(text).toContain('Ana Santos');
  expect(text).toContain('Attendance');
  expect(text).toContain('On time');
  expect(text).toContain('Science Project');
  expect(text).toContain('45 / 50');
  expect(text).toContain('Reading Log');
  expect(text).toContain('missing');
  expect(mockedGetActivitiesForClasses).toHaveBeenCalledWith(['class-1']);
});

it('shows empty states when the student has no attendance or assigned activities', async () => {
  mockedGetStudentAttendance.mockResolvedValue([]);
  mockedGetActivitiesForClasses.mockResolvedValue([]);
  mockedGetSubmissionsByStudent.mockResolvedValue([]);

  const tree = await renderScreen();
  const text = renderedText(tree);

  expect(text).toContain('No attendance records');
  expect(text).toContain('No assigned activities');
  expect(text).toContain('0%');
});
