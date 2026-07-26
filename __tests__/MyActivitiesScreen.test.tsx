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
jest.mock('../src/components/AppHeader', () => ({
  AppHeader: ({title}: {title: string}) => {
    const react = require('react');
    const {Text} = require('react-native');
    return react.createElement(Text, null, title);
  },
}));
jest.mock('../src/components/LoadingState', () => ({LoadingState: () => null}));

const mockedUseAuth = useAuth as jest.Mock;
const mockedGetActivitiesForClasses = getActivitiesForClasses as jest.Mock;
const mockedGetSubmissionsByStudent = getSubmissionsByStudent as jest.Mock;
const navigation = {
  addListener: jest.fn((_event, listener) => {
    listener();
    return jest.fn();
  }),
  navigate: jest.fn(),
} as any;

const activities = [
  {
    acceptsImageAttachments: true,
    classId: 'class-1',
    description: 'Life Science – Heredity and Taxonomy',
    dueDate: new Date('2026-07-26T12:00:00'),
    id: 'assignment-upcoming',
    status: 'active',
    title: 'Science Worksheet #4',
    totalPoints: 20,
  },
  {
    activityCategory: 'coding' as const,
    classId: 'class-1',
    description: 'Build a model of the solar system.',
    dueDate: new Date('2026-07-28T08:00:00'),
    id: 'coding-upcoming',
    status: 'active' as const,
    title: 'Solar System Model',
    totalPoints: 30,
  },
  {
    classId: 'class-1',
    description: 'Taxonomy and Classification',
    dueDate: new Date('2026-07-27T08:00:00'),
    id: 'quiz-upcoming',
    status: 'active',
    title: 'Short Quiz #2',
    totalPoints: 10,
  },
  {
    classId: 'class-1',
    description: 'Life Science – Digestive System',
    dueDate: new Date('2026-07-20T12:00:00'),
    id: 'assignment-completed',
    status: 'active',
    title: 'Science Worksheet #3',
    totalPoints: 20,
  },
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
    tree = renderer.create(
      <MyActivitiesScreen navigation={navigation} route={{} as any} />,
    );
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
    profile: {classIds: ['class-1'], studentId: 'student-1'},
    student: null,
  });
  mockedGetActivitiesForClasses.mockResolvedValue(activities);
  mockedGetSubmissionsByStudent.mockResolvedValue([
    {
      activityId: 'assignment-completed',
      remarks: 'Excellent work',
      score: 18,
      status: 'submitted',
      submittedAt: new Date('2026-07-20T09:15:00'),
    },
  ]);
});

it('renders one teacher-assigned activity feed with row status indicators', async () => {
  const tree = await renderScreen();
  const text = renderedText(tree.toJSON());

  expect(text).toContain('Science Worksheet #4');
  expect(text).toContain('Short Quiz #2');
  expect(text).toContain('Solar System Model');
  expect(text).not.toContain('Upcoming');
  expect(text).not.toContain('Completed');
  expect(text).toContain('To Do');
  expect(text).toContain('18/20');
  expect(text).toContain('Excellent work');
});

it('filters PETAs and quizzes', async () => {
  const tree = await renderScreen();

  expect(
    tree.root.findAllByProps({name: 'file-question-outline'}).length,
  ).toBeGreaterThan(0);

  await act(async () => {
    tree.root.findByProps({accessibilityLabel: 'Quizzes'}).props.onPress();
  });
  expect(renderedText(tree.toJSON())).toContain('Short Quiz #2');
  expect(renderedText(tree.toJSON())).not.toContain('Science Worksheet #4');

  await act(async () => {
    tree.root
      .findByProps({accessibilityLabel: 'PETA'})
      .props.onPress();
  });
  expect(renderedText(tree.toJSON())).toContain('Science Worksheet #4');
  expect(renderedText(tree.toJSON())).not.toContain('Short Quiz #2');
});

it('filters coding activities using their teacher-selected category', async () => {
  const tree = await renderScreen();

  await act(async () => {
    tree.root.findByProps({accessibilityLabel: 'Coding'}).props.onPress();
  });

  const text = renderedText(tree.toJSON());
  expect(text).toContain('Solar System Model');
  expect(text).toContain('Coding');
  expect(text).not.toContain('Short Quiz #2');
  expect(text).not.toContain('Science Worksheet #4');
});

it('opens activity details for every teacher-created activity', async () => {
  const tree = await renderScreen();

  await act(async () => {
    tree.root
      .findByProps({accessibilityLabel: 'Open activity Science Worksheet #4'})
      .props.onPress();
  });

  expect(navigation.navigate).toHaveBeenCalledWith('StudentActivityDetails', {
    activity: activities[0],
  });
});

it('shows an empty quiz state when no quiz activities are available', async () => {
  mockedGetActivitiesForClasses.mockResolvedValue([activities[0]]);
  const tree = await renderScreen();

  await act(async () => {
    tree.root
      .findByProps({accessibilityLabel: 'Quizzes'})
      .props.onPress();
  });

  expect(renderedText(tree.toJSON())).toContain('No activities available.');
});
