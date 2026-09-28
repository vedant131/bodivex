import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  connectAuthEmulator,
  Auth,
  // @ts-ignore — exported by the React Native build of firebase/auth only
  getReactNativePersistence,
} from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, serverTimestamp, Timestamp } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { CONFIG } from '../constants/config';

// Local development runs against the Firebase Emulator Suite (`npm run emulators`).
// A `demo-` project id can never reach a real Firebase project.
export const USE_EMULATORS = __DEV__;

const isFirstInit = getApps().length === 0;
const app = isFirstInit ? initializeApp(CONFIG.firebase) : getApp();

let authInstance: Auth;
if (isFirstInit && Platform.OS !== 'web') {
  authInstance = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
} else {
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const db = getFirestore(app);
export const storage = getStorage(app);

if (USE_EMULATORS && isFirstInit) {
  // Phone on Wi-Fi reaches the PC via the same host Metro is served from.
  const metroHost = Constants.expoConfig?.hostUri?.split(':')[0];
  const host = metroHost ?? (Platform.OS === 'android' ? '10.0.2.2' : 'localhost');
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, 8080);
  connectStorageEmulator(storage, host, 9199);
}

export { serverTimestamp, Timestamp };

// Firestore collection paths
export const COLLECTIONS = {
  USERS: 'users',
  CLIENTS: 'clients',
  TRAINERS: 'trainers',
  SESSIONS: 'sessions',
  CHATS: 'chats',
  MESSAGES: 'messages',
  TRANSFORMATIONS: 'transformations',
  REVIEWS: 'reviews',
  SCHEDULED_CHECKINS: 'scheduledCheckIns',
  QA: 'qa',
} as const;

export default app;
