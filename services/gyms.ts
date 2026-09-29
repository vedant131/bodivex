import { sb, fromRow, must, myId } from './backend';
import { getTrainers } from './trainers';
import { Gym, GymRef } from '../types/gym';
import { TrainerProfile } from '../types/trainer';

export const toRef = (g: Gym | GymRef): GymRef => ({ id: g.id, name: g.name, area: g.area });

/** All gyms in a city, alphabetical. Note: fine for a few hundred per city; paginate/search later. */
export const getGymsInCity = async (city: string): Promise<Gym[]> =>
  must(await sb.from('gyms').select().eq('city', city).order('name')).map((r) => fromRow<Gym>(r));

export const getGym = async (id: string): Promise<Gym | null> => {
  const row = must(await sb.from('gyms').select().eq('id', id).maybeSingle());
  return row ? fromRow<Gym>(row) : null;
};

/** Anyone signed in can add a missing gym (name + area). The DB blocks contact info and spoofed authors. */
export const addGym = async (g: { name: string; area: string; city: string }): Promise<Gym> => {
  const row = must(await sb.from('gyms')
    .insert({ name: g.name.trim(), area: g.area.trim(), city: g.city, created_by: await myId() })
    .select().single());
  return fromRow<Gym>(row);
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
