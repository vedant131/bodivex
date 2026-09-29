import React, { useState } from 'react';
import { View, StyleSheet, Text, Switch } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../../stores/authStore';
import { OnboardingShell } from '../../../components/ui/OnboardingShell';
import { Field, Input, Tile } from '../../../components/ui/Form';
import { Glass } from '../../../components/ui/Glass';
import { T, type } from '../../../constants/theme';
import { FitnessLevel, SPORTS, FEDERATIONS } from '../../../types/user';
import { Chip } from '../../../components/ui/Bits';
import { GymPicker } from '../../../components/gym/GymPicker';
import { GymRef } from '../../../types/gym';

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
  const [gym, setGym] = useState<GymRef[]>(clientProfile?.gym ? [clientProfile.gym] : []);
  const athlete = (clientProfile?.athleteLevel ?? 'enthusiast') !== 'enthusiast';
  const [sport, setSport] = useState(clientProfile?.sport ?? '');
  const [federation, setFederation] = useState(clientProfile?.federation ?? '');
  const [nextComp, setNextComp] = useState(clientProfile?.nextCompetition ?? '');

  const h = Number(height);
  const w = Number(weight);
  const valid = h >= 100 && h <= 250 && w >= 25 && w <= 300 && (!athlete || !!sport);

  const next = () => {
    setClientProfile({
      ...clientProfile!,
      height: h,
      heightUnit: 'cm',
      weight: w,
      fitnessLevel: level,
      currentlyGoesToGym: goesToGym,
      gym: goesToGym && gym[0] ? gym[0] : undefined,
      gymName: goesToGym && gym[0] ? gym[0].name : undefined,
      sport: athlete ? sport : undefined,
      federation: athlete && federation ? federation : undefined,
      nextCompetition: athlete && nextComp.trim() ? nextComp.trim() : undefined,
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

      {athlete && (
        <>
          <Field label="Your sport">
            <View style={styles.wrap}>
              {SPORTS.map((s) => <Chip key={s} label={s} active={sport === s} onPress={() => setSport(s)} />)}
            </View>
          </Field>
          <Field label="Federation (optional)">
            <View style={styles.wrap}>
              {FEDERATIONS.map((f) => <Chip key={f} label={f} active={federation === f} onPress={() => setFederation(federation === f ? '' : f)} />)}
            </View>
          </Field>
          <Field label="Next competition (optional)">
            <Input value={nextComp} onChangeText={setNextComp} placeholder="e.g. IFBB Pro Mumbai Classic, Feb 2027" />
          </Field>
        </>
      )}

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
        <Field label="Your gym" hint="Coaches who train at your gym show first — no outside-trainer fee.">
          <GymPicker city={clientProfile?.city ?? 'Mumbai'} selected={gym} onChange={setGym} />
        </Field>
      )}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gymRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
});
