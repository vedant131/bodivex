import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, COLLECTIONS, USE_EMULATORS } from './firebase';
import { User, UserRole, ClientProfile } from '../types/user';
import { TrainerProfile } from '../types/trainer';

const toDate = (v: any) => v?.toDate?.() ?? (v ? new Date(v) : new Date());

// ─── Sign in ──────────────────────────────────────────────────────────────────

/**
 * Dev-only sign-in: the Auth emulator stands in for SMS OTP, keyed by phone
 * number, so the same phone always maps to the same account.
 * Note: real SMS OTP needs @react-native-firebase/auth + a dev build; add before launch.
 */
export const signInWithPhone = async (phone: string): Promise<FirebaseUser> => {
  if (!USE_EMULATORS) {
    throw new Error('Phone OTP is not configured for release builds yet.');
  }
  const email = `${phone.replace(/\D/g, '')}@phone.bodivex.dev`;
  const password = 'emulator-only-password';
  try {
    return (await signInWithEmailAndPassword(auth, email, password)).user;
  } catch (e: any) {
    if (e.code !== 'auth/user-not-found' && e.code !== 'auth/invalid-credential') throw e;
    return (await createUserWithEmailAndPassword(auth, email, password)).user;
  }
};

export const logout = async (): Promise<void> => {
  await signOut(auth);
};

export const subscribeToAuthState = (callback: (user: FirebaseUser | null) => void) =>
  onAuthStateChanged(auth, callback);

// ─── User doc ─────────────────────────────────────────────────────────────────

export const createUserProfile = async (
  uid: string,
  data: { phone: string; role: UserRole }
): Promise<User> => {
  const user: Omit<User, 'id'> = {
    phone: data.phone,
    name: '',
    role: data.role,
    kycStatus: 'not_started',
    aadhaarVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await setDoc(doc(db, COLLECTIONS.USERS, uid), {
    ...user,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: uid, ...user };
};

export const getUserProfile = async (uid: string): Promise<User | null> => {
  const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return { id: snap.id, ...data, createdAt: toDate(data.createdAt), updatedAt: toDate(data.updatedAt) } as User;
};

export const updateUserProfile = async (uid: string, data: Partial<User>): Promise<void> => {
  await updateDoc(doc(db, COLLECTIONS.USERS, uid), { ...data, updatedAt: serverTimestamp() });
};

// ─── Role profiles (doc id = uid) ─────────────────────────────────────────────

export const getClientProfile = async (uid: string): Promise<ClientProfile | null> => {
  const snap = await getDoc(doc(db, COLLECTIONS.CLIENTS, uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return { ...data, userId: uid, createdAt: toDate(data.createdAt), updatedAt: toDate(data.updatedAt) } as ClientProfile;
};

export const saveClientProfile = async (
  uid: string,
  profile: Partial<ClientProfile>,
  { isNew = false }: { isNew?: boolean } = {}
): Promise<void> => {
  const { createdAt, updatedAt, ...rest } = profile;
  const clean = JSON.parse(JSON.stringify(rest)); // drops undefined, Dates → ISO strings
  await setDoc(
    doc(db, COLLECTIONS.CLIENTS, uid),
    { ...clean, userId: uid, ...(isNew && { createdAt: serverTimestamp() }), updatedAt: serverTimestamp() },
    { merge: true }
  );
};

export const getOwnTrainerProfile = async (uid: string): Promise<TrainerProfile | null> => {
  const snap = await getDoc(doc(db, COLLECTIONS.TRAINERS, uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return { id: uid, ...data, createdAt: toDate(data.createdAt), updatedAt: toDate(data.updatedAt) } as TrainerProfile;
};

/** Loads everything the app needs after sign-in. */
export const loadSession = async (uid: string) => {
  const user = await getUserProfile(uid);
  if (!user) return { user: null, clientProfile: null, trainerProfile: null };
  const [clientProfile, trainerProfile] = await Promise.all([
    user.role === 'client' ? getClientProfile(uid) : null,
    user.role === 'trainer' ? getOwnTrainerProfile(uid) : null,
  ]);
  return { user, clientProfile, trainerProfile };
};
