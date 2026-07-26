import React from 'react';
import {Alert} from 'react-native';
import renderer, {act} from 'react-test-renderer';
import {StudentProfileScreen} from '../src/screens/student/StudentProfileScreen';
import {useAuth} from '../src/context/AuthContext';
import {getClassById} from '../src/services/classService';
import {uploadStudentProfilePhoto} from '../src/services/studentService';
import {launchImageLibrary} from 'react-native-image-picker';

jest.mock('../src/context/AuthContext', () => ({useAuth: jest.fn()}));
jest.mock('../src/services/classService', () => ({getClassById: jest.fn()}));
jest.mock('../src/services/studentService', () => ({
  uploadStudentProfilePhoto: jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({bottom: 0, left: 0, right: 0, top: 0}),
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
  StatusBadge: ({status}: {status: string}) => {
    const react = require('react');
    const {Text} = require('react-native');
    return react.createElement(Text, null, status);
  },
}));
jest.mock('../src/components/AppButton', () => ({
  AppButton: ({children}: {children: React.ReactNode}) => {
    const react = require('react');
    const {Text} = require('react-native');
    return react.createElement(Text, null, children);
  },
}));

const mockedUseAuth = useAuth as jest.Mock;
const mockedGetClassById = getClassById as jest.Mock;
const mockedUploadStudentProfilePhoto = uploadStudentProfilePhoto as jest.Mock;
const mockedLaunchImageLibrary = launchImageLibrary as jest.Mock;
const mockedSignOut = jest.fn();
const mockedRefreshProfile = jest.fn();
const mockedNavigation = {navigate: jest.fn()};

const profile = {
  uid: 'student-user',
  fullName: 'Maria Santos',
  email: 'maria@example.com',
  role: 'student' as const,
  studentId: 'student-1',
  studentNumber: '2026-001',
  teacherId: null,
  classIds: ['class-1'],
  status: 'active' as const,
};

const student = {
  id: 'student-1',
  userId: 'student-user',
  studentNumber: '2026-001',
  fullName: 'Maria Santos',
  email: 'maria@example.com',
  contactNumber: '',
  guardianName: '',
  guardianContact: '',
  classIds: ['class-1'],
  status: 'active' as const,
};

const renderedText = (tree: renderer.ReactTestRenderer) =>
  JSON.stringify(tree.toJSON());

const renderScreen = async () => {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(
      <StudentProfileScreen navigation={mockedNavigation as never} />,
    );
  });
  return tree;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseAuth.mockReturnValue({
    profile,
    student,
    signOut: mockedSignOut,
    loading: false,
    refreshProfile: mockedRefreshProfile,
  });
  mockedRefreshProfile.mockResolvedValue(undefined);
  mockedUploadStudentProfilePhoto.mockResolvedValue('https://example.com/avatar.jpg');
});

it('shows the cover-profile identity and primary active class details', async () => {
  mockedGetClassById.mockResolvedValue({
    id: 'class-1',
    className: 'Mathematics 10',
    subject: 'Mathematics',
    gradeLevel: 'Grade 10',
    section: 'Rizal',
    teacherId: 'teacher-1',
    schedule: 'Mon',
    status: 'active',
  });

  const tree = await renderScreen();
  const text = renderedText(tree);

  expect(text).toContain('Maria Santos');
  expect(text).toContain('maria@example.com');
  expect(text).toContain('Basic Information');
  expect(text).toContain('Phone');
  expect(text).toContain('Birthday');
  expect(text).toContain('Gender');
  expect(text).toContain('Active');
  expect(text).toContain('Grade Level');
  expect(text).toContain('Grade 10');
  expect(text).toContain('Section');
  expect(text).toContain('Rizal');
  expect(
    tree.root.findAllByProps({accessibilityLabel: 'Student status: active'}),
  ).not.toHaveLength(0);
});

