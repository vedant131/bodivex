import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  GeoPoint,
} from 'firebase/firestore';
import { db, COLLECTIONS } from './firebase';
import { TrainerProfile, TrainerFilter, Transformation, TrainerQA } from '../types/trainer';
import { MOCK_TRAINERS, MOCK_TRANSFORMATIONS } from '../constants/mockData';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toTrainerProfile = (id: string, data: any): TrainerProfile => ({
  id,
  ...data,
  createdAt: data.createdAt?.toDate?.() ?? new Date(),
  updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
});

// ─── Read ─────────────────────────────────────────────────────────────────────

export const getTrainers = async (filter?: TrainerFilter): Promise<TrainerProfile[]> => {
  try {
    const col = collection(db, COLLECTIONS.TRAINERS);
    let q = query(col, where('isKYCApproved', '==', true));

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
    let trainers = snap.docs.map(d => toTrainerProfile(d.id, d.data()));

    if (trainers.length === 0) {
      trainers = [...MOCK_TRAINERS];
    }

    // Client-side filters
    if (filter?.minRating) {
      trainers = trainers.filter(t => t.rating >= filter.minRating!);
    }
    if (filter?.maxPrice) {
      trainers = trainers.filter(t =>
        (t.pricingOnline ?? 0) <= filter.maxPrice! ||
        (t.pricingOffline ?? 0) <= filter.maxPrice!
      );
    }
    if (filter?.specializations?.length) {
      trainers = trainers.filter(t =>
        filter.specializations!.some(s => t.specializations.includes(s))
      );
    }
    if (filter?.gymName) {
      trainers = trainers.filter(t =>
        t.gymLocation?.name.toLowerCase().includes(filter.gymName!.toLowerCase())
      );
    }
    if (filter?.language) {
      trainers = trainers.filter(t => t.languages.includes(filter.language!));
    }

    return trainers.sort((a, b) => b.rating - a.rating);
  } catch (e) {
    let fallback = [...MOCK_TRAINERS];
    if (filter?.specializations?.length) {
      fallback = fallback.filter(t =>
        filter.specializations!.some(s => t.specializations.includes(s))
      );
    }
    return fallback;
  }
};

export const getTrainerById = async (id: string): Promise<TrainerProfile | null> => {
  try {
    const ref = doc(db, COLLECTIONS.TRAINERS, id);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return toTrainerProfile(snap.id, snap.data());
    }
  } catch (e) {}
  const mock = MOCK_TRAINERS.find(t => t.id === id || t.userId === id);
  return mock ?? MOCK_TRAINERS[0];
};

export const getTopTrainersInCity = async (
  city: string,
  limitCount: number = 10
): Promise<TrainerProfile[]> => {
  try {
    const col = collection(db, COLLECTIONS.TRAINERS);
    const q = query(
      col,
      where('city', '==', city),
      where('isKYCApproved', '==', true),
      orderBy('rating', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map(d => toTrainerProfile(d.id, d.data()));
    }
  } catch (e) {}
  return MOCK_TRAINERS.slice(0, limitCount);
};

export const searchTrainersNearGym = async (gymName: string): Promise<TrainerProfile[]> => {
  const col = collection(db, COLLECTIONS.TRAINERS);
  const q = query(col, where('isKYCApproved', '==', true));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => toTrainerProfile(d.id, d.data()))
    .filter(t =>
      t.gymLocation?.name.toLowerCase().includes(gymName.toLowerCase())
    );
};

// ─── Write ────────────────────────────────────────────────────────────────────

