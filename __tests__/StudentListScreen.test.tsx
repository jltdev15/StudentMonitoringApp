import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {StudentListScreen} from '../src/screens/teacher/StudentListScreen';
import {AppHeader} from '../src/components/AppHeader';
import {useAuth} from '../src/context/AuthContext';
import {getTeacherClasses} from '../src/services/classService';
import {getStudentsByClass} from '../src/services/studentService';

jest.mock('../src/context/AuthContext', () => ({useAuth: jest.fn()}));
jest.mock('../src/services/classService', () => ({
  getTeacherClasses: jest.fn(),
}));
jest.mock('../src/services/studentService', () => ({
  getStudentsByClass: jest.fn(),
}));
jest.mock('../src/components/AppHeader', () => ({
  AppHeader: jest.fn(({title}: {title: string}) => {
    const react = require('react');
    const {Text} = require('react-native');
    return react.createElement(Text, null, title);
  }),
}));
jest.mock('../src/components/AppButton', () => ({
  AppButton: ({children}: {children: React.ReactNode}) => {
    const react = require('react');
    const {Text} = require('react-native');
    return react.createElement(Text, null, children);
  },
}));
jest.mock('../src/components/EmptyState', () => ({
  EmptyState: () => null,
}));
jest.mock('../src/components/LoadingState', () => ({
  LoadingState: () => null,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({bottom: 0, left: 0, right: 0, top: 0}),
}));
jest.mock('../src/components/StudentListItem', () => ({
  StudentListItem: ({student}: {student: {fullName: string}}) => {
    const react = require('react');
    const {Text} = require('react-native');
    return react.createElement(Text, null, student.fullName);
  },
}));
jest.mock('react-native-paper', () => ({
  Searchbar: () => null,
}));

const mockedAppHeader = AppHeader as jest.Mock;
const mockedUseAuth = useAuth as jest.Mock;
const mockedGetTeacherClasses = getTeacherClasses as jest.Mock;
const mockedGetStudentsByClass = getStudentsByClass as jest.Mock;

const navigation = {
  addListener: jest.fn((_event, listener) => {
    listener();
    return jest.fn();
  }),
  navigate: jest.fn(),
} as any;

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseAuth.mockReturnValue({profile: {uid: 'teacher-1'}});
  mockedGetTeacherClasses.mockResolvedValue([{id: 'class-1'}]);
  mockedGetStudentsByClass.mockResolvedValue([
    {id: 'student-1', fullName: 'Maria Santos', studentNumber: '2026-001'},
  ]);
});

it('keeps the header fixed above the scrolling student list and preserves the class id', async () => {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(
      <StudentListScreen
        navigation={navigation}
        route={{params: {classId: 'class-1'}} as any}
      />,
    );
  });

  expect(mockedAppHeader.mock.calls[0][0].rightIcon).toBeUndefined();
  const header = tree.root.findByProps({testID: 'students-sticky-header'});
  const scrollView = tree.root.findByType(
    require('react-native').ScrollView,
  );
  expect(header.parent).toBe(scrollView.parent);

  await act(async () => {
    tree.root.findByProps({accessibilityLabel: 'Add student'}).props.onPress();
  });

  expect(navigation.navigate).toHaveBeenCalledWith('AddStudent', {
    classId: 'class-1',
  });
});
