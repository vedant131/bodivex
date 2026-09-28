import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserRole, ClientProfile } from '../types/user';
import { TrainerProfile } from '../types/trainer';

interface AuthState {
  user: User | null;
  clientProfile: ClientProfile | null;
  trainerProfile: TrainerProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOnboardingComplete: boolean;
  phoneNumber: string;

  // Actions
  setUser: (user: User | null) => void;
  setClientProfile: (profile: ClientProfile | null) => void;
  setTrainerProfile: (profile: TrainerProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setPhoneNumber: (phone: string) => void;
  setOnboardingComplete: (complete: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      clientProfile: null,
      trainerProfile: null,
      isLoading: true,
      isAuthenticated: false,
      isOnboardingComplete: false,
      phoneNumber: '',

      setUser: (user) =>
        set({ user, isAuthenticated: !!user, isLoading: false }),

      setClientProfile: (clientProfile) => set({ clientProfile }),

      setTrainerProfile: (trainerProfile) => set({ trainerProfile }),

      setLoading: (isLoading) => set({ isLoading }),

      setPhoneNumber: (phoneNumber) => set({ phoneNumber }),

      setOnboardingComplete: (isOnboardingComplete) =>
        set({ isOnboardingComplete }),

      logout: () =>
        set({
          user: null,
          clientProfile: null,
          trainerProfile: null,
          isAuthenticated: false,
          isOnboardingComplete: false,
          phoneNumber: '',
        }),
    }),
    {
      name: 'bodivex-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        clientProfile: state.clientProfile,
        trainerProfile: state.trainerProfile,
        isAuthenticated: state.isAuthenticated,
        isOnboardingComplete: state.isOnboardingComplete,
      }),
    }
  )
);

// Derived selectors
export const useRole = () => useAuthStore((s) => s.user?.role as UserRole | undefined);
export const useIsClient = () => useAuthStore((s) => s.user?.role === 'client');
export const useIsTrainer = () => useAuthStore((s) => s.user?.role === 'trainer');