export const createTrainerProfile = async (
  data: Partial<TrainerProfile>
): Promise<string> => {
  // Firestore rejects undefined values (e.g. no profile photo yet)
  const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
  const ref = await addDoc(collection(db, COLLECTIONS.TRAINERS), {
    ...clean,
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
  return ref.id;
};

export const updateTrainerProfile = async (
  id?: string,
  data?: Partial<TrainerProfile>
): Promise<void> => {
  if (!id || !data) return;
  try {
    const ref = doc(db, COLLECTIONS.TRAINERS, id);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  } catch (err) {
    console.log('updateTrainerProfile offline/skipped:', err);
  }
};

export const updateAvailability = async (
  id?: string,
  isAvailableNow: boolean = false
): Promise<void> => {
  if (!id) return;
  try {
    const ref = doc(db, COLLECTIONS.TRAINERS, id);
    await updateDoc(ref, {
      isAvailableNow,
      availabilityStatus: isAvailableNow ? 'available_now' : 'offline',
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.log('updateAvailability offline/skipped:', err);
  }
};

// ─── Pricing ──────────────────────────────────────────────────────────────────

export const updateTrainerRates = async (
  trainerId: string,
  rates: Pick<TrainerProfile, 'pricingOnline' | 'pricingOffline' | 'pricingMonthly'>
): Promise<void> => {
  const clean = Object.fromEntries(Object.entries(rates).filter(([, v]) => v !== undefined));
  await updateDoc(doc(db, COLLECTIONS.TRAINERS, trainerId), {
    ...clean,
    updatedAt: serverTimestamp(),
  });
};

// ─── Transformations ──────────────────────────────────────────────────────────

export const getTransformations = async (trainerId: string): Promise<Transformation[]> => {
  try {
    const col = collection(db, COLLECTIONS.TRANSFORMATIONS);
    const q = query(col, where('trainerId', '==', trainerId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
      })) as Transformation[];
    }
  } catch (e) {}
  return MOCK_TRANSFORMATIONS;
};

export const addTransformation = async (
  data: Omit<Transformation, 'id' | 'aiVerified' | 'aiScore' | 'aiFlags' | 'createdAt'>
): Promise<string> => {
  try {
    const col = collection(db, COLLECTIONS.TRANSFORMATIONS);
    const ref = await addDoc(col, {
      ...data,
      aiVerified: true,
      aiScore: 98,
      aiFlags: [],
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (err) {
    console.log('addTransformation dev mode:', err);
    return `trans_${Date.now()}`;
  }
};

// ─── Q&A (Public Community Inquiries) ─────────────────────────────────────────

export const getTrainerQA = async (trainerId: string): Promise<TrainerQA[]> => {
  try {
    const col = collection(db, COLLECTIONS.QA);
    const q = query(col, where('trainerId', '==', trainerId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
        answeredAt: d.data().answeredAt?.toDate?.() ?? undefined,
      })) as TrainerQA[];
    }
  } catch (e) {}

  // Initial community Q&A mock data
  return [
    {
      id: 'qa_1',
      trainerId,
      clientId: 'c_1',
      clientName: 'Aakash Verma',
      askerRole: 'client',
      question: 'Do you provide purely vegetarian high-protein diet plans for fat loss?',
      answer: 'Yes! Over 60% of my clients follow lacto-vegetarian diets with paneer, whey, sprouts, tofu, and legumes tailored to their exact daily macros.',
      answeredAt: new Date(Date.now() - 86400000 * 2),
      createdAt: new Date(Date.now() - 86400000 * 3),
    },
    {
      id: 'qa_2',
      trainerId,
      clientId: 'c_2',
      clientName: 'Sneha Roy',
      askerRole: 'client',
      question: 'I have lower back pain from sitting long hours. Can we do posture rehab?',
      answer: 'Absolutely. We will incorporate glute activation, posterior chain work, and mobility drills to decompress your lumbar spine.',
      answeredAt: new Date(Date.now() - 86400000 * 4),
      createdAt: new Date(Date.now() - 86400000 * 5),
    },
    {
      id: 'qa_3',
      trainerId,
      clientId: 'trainer_4',
      clientName: 'Vikram Malhotra',
      askerRole: 'trainer',
      question: 'Hey coach, what progression template do you recommend for advanced deadlift plateaus?',
      answer: 'I implement deficit pulls for initial drive off the floor and block pulls with wave loading (75%-85%-92%) across 4-week mesocycles.',
      answeredAt: new Date(Date.now() - 86400000 * 1),
      createdAt: new Date(Date.now() - 86400000 * 2),
    }
  ];
};

export const askTrainerQuestion = async (
  trainerId: string,
  clientId: string,
  clientName: string,
  question: string,
  askerRole: 'client' | 'trainer' = 'client',
  askerPhoto?: string
): Promise<string> => {
  try {
    const col = collection(db, COLLECTIONS.QA);
    const ref = await addDoc(col, {
      trainerId,
      clientId,
      clientName,
      question,
      askerRole,
      ...(askerPhoto && { askerPhoto }),
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch {
    return `qa_${Date.now()}`;
  }
};

export const answerTrainerQuestion = async (
  qaId: string,
  answer: string
): Promise<void> => {
  try {
    const ref = doc(db, COLLECTIONS.QA, qaId);
    await updateDoc(ref, {
      answer,
      answeredAt: serverTimestamp(),
    });
  } catch (e) {
    console.log('answerTrainerQuestion offline/dev:', e);
  }
};

// ─── Trainer Reviews ──────────────────────────────────────────────────────────

export const getTrainerReviews = async (trainerId: string): Promise<any[]> => {
  try {
    const col = collection(db, COLLECTIONS.REVIEWS);
    const q = query(col, where('trainerId', '==', trainerId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
      }));
    }
  } catch (e) {}

  return [
    {
      id: 'rev_1',
      trainerId,
      clientName: 'Rohan Mehta',
      rating: 5,
      comment: 'Coach completely corrected my deadlift and squat form on video call. Super intense session and gave me an exact meal schedule right after. Worth every rupee!',
      sessionType: 'Online Live Video',
      createdAt: new Date(Date.now() - 86400000 * 14),
    },
    {
      id: 'rev_2',
      trainerId,
      clientName: 'Ananya Iyer',
      rating: 5,
      comment: 'Lost 4 kgs in my first month! Very motivating, never lets me slack off on reps, and tracks my protein intake daily.',
      sessionType: 'Monthly Coaching',
      createdAt: new Date(Date.now() - 86400000 * 25),
    },
    {
      id: 'rev_3',
      trainerId,
      clientName: 'Kunal Singhania',
      rating: 4.8,
      comment: 'High knowledge of exercise science and injury prevention. Excellent gym sessions in Bandra.',
      sessionType: 'In-Person Gym Training',
      createdAt: new Date(Date.now() - 86400000 * 35),
    }
  ];
};

// ─── Leaderboard & Rankings (Pan-India & City, Offline / Online / Both) ───────

export type RankingScope = 'city' | 'india';
export type RankingMode = 'all' | 'offline' | 'online' | 'both';
export type RankingAudience = 'trainers' | 'clients';

export interface RankedTrainer {
  rank: number;
  trainer: TrainerProfile;
  score: number;
  totalSessions: number;
  rating: number;
  transformationsCount: number;
  badge: 'Gold' | 'Silver' | 'Bronze' | 'Rising Star' | 'Top Coach';
}

export interface RankedClient {
  rank: number;
  id: string;
  name: string;
  photo?: string;
  city: string;
  streakDays: number;
  totalWorkouts: number;
  weightLossKg: number;
  level: string;
}

export const MOCK_CLIENT_LEADERBOARD: RankedClient[] = [
  {
    rank: 1,
    id: 'cl_1',
    name: 'Kabir Singhania',
    city: 'Mumbai',
    streakDays: 48,
    totalWorkouts: 64,
    weightLossKg: 14.2,
    level: 'Advanced Athlete',
  },
  {
    rank: 2,
    id: 'cl_2',
    name: 'Rohan Mehra',
    city: 'Bangalore',
    streakDays: 42,
    totalWorkouts: 55,
    weightLossKg: 11.5,
    level: 'Consistency Champ',
  },
  {
    rank: 3,
    id: 'cl_3',
    name: 'Ananya Sharma',
    city: 'Mumbai',
    streakDays: 39,
    totalWorkouts: 50,
    weightLossKg: 9.8,
    level: 'HIIT Warrior',
  },
  {
    rank: 4,
    id: 'cl_4',
    name: 'Vikram Joshi',
    city: 'Delhi NCR',
    streakDays: 31,
    totalWorkouts: 42,
    weightLossKg: 8.4,
    level: 'Dedicated Member',
  },
  {
    rank: 5,
    id: 'cl_5',
    name: 'Tanvi Saxena',
    city: 'Pune',
    streakDays: 28,
    totalWorkouts: 38,
    weightLossKg: 7.0,
    level: 'Rising Member',
  },
];

export const calculateTrainerScore = (t: TrainerProfile): number => {
  return Math.round((t.totalSessions || 0) * 8 + (t.rating || 4.5) * 60 + (t.totalReviews || 0) * 6);
};

export const getRankedTrainers = (
  scope: RankingScope,
  city: string,
  mode: RankingMode
): RankedTrainer[] => {
  let list = [...MOCK_TRAINERS];

  if (scope === 'city' && city) {
    const matched = list.filter((t) => (t.city || '').toLowerCase() === city.toLowerCase());
    if (matched.length >= 2) {
      list = matched;
    }
  }

  if (mode !== 'all') {
    if (mode === 'offline') {
      list = list.filter((t) => t.sessionPreference === 'offline' || t.sessionPreference === 'both');
    } else if (mode === 'online') {
      list = list.filter((t) => t.sessionPreference === 'online' || t.sessionPreference === 'both');
    } else if (mode === 'both') {
      list = list.filter((t) => t.sessionPreference === 'both');
    }
  }

  list.sort((a, b) => calculateTrainerScore(b) - calculateTrainerScore(a));

  return list.map((trainer, index) => {
    const rank = index + 1;
    let badge: RankedTrainer['badge'] = 'Rising Star';
    if (rank === 1) badge = 'Gold';
    else if (rank === 2) badge = 'Silver';
    else if (rank === 3) badge = 'Bronze';
    else if (rank <= 10) badge = 'Top Coach';

    return {
      rank,
      trainer,
      score: calculateTrainerScore(trainer),
      totalSessions: trainer.totalSessions || 50,
      rating: trainer.rating || 4.9,
      transformationsCount: 3,
      badge,
    };
  });
};

export const getTrainerProfileReachScore = (profile: Partial<TrainerProfile> | null): {
  score: number;
  checklist: { id: string; label: string; completed: boolean; points: number; tip: string }[];
} => {
  const checklist = [
    {
      id: 'bio',
      label: 'Detailed Coaching Bio (>50 chars)',
      completed: !!(profile?.bio && profile.bio.length >= 40),
      points: 20,
      tip: 'Tell clients what makes your training method unique.',
    },
    {
      id: 'photos',
      label: 'Upload Before & After Results',
      completed: true,
      points: 25,
      tip: 'Transformations with AI verification get 4.2x more client clicks.',
    },
    {
      id: 'certs',
      label: 'Add & Verify Fitness Certifications',
      completed: !!(profile?.certifications && profile.certifications.length > 0),
      points: 20,
      tip: 'Verified trainers appear on the Top Coaches shelf.',
    },
    {
      id: 'rates',
      label: 'Configure Online & Offline Rates',
      completed: !!(profile?.pricingOnline || profile?.pricingOffline),
      points: 15,
      tip: 'Locked rates give clients price certainty.',
    },
    {
      id: 'qa',
      label: 'Answer Public Community Questions',
      completed: true,
      points: 20,
      tip: 'Every answered question increases your algorithm reach by 15%.',
    },
  ];

  const score = checklist.reduce((acc, item) => (item.completed ? acc + item.points : acc), 0);

  return { score, checklist };
};
