import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';

/**
 * The only file that knows which backend we use. Screens never import this;
 * they call services/*.ts, which use the helpers below. Moving to another
 * provider (e.g. AWS) = reimplement these helpers + the services' queries.
 *
 * Config: EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY (.env). Unset = the local
 * stack from `npm run db:start`, reached on the same host Metro is served from.
 */
const metroHost = Constants.expoConfig?.hostUri?.split(':')[0];
const localHost = metroHost ?? (Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1');

export const IS_LOCAL_BACKEND = !process.env.EXPO_PUBLIC_SUPABASE_URL;
const url = process.env.EXPO_PUBLIC_SUPABASE_URL || `http://${localHost}:54321`;
// Public demo key every local Supabase stack uses (not a secret).
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

export const sb = createClient(url, key, {
  auth: {
    ...(Platform.OS !== 'web' && { storage: AsyncStorage }),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (s) => (s === 'active' ? sb.auth.startAutoRefresh() : sb.auth.stopAutoRefresh()));
}

// ─── Row mapping: DB is snake_case, app types are camelCase (top-level keys only) ──
const ALIASES: Record<string, string> = { isKYCApproved: 'is_kyc_approved' };
const REVERSE = Object.fromEntries(Object.entries(ALIASES).map(([k, v]) => [v, k]));
const snake = (k: string) => ALIASES[k] ?? k.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
const camel = (k: string) => REVERSE[k] ?? k.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

/** App object → row. `undefined` is skipped, or written as NULL with clearUndefined (to remove a field). */
export const toRow = (o: Record<string, any>, clearUndefined = false) =>
  Object.fromEntries(
    Object.entries(o)
      .filter(([, v]) => v !== undefined || clearUndefined)
      .map(([k, v]) => [snake(k), v === undefined ? null : v instanceof Date ? v.toISOString() : v])
  );

// Seeded files carry 127.0.0.1 URLs; point them at the host this device actually reaches (no-op when hosted).
const LOCAL_PREFIX = 'http://127.0.0.1:54321';
const fixUrl = (v: any) => (typeof v === 'string' && v.startsWith(LOCAL_PREFIX) ? url + v.slice(LOCAL_PREFIX.length) : v);

/** Row → app object. NULL becomes a missing key; *_at / scheduled_for become Dates. */
export const fromRow = <T>(r: Record<string, any>): T =>
  Object.fromEntries(
    Object.entries(r)
      .filter(([, v]) => v !== null)
      .map(([k, v]) => [camel(k), k.endsWith('_at') || k === 'scheduled_for' ? new Date(v) : fixUrl(v)])
  ) as T;

/** Unwraps a query result, throwing a readable Error. (maybeSingle() can still yield null at runtime.) */
export const must = <T>({ data, error }: { data: T; error: { message: string } | null }): NonNullable<T> => {
  if (error) throw new Error(error.message);
  return data as NonNullable<T>;
};

export const myId = async () => (await sb.auth.getSession()).data.session?.user.id;

/**
 * Live query: runs `load` now and again whenever a watched table changes
 * (row-level security still decides which changes reach this user). Returns unsubscribe.
 */
export const live = (tables: { table: string; filter?: string }[], load: () => Promise<void>): (() => void) => {
  let run = 0;
  const reload = () => {
    const mine = ++run;
    load().catch((e) => mine === run && console.warn('live query failed', e.message));
  };
  const ch = sb.channel(`live-${Math.random().toString(36).slice(2)}`);
  for (const t of tables) {
    ch.on('postgres_changes' as any, { event: '*', schema: 'public', table: t.table, filter: t.filter }, reload);
  }
  ch.subscribe();
  reload();
  return () => { run = -1; sb.removeChannel(ch); };
};

// ─── Files ──────────────────────────────────────────────────────────────────
const BUCKET = 'media';

/** Uploads a local file (file:// or blob: URI) and returns its public URL. Already-uploaded URLs pass through. */
export const uploadFile = async (localUri: string, path: string, fallbackType: string): Promise<string> => {
  if (/^https?:\/\//.test(localUri)) return localUri;
  const res = await fetch(localUri);
  const type = res.headers.get('content-type') || fallbackType;
  const body = await res.arrayBuffer();
  must(await sb.storage.from(BUCKET).upload(path, body, { contentType: type, upsert: true }));
  // Cache-bust so a replaced photo/video shows the new version
  return `${sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
};

// ─── Server functions (edge functions) ───────────────────────────────────────
export const callFunction = async <T>(name: string, body: object, timeoutMs = 8000): Promise<T> => {
  const { data, error } = await sb.functions.invoke(name, { body, signal: AbortSignal.timeout(timeoutMs) } as any);
  if (error) throw new Error(error.message);
  return data as T;
};
