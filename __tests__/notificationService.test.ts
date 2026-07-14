import {
  onMessage,
  subscribeToTopic,
  unsubscribeFromTopic,
} from '@react-native-firebase/messaging';
import {
  announcementTopicsFor,
  initializeAnnouncementNotifications,
  registerAnnouncementListeners,
  subscribeToAnnouncementTopics,
  unsubscribeFromAnnouncementTopics,
} from '../src/services/notificationService';
import notifee from '@notifee/react-native';
import {Platform} from 'react-native';

const originalPlatform = Platform.OS;

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(Platform, 'OS', {configurable: true, value: 'android'});
});

afterAll(() => {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    value: originalPlatform,
  });
});

it('builds all-student and class notification topics', () => {
  expect(announcementTopicsFor(['class-1', 'class-2'])).toEqual([
    'students-all',
    'class-class-1',
    'class-class-2',
  ]);
});

it('subscribes and unsubscribes a student from active announcement topics', async () => {
  await subscribeToAnnouncementTopics(['class-1']);
  await unsubscribeFromAnnouncementTopics(['class-1']);

  expect(subscribeToTopic).toHaveBeenCalledWith({}, 'students-all');
  expect(subscribeToTopic).toHaveBeenCalledWith({}, 'class-class-1');
  expect(unsubscribeFromTopic).toHaveBeenCalledWith({}, 'students-all');
  expect(unsubscribeFromTopic).toHaveBeenCalledWith({}, 'class-class-1');
});

it('creates the Android announcement channel during notification initialization', async () => {
  await initializeAnnouncementNotifications();

  expect(notifee.createChannel).toHaveBeenCalledWith({
    id: 'announcements',
    importance: 4,
    name: 'Announcements',
  });
});

it('uses the Class Tracker icons for foreground announcements', async () => {
  (onMessage as jest.Mock).mockImplementation((_messaging, handler) => {
    handler({
      data: {type: 'announcement'},
      notification: {body: 'Tomorrow is a holiday.', title: 'School update'},
    });
    return jest.fn();
  });

  registerAnnouncementListeners(jest.fn());
  await Promise.resolve();

  expect(notifee.displayNotification).toHaveBeenCalledWith(
    expect.objectContaining({
      android: expect.objectContaining({
        color: '#1468F5',
        largeIcon: 'ic_launcher',
        smallIcon: 'ic_stat_class_tracker',
      }),
    }),
  );
});
