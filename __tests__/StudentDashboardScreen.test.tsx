import React from 'react';
import {ScrollView} from 'react-native';
import renderer, {act} from 'react-test-renderer';
import {StudentDashboardScreen} from '../src/screens/student/StudentDashboardScreen';
import {useAuth} from '../src/context/AuthContext';
import {getAnnouncementsForStudent} from '../src/services/announcementService';
import {
  getActivitiesForClasses,
  getSubmissionsByStudent,
} from '../src/services/activityService';
import {getStudentAttendance} from '../src/services/attendanceService';
import {
  calculateAverageScore,
  countByStatus,
} from '../src/services/reportService';

jest.mock('../src/context/AuthContext', () => ({useAuth: jest.fn()}));
jest.mock('../src/services/announcementService', () => ({
  getAnnouncementsForStudent: jest.fn(),
}));
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
const mockedGetAnnouncementsForStudent =
  getAnnouncementsForStudent as jest.Mock;
const mockedGetActivitiesForClasses = getActivitiesForClasses as jest.Mock;
const mockedGetSubmissionsByStudent = getSubmissionsByStudent as jest.Mock;
const mockedGetStudentAttendance = getStudentAttendance as jest.Mock;
const mockedCalculateAverageScore = calculateAverageScore as jest.Mock;
const mockedCountByStatus = countByStatus as jest.Mock;

const navigation = {
  addListener: jest.fn((_event, listener) => {
    listener();
    return jest.fn();
  }),
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

const renderedText = (tree: renderer.ReactTestRenderer) =>
  tree.root
    .findAll(node => typeof node.props.children === 'string')
    .map(node => node.props.children)
    .join(' ');

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
  mockedGetStudentAttendance.mockResolvedValue([]);
  mockedGetActivitiesForClasses.mockResolvedValue([]);
  mockedGetSubmissionsByStudent.mockResolvedValue([]);
  mockedGetAnnouncementsForStudent.mockResolvedValue([
    {
      id: 'announcement-1',
      title: 'Welcome back',
      message: 'Class starts Monday.',
    },
  ]);
  mockedCountByStatus.mockReturnValue({present: 8, absent: 1, late: 2});
  mockedCalculateAverageScore.mockReturnValue(92);
});

it('renders cumulative student overview totals and the latest announcement', async () => {
  const tree = await renderDashboard();
  const text = renderedText(tree);

  expect(text).toContain('Your Overview');
  expect(text).toContain('All records');
  expect(text).toContain('Overall score');
  expect(text).toContain('92%');
  expect(text).toContain('Welcome back');
});

it('keeps zero-value overview cards visible when no records exist', async () => {
  mockedCountByStatus.mockReturnValue({});
  mockedCalculateAverageScore.mockReturnValue(0);
  mockedGetAnnouncementsForStudent.mockResolvedValue([]);

  const tree = await renderDashboard();
  const text = renderedText(tree);

  expect(text).toContain('Present');
  expect(text).toContain('Absent');
  expect(text).toContain('Late');
  expect(text).toContain('Average');
  expect(text).toContain('0%');
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
      .findByProps({accessibilityLabel: 'Open latest announcement'})
      .props.onPress();
    tree.root.findByType(ScrollView).props.refreshControl.props.onRefresh();
  });

  expect(navigation.navigate).toHaveBeenCalledWith('StudentAnnouncements');
  expect(navigation.navigate).toHaveBeenCalledWith('MyAttendance');
  expect(navigation.navigate).toHaveBeenCalledWith('MyActivities');
  expect(navigation.navigate).toHaveBeenCalledWith('MyScores');
  expect(mockedGetStudentAttendance.mock.calls.length).toBeGreaterThan(
    initialAttendanceCalls,
  );
});
