import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {Button} from 'react-native-paper';
import {MyAttendanceScreen} from '../src/screens/student/MyAttendanceScreen';
import {useAuth} from '../src/context/AuthContext';
import {getStudentAttendance} from '../src/services/attendanceService';

jest.mock('../src/context/AuthContext', () => ({useAuth: jest.fn()}));
jest.mock('../src/services/attendanceService', () => ({
  getStudentAttendance: jest.fn(),
}));
jest.mock('../src/components/AppHeader', () => ({
  AppHeader: ({title, subtitle}: {title: string; subtitle?: string}) => {
    const react = require('react');
    const {Text, View} = require('react-native');
    return react.createElement(
      View,
      null,
      react.createElement(Text, null, title),
      react.createElement(Text, null, subtitle),
    );
  },
}));
jest.mock('../src/components/LoadingState', () => ({
  LoadingState: () => {
    const react = require('react');
    const {Text} = require('react-native');
    return react.createElement(Text, null, 'Loading attendance...');
  },
}));

const mockedUseAuth = useAuth as jest.Mock;
const mockedGetStudentAttendance = getStudentAttendance as jest.Mock;

const attendanceRecords = [
  {id: '24-present', date: '2026-07-24', remarks: '', status: 'present'},
  {id: '23-late', date: '2026-07-23', remarks: 'Traffic delay', status: 'late'},
  {id: '22-absent', date: '2026-07-22', remarks: '', status: 'absent'},
  {id: '21-excused', date: '2026-07-21', remarks: '', status: 'excused'},
  {id: '20-present', date: '2026-07-20', remarks: '', status: 'present'},
  {id: 'duplicate-present', date: '2026-07-22', remarks: '', status: 'present'},
  {id: 'june-present', date: '2026-06-30', remarks: '', status: 'present'},
];

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

const renderScreen = async () => {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(<MyAttendanceScreen />);
  });
  return tree;
};

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-07-24T12:00:00'));
});

afterAll(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseAuth.mockReturnValue({
    profile: {studentId: 'student-1'},
    student: null,
  });
  mockedGetStudentAttendance.mockResolvedValue(attendanceRecords);
});

it('renders the live date card, calendar priority dots, and recent records', async () => {
  const tree = await renderScreen();
  const text = renderedText(tree.toJSON());

  expect(text).toContain('Today, July 24, 2026');
  expect(text).toContain('July 2026');
  expect(text).toContain('Recent Records');
  expect(text).toContain('Traffic delay');
  expect(tree.root.findByProps({accessibilityLabel: '2026-07-22 absent'})).toBeTruthy();
});

it('filters records by week, month, and all history', async () => {
  const tree = await renderScreen();

  await act(async () => {
    tree.root.findByProps({accessibilityLabel: 'This Week'}).props.onPress();
  });
  expect(renderedText(tree.toJSON())).not.toContain('Jun 30, 2026');

  await act(async () => {
    tree.root.findByProps({accessibilityLabel: 'All Records'}).props.onPress();
    tree.root.findByProps({accessibilityLabel: 'View all records'}).props.onPress();
  });
  expect(renderedText(tree.toJSON())).toContain('Jun 30, 2026');
});

it('changes the visible month and resets the month filter', async () => {
  const tree = await renderScreen();

  await act(async () => {
    tree.root.findByProps({accessibilityLabel: 'Previous month'}).props.onPress();
  });

  const text = renderedText(tree.toJSON());
  expect(text).toContain('June 2026');
  expect(tree.root.findByProps({accessibilityLabel: 'This Month'}).props.accessibilityState).toEqual({selected: true});
});

it('shows the retry state when attendance cannot be loaded', async () => {
  mockedGetStudentAttendance.mockRejectedValue(new Error('Network error'));
  const tree = await renderScreen();

  expect(renderedText(tree.toJSON())).toContain('Unable to load attendance');
  expect(tree.root.findByType(Button).props.onPress).toBeTruthy();
});
