import {getMessaging, requestPermission} from '@react-native-firebase/messaging';
import {Platform} from 'react-native';
import {requestAnnouncementNotificationPermission} from '../src/services/notificationPermissionService';

const originalPlatform = Platform.OS;

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    value: originalPlatform,
  });
});

it('requests the iOS notification permission through Firebase Messaging', async () => {
  Object.defineProperty(Platform, 'OS', {configurable: true, value: 'ios'});

  await requestAnnouncementNotificationPermission();

  expect(getMessaging).toHaveBeenCalledTimes(1);
  expect(requestPermission).toHaveBeenCalledWith({});
});
