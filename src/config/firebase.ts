import {getApp} from '@react-native-firebase/app';
import {getAuth} from '@react-native-firebase/auth';
import {getFirestore} from '@react-native-firebase/firestore';

export const firebaseApp = getApp();
export const firebaseAuth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

export const collections = {
  users: 'users',
  classes: 'classes',
  students: 'students',
  attendance: 'attendance',
  activities: 'activities',
  submissions: 'activitySubmissions',
  announcements: 'announcements',
};
