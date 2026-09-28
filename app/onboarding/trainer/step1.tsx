import React, { useState } from 'react';
import { ScrollView, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../../stores/authStore';
import { OnboardingShell } from '../../../components/ui/OnboardingShell';
import { Field, Input, PhotoPick } from '../../../components/ui/Form';
import { Chip } from '../../../components/ui/Bits';
import { CITIES, CONTACT_INFO_PATTERN, CONTACT_INFO_MESSAGE } from '../../../constants/config';

export default function TrainerStep1() {
  const { trainerProfile, setTrainerProfile, user } = useAuthStore();
  const [name, setName] = useState(trainerProfile?.name ?? user?.name ?? '');
  const [bio, setBio] = useState(trainerProfile?.bio ?? '');
  const [city, setCity] = useState<string>(trainerProfile?.city ?? 'Mumbai');
  const [experience, setExperience] = useState(trainerProfile?.experience?.toString() ?? '');
  const [photo, setPhoto] = useState<string | null>(trainerProfile?.profilePhoto ?? null);

  const valid = name.trim().length >= 2 && bio.trim().length >= 20 && experience !== '';

  const next = () => {
    if (CONTACT_INFO_PATTERN.test(bio)) return Alert.alert('Keep it on Bodivex', CONTACT_INFO_MESSAGE);
    setTrainerProfile({
      ...trainerProfile!,
      name: name.trim(),
      bio: bio.trim(),
      city,
      experience: Number(experience),
      profilePhoto: photo ?? undefined,
    });
    router.push('/onboarding/trainer/step2');
  };

  return (
    <OnboardingShell preset="trainer" step={1} total={4} title="Your coach profile" subtitle="This is what clients see first." cta="Next" onNext={next} canNext={valid}>
      <PhotoPick uri={photo} name={name} onPick={setPhoto} />
      <Field label="Full name"><Input value={name} onChangeText={setName} placeholder="e.g. Arjun Sharma" autoCapitalize="words" /></Field>
      <Field label="City">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {CITIES.map((c) => <Chip key={c} label={c} icon={city === c ? 'location' : undefined} active={city === c} onPress={() => setCity(c)} />)}
        </ScrollView>
      </Field>
      <Field label="Years of coaching">
        <Input value={experience} onChangeText={(v) => setExperience(v.replace(/\D/g, ''))} placeholder="e.g. 4" keyboardType="number-pad" maxLength={2} />
      </Field>
      <Field label="Bio" hint={`${bio.trim().length}/20 characters minimum. No phone numbers or links.`}>
        <Input value={bio} onChangeText={setBio} placeholder="How do you coach? Who do you help best?" multiline maxLength={400}
          style={{ minHeight: 110, textAlignVertical: 'top' }} />
      </Field>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({ row: { gap: 8, paddingRight: 20 } });
