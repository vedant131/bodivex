import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { saveClientProfile, updateUserProfile } from '../../../services/auth';
import { uploadImage } from '../../../services/storage';
import { useAuthStore } from '../../../stores/authStore';
import { COLORS } from '../../../constants/colors';
import { FitnessGoal, FitnessBlueprint, FitnessGoalLabel } from '../../../types/user';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../services/firebase';
import { Screen } from '../../../components/ui/Screen';

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
  const fadeAnim = useState(new Animated.Value(0))[0];

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
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
      // Save (incl. photo upload) in the background; the Find button waits on `saving`.
      if (user) saveProfile(bp);
    } catch (e) {
      console.error('Blueprint error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Screen preset="calm">
      <ScrollView contentContainerStyle={styles.scroll}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingTitle}>Analyzing your profile...</Text>
            <Text style={styles.loadingSubtitle}>
              Building your personal fitness blueprint
            </Text>
          </View>
        ) : blueprint ? (
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Header */}
            <LinearGradient
              colors={[COLORS.secondary, COLORS.accent]}
              style={styles.header}
            >
              <Ionicons name="sparkles" size={34} color={COLORS.onColor} />
              <Text style={styles.headerTitle}>Your Fitness Blueprint</Text>
              <Text style={styles.headerSub}>Personalized for {clientProfile?.name}</Text>
            </LinearGradient>

            {/* Blueprint Card */}
            <View style={styles.card}>
              <InfoRow icon="fitness" label="Ideal Trainer" value={blueprint.trainerType} />
              <Divider />
              <InfoRow icon="list" label="Training Style" value={blueprint.recommendedStyle} />
              <Divider />
              <InfoRow icon="time" label="Timeline" value={blueprint.estimatedTimeline} />
              <Divider />
              <InfoRow icon="bulb" label="Tips" value={blueprint.additionalNotes} />
            </View>

            {/* Goals Confirmed */}
            <View style={styles.goalsCard}>
              <Text style={styles.goalsTitle}>Your Goals</Text>
              <View style={styles.goalChips}>
                {blueprint.goals.map((g) => (
                  <View key={g} style={styles.goalChip}>
                    <Text style={styles.goalChipText}>{FitnessGoalLabel[g]}</Text>
                  </View>
                ))}
              </View>
            </View>

            {saveError && (
              <TouchableOpacity onPress={() => saveProfile(blueprint)}>
                <Text style={styles.saveError}>Couldn't save your profile ({saveError}). Tap to retry.</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.findBtn, (saveError || saving) ? { opacity: 0.5 } : null]}
              disabled={!!saveError || saving}
              onPress={() => router.replace('/(client)/home')}
              activeOpacity={0.85}
            >
              <Ionicons name="search" size={20} color={COLORS.onColor} />
              <Text style={styles.findBtnText}>{saving ? 'Saving your profile…' : 'Find My Perfect Trainer'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={generateBlueprint} style={styles.regenerateBtn}>
              <Ionicons name="refresh" size={16} color={COLORS.textSecondary} />
              <Text style={styles.regenerateBtnText}>Regenerate Blueprint</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const InfoRow = ({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon} size={20} color={COLORS.primary} />
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const Divider = () => <View style={styles.divider} />;

const styles = StyleSheet.create({
  saveError: { color: COLORS.danger, fontSize: 13, textAlign: 'center', marginBottom: 8 },
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 24, gap: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 120, gap: 16 },
  loadingTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  loadingSubtitle: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  header: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  headerEmoji: { fontSize: 40 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.onColor },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)' },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    gap: 4,
  },
  infoRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', paddingVertical: 8 },
  infoEmoji: { fontSize: 22, marginTop: 2 },
  infoLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 15, color: COLORS.textPrimary, lineHeight: 22, marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 2 },
  goalsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    gap: 12,
  },
  goalsTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  goalChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  goalChip: {
    backgroundColor: `${COLORS.primary}15`,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${COLORS.primary}40`,
  },
  goalChipText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  findBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 58,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  findBtnText: { color: COLORS.onColor, fontSize: 17, fontWeight: '700' },
  regenerateBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  regenerateBtnText: { color: COLORS.textSecondary, fontSize: 14 },
});
