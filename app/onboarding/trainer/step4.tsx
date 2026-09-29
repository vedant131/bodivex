import React from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '../../../stores/authStore';
import { OnboardingShell } from '../../../components/ui/OnboardingShell';
import { IntroVideoPicker } from '../../../components/trainer/IntroVideo';

/** Compulsory 30–60s intro clip. Uploaded with the rest of the profile on submit (step 5). */
export default function TrainerStep4() {
  const { trainerProfile, setTrainerProfile } = useAuthStore();
  const uri = trainerProfile?.videoIntroUrl;

  return (
    <OnboardingShell preset="trainer" step={4} total={5} title="Your intro video" subtitle="Coaches with a video get picked first. Keep it real, no contact details."
      cta="Next" onNext={() => router.push('/onboarding/trainer/step5')} canNext={!!uri}>
      <IntroVideoPicker uri={uri} onChange={(v) => setTrainerProfile({ ...trainerProfile!, videoIntroUrl: v })} />
    </OnboardingShell>
  );
}
