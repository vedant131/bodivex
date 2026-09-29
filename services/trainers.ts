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

export const getTrainers = async (filter?: TrainerFilter): Promise<TrainerProfile[]> => {
  let q = sb.from('trainers').select().eq('is_kyc_approved', true);
  if (filter?.sessionPreference && filter.sessionPreference !== 'both') {
    q = q.in('session_preference', [filter.sessionPreference, 'both']);
  }
  if (filter?.isAvailableNow) q = q.eq('is_available_now', true);
  if (filter?.city) q = q.eq('city', filter.city);

  let trainers = must(await q).map(toTrainerProfile);

  // Note: client-side filtering is fine for a few hundred trainers per city;
  // move these into the query (or a search index) when search gets slow.
  if (filter?.minRating) {
    trainers = trainers.filter((t) => t.rating >= filter.minRating!);
  }
  if (filter?.maxPrice) {
    trainers = trainers.filter(
      (t) => (t.pricingOnline ?? Infinity) <= filter.maxPrice! || (t.pricingOffline ?? Infinity) <= filter.maxPrice!
    );
  }
  if (filter?.specializations?.length) {
    trainers = trainers.filter((t) => filter.specializations!.some((s) => t.specializations.includes(s)));
  }
  if (filter?.gymName) {
    const g = filter.gymName.toLowerCase();
    trainers = trainers.filter((t) => t.gymLocation?.name.toLowerCase().includes(g));
  }
  if (filter?.gymId) {
    trainers = trainers.filter((t) => t.gymIds?.includes(filter.gymId!));
  }
  if (filter?.inPersonPlace) {
    trainers = trainers.filter((t) => placesOf(t).includes(filter.inPersonPlace!));
  }
  if (filter?.athleteLevel) {
    trainers = trainers.filter((t) => (t.coachesLevels ?? ['enthusiast']).includes(filter.athleteLevel!));
  }
  if (filter?.language) {
    trainers = trainers.filter((t) => t.languages?.includes(filter.language!));
  }

  return trainers.sort((a, b) => b.rating - a.rating);
};

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

export const updateTrainerRates = async (
  trainerId: string,
  rates: Pick<TrainerProfile, 'pricingOnline' | 'pricingOffline' | 'pricingMonthly'>
): Promise<void> => updateTrainerProfile(trainerId, rates);

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
  const row = must(await sb.from('trainer_private').select('instagram, youtube').eq('trainer_id', uid).maybeSingle());
  return row ? fromRow<TrainerSocial>(row) : {};
};

export const saveTrainerSocial = async (uid: string, social: TrainerSocial): Promise<void> => {
  must(await sb.from('trainer_private').upsert({ trainer_id: uid, instagram: social.instagram ?? null, youtube: social.youtube ?? null }));
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
export const calculateTrainerScore = (t: TrainerProfile): number =>
  Math.round((t.totalSessions || 0) * 8 + (t.rating || 0) * 60 + (t.totalReviews || 0) * 6);

export const rankTrainers = (
  trainers: TrainerProfile[],
  scope: RankingScope,
  city: string,
  mode: RankingMode
): RankedTrainer[] => {
  let list = trainers;
  if (scope === 'city' && city) {
    list = list.filter((t) => t.city === city);
  }
  if (mode === 'offline' || mode === 'online') {
    list = list.filter((t) => t.sessionPreference === mode || t.sessionPreference === 'both');
  } else if (mode === 'both') {
    list = list.filter((t) => t.sessionPreference === 'both');
  }

  return [...list]
    .sort((a, b) => calculateTrainerScore(b) - calculateTrainerScore(a))
    .map((trainer, i) => {
      const rank = i + 1;
      const badge: RankedTrainer['badge'] =
        rank === 1 ? 'Gold' : rank === 2 ? 'Silver' : rank === 3 ? 'Bronze' : rank <= 10 ? 'Top Coach' : 'Rising Star';
      return {
        rank,
        trainer,
        score: calculateTrainerScore(trainer),
        totalSessions: trainer.totalSessions || 0,
        rating: trainer.rating || 0,
        badge,
      };
    });
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
