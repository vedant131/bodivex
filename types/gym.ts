/** A real gym, shared by everyone (so trainer and client gyms match exactly, not by spelling). */
export interface Gym {
  id: string;
  name: string;
  area: string;      // locality, e.g. "Baner"
  city: string;
  createdBy: string;
  createdAt: Date;
}

/** Denormalised copy kept on trainer/client profiles for display without extra reads. */
export interface GymRef {
  id: string;
  name: string;
  area: string;
}

/** Where an in-person session can happen. Home/society and outdoor avoid gym entry fees. */
export type InPersonPlace = 'gym' | 'home' | 'outdoor';

export const PLACE_LABEL: Record<InPersonPlace, string> = {
  gym: 'At a gym',
  home: 'Your home / society gym',
  outdoor: 'Outdoors (park, ground)',
};

export const PLACE_ICON: Record<InPersonPlace, 'barbell' | 'home' | 'leaf'> = {
  gym: 'barbell',
  home: 'home',
  outdoor: 'leaf',
};
