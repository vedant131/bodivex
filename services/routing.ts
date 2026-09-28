import { Href } from 'expo-router';
import { User, ClientProfile } from '../types/user';
import { TrainerProfile } from '../types/trainer';

/** Where a signed-in (or signed-out) user belongs. Single source of truth for entry + login. */
export const homeRouteFor = (s: {
  user: User | null;
  clientProfile: ClientProfile | null;
  trainerProfile: TrainerProfile | null;
}): Href => {
  if (!s.user) return '/welcome';
  if (s.user.role === 'trainer') return s.trainerProfile ? '/(trainer)/dashboard' : '/onboarding/trainer/step1';
  return s.clientProfile ? '/(client)/home' : '/onboarding/client/step1';
};
