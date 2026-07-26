import {PermissionsAndroid, Platform} from 'react-native';
import {getMessaging, requestPermission} from '@react-native-firebase/messaging';
import {firebaseApp} from '../config/firebase';

export const requestAnnouncementNotificationPermission = async () => {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return;
  }

  if (Platform.OS === 'ios') {
    await requestPermission(getMessaging(firebaseApp));
  }
};
