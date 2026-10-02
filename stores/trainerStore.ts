import { create } from 'zustand';
import { TrainerProfile, TrainerFilter } from '../types/trainer';
import { getTrainers, getTrainerById, getTopTrainersInCity, PAGE_SIZE } from '../services/trainers';

interface TrainerState {
  trainers: TrainerProfile[];
  topTrainers: TrainerProfile[];
  selectedTrainer: TrainerProfile | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  page: number;
  error: string | null;
  lastFetchedCity: string | null;
  filter: TrainerFilter;

  // Actions
  fetchTrainers: (filter?: TrainerFilter) => Promise<void>;
  fetchMore: () => Promise<void>;
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
  isLoadingMore: false,
  hasMore: false,
  page: 0,
  error: null,
  lastFetchedCity: null,
  filter: defaultFilter,

  // First page for a filter. A newer call wins if two overlap (fast typing in search).
  fetchTrainers: async (filter) => {
    const activeFilter = filter ?? get().filter;
    set({ isLoading: true, error: null, filter: activeFilter });
    try {
      const trainers = await getTrainers(activeFilter, 0);
      if (get().filter !== activeFilter) return;
      set({ trainers, page: 0, hasMore: trainers.length === PAGE_SIZE, isLoading: false });
    } catch (e: any) {
      if (get().filter === activeFilter) set({ error: e.message, isLoading: false });
    }
  },

  fetchMore: async () => {
    const { filter, page, hasMore, isLoading, isLoadingMore } = get();
    if (!hasMore || isLoading || isLoadingMore) return;
    set({ isLoadingMore: true });
    try {
      const more = await getTrainers(filter, page + 1);
      if (get().filter !== filter) return;
      set((st) => ({ trainers: [...st.trainers, ...more], page: page + 1, hasMore: more.length === PAGE_SIZE, isLoadingMore: false }));
    } catch (e: any) {
      set({ error: e.message, isLoadingMore: false });
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
