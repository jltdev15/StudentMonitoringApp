import {useEffect, useMemo} from 'react';
import {NativeModules} from 'react-native';
import {UserProfile, StudentRecord} from '../types/models';
import {openStudentAnnouncements} from '../navigation/navigationRef';

type Props = {
  profile: UserProfile;
  student: StudentRecord | null;
};

const emptyClassIds: string[] = [];

type NotificationService = typeof import('../services/notificationService');

const loadNotificationService = (): NotificationService | null => {
  // Do not import Notifee into an APK that predates the native dependency.
  if (!NativeModules.NotifeeApiModule) {
    return null;
  }

  try {
    return require('../services/notificationService') as NotificationService;
  } catch {
    return null;
  }
};

export const StudentNotificationManager = ({profile, student}: Props) => {
  const classIds = useMemo(
    () =>
      profile.classIds.length
        ? profile.classIds
        : student?.classIds || emptyClassIds,
    [profile.classIds, student?.classIds],
  );

  useEffect(() => {
    const notifications = loadNotificationService();
    if (!notifications) {
      return;
    }

    notifications.initializeAnnouncementNotifications().catch(error => {
      console.warn('Announcement notifications could not be initialized.', error);
    });
    notifications.subscribeToAnnouncementTopics(classIds).catch(error => {
      console.warn('Announcement topic subscription failed.', error);
    });
    const unregisterListeners = notifications.registerAnnouncementListeners(() => {
      setTimeout(openStudentAnnouncements, 0);
    });

    return () => {
      unregisterListeners();
      notifications.unsubscribeFromAnnouncementTopics(classIds).catch(error => {
        console.warn('Announcement topic unsubscribe failed.', error);
      });
    };
  }, [classIds]);

  return null;
};
