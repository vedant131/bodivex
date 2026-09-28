import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AnimatedR, { FadeInDown } from 'react-native-reanimated';
import { OnboardingShell } from '../../../components/ui/OnboardingShell';
import { Glass } from '../../../components/ui/Glass';
import { Button } from '../../../components/ui/Button';
import { T, type } from '../../../constants/theme';
import { saveClientProfile, updateUserProfile } from '../../../services/auth';
import { uploadImage } from '../../../services/storage';
import { useAuthStore } from '../../../stores/authStore';
import { FitnessGoal, FitnessBlueprint, FitnessGoalLabel } from '../../../types/user';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../services/firebase';

const AnimatedView = AnimatedR.View;

// ─── Gemini AI Blueprint Generator ──────────────────────────────────────────

const generateBlueprintWithAI = async (
  age: number,
  gender: string,
  weight: number,
  height: number,
  fitnessLevel: string,
  goals: FitnessGoal[]
): Promise<FitnessBlueprint> => {
  try {
    const call = httpsCallable<object, { blueprint: Omit<FitnessBlueprint, 'goals' | 'generatedAt'> | null }>(
      functions,
      'generateBlueprint',
      { timeout: 8000 } // never keep the user waiting on AI; fall back to the built-in plan
    );
    const { data } = await call({ age, gender, weight, height, fitnessLevel, goals: goals.map((g) => FitnessGoalLabel[g]) });
    if (data.blueprint) return { goals, ...data.blueprint, generatedAt: new Date() };
  } catch (e) {
    console.warn('Blueprint function unavailable, using built-in blueprint', e);
  }
  return getFallbackBlueprint(goals, fitnessLevel);
};

const getFallbackBlueprint = (goals: FitnessGoal[], fitnessLevel: string): FitnessBlueprint => {
  const isWeightLoss = goals.includes(FitnessGoal.WEIGHT_LOSS);
  const isMuscle = goals.includes(FitnessGoal.MUSCLE_GAIN);

  return {
    goals,
    trainerType: isWeightLoss && isMuscle
      ? 'Body Recomposition Specialist (CPT with nutrition background)'
      : isWeightLoss
      ? 'Weight Loss Specialist (Certified Personal Trainer)'
      : isMuscle
      ? 'Strength & Hypertrophy Coach'
      : 'General Fitness Coach (CPT)',
    recommendedStyle: isWeightLoss
      ? 'Strength training 3x/week + cardio 2x/week + calorie deficit diet'
      : isMuscle
      ? 'Progressive overload weight training 4–5x/week + high protein diet'
      : 'Full-body workouts 3x/week for balanced fitness',
    estimatedTimeline: fitnessLevel === 'beginner'
      ? '8–12 weeks to see visible results with consistency'
      : '6–8 weeks to notice significant improvement',
    additionalNotes:
      'Start with 3 sessions per week and build up. Consistency beats intensity. Track your food and workouts — what gets measured gets improved.',
    recommendedFilters: {
      specializations: isWeightLoss ? ['Weight Loss', 'HIIT'] : isMuscle ? ['Muscle Gain', 'Strength Training'] : ['General Fitness'],
      sessionPreference: 'both',
      minExperience: fitnessLevel === 'beginner' ? 1 : 2,
    },
    generatedAt: new Date(),
  };
};

export default function BlueprintScreen() {
  const { clientProfile, user, setClientProfile, setUser } = useAuthStore();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [blueprint, setBlueprint] = useState<FitnessBlueprint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    generateBlueprint();
  }, []);

  const saveProfile = async (bp: FitnessBlueprint) => {
    if (!user || !clientProfile) return;
    setSaving(true);
    try {
      const profilePhoto = clientProfile.profilePhoto
        ? await uploadImage(clientProfile.profilePhoto, `users/${user.id}/profile.jpg`)
        : undefined;
      const profile = { ...clientProfile, profilePhoto, fitnessBlueprint: bp, userId: user.id };
      await saveClientProfile(user.id, profile, { isNew: true });
      await updateUserProfile(user.id, { name: clientProfile.name, ...(profilePhoto && { profilePhoto }) });
      setUser({ ...user, name: clientProfile.name, profilePhoto });
      setClientProfile(profile);
      setSaveError(null);
    } catch (e: any) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const generateBlueprint = async () => {
    setIsLoading(true);
    try {
      const bp = await generateBlueprintWithAI(
        clientProfile?.age ?? 25,
        clientProfile?.gender ?? 'male',
        clientProfile?.weight ?? 70,
        clientProfile?.height ?? 170,
        clientProfile?.fitnessLevel ?? 'beginner',
        clientProfile?.goals ?? [FitnessGoal.GENERAL_FITNESS]
      );
      setBlueprint(bp);
      // Save (incl. photo upload) in the background; the Find button waits on `saving`.
      if (user) saveProfile(bp);
    } catch (e) {
      console.error('Blueprint error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const rows = blueprint
    ? [
        { icon: 'fitness' as const, label: 'Ideal coach', v: blueprint.trainerType },
        { icon: 'list' as const, label: 'Training style', v: blueprint.recommendedStyle },
        { icon: 'time' as const, label: 'Timeline', v: blueprint.estimatedTimeline },
        { icon: 'bulb' as const, label: 'Tips', v: blueprint.additionalNotes },
      ]
    : [];

  return (
    <OnboardingShell
      step={4}
      total={4}
      title={isLoading ? 'Building your plan…' : 'Your plan'}
      subtitle={isLoading ? 'Takes a few seconds.' : `Made for ${clientProfile?.name?.split(' ')[0] ?? 'you'}. Coaches are matched to it.`}
      cta={saving ? 'Saving…' : 'Find my coach'}
      onNext={() => router.replace('/(client)/home')}
      canNext={!isLoading && !saving && !saveError}
      loading={saving}
    >
      {isLoading ? (
        <ActivityIndicator color={T.text} size="large" style={{ marginTop: 40 }} />
      ) : blueprint ? (
        <AnimatedView entering={FadeInDown.duration(500)} style={{ gap: 12 }}>
          <Glass radius={T.radius.xl} style={styles.card}>
            {rows.map((r) => (
              <View key={r.label} style={styles.row}>
                <View style={styles.icon}><Ionicons name={r.icon} size={16} color={T.accent} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={type.micro}>{r.label}</Text>
                  <Text style={[type.body, { marginTop: 2 }]}>{r.v}</Text>
                </View>
              </View>
            ))}
          </Glass>
          <View style={styles.goals}>
            {blueprint.goals.map((g) => (
              <Glass key={g} radius={T.radius.pill} style={styles.goal}>
                <Text style={styles.goalText}>{FitnessGoalLabel[g]}</Text>
              </Glass>
            ))}
          </View>
          {saveError && (
            <Button title="Couldn't save — tap to retry" variant="danger" size="md" onPress={() => saveProfile(blueprint)} />
          )}
          <Button title="Regenerate" icon="refresh" variant="ghost" size="sm" onPress={generateBlueprint} />
        </AnimatedView>
      ) : null}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 16 },
  row: { flexDirection: 'row', gap: 12 },
  icon: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,45,111,0.16)', alignItems: 'center', justifyContent: 'center' },
  goals: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  goal: { paddingHorizontal: 14, height: 34, justifyContent: 'center' },
  goalText: { color: T.text, fontSize: 13, fontWeight: '700' },
});
