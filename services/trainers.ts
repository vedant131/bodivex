import { sb, toRow, fromRow, must, live } from './backend';
import { InPersonPlace } from '../types/gym';
import { uploadImage } from './storage';
import { TrainerProfile, TrainerFilter, Transformation, TrainerQA, TrainerReview, TrainerSocial } from '../types/trainer';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toTrainerProfile = (row: any) => fromRow<TrainerProfile>(row);

/** In-person places a trainer offers (legacy profiles with a gym = ['gym']). */
export const placesOf = (t: Partial<Pick<TrainerProfile, 'inPersonPlaces' | 'sessionPreference' | 'gymLocation' | 'gyms'>>): InPersonPlace[] =>
  t.sessionPreference === 'online' ? [] : t.inPersonPlaces ?? (t.gyms?.length || t.gymLocation ? ['gym'] : []);

// ─── Read ─────────────────────────────────────────────────────────────────────

export const PAGE_SIZE = 20;

/**
 * One page of approved coaches. All filtering, text search and sorting happen in the
 * database (search_trainers), so the phone only downloads what it shows.
 */
export const getTrainers = async (filter: TrainerFilter = {}, page = 0, pageSize = PAGE_SIZE): Promise<TrainerProfile[]> =>
  (must(await sb.rpc('search_trainers', {
    p_city: filter.city ?? null,
    p_q: filter.searchQuery?.trim() || null,
    p_specs: filter.specializations?.length ? filter.specializations : null,
    p_pref: filter.sessionPreference && filter.sessionPreference !== 'both' ? filter.sessionPreference : null,
    p_level: filter.athleteLevel ?? null,
    p_gym: filter.gymId ?? null,
    p_place: filter.inPersonPlace ?? null,
    p_prefer_gym: filter.preferGymId ?? null,
    p_online_anywhere: !!filter.onlineAnywhere,
    p_limit: pageSize,
    p_offset: page * pageSize,
  })) as any[]).map(toTrainerProfile);

export const getTrainerById = async (id: string): Promise<TrainerProfile | null> => {
  const row = must(await sb.from('trainers').select().eq('id', id).maybeSingle());
  return row ? toTrainerProfile(row) : null;
};

export const getTopTrainersInCity = async (city: string, limitCount = 10): Promise<TrainerProfile[]> =>
  must(await sb.from('trainers').select().eq('is_kyc_approved', true).eq('city', city)
    .order('rating', { ascending: false }).limit(limitCount)).map(toTrainerProfile);

export const subscribeToOwnTrainerProfile = (uid: string, callback: (profile: TrainerProfile | null) => void) =>
  live([{ table: 'trainers', filter: `id=eq.${uid}` }], async () => callback(await getTrainerById(uid)));

// ─── Write ────────────────────────────────────────────────────────────────────

/** Trainer id = the trainer's auth uid. Approval, stats and fee counters are DB defaults only admins change. */
export const createTrainerProfile = async (uid: string, data: Partial<TrainerProfile>): Promise<void> => {
  const { id, rating, totalReviews, totalSessions, isKYCApproved, kycStatus, leadCount, feesPaid,
    isAvailableNow, availabilityStatus, createdAt, updatedAt, ...rest } = data;
  must(await sb.from('trainers').insert({ ...toRow(rest), id: uid, user_id: uid }));
};

/** Keys passed as `undefined` are cleared (e.g. switching to online-only clears the gym). */
export const updateTrainerProfile = async (id: string, data: Partial<TrainerProfile>): Promise<void> => {
  must(await sb.from('trainers').update(toRow(data, true)).eq('id', id));
};

export const updateAvailability = async (id: string, isAvailableNow: boolean): Promise<void> =>
  updateTrainerProfile(id, { isAvailableNow, availabilityStatus: isAvailableNow ? 'available_now' : 'offline' });

// ─── New-client fee ledger (written by accept_booking) ──────────────────────

export interface Lead {
  clientId: string;
  clientName: string;
  fee: number;
  paymentRef: string | null;
  createdAt: Date;
}

export const getTrainerLeads = async (uid: string): Promise<Lead[]> =>
  must(await sb.from('leads').select().eq('trainer_id', uid).order('created_at', { ascending: false }))
    .map((r) => ({ ...fromRow<Lead>(r), paymentRef: r.payment_ref ?? null }));

// ─── Social handles (private until a booking is accepted) ────────────────────

export const getTrainerSocial = async (uid: string): Promise<TrainerSocial> => {
  const row = must(await sb.from('trainer_private').select('instagram, youtube, facebook, x').eq('trainer_id', uid).maybeSingle());
  return row ? fromRow<TrainerSocial>(row) : {};
};

export const saveTrainerSocial = async (uid: string, social: TrainerSocial): Promise<void> => {
  must(await sb.from('trainer_private').upsert({
    trainer_id: uid,
    instagram: social.instagram ?? null, youtube: social.youtube ?? null,
    facebook: social.facebook ?? null, x: social.x ?? null,
  }));
};

// ─── Transformations ──────────────────────────────────────────────────────────

export const getTransformations = async (trainerId: string): Promise<Transformation[]> =>
  must(await sb.from('transformations').select().eq('trainer_id', trainerId).order('created_at', { ascending: false }))
    .map((r) => fromRow<Transformation>(r));

