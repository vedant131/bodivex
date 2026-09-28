import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../../stores/authStore';
import { OnboardingShell } from '../../../components/ui/OnboardingShell';
import { Field, Tile } from '../../../components/ui/Form';
import { Chip } from '../../../components/ui/Bits';
import { FitnessGoal, SessionPreference, BudgetRange, BudgetRangeLabel } from '../../../types/user';

const GOALS: { value: FitnessGoal; label: string; desc: string; icon: 'trophy' | 'flame' | 'barbell' | 'walk' | 'body' | 'nutrition' | 'flash' }[] = [
  { value: FitnessGoal.CONTEST_PREP, label: 'Contest prep', desc: 'Peak for a show or meet', icon: 'trophy' },
  { value: FitnessGoal.WEIGHT_LOSS, label: 'Lose weight', desc: 'Burn fat, get leaner', icon: 'flame' },
  { value: FitnessGoal.MUSCLE_GAIN, label: 'Build muscle', desc: 'Stronger & bigger', icon: 'barbell' },
  { value: FitnessGoal.ENDURANCE, label: 'Stamina', desc: 'Run farther, breathe easier', icon: 'walk' },
  { value: FitnessGoal.FLEXIBILITY, label: 'Flexibility', desc: 'Mobility & stretching', icon: 'body' },
  { value: FitnessGoal.DIET_ONLY, label: 'Diet plan', desc: 'Nutrition guidance only', icon: 'nutrition' },
  { value: FitnessGoal.GENERAL_FITNESS, label: 'General fitness', desc: 'Healthy lifestyle', icon: 'flash' },
];

export default function ClientStep3() {
  const { clientProfile, setClientProfile } = useAuthStore();
  const athlete = (clientProfile?.athleteLevel ?? 'enthusiast') !== 'enthusiast';
  const [goals, setGoals] = useState<FitnessGoal[]>(clientProfile?.goals ?? (athlete ? [FitnessGoal.CONTEST_PREP] : []));
  const [pref, setPref] = useState<SessionPreference>(clientProfile?.sessionPreference ?? 'both');
  const [budget, setBudget] = useState<BudgetRange>(clientProfile?.budgetRange ?? '300_700');

  const toggle = (g: FitnessGoal) => setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  const next = () => {
    setClientProfile({ ...clientProfile!, goals, sessionPreference: pref, budgetRange: budget });
    router.push('/onboarding/client/blueprint');
  };

  return (
    <OnboardingShell step={3} total={4} title="Your goals" subtitle="Pick all that apply." cta="Build my plan" onNext={next} canNext={goals.length > 0}>
      <View style={styles.grid}>
        {GOALS.filter((g) => athlete || g.value !== FitnessGoal.CONTEST_PREP).map((g) => (
          <Tile key={g.value} icon={g.icon} title={g.label} desc={g.desc} selected={goals.includes(g.value)} onPress={() => toggle(g.value)} />
        ))}
      </View>

      <Field label="How do you want to train?">
        <View style={styles.wrap}>
          {(['online', 'offline', 'both'] as SessionPreference[]).map((v) => (
            <Chip key={v} label={v === 'online' ? 'Online' : v === 'offline' ? 'In person' : 'Either'}
              icon={v === 'online' ? 'videocam' : v === 'offline' ? 'barbell' : 'swap-horizontal'}
              active={pref === v} onPress={() => setPref(v)} />
          ))}
        </View>
      </Field>

      <Field label="Budget per session">
        <View style={styles.wrap}>
          {(Object.keys(BudgetRangeLabel) as BudgetRange[]).map((b) => (
            <Chip key={b} label={BudgetRangeLabel[b]} active={budget === b} onPress={() => setBudget(b)} />
          ))}
        </View>
      </Field>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
