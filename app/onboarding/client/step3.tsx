import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../constants/colors';
import { useAuthStore } from '../../../stores/authStore';
import { FitnessGoal, FitnessGoalLabel, SessionPreference, BudgetRange, BudgetRangeLabel } from '../../../types/user';
import { OnboardingProgress } from '../../../components/shared/OnboardingProgress';
import { Screen } from '../../../components/ui/Screen';

const TOTAL_STEPS = 3;

const GOALS: { value: FitnessGoal; icon: keyof typeof Ionicons.glyphMap; label: string; desc: string }[] = [
  { value: FitnessGoal.WEIGHT_LOSS, icon: 'flame', label: 'Lose Weight', desc: 'Burn fat, get leaner' },
  { value: FitnessGoal.MUSCLE_GAIN, icon: 'barbell', label: 'Build Muscle', desc: 'Get stronger & bigger' },
  { value: FitnessGoal.ENDURANCE, icon: 'walk', label: 'Improve Stamina', desc: 'Run farther, breathe easier' },
  { value: FitnessGoal.FLEXIBILITY, icon: 'body', label: 'Flexibility', desc: 'Mobility & stretching' },
  { value: FitnessGoal.DIET_ONLY, icon: 'nutrition', label: 'Diet Plan Only', desc: 'Just need nutrition guidance' },
  { value: FitnessGoal.GENERAL_FITNESS, icon: 'flash', label: 'General Fitness', desc: 'Overall health & lifestyle' },
];

const SESSION_PREFS: { value: SessionPreference; icon: string; label: string; desc: string }[] = [
  { value: 'online', icon: 'videocam', label: 'Online', desc: 'Video sessions from anywhere' },
  { value: 'offline', icon: 'location', label: 'Offline', desc: 'Meet at gym / home' },
  { value: 'both', icon: 'swap-horizontal', label: 'Both', desc: "I'm flexible" },
];

const BUDGETS: { value: BudgetRange }[] = [
  { value: 'under_300' },
  { value: '300_700' },
  { value: '700_1500' },
  { value: '1500_plus' },
];

export default function ClientStep3() {
  const { clientProfile, setClientProfile } = useAuthStore();
  const [goals, setGoals] = useState<FitnessGoal[]>(clientProfile?.goals ?? []);
  const [sessionPref, setSessionPref] = useState<SessionPreference>(clientProfile?.sessionPreference ?? 'both');
  const [budget, setBudget] = useState<BudgetRange>(clientProfile?.budgetRange ?? '300_700');

  const toggleGoal = (goal: FitnessGoal) => {
    setGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  };

  const isValid = goals.length > 0;

  const handleNext = () => {
    setClientProfile({
      ...clientProfile!,
      goals,
      sessionPreference: sessionPref,
      budgetRange: budget,
    } as any);
    router.push('/onboarding/client/blueprint');
  };

  return (
    <Screen preset="calm">
      <OnboardingProgress current={3} total={TOTAL_STEPS} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.title}>What's your goal?</Text>
        <Text style={styles.subtitle}>Select all that apply — we'll match you perfectly</Text>

        {/* Goals */}
        <View style={styles.goalsGrid}>
          {GOALS.map((g) => {
            const selected = goals.includes(g.value);
            return (
              <TouchableOpacity
                key={g.value}
                style={[styles.goalCard, selected && styles.goalCardSelected]}
                onPress={() => toggleGoal(g.value)}
                activeOpacity={0.75}
              >
                <Ionicons name={g.icon} size={26} color={COLORS.textPrimary} />
                <Text style={[styles.goalLabel, selected && styles.goalLabelSelected]}>{g.label}</Text>
                <Text style={styles.goalDesc}>{g.desc}</Text>
                {selected && (
                  <View style={styles.checkBadge}>
                    <Ionicons name="checkmark" size={12} color={COLORS.onColor} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Session Preference */}
        <Text style={styles.sectionLabel}>How do you prefer to train?</Text>
        {SESSION_PREFS.map((sp) => (
          <TouchableOpacity
            key={sp.value}
            style={[styles.prefBtn, sessionPref === sp.value && styles.prefBtnActive]}
            onPress={() => setSessionPref(sp.value)}
          >
            <Ionicons
              name={sp.icon as any}
              size={22}
              color={sessionPref === sp.value ? COLORS.primary : COLORS.textSecondary}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.prefLabel, sessionPref === sp.value && styles.prefLabelActive]}>
                {sp.label}
              </Text>
              <Text style={styles.prefDesc}>{sp.desc}</Text>
            </View>
            {sessionPref === sp.value && (
              <Ionicons name="radio-button-on" size={20} color={COLORS.primary} />
            )}
          </TouchableOpacity>
        ))}

        {/* Budget */}
        <Text style={styles.sectionLabel}>Your budget per session</Text>
        <View style={styles.budgetGrid}>
          {BUDGETS.map((b) => (
            <TouchableOpacity
              key={b.value}
              style={[styles.budgetBtn, budget === b.value && styles.budgetBtnActive]}
              onPress={() => setBudget(b.value)}
            >
              <Text style={[styles.budgetText, budget === b.value && styles.budgetTextActive]}>
                {BudgetRangeLabel[b.value]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.nextBtn, !isValid && styles.nextBtnDisabled]}
          onPress={handleNext}
          disabled={!isValid}
        >
          <Text style={styles.nextBtnText}>Generate my blueprint</Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.card },
  scroll: { padding: 24, gap: 12 },
  backBtn: { marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, marginBottom: 8 },
  goalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  goalCard: {
    width: '47%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    position: 'relative',
    gap: 4,
  },
  goalCardSelected: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}0D` },
  goalEmoji: { fontSize: 28 },
  goalLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  goalLabelSelected: { color: COLORS.primary },
  goalDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 16 },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionLabel: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginTop: 16 },
  prefBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  prefBtnActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}08` },
  prefLabel: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  prefLabelActive: { color: COLORS.primary },
  prefDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  budgetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  budgetBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  budgetBtnActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}12` },
  budgetText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  budgetTextActive: { color: COLORS.primary, fontWeight: '700' },
  nextBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  nextBtnDisabled: { backgroundColor: COLORS.textMuted, opacity: 0.5 },
  nextBtnText: { color: COLORS.onColor, fontSize: 17, fontWeight: '700' },
});
