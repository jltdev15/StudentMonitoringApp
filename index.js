/**
 * @format
 */

import {AppRegistry} from 'react-native';
import {
  getMessaging,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';
import {firebaseApp} from './src/config/firebase';
import App from './App';
import {name as appName} from './app.json';

try {
  setBackgroundMessageHandler(getMessaging(firebaseApp), async () => {});
} catch {
  // The app remains usable until an APK containing the native messaging module is installed.
}

AppRegistry.registerComponent(appName, () => App);