export const addTransformation = async (
  data: Omit<Transformation, 'id' | 'aiVerified' | 'aiScore' | 'aiFlags' | 'createdAt'>
): Promise<string> => {
  const stamp = Date.now();
  const [beforePhotoUrl, afterPhotoUrl] = await Promise.all([
    uploadImage(data.beforePhotoUrl, `transformations/${data.trainerId}/${stamp}_before.jpg`),
    uploadImage(data.afterPhotoUrl, `transformations/${data.trainerId}/${stamp}_after.jpg`),
  ]);
  return must(await sb.from('transformations').insert(toRow({ ...data, beforePhotoUrl, afterPhotoUrl })).select('id').single()).id;
};

// ─── Q&A (public) ─────────────────────────────────────────────────────────────

export const getTrainerQA = async (trainerId: string): Promise<TrainerQA[]> =>
  must(await sb.from('qa').select().eq('trainer_id', trainerId).order('created_at', { ascending: false }))
    .map((r) => fromRow<TrainerQA>(r));

export const askTrainerQuestion = async (
  trainerId: string,
  clientId: string,
  clientName: string,
  question: string,
  askerRole: 'client' | 'trainer' = 'client',
  askerPhoto?: string
): Promise<string> =>
  must(await sb.from('qa').insert(toRow({ trainerId, clientId, clientName, question, askerRole, askerPhoto })).select('id').single()).id;

export const answerTrainerQuestion = async (qaId: string, answer: string): Promise<void> => {
  must(await sb.from('qa').update({ answer, answered_at: new Date().toISOString() }).eq('id', qaId));
};

// ─── Reviews ──────────────────────────────────────────────────────────────────

export const getTrainerReviews = async (trainerId: string): Promise<TrainerReview[]> =>
  must(await sb.from('reviews').select().eq('trainer_id', trainerId).order('created_at', { ascending: false }))
    .map((r) => fromRow<TrainerReview>(r));

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export type RankingScope = 'city' | 'india';
export type RankingMode = 'all' | 'offline' | 'online' | 'both';

export interface RankedTrainer {
  rank: number;
  trainer: TrainerProfile;
  score: number;
  totalSessions: number;
  rating: number;
  badge: 'Gold' | 'Silver' | 'Bronze' | 'Rising Star' | 'Top Coach';
}

// Only in-app sessions and reviews count, so taking clients off-platform lowers rank.
const badgeFor = (rank: number): RankedTrainer['badge'] =>
  rank === 1 ? 'Gold' : rank === 2 ? 'Silver' : rank === 3 ? 'Bronze' : rank <= 10 ? 'Top Coach' : 'Rising Star';

/**
 * Leaderboard ranked in the database (score = sessions·8 + rating·60 + reviews·6, see
 * trainer_score). Returns the top list and, for a coach, their own position.
 */
export const getRankings = async (scope: RankingScope, city: string, mode: RankingMode, limit = 100) => {
  const p_city = scope === 'city' ? city : null;
  const [rows, myRank] = await Promise.all([
    sb.rpc('trainer_rankings', { p_city, p_mode: mode, p_limit: limit }).then(must),
    sb.rpc('my_trainer_rank', { p_city, p_mode: mode }).then(must),
  ]);
  const ranked: RankedTrainer[] = (rows as any[]).map((r) => {
    const trainer = toTrainerProfile(r.trainer);
    return { rank: Number(r.rank), score: r.score, trainer, totalSessions: trainer.totalSessions || 0, rating: trainer.rating || 0, badge: badgeFor(Number(r.rank)) };
  });
  return { ranked, myRank: (myRank as number | null) ?? undefined };
};

// ─── Profile completeness (shown on the trainer dashboard) ────────────────────

export const getTrainerProfileReachScore = (
  profile: Partial<TrainerProfile> | null,
  counts: { transformations?: number; answeredQA?: number } = {}
): {
  score: number;
  checklist: { id: string; label: string; completed: boolean; points: number; tip: string }[];
} => {
  const checklist = [
    {
      id: 'video',
      label: 'Add your intro video',
      completed: !!profile?.videoIntroUrl,
      points: 20,
      tip: 'Required. A 30–60s clip plays at the top of your profile.',
    },
    {
      id: 'bio',
      label: 'Write a coaching bio',
      completed: (profile?.bio?.length ?? 0) >= 40,
      points: 15,
      tip: 'Tell clients what makes your training method unique.',
    },
    {
      id: 'photos',
      label: 'Upload a before & after result',
      completed: (counts.transformations ?? 0) > 0,
      points: 20,
      tip: 'Real results are the first thing clients look for.',
    },
    {
      id: 'certs',
      label: 'Add your certifications',
      completed: (profile?.certifications?.length ?? 0) > 0,
      points: 15,
      tip: 'Certified coaches get more bookings.',
    },
    {
      id: 'rates',
      label: 'Set your online / in-person rates',
      completed: !!(profile?.pricingOnline || profile?.pricingOffline),
      points: 10,
      tip: 'Clear prices make it easy to book.',
    },
    {
      id: 'qa',
      label: 'Answer a public question',
      completed: (counts.answeredQA ?? 0) > 0,
      points: 20,
      tip: 'Answers show clients how you coach.',
    },
  ];

  const score = checklist.reduce((acc, item) => (item.completed ? acc + item.points : acc), 0);
  return { score, checklist };
};
