import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  setDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  deleteField,
} from 'firebase/firestore';
import { db, COLLECTIONS } from './firebase';
import { InPersonPlace } from '../types/gym';
import { uploadImage } from './storage';
import { TrainerProfile, TrainerFilter, Transformation, TrainerQA, TrainerReview, TrainerSocial } from '../types/trainer';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toDate = (v: any) => v?.toDate?.() ?? (v ? new Date(v) : undefined);

const toTrainerProfile = (id: string, data: any): TrainerProfile => ({
  id,
  ...data,
  createdAt: toDate(data.createdAt) ?? new Date(),
  updatedAt: toDate(data.updatedAt) ?? new Date(),
});

const withoutUndefined = <T extends object>(obj: T) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

/** In-person places a trainer offers (legacy profiles with a gym = ['gym']). */
export const placesOf = (t: Partial<Pick<TrainerProfile, 'inPersonPlaces' | 'sessionPreference' | 'gymLocation' | 'gyms'>>): InPersonPlace[] =>
  t.sessionPreference === 'online' ? [] : t.inPersonPlaces ?? (t.gyms?.length || t.gymLocation ? ['gym'] : []);

// ─── Read ─────────────────────────────────────────────────────────────────────

export const getTrainers = async (filter?: TrainerFilter): Promise<TrainerProfile[]> => {
  let q = query(collection(db, COLLECTIONS.TRAINERS), where('isKYCApproved', '==', true));

  if (filter?.sessionPreference && filter.sessionPreference !== 'both') {
    q = query(q, where('sessionPreference', 'in', [filter.sessionPreference, 'both']));
  }
  if (filter?.isAvailableNow) {
    q = query(q, where('isAvailableNow', '==', true));
  }
  if (filter?.city) {
    q = query(q, where('city', '==', filter.city));
  }

  const snap = await getDocs(q);
  let trainers = snap.docs.map((d) => toTrainerProfile(d.id, d.data()));

  // Note: client-side filtering is fine for a few hundred trainers per city;
  // move to Algolia/Typesense when search gets slow.
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
  const snap = await getDoc(doc(db, COLLECTIONS.TRAINERS, id));
  return snap.exists() ? toTrainerProfile(snap.id, snap.data()) : null;
};

export const getTopTrainersInCity = async (city: string, limitCount = 10): Promise<TrainerProfile[]> => {
  const q = query(
    collection(db, COLLECTIONS.TRAINERS),
    where('isKYCApproved', '==', true),
    where('city', '==', city),
    orderBy('rating', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toTrainerProfile(d.id, d.data()));
};

export const subscribeToOwnTrainerProfile = (
  uid: string,
  callback: (profile: TrainerProfile | null) => void
) =>
  onSnapshot(doc(db, COLLECTIONS.TRAINERS, uid), (snap) =>
    callback(snap.exists() ? toTrainerProfile(snap.id, snap.data()) : null)
  );

// ─── Write ────────────────────────────────────────────────────────────────────

/** Trainer doc id = the trainer's auth uid. */
export const createTrainerProfile = async (uid: string, data: Partial<TrainerProfile>): Promise<void> => {
  await setDoc(doc(db, COLLECTIONS.TRAINERS, uid), {
    ...withoutUndefined(data),
    rating: 0,
    totalReviews: 0,
    totalSessions: 0,
    // Hidden from clients until approved by hand in the Firebase console
    isKYCApproved: false,
    kycStatus: 'pending',
    isAvailableNow: false,
    availabilityStatus: 'offline',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

/** Keys passed as `undefined` are removed from the document (e.g. switching to online-only clears the gym). */
export const updateTrainerProfile = async (id: string, data: Partial<TrainerProfile>): Promise<void> => {
  const changes = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v === undefined ? deleteField() : v]));
  await updateDoc(doc(db, COLLECTIONS.TRAINERS, id), { ...changes, updatedAt: serverTimestamp() });
};

export const updateAvailability = async (id: string, isAvailableNow: boolean): Promise<void> => {
  await updateDoc(doc(db, COLLECTIONS.TRAINERS, id), {
    isAvailableNow,
    availabilityStatus: isAvailableNow ? 'available_now' : 'offline',
    updatedAt: serverTimestamp(),
  });
};

export const updateTrainerRates = async (
  trainerId: string,
  rates: Pick<TrainerProfile, 'pricingOnline' | 'pricingOffline' | 'pricingMonthly'>
): Promise<void> => updateTrainerProfile(trainerId, rates);

// ─── New-client fee ledger (written by the acceptBooking function) ──────────

export interface Lead {
  clientId: string;
  clientName: string;
  fee: number;
  paymentRef: string | null;
  createdAt: Date;
}

export const getTrainerLeads = async (uid: string): Promise<Lead[]> => {
  const snap = await getDocs(query(collection(db, COLLECTIONS.TRAINERS, uid, 'leads'), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ ...(d.data() as Lead), createdAt: toDate(d.data().createdAt) ?? new Date() }));
};

