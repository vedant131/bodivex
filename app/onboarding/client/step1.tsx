import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../../stores/authStore';
import { OnboardingShell } from '../../../components/ui/OnboardingShell';
import { Field, Input, PhotoPick } from '../../../components/ui/Form';
import { Chip } from '../../../components/ui/Bits';
import { CITIES } from '../../../constants/config';
import { Gender } from '../../../types/user';

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export default function ClientStep1() {
  const { clientProfile, setClientProfile, user } = useAuthStore();
  const [name, setName] = useState(clientProfile?.name ?? user?.name ?? '');
  const [age, setAge] = useState(clientProfile?.age?.toString() ?? '');
  const [gender, setGender] = useState<Gender>(clientProfile?.gender ?? 'male');
  const [city, setCity] = useState<string>(clientProfile?.city ?? 'Mumbai');
  const [photo, setPhoto] = useState<string | null>(clientProfile?.profilePhoto ?? null);

  const valid = name.trim().length >= 2 && Number(age) >= 13 && Number(age) <= 90;

  const next = () => {
    setClientProfile({ ...clientProfile!, name: name.trim(), age: Number(age), gender, city, profilePhoto: photo ?? undefined });
    router.push('/onboarding/client/step2');
  };

  return (
    <OnboardingShell step={1} total={4} title="About you" subtitle="So coaches know who they're training." cta="Next" onNext={next} canNext={valid}>
      <PhotoPick uri={photo} name={name} onPick={setPhoto} />
      <Field label="Name"><Input value={name} onChangeText={setName} placeholder="Your full name" autoCapitalize="words" /></Field>
      <Field label="Age">
        <Input value={age} onChangeText={(v) => setAge(v.replace(/\D/g, ''))} placeholder="e.g. 26" keyboardType="number-pad" maxLength={2} />
      </Field>
      <Field label="Gender">
        <View style={styles.wrap}>
          {GENDERS.map((g) => <Chip key={g.value} label={g.label} active={gender === g.value} onPress={() => setGender(g.value)} />)}
        </View>
      </Field>
      <Field label="City">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {CITIES.map((c) => <Chip key={c} label={c} icon={city === c ? 'location' : undefined} active={city === c} onPress={() => setCity(c)} />)}
        </ScrollView>
      </Field>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { gap: 8, paddingRight: 20 },
});
