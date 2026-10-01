import {initializeApp} from 'firebase/app';
import {getAuth} from 'firebase/auth';
import {initializeFirestore} from 'firebase/firestore';
import {getStorage} from 'firebase/storage';
import {getFunctions} from 'firebase/functions';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Object.values(config).every(Boolean);
export const app = initializeApp(config);
export const auth = getAuth(app);
// Prefer the standard transport and let Firestore fall back to long polling
// only on networks where WebChannel streaming is unavailable.
export const db = initializeFirestore(app, {experimentalAutoDetectLongPolling: true});
export const storage = getStorage(app);
export const functions = getFunctions(app);