// ─── Social handles (private until a booking is accepted) ────────────────────

export const getTrainerSocial = async (uid: string): Promise<TrainerSocial> => {
  const snap = await getDoc(doc(db, COLLECTIONS.TRAINERS, uid, 'private', 'social'));
  return (snap.data() as TrainerSocial) ?? {};
};

export const saveTrainerSocial = async (uid: string, social: TrainerSocial): Promise<void> => {
  await setDoc(doc(db, COLLECTIONS.TRAINERS, uid, 'private', 'social'), withoutUndefined(social));
};

// ─── Transformations ──────────────────────────────────────────────────────────

export const getTransformations = async (trainerId: string): Promise<Transformation[]> => {
  const q = query(
    collection(db, COLLECTIONS.TRANSFORMATIONS),
    where('trainerId', '==', trainerId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: toDate(d.data().createdAt) ?? new Date() })) as Transformation[];
};

export const addTransformation = async (
  data: Omit<Transformation, 'id' | 'aiVerified' | 'aiScore' | 'aiFlags' | 'createdAt'>
): Promise<string> => {
  const stamp = Date.now();
  const [beforePhotoUrl, afterPhotoUrl] = await Promise.all([
    uploadImage(data.beforePhotoUrl, `transformations/${data.trainerId}/${stamp}_before.jpg`),
    uploadImage(data.afterPhotoUrl, `transformations/${data.trainerId}/${stamp}_after.jpg`),
  ]);
  const ref = await addDoc(collection(db, COLLECTIONS.TRANSFORMATIONS), {
    ...withoutUndefined(data),
    beforePhotoUrl,
    afterPhotoUrl,
    aiVerified: false, // no AI check yet; never claim one
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

// ─── Q&A (public) ─────────────────────────────────────────────────────────────

export const getTrainerQA = async (trainerId: string): Promise<TrainerQA[]> => {
  const q = query(collection(db, COLLECTIONS.QA), where('trainerId', '==', trainerId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: toDate(d.data().createdAt) ?? new Date(),
    answeredAt: toDate(d.data().answeredAt),
  })) as TrainerQA[];
};

export const askTrainerQuestion = async (
  trainerId: string,
  clientId: string,
  clientName: string,
  question: string,
  askerRole: 'client' | 'trainer' = 'client',
  askerPhoto?: string
): Promise<string> => {
  const ref = await addDoc(collection(db, COLLECTIONS.QA), {
    trainerId,
    clientId,
    clientName,
    question,
    askerRole,
    ...(askerPhoto && { askerPhoto }),
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const answerTrainerQuestion = async (qaId: string, answer: string): Promise<void> => {
  await updateDoc(doc(db, COLLECTIONS.QA, qaId), { answer, answeredAt: serverTimestamp() });
};

// ─── Reviews ──────────────────────────────────────────────────────────────────

export const getTrainerReviews = async (trainerId: string): Promise<TrainerReview[]> => {
  const q = query(collection(db, COLLECTIONS.REVIEWS), where('trainerId', '==', trainerId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: toDate(d.data().createdAt) ?? new Date() })) as TrainerReview[];
};

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
      id: 'bio',
      label: 'Write a coaching bio',
      completed: (profile?.bio?.length ?? 0) >= 40,
      points: 20,
      tip: 'Tell clients what makes your training method unique.',
    },
    {
      id: 'photos',
      label: 'Upload a before & after result',
      completed: (counts.transformations ?? 0) > 0,
      points: 25,
      tip: 'Real results are the first thing clients look for.',
    },
    {
      id: 'certs',
      label: 'Add your certifications',
      completed: (profile?.certifications?.length ?? 0) > 0,
      points: 20,
      tip: 'Certified coaches get more bookings.',
    },
    {
      id: 'rates',
      label: 'Set your online / in-person rates',
      completed: !!(profile?.pricingOnline || profile?.pricingOffline),
      points: 15,
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
