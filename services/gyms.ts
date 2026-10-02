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

/** Approved trainers who train at this gym. Note: first 50; page it if a gym ever has more. */
export const getTrainersAtGym = (gym: Gym): Promise<TrainerProfile[]> => getTrainers({ city: gym.city, gymId: gym.id }, 0, 50);

/** gymId -> number of approved trainers there, counted in the database. */
export const getTrainerCountsByGym = async (city: string): Promise<Record<string, number>> =>
  Object.fromEntries(must(await sb.rpc('trainer_counts_by_gym', { p_city: city })).map((r: any) => [r.gym_id, r.coaches]));

/** Does this trainer train at the client's gym? */
export const trainsAtGym = (t: Pick<TrainerProfile, 'gymIds'>, gymId?: string) => !!gymId && !!t.gymIds?.includes(gymId);
