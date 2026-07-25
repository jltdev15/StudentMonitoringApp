import React from 'react';
import {ImageBackground, ScrollView} from 'react-native';
import renderer, {act} from 'react-test-renderer';
import {StudentDashboardScreen} from '../src/screens/student/StudentDashboardScreen';
import {useAuth} from '../src/context/AuthContext';
import {
  getActivitiesForClasses,
  getSubmissionsByStudent,
} from '../src/services/activityService';
import {getStudentAttendance} from '../src/services/attendanceService';
import {
  calculateAverageScore,
  countByStatus,
} from '../src/services/reportService';
import {toReadableDate} from '../src/utils/dateUtils';

jest.mock('../src/context/AuthContext', () => ({useAuth: jest.fn()}));
jest.mock('../src/services/activityService', () => ({
  getActivitiesForClasses: jest.fn(),
  getSubmissionsByStudent: jest.fn(),
}));
jest.mock('../src/services/attendanceService', () => ({
  getStudentAttendance: jest.fn(),
}));
jest.mock('../src/services/reportService', () => ({
  calculateAverageScore: jest.fn(),
  countByStatus: jest.fn(),
}));
jest.mock('../src/components/LoadingState', () => ({LoadingState: () => null}));

const mockedUseAuth = useAuth as jest.Mock;
const mockedGetActivitiesForClasses = getActivitiesForClasses as jest.Mock;
const mockedGetSubmissionsByStudent = getSubmissionsByStudent as jest.Mock;
const mockedGetStudentAttendance = getStudentAttendance as jest.Mock;
const mockedCalculateAverageScore = calculateAverageScore as jest.Mock;
const mockedCountByStatus = countByStatus as jest.Mock;

const tabNavigation = {navigate: jest.fn()};
const navigation = {
  addListener: jest.fn((_event, listener) => {
    listener();
    return jest.fn();
  }),
  getParent: jest.fn(() => tabNavigation),
  navigate: jest.fn(),
} as any;

const renderDashboard = async () => {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(
      <StudentDashboardScreen navigation={navigation} route={{} as any} />,
    );
  });
  return tree;
};

const renderedText = (node: unknown): string => {
  if (typeof node === 'string') {
    return node;
  }
  if (Array.isArray(node)) {
    return node.map(renderedText).join('');
  }
  if (node && typeof node === 'object' && 'children' in node) {
    return renderedText((node as {children?: unknown}).children);
  }
  return '';
};

const dateInDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseAuth.mockReturnValue({
    profile: {
      fullName: 'Maria Santos',
      studentId: 'student-1',
      classIds: ['class-1'],
    },
    student: null,
  });
  mockedGetStudentAttendance.mockResolvedValue([
    ...Array.from({length: 8}, (_, index) => ({
      id: `present-${index}`,
      status: 'present',
    })),
    {id: 'absent-1', status: 'absent'},
    {id: 'late-1', status: 'late'},
    {id: 'excused-1', status: 'excused'},
  ]);
  mockedGetActivitiesForClasses.mockResolvedValue([
    {
      id: 'activity-upcoming',
      classId: 'class-1',
      dueDate: dateInDays(3),
      status: 'active',
      title: 'Science Quiz',
    },
  ]);
  mockedGetSubmissionsByStudent.mockResolvedValue([]);
  mockedCountByStatus.mockReturnValue({present: 8, absent: 1, late: 2});
  mockedCalculateAverageScore.mockReturnValue(92);
});

it('renders cumulative overview totals and the nearest upcoming activity', async () => {
  const tree = await renderDashboard();
  const text = renderedText(tree.toJSON());

  expect(text).toContain('Overview');
  expect(text).toContain('All records');
  expect(text).toContain('Overall score');
  expect(text).toContain('92%');
  expect(text).toContain('73%');
  expect(text).toContain('9%');
  expect(text).toContain('18%');
  expect(text).toContain('Science Quiz');
  expect(text).toContain(
    toReadableDate(dateInDays(3)),
  );
});

it('renders the supplied school-scene header artwork behind the live hero content', async () => {
  const tree = await renderDashboard();

  expect(tree.root.findAllByType(ImageBackground)).toHaveLength(1);
  expect(renderedText(tree.toJSON())).toContain('Maria Santos');
  expect(renderedText(tree.toJSON())).toContain('Today is');
});

it('keeps zero-value overview cards visible when no records exist', async () => {
  mockedCountByStatus.mockReturnValue({});
  mockedCalculateAverageScore.mockReturnValue(0);
  mockedGetStudentAttendance.mockResolvedValue([]);
  mockedGetActivitiesForClasses.mockResolvedValue([]);

  const tree = await renderDashboard();
  const text = renderedText(tree.toJSON());

  expect(text).toContain('Present');
  expect(text).toContain('Absent');
  expect(text).toContain('Late');
  expect(text).toContain('Average');
  expect(text).toContain('0%');
  expect(text).toContain('No upcoming activities');
});

it('keeps a long student name visible in the redesigned hero', async () => {
  mockedUseAuth.mockReturnValue({
    profile: {
      fullName: 'Dela Cruz, Juan Lorenzo Miguel',
      studentId: 'student-1',
      classIds: ['class-1'],
    },
    student: null,
  });

  const tree = await renderDashboard();

  expect(renderedText(tree.toJSON())).toContain('Dela Cruz, Juan Lorenzo Miguel');
});

it('wires all dashboard destinations and supports pull-to-refresh', async () => {
  const tree = await renderDashboard();
  const initialAttendanceCalls = mockedGetStudentAttendance.mock.calls.length;

  await act(async () => {
    tree.root
      .findByProps({accessibilityLabel: 'Open announcements'})
      .props.onPress();
    tree.root
      .findByProps({accessibilityLabel: 'View attendance records'})
      .props.onPress();
    tree.root
      .findByProps({accessibilityLabel: 'My Attendance'})
      .props.onPress();
    tree.root
      .findByProps({accessibilityLabel: 'My Activities'})
      .props.onPress();
    tree.root.findByProps({accessibilityLabel: 'My Scores'}).props.onPress();
    tree.root
      .findByProps({accessibilityLabel: 'Announcements'})
      .props.onPress();
    tree.root
      .findByProps({accessibilityLabel: 'Open upcoming activity Science Quiz'})
      .props.onPress();
    tree.root
      .findAllByType(ScrollView)[0]
      .props.refreshControl.props.onRefresh();
  });

  expect(tabNavigation.navigate).toHaveBeenCalledWith('AnnouncementsTab', {
    screen: 'StudentAnnouncements',
  });
  expect(tabNavigation.navigate).toHaveBeenCalledWith('AttendanceTab', {
    screen: 'MyAttendance',
  });
  expect(tabNavigation.navigate).toHaveBeenCalledWith('ActivitiesTab', {
    screen: 'MyActivities',
  });
  expect(tabNavigation.navigate).toHaveBeenCalledWith('ActivitiesTab', {
    screen: 'MyScores',
  });
  expect(mockedGetStudentAttendance.mock.calls.length).toBeGreaterThan(
    initialAttendanceCalls,
  );
});
