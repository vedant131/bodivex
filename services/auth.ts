import {
  signInWithPhoneNumber,
  ConfirmationResult,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, COLLECTIONS } from './firebase';
import { User, UserRole, KYCStatus } from '../types/user';

// ─── Phone OTP ───────────────────────────────────────────────────────────────

export const sendOTP = async (phone: string): Promise<ConfirmationResult> => {
  // phone should be in format: +91XXXXXXXXXX
  const formatted = phone.startsWith('+') ? phone : `+91${phone}`;
  const confirmation = await signInWithPhoneNumber(auth, formatted, (window as any).recaptchaVerifier);
  return confirmation;
};

export const verifyOTP = async (
  confirmation: ConfirmationResult,
  otp: string
) => {
  const credential = await confirmation.confirm(otp);
  return credential;
};

// ─── User Profile ─────────────────────────────────────────────────────────────

export const createUserProfile = async (
  uid: string,
  data: {
    phone: string;
    role: UserRole;
    name?: string;
  }
): Promise<void> => {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    const newUser: Omit<User, 'id'> = {
      phone: data.phone,
      name: data.name ?? '',
      role: data.role,
      walletBalance: 0,
      kycStatus: 'not_started' as KYCStatus,
      aadhaarVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await setDoc(userRef, { ...newUser, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  } catch (e) {
    console.warn('createUserProfile fallback:', e);
  }
};

export const getUserProfile = async (uid: string): Promise<User | null> => {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: snap.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
      updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
    } as User;
  } catch (e) {
    return null;
  }
};

export const getUserRole = async (uid: string): Promise<UserRole | null> => {
  const user = await getUserProfile(uid);
  return user?.role ?? null;
};

export const updateUserProfile = async (
  uid: string,
  data: Partial<User>
): Promise<void> => {
  const userRef = doc(db, COLLECTIONS.USERS, uid);
  await updateDoc(userRef, { ...data, updatedAt: serverTimestamp() });
};

// ─── Auth State ───────────────────────────────────────────────────────────────

export const subscribeToAuthState = (
  callback: (user: FirebaseUser | null) => void
) => {
  return onAuthStateChanged(auth, callback);
};

export const logout = async (): Promise<void> => {
  await signOut(auth);
};
