import {PermissionsAndroid, Platform} from 'react-native';

export const ensureCameraPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android' || Platform.Version < 23) {
    return true;
  }

  const cameraPermission = PermissionsAndroid.PERMISSIONS.CAMERA;
  if (await PermissionsAndroid.check(cameraPermission)) {
    return true;
  }

  const result = await PermissionsAndroid.request(cameraPermission, {
    buttonNegative: 'Not now',
    buttonPositive: 'Allow camera',
    message: 'Class Tracker uses your camera to take profile and activity photos.',
    title: 'Allow camera access',
  });

  return result === PermissionsAndroid.RESULTS.GRANTED;
};
