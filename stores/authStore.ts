import { create } from 'zustand';
import { User, UserRole, ClientProfile } from '../types/user';
import { TrainerProfile } from '../types/trainer';

// Not persisted: Firebase Auth keeps the login, and the profile is reloaded
// from Firestore on start (see app/_layout.tsx), so the cache can't go stale.
interface AuthState {
  user: User | null;
  clientProfile: ClientProfile | null;
  trainerProfile: TrainerProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  setSession: (s: { user: User | null; clientProfile: ClientProfile | null; trainerProfile: TrainerProfile | null }) => void;
  setUser: (user: User | null) => void;
  setClientProfile: (profile: ClientProfile | null) => void;
  setTrainerProfile: (profile: TrainerProfile | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  clientProfile: null,
  trainerProfile: null,
  isLoading: true,
  isAuthenticated: false,

  setSession: ({ user, clientProfile, trainerProfile }) =>
    set({ user, clientProfile, trainerProfile, isAuthenticated: !!user, isLoading: false }),

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  setClientProfile: (clientProfile) => set({ clientProfile }),

  setTrainerProfile: (trainerProfile) => set({ trainerProfile }),

  setLoading: (isLoading) => set({ isLoading }),

  logout: () =>
    set({ user: null, clientProfile: null, trainerProfile: null, isAuthenticated: false }),
}));

// Derived selectors
export const useRole = () => useAuthStore((s) => s.user?.role as UserRole | undefined);
export const useIsClient = () => useAuthStore((s) => s.user?.role === 'client');
export const useIsTrainer = () => useAuthStore((s) => s.user?.role === 'trainer');
