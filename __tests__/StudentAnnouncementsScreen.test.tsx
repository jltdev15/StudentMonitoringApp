import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {
  getAnnouncementCategory,
  StudentAnnouncementsScreen,
} from '../src/screens/student/StudentAnnouncementsScreen';
import {useAuth} from '../src/context/AuthContext';
import {getAnnouncementsForStudent} from '../src/services/announcementService';
import {toReadableDate} from '../src/utils/dateUtils';

jest.mock('../src/context/AuthContext', () => ({useAuth: jest.fn()}));
jest.mock('../src/services/announcementService', () => ({
  getAnnouncementsForStudent: jest.fn(),
}));
jest.mock('../src/components/AppHeader', () => ({
  AppHeader: () => null,
}));
jest.mock('../src/components/LoadingState', () => ({
  LoadingState: () => null,
}));

const mockedUseAuth = useAuth as jest.Mock;
const mockedGetAnnouncementsForStudent =
  getAnnouncementsForStudent as jest.Mock;
const mockedNavigation = {navigate: jest.fn()};

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

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseAuth.mockReturnValue({
    profile: {classIds: ['class-1']},
    student: null,
  });
});

it('displays announcement posting dates with a safe missing-date fallback', async () => {
  mockedGetAnnouncementsForStudent.mockResolvedValue([
    {
      id: 'announcement-1',
      createdAt: new Date('2026-07-12T12:00:00'),
      message: 'Class starts Monday.',
      title: 'Welcome back',
    },
    {
      id: 'announcement-2',
      message: 'Please check the class board.',
      title: 'No date available',
    },
  ]);

  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(
      <StudentAnnouncementsScreen navigation={mockedNavigation as never} />,
    );
  });

  const text = renderedText(tree.toJSON());
  expect(text).toContain(
    `Posted ${toReadableDate(new Date('2026-07-12T12:00:00'))}`,
  );
  expect(text).toContain('Posted No date');
});

it('uses an explicitly featured announcement and does not repeat it in the feed', async () => {
  mockedGetAnnouncementsForStudent.mockResolvedValue([
    {
      id: 'newest-event',
      createdAt: new Date('2026-07-24T12:00:00'),
      featured: true,
      message: 'Join the school celebration.',
      title: 'Foundation Day Celebration',
    },
    {
      id: 'academic-update',
      createdAt: new Date('2026-07-23T12:00:00'),
      message: 'The Quarter 1 exam schedule is now available.',
      title: 'Exam Schedule Released',
    },
  ]);

  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(
      <StudentAnnouncementsScreen navigation={mockedNavigation as never} />,
    );
  });

  expect(tree.root.findAllByProps({testID: 'featured-announcement'})).not.toHaveLength(0);
  expect(tree.root.findAllByProps({testID: 'announcement-row-newest-event'})).toHaveLength(0);
  expect(tree.root.findAllByProps({testID: 'announcement-row-academic-update'})).not.toHaveLength(0);
  expect(tree.root.findAllByProps({testID: 'announcements-placeholder'})).toHaveLength(0);

  await act(async () => {
    tree.root.findByProps({accessibilityLabel: 'Show Events'}).props.onPress();
  });

  expect(tree.root.findAllByProps({testID: 'featured-announcement'})).toHaveLength(0);
  expect(tree.root.findAllByProps({testID: 'announcement-row-newest-event'})).not.toHaveLength(0);
  expect(tree.root.findAllByProps({testID: 'announcements-placeholder'})).toHaveLength(0);
});

it('filters inferred academic, event, and general announcement categories', async () => {
  mockedGetAnnouncementsForStudent.mockResolvedValue([
    {
      id: 'general',
      createdAt: new Date('2026-07-24T12:00:00'),
      message: 'Please review this important update.',
      title: 'Important Advisory',
    },
    {
      id: 'academic',
      createdAt: new Date('2026-07-23T12:00:00'),
      message: 'Review your worksheet before the quiz.',
      title: 'Science Quiz',
    },
    {
      id: 'event',
      createdAt: new Date('2026-07-22T12:00:00'),
      message: 'Register for the school fair.',
      title: 'Science Fair Registration',
    },
  ]);

  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(
      <StudentAnnouncementsScreen navigation={mockedNavigation as never} />,
    );
  });

  await act(async () => {
    tree.root.findByProps({accessibilityLabel: 'Show Academic'}).props.onPress();
  });

  expect(tree.root.findAllByProps({testID: 'featured-announcement'})).toHaveLength(0);
  expect(tree.root.findAllByProps({testID: 'announcement-row-academic'})).not.toHaveLength(0);
  expect(tree.root.findAllByProps({testID: 'announcement-row-event'})).toHaveLength(0);
  expect(tree.root.findAllByProps({testID: 'announcement-row-general'})).toHaveLength(0);
  expect(getAnnouncementCategory({title: 'Science Fair', message: ''})).toBe('events');
  expect(getAnnouncementCategory({title: 'Math Quiz', message: ''})).toBe('academic');
  expect(getAnnouncementCategory({title: 'Important update', message: ''})).toBe('general');

  const academicRow = tree.root
    .findAllByProps({testID: 'announcement-row-academic'})
    .find(node => typeof node.props.onPress === 'function');
  await act(async () => {
    academicRow?.props.onPress();
  });
  expect(mockedNavigation.navigate).toHaveBeenCalledWith(
    'StudentAnnouncementDetails',
    expect.objectContaining({
      announcement: expect.objectContaining({id: 'academic'}),
    }),
  );
});

it('shows a placeholder when there are no announcements', async () => {
  mockedGetAnnouncementsForStudent.mockResolvedValue([]);

  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(
      <StudentAnnouncementsScreen navigation={mockedNavigation as never} />,
    );
  });

  expect(tree.root.findAllByProps({testID: 'announcements-placeholder'})).not.toHaveLength(0);
  expect(renderedText(tree.toJSON())).toContain('No announcements yet');
});
