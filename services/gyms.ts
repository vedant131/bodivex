import { collection, doc, getDoc, getDocs, addDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';
import { getTrainers } from './trainers';
import { Gym, GymRef } from '../types/gym';
import { TrainerProfile } from '../types/trainer';

const GYMS = 'gyms';

const toGym = (id: string, d: any): Gym => ({ id, ...d, createdAt: d.createdAt?.toDate?.() ?? new Date() });

export const toRef = (g: Gym | GymRef): GymRef => ({ id: g.id, name: g.name, area: g.area });

/** All gyms in a city, alphabetical. Note: fine for a few hundred per city; paginate/search index later. */
export const getGymsInCity = async (city: string): Promise<Gym[]> => {
  const snap = await getDocs(query(collection(db, GYMS), where('city', '==', city)));
  return snap.docs.map((d) => toGym(d.id, d.data())).sort((a, b) => a.name.localeCompare(b.name));
};

export const getGym = async (id: string): Promise<Gym | null> => {
  const snap = await getDoc(doc(db, GYMS, id));
  return snap.exists() ? toGym(snap.id, snap.data()) : null;
};

/** Anyone signed in can add a missing gym (name + area). Rules block contact info and spoofed authors. */
export const addGym = async (g: { name: string; area: string; city: string }): Promise<Gym> => {
  const data = { name: g.name.trim(), area: g.area.trim(), city: g.city, createdBy: auth.currentUser?.uid ?? '' };
  const ref = await addDoc(collection(db, GYMS), { ...data, createdAt: serverTimestamp() });
  return { id: ref.id, ...data, createdAt: new Date() };
};

/** Approved trainers who train at this gym. */
export const getTrainersAtGym = async (gym: Gym): Promise<TrainerProfile[]> =>
  (await getTrainers({ city: gym.city })).filter((t) => t.gymIds?.includes(gym.id));

/** gymId -> number of approved trainers there (one query per city, counted client-side). */
export const getTrainerCountsByGym = async (city: string): Promise<Record<string, number>> => {
  const counts: Record<string, number> = {};
  for (const t of await getTrainers({ city })) for (const id of t.gymIds ?? []) counts[id] = (counts[id] ?? 0) + 1;
  return counts;
};

/** Does this trainer train at the client's gym? */
export const trainsAtGym = (t: Pick<TrainerProfile, 'gymIds'>, gymId?: string) => !!gymId && !!t.gymIds?.includes(gymId);
