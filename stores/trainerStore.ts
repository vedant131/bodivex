import { create } from 'zustand';
import { TrainerProfile, TrainerFilter } from '../types/trainer';
import { getTrainers, getTrainerById, getTopTrainersInCity } from '../services/trainers';

interface TrainerState {
  trainers: TrainerProfile[];
  topTrainers: TrainerProfile[];
  selectedTrainer: TrainerProfile | null;
  isLoading: boolean;
  error: string | null;
  lastFetchedCity: string | null;
  filter: TrainerFilter;

  // Actions
  fetchTrainers: (filter?: TrainerFilter) => Promise<void>;
  fetchTopTrainers: (city: string) => Promise<void>;
  fetchTrainerById: (id: string) => Promise<TrainerProfile | null>;
  setSelectedTrainer: (trainer: TrainerProfile | null) => void;
  setFilter: (filter: Partial<TrainerFilter>) => void;
  resetFilter: () => void;
  clearError: () => void;
}

const defaultFilter: TrainerFilter = {};

export const useTrainerStore = create<TrainerState>()((set, get) => ({
  trainers: [],
  topTrainers: [],
  selectedTrainer: null,
  isLoading: false,
  error: null,
  lastFetchedCity: null,
  filter: defaultFilter,

  fetchTrainers: async (filter) => {
    set({ isLoading: true, error: null });
    try {
      const activeFilter = filter ?? get().filter;
      const trainers = await getTrainers(activeFilter);
      set({ trainers, isLoading: false });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  fetchTopTrainers: async (city) => {
    if (get().lastFetchedCity === city && get().topTrainers.length > 0) return;
    set({ isLoading: true });
    try {
      const topTrainers = await getTopTrainersInCity(city);
      set({ topTrainers, lastFetchedCity: city, isLoading: false });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  fetchTrainerById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const trainer = await getTrainerById(id);
      set({ selectedTrainer: trainer, isLoading: false });
      return trainer;
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      return null;
    }
  },

  setSelectedTrainer: (trainer) => set({ selectedTrainer: trainer }),

  setFilter: (filter) =>
    set((state) => ({ filter: { ...state.filter, ...filter } })),

  resetFilter: () => set({ filter: defaultFilter }),

  clearError: () => set({ error: null }),
}));
