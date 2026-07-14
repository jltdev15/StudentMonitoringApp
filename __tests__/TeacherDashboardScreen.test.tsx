import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {TeacherDashboardScreen} from '../src/screens/teacher/TeacherDashboardScreen';
import {useAuth} from '../src/context/AuthContext';
import {getTeacherClasses} from '../src/services/classService';
import {getStudentsByClass} from '../src/services/studentService';
import {getAttendanceByClassAndDate} from '../src/services/attendanceService';
import {countByStatus} from '../src/services/reportService';

jest.mock('../src/context/AuthContext', () => ({useAuth: jest.fn()}));
jest.mock('../src/services/classService', () => ({
  getTeacherClasses: jest.fn(),
}));
jest.mock('../src/services/studentService', () => ({
  getStudentsByClass: jest.fn(),
}));
jest.mock('../src/services/attendanceService', () => ({
  getAttendanceByClassAndDate: jest.fn(),
}));
jest.mock('../src/services/reportService', () => ({countByStatus: jest.fn()}));
jest.mock('../src/components/LoadingState', () => ({
  LoadingState: () => null,
}));

const mockedUseAuth = useAuth as jest.Mock;
const mockedGetTeacherClasses = getTeacherClasses as jest.Mock;
const mockedGetStudentsByClass = getStudentsByClass as jest.Mock;
const mockedGetAttendanceByClassAndDate =
  getAttendanceByClassAndDate as jest.Mock;
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
      <TeacherDashboardScreen navigation={navigation} route={{} as any} />,
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
    profile: {uid: 'teacher-1', fullName: 'John Lerry Taruc'},
  });
  mockedGetTeacherClasses.mockResolvedValue([{id: 'class-1'}]);
  mockedGetStudentsByClass.mockResolvedValue([
    {id: 'student-1'},
    {id: 'student-2'},
  ]);
  mockedGetAttendanceByClassAndDate.mockResolvedValue([]);
  mockedCountByStatus.mockReturnValue({present: 1, absent: 1, late: 0});
});

it('renders live overview statistics and quick actions', async () => {
  const tree = await renderDashboard();
  const text = renderedText(tree);

  expect(text).toContain("Today's Overview");
  expect(text).toContain('Total enrolled');
  expect(text).toContain('Take Attendance');
  expect(text).toContain('Create Activity');
  expect(text).toContain('Add Student');
  expect(text).toContain('View Reports');
  expect(text).toContain('2');
  expect(text).toContain('1');
});

it('keeps empty statistics visible when the teacher has no classes', async () => {
  mockedGetTeacherClasses.mockResolvedValue([]);
  mockedCountByStatus.mockReturnValue({});

  const tree = await renderDashboard();
  const text = renderedText(tree);

  expect(text).toContain('Students');
  expect(text).toContain('Present');
  expect(text).toContain('Absent');
  expect(text).toContain('Late');
  expect(text).toContain('0');
});

it('wires overview, announcement, and quick-action controls to teacher screens', async () => {
  const tree = await renderDashboard();

  await act(async () => {
    tree.root
      .findByProps({accessibilityLabel: 'View attendance overview'})
      .props.onPress();
    tree.root
      .findByProps({accessibilityLabel: 'Open announcements'})
      .props.onPress();
    tree.root.findByProps({accessibilityLabel: 'View Reports'}).props.onPress();
  });

  expect(navigation.navigate).toHaveBeenCalledTimes(3);
  expect(navigation.navigate).toHaveBeenNthCalledWith(1, 'AttendanceHome');
  expect(navigation.navigate).toHaveBeenNthCalledWith(2, 'Announcements');
  expect(navigation.navigate).toHaveBeenNthCalledWith(3, 'Reports');
});
