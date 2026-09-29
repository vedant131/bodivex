import { sb, toRow, fromRow, must, IS_LOCAL_BACKEND } from './backend';
import { User, UserRole, ClientProfile } from '../types/user';
import { TrainerProfile } from '../types/trainer';

export type AuthUser = { uid: string };

/** Test sign-in (no real SMS): always on locally, opt-in for a test deployment. */
export const DEV_LOGIN = IS_LOCAL_BACKEND || process.env.EXPO_PUBLIC_ALLOW_DEV_LOGIN === 'true';

// ─── Sign in ──────────────────────────────────────────────────────────────────

/**
 * Dev sign-in: stands in for SMS OTP, keyed by phone number, so the same phone
 * always maps to the same account.
 * Note: anyone who knows a number can sign in as it. Fine locally and for a
 * friends-only test deployment (EXPO_PUBLIC_ALLOW_DEV_LOGIN=true); real SMS OTP before launch.
 */
export const signInWithPhone = async (phone: string): Promise<AuthUser> => {
  if (!DEV_LOGIN) {
    throw new Error('Phone OTP is not configured for this build yet.');
  }
  const email = `${phone.replace(/\D/g, '')}@phone.bodivex.dev`;
  const password = 'dev-only-password';
  const signIn = await sb.auth.signInWithPassword({ email, password });
  if (signIn.data.user) return { uid: signIn.data.user.id };
  if (!/invalid login credentials/i.test(signIn.error?.message ?? '')) throw new Error(signIn.error?.message);
  const signUp = must(await sb.auth.signUp({ email, password }));
  if (!signUp.user) throw new Error('Could not create your account.');
  return { uid: signUp.user.id };
};

export const logout = async (): Promise<void> => {
  await sb.auth.signOut();
};

export const subscribeToAuthState = (callback: (user: AuthUser | null) => void) => {
  let last: string | undefined | null = null;
  const { data } = sb.auth.onAuthStateChange((_event, session) => {
    const uid = session?.user.id;
    if (uid === last) return; // token refreshes fire too; only report sign-in / sign-out
    last = uid;
    // Don't query inside the auth callback (supabase-js lock); defer a tick
    setTimeout(() => callback(uid ? { uid } : null), 0);
  });
  return () => data.subscription.unsubscribe();
};

// ─── User row ─────────────────────────────────────────────────────────────────

export const createUserProfile = async (uid: string, data: { phone: string; role: UserRole }): Promise<User> => {
  const row = must(await sb.from('users').insert({ id: uid, phone: data.phone, role: data.role }).select().single());
  return fromRow<User>(row);
};

export const getUserProfile = async (uid: string): Promise<User | null> => {
  const row = must(await sb.from('users').select().eq('id', uid).maybeSingle());
  return row ? fromRow<User>(row) : null;
};

export const updateUserProfile = async (uid: string, data: Partial<User>): Promise<void> => {
  must(await sb.from('users').update(toRow(data)).eq('id', uid));
};

// ─── Role profiles (id = uid) ─────────────────────────────────────────────────

export const getClientProfile = async (uid: string): Promise<ClientProfile | null> => {
  const row = must(await sb.from('clients').select().eq('user_id', uid).maybeSingle());
  return row ? fromRow<ClientProfile>(row) : null;
};

export const saveClientProfile = async (
  uid: string,
  profile: Partial<ClientProfile>,
  _opts: { isNew?: boolean } = {}
): Promise<void> => {
  const { createdAt, updatedAt, aadhaarVerified, ...rest } = profile;
  const clean = JSON.parse(JSON.stringify(rest)); // drops undefined, nested Dates → ISO strings
  must(await sb.from('clients').upsert({ ...toRow(clean), user_id: uid }));
};

export const getOwnTrainerProfile = async (uid: string): Promise<TrainerProfile | null> => {
  const row = must(await sb.from('trainers').select().eq('id', uid).maybeSingle());
  return row ? fromRow<TrainerProfile>(row) : null;
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
