import { initializeApp, getApps, getApp } from 'firebase/app';
// @ts-ignore
import { initializeAuth, getAuth } from 'firebase/auth';
import { getFirestore, serverTimestamp, Timestamp } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { CONFIG } from '../constants/config';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(CONFIG.firebase) : getApp();

// Initialize Auth safely for React Native
let authInstance: any;
try {
  authInstance = getAuth(app);
} catch (e) {
  authInstance = null;
}

export const auth = authInstance;
export const db = getFirestore(app);
export const storage = getStorage(app);

export { serverTimestamp, Timestamp };

// Firestore collection paths
export const COLLECTIONS = {
  USERS: 'users',
  CLIENTS: 'clients',
  TRAINERS: 'trainers',
  SESSIONS: 'sessions',
  CHATS: 'chats',
  MESSAGES: 'messages',
  WORKOUT_LOGS: 'workoutLogs',
  DIET_LOGS: 'dietLogs',
  TRANSFORMATIONS: 'transformations',
  REVIEWS: 'reviews',
  FINANCE: 'finance',
  WITHDRAWALS: 'withdrawals',
  RATE_HISTORY: 'rateHistory',
  DISPUTES: 'disputes',
  SCHEDULED_CHECKINS: 'scheduledCheckIns',
  NOTIFICATIONS: 'notifications',
  QA: 'qa',
} as const;

export default app;
