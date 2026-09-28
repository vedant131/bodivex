import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../../stores/authStore';
import { OnboardingShell } from '../../../components/ui/OnboardingShell';
import { Field, Input, Tile } from '../../../components/ui/Form';
import { Chip } from '../../../components/ui/Bits';
import { SPECIALIZATIONS } from '../../../types/trainer';
import { SessionPreference } from '../../../types/user';

const MODES: { value: SessionPreference; label: string; desc: string; icon: 'videocam' | 'barbell' | 'swap-horizontal' }[] = [
  { value: 'online', label: 'Online', desc: 'Video sessions', icon: 'videocam' },
  { value: 'offline', label: 'In person', desc: 'At your gym', icon: 'barbell' },
  { value: 'both', label: 'Both', desc: 'Online + gym', icon: 'swap-horizontal' },
];

export default function TrainerStep2() {
  const { trainerProfile, setTrainerProfile } = useAuthStore();
  const [specs, setSpecs] = useState<string[]>(trainerProfile?.specializations ?? []);
  const [pref, setPref] = useState<SessionPreference>(trainerProfile?.sessionPreference ?? 'both');
  const [gymName, setGymName] = useState(trainerProfile?.gymLocation?.name ?? '');
  const [gymAddress, setGymAddress] = useState(trainerProfile?.gymLocation?.address ?? '');

  const inPerson = pref !== 'online';
  // No invented gym: in-person coaches must say where they train
  const valid = specs.length > 0 && (!inPerson || gymName.trim().length >= 2);

  const next = () => {
    setTrainerProfile({
      ...trainerProfile!,
      specializations: specs,
      sessionPreference: pref,
      gymLocation: inPerson
        ? {
            name: gymName.trim(),
            address: gymAddress.trim(),
            latitude: 0, // Note: set from a map pin when "near me" search is built
            longitude: 0,
            city: trainerProfile?.city ?? 'Mumbai',
            state: 'Maharashtra',
          }
        : undefined,
    });
    router.push('/onboarding/trainer/step3');
  };

  return (
    <OnboardingShell preset="trainer" step={2} total={4} title="What you coach" subtitle="Clients search by these." cta="Next" onNext={next} canNext={valid}>
      <Field label="Specializations">
        <View style={styles.wrap}>
          {SPECIALIZATIONS.map((s) => (
            <Chip key={s} label={s} active={specs.includes(s)} onPress={() => setSpecs(specs.includes(s) ? specs.filter((x) => x !== s) : [...specs, s])} />
          ))}
        </View>
      </Field>

      <Field label="How you train">
        <View style={styles.grid}>
          {MODES.map((m) => <Tile key={m.value} icon={m.icon} title={m.label} desc={m.desc} selected={pref === m.value} onPress={() => setPref(m.value)} />)}
        </View>
      </Field>

      {inPerson && (
        <Field label="Your gym">
          <Input value={gymName} onChangeText={setGymName} placeholder="Gym name, e.g. Anytime Fitness Baner" />
          <Input value={gymAddress} onChangeText={setGymAddress} placeholder="Area / address" />
        </Field>
      )}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
