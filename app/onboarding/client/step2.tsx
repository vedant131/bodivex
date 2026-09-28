import React, { useState } from 'react';
import { View, StyleSheet, Text, Switch } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../../stores/authStore';
import { OnboardingShell } from '../../../components/ui/OnboardingShell';
import { Field, Input, Tile } from '../../../components/ui/Form';
import { Glass } from '../../../components/ui/Glass';
import { T, type } from '../../../constants/theme';
import { FitnessLevel } from '../../../types/user';

const LEVELS: { value: FitnessLevel; label: string; desc: string; icon: 'leaf' | 'barbell' | 'trophy' }[] = [
  { value: 'beginner', label: 'Beginner', desc: 'Just starting out', icon: 'leaf' },
  { value: 'intermediate', label: 'Intermediate', desc: '6+ months training', icon: 'barbell' },
  { value: 'advanced', label: 'Advanced', desc: 'Training seriously', icon: 'trophy' },
];

export default function ClientStep2() {
  const { clientProfile, setClientProfile } = useAuthStore();
  const [height, setHeight] = useState(clientProfile?.height?.toString() ?? '');
  const [weight, setWeight] = useState(clientProfile?.weight?.toString() ?? '');
  const [level, setLevel] = useState<FitnessLevel>(clientProfile?.fitnessLevel ?? 'beginner');
  const [goesToGym, setGoesToGym] = useState(clientProfile?.currentlyGoesToGym ?? false);
  const [gymName, setGymName] = useState(clientProfile?.gymName ?? '');

  const h = Number(height);
  const w = Number(weight);
  const valid = h >= 100 && h <= 250 && w >= 25 && w <= 300;

  const next = () => {
    setClientProfile({
      ...clientProfile!,
      height: h,
      heightUnit: 'cm',
      weight: w,
      fitnessLevel: level,
      currentlyGoesToGym: goesToGym,
      gymName: goesToGym && gymName.trim() ? gymName.trim() : undefined,
    });
    router.push('/onboarding/client/step3');
  };

  return (
    <OnboardingShell step={2} total={4} title="Your body" subtitle="Helps match you with the right coach." cta="Next" onNext={next} canNext={valid}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field label="Height (cm)">
            <Input value={height} onChangeText={(v) => setHeight(v.replace(/\D/g, ''))} placeholder="170" keyboardType="number-pad" maxLength={3} />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Weight (kg)">
            <Input value={weight} onChangeText={(v) => setWeight(v.replace(/[^\d.]/g, ''))} placeholder="68" keyboardType="decimal-pad" maxLength={5} />
          </Field>
        </View>
      </View>

      <Field label="Fitness level">
        <View style={styles.grid}>
          {LEVELS.map((l) => (
            <Tile key={l.value} icon={l.icon} title={l.label} desc={l.desc} selected={level === l.value} onPress={() => setLevel(l.value)} />
          ))}
        </View>
      </Field>

      <Glass radius={T.radius.lg} style={styles.gymRow}>
        <View style={{ flex: 1 }}>
          <Text style={type.headline}>I already go to a gym</Text>
          <Text style={type.caption}>We'll show coaches who train there</Text>
        </View>
        <Switch value={goesToGym} onValueChange={setGoesToGym} trackColor={{ true: T.ring2, false: T.glassStrong }} thumbColor="#fff" />
      </Glass>
      {goesToGym && (
        <Field label="Gym name"><Input value={gymName} onChangeText={setGymName} placeholder="e.g. Cult Baner" /></Field>
      )}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gymRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
});