it('selects a gallery image, uploads it, and refreshes the profile', async () => {
  mockedGetClassById.mockResolvedValue(null);
  mockedLaunchImageLibrary.mockResolvedValue({
    assets: [
      {
        fileSize: 1024,
        type: 'image/jpeg',
        uri: 'file:///profile.jpg',
      },
    ],
  });
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  const tree = await renderScreen();

  await act(async () => {
    tree.root
      .findByProps({accessibilityLabel: 'Update profile photo'})
      .props.onPress();
  });
  const options = alertSpy.mock.calls[0][2] as Array<{onPress?: () => void}>;
  await act(async () => {
    options[1].onPress?.();
  });

  expect(mockedUploadStudentProfilePhoto).toHaveBeenCalledWith('student-1', {
    contentType: 'image/jpeg',
    fileSize: 1024,
    uri: 'file:///profile.jpg',
  });
  expect(mockedRefreshProfile).toHaveBeenCalledTimes(1);
  expect(alertSpy).toHaveBeenLastCalledWith(
    'Profile photo updated',
    'Your new profile photo is now visible.',
  );
  alertSpy.mockRestore();
});

it('renders an uploaded profile photo instead of initials', async () => {
  mockedGetClassById.mockResolvedValue(null);
  mockedUseAuth.mockReturnValue({
    profile,
    student: {...student, photoUrl: 'https://example.com/avatar.jpg'},
    signOut: mockedSignOut,
    loading: false,
    refreshProfile: mockedRefreshProfile,
  });

  const tree = await renderScreen();
  expect(
    tree.root.findAllByProps({accessibilityLabel: 'Student profile photo'}),
  ).not.toHaveLength(0);
});

it('keeps profile details visible when no active class is assigned', async () => {
  mockedGetClassById.mockResolvedValue({
    id: 'class-1',
    className: 'Archived class',
    subject: 'Science',
    gradeLevel: 'Grade 9',
    section: 'Mabini',
    teacherId: 'teacher-1',
    schedule: 'Tue',
    status: 'archived',
  });

  const tree = await renderScreen();
  const text = renderedText(tree);

  expect(text).toContain('Maria Santos');
  expect(text).toContain('2026-001');
  expect(text).toContain('Not assigned');
});

it('keeps profile details visible and offers retry when enrollment fails', async () => {
  mockedGetClassById.mockRejectedValue(new Error('Network unavailable'));

  const tree = await renderScreen();
  const text = renderedText(tree);

  expect(text).toContain('Maria Santos');
  expect(text).toContain('Unavailable');
  expect(text).toContain('Retry');

  await act(async () => {
    tree.root
      .findByProps({accessibilityLabel: 'Retry loading enrollment'})
      .props.onPress();
  });

  expect(mockedGetClassById).toHaveBeenCalledTimes(2);
});

it('keeps long identity details visible and signs out from the profile action', async () => {
  mockedUseAuth.mockReturnValue({
    profile: {
      ...profile,
      email: 'very.long.student.email.address@example.com',
      fullName: 'Dela Cruz, Juan Lorenzo Miguel',
    },
    student: {...student, fullName: 'Dela Cruz, Juan Lorenzo Miguel'},
    signOut: mockedSignOut,
    loading: false,
  });
  mockedGetClassById.mockResolvedValue(null);

  const tree = await renderScreen();
  const text = renderedText(tree);

  expect(text).toContain('Dela Cruz, Juan Lorenzo Miguel');
  expect(text).toContain('very.long.student.email.address@example.com');

  await act(async () => {
    tree.root.findByProps({accessibilityLabel: 'Log out'}).props.onPress();
  });

  expect(mockedSignOut).toHaveBeenCalledTimes(1);
});

it('opens the student edit profile flow', async () => {
  mockedGetClassById.mockResolvedValue(null);

  const tree = await renderScreen();
  await act(async () => {
    tree.root.findByProps({accessibilityLabel: 'Edit profile'}).props.onPress();
  });

  expect(mockedNavigation.navigate).toHaveBeenCalledWith('EditStudentProfile');
});
