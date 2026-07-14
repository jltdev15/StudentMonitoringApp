import {PermissionsAndroid, Platform} from 'react-native';
import notifee, {AndroidImportance, EventType} from '@notifee/react-native';
import {
  getInitialNotification,
  getMessaging,
  onMessage,
  onNotificationOpenedApp,
  requestPermission,
  subscribeToTopic,
  unsubscribeFromTopic,
} from '@react-native-firebase/messaging';
import {firebaseApp} from '../config/firebase';

const announcementChannelId = 'announcements';
type NotificationData = Record<string, string | number | object>;
let messagingInstance: ReturnType<typeof getMessaging> | null = null;

const messaging = () => {
  if (!messagingInstance) {
    messagingInstance = getMessaging(firebaseApp);
  }
  return messagingInstance;
};

export const announcementTopicsFor = (classIds: string[]) => [
  'students-all',
  ...classIds.map(classId => `class-${classId}`),
];

const isAnnouncement = (data?: NotificationData) =>
  data?.type === 'announcement';

const ensureAnnouncementChannel = () =>
  notifee.createChannel({
    id: announcementChannelId,
    importance: AndroidImportance.HIGH,
    name: 'Announcements',
  });

export const initializeAnnouncementNotifications = async () => {
  if (Platform.OS === 'android') {
    await ensureAnnouncementChannel();
  }
  await requestAnnouncementNotificationPermission();
};

export const requestAnnouncementNotificationPermission = async () => {
  const currentMessaging = messaging();
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return;
  }
  if (Platform.OS === 'ios') {
    await requestPermission(currentMessaging);
  }
};

export const subscribeToAnnouncementTopics = async (classIds: string[]) => {
  const currentMessaging = messaging();
  await Promise.all(
    announcementTopicsFor(classIds).map(topic =>
      subscribeToTopic(currentMessaging, topic),
    ),
  );
};

export const unsubscribeFromAnnouncementTopics = async (classIds: string[]) => {
  const currentMessaging = messaging();
  await Promise.all(
    announcementTopicsFor(classIds).map(topic =>
      unsubscribeFromTopic(currentMessaging, topic),
    ),
  );
};

const displayAnnouncement = async (
  title: string,
  body: string,
  data: NotificationData,
) => {
  const channelId = await ensureAnnouncementChannel();
  await notifee.displayNotification({
    android: {
      channelId,
      pressAction: {id: 'default'},
      smallIcon: 'ic_stat_class_tracker',
      largeIcon: 'ic_launcher',
      color: '#1468F5',
    },
    body,
    data,
    title,
  });
};

export const registerAnnouncementListeners = (
  onOpenAnnouncement: () => void,
) => {
  const currentMessaging = messaging();
  const unsubscribeForegroundMessage = onMessage(
    currentMessaging,
    async message => {
      if (!isAnnouncement(message.data)) {
        return;
      }
      await displayAnnouncement(
        message.notification?.title || 'New announcement',
        message.notification?.body || '',
        message.data || {},
      );
    },
  );
  const unsubscribeOpened = onNotificationOpenedApp(
    currentMessaging,
    message => {
      if (isAnnouncement(message.data)) {
        onOpenAnnouncement();
      }
    },
  );
  const unsubscribeNotifee = notifee.onForegroundEvent(({detail, type}) => {
    if (type === EventType.PRESS && isAnnouncement(detail.notification?.data)) {
      onOpenAnnouncement();
    }
  });

  getInitialNotification(currentMessaging).then(message => {
    if (message && isAnnouncement(message.data)) {
      onOpenAnnouncement();
    }
  });

  return () => {
    unsubscribeForegroundMessage();
    unsubscribeOpened();
    unsubscribeNotifee();
  };
};
