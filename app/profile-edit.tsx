import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../stores/authStore';
import { updateTrainerProfile } from '../services/trainers';
import { updateUserProfile } from '../services/auth';
import { uploadImage } from '../services/storage';
import { Screen } from '../components/ui/Screen';
import { Glass } from '../components/ui/Glass';
import { Button } from '../components/ui/Button';
import { PressableScale } from '../components/ui/PressableScale';
import { Avatar, Chip, IconButton } from '../components/ui/Bits';
import { Field, Input } from '../components/ui/Form';
import { CredentialsEditor, Entry } from '../components/trainer/CredentialsEditor';
import { T, type } from '../constants/theme';
import { CITIES, CONTACT_INFO_PATTERN, CONTACT_INFO_MESSAGE } from '../constants/config';
import { SPECIALIZATIONS, TrainerProfile } from '../types/trainer';
import { SessionPreference } from '../types/user';

const LANGUAGES = ['English', 'Hindi', 'Marathi', 'Gujarati', 'Tamil', 'Telugu', 'Kannada', 'Bengali'];

/** Trainer edits their public profile. Approval/rating/fee fields are server-only (see firestore.rules). */
export default function EditTrainerProfile() {
  const { user, trainerProfile, setTrainerProfile, setUser } = useAuthStore();
  const p = trainerProfile;

  const [photo, setPhoto] = useState(p?.profilePhoto);
  const [name, setName] = useState(p?.name ?? '');
  const [bio, setBio] = useState(p?.bio ?? '');
  const [city, setCity] = useState(p?.city ?? 'Mumbai');
  const [experience, setExperience] = useState(String(p?.experience ?? ''));
  const [specs, setSpecs] = useState<string[]>(p?.specializations ?? []);
  const [pref, setPref] = useState<SessionPreference>(p?.sessionPreference ?? 'both');
  const [online, setOnline] = useState(p?.pricingOnline ? String(p.pricingOnline) : '');
  const [offline, setOffline] = useState(p?.pricingOffline ? String(p.pricingOffline) : '');
  const [gymName, setGymName] = useState(p?.gymLocation?.name ?? '');
  const [gymAddress, setGymAddress] = useState(p?.gymLocation?.address ?? '');
  const [languages, setLanguages] = useState<string[]>(p?.languages ?? ['English', 'Hindi']);
  const [certs, setCerts] = useState<Entry[]>(
    (p?.certifications ?? []).map((c) => ({ title: c.name, subtitle: c.issuedBy, year: c.year }))
  );
  const medalsOf = (kind: 'competition' | 'achievement') =>
    (p?.medals ?? [])
      .filter((m) => (m.kind ?? 'achievement') === kind)
      .map((m) => ({ title: m.title, subtitle: m.description, year: m.year }));
  const [competitions, setCompetitions] = useState<Entry[]>(medalsOf('competition'));
  const [achievements, setAchievements] = useState<Entry[]>(medalsOf('achievement'));
  const [saving, setSaving] = useState(false);

  if (!p || !user) return null;

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!res.canceled) setPhoto(res.assets[0].uri);
  };

  const offersOnline = pref !== 'offline';
  const offersOffline = pref !== 'online';

  const save = async () => {
    const errors: string[] = [];
    if (name.trim().length < 2) errors.push('Enter your name');
    if (bio.trim().length < 20) errors.push('Write a bio of at least 20 characters');
    if (CONTACT_INFO_PATTERN.test(bio) || CONTACT_INFO_PATTERN.test(name)) errors.push(CONTACT_INFO_MESSAGE);
    if (!specs.length) errors.push('Pick at least one specialization');
    if (offersOnline && !(Number(online) > 0)) errors.push('Set your online price');
    if (offersOffline && !(Number(offline) > 0)) errors.push('Set your in-person price');
    if (offersOffline && !gymName.trim()) errors.push('Add the gym where you train clients');
    if (errors.length) return Alert.alert('Almost there', errors.join('\n'));

    setSaving(true);
    try {
      const profilePhoto = photo ? await uploadImage(photo, `users/${user.id}/profile.jpg`) : undefined;
      const changes: Partial<TrainerProfile> = {
        name: name.trim(),
        bio: bio.trim(),
        city,
        experience: Number(experience) || 0,
        specializations: specs,
        sessionPreference: pref,
        pricingOnline: offersOnline ? Number(online) : undefined,
        pricingOffline: offersOffline ? Number(offline) : undefined,
        languages,
        profilePhoto,
        // Self-reported; the "Verified coach" badge comes from the team's manual review
        certifications: certs.map((c) => ({ name: c.title, issuedBy: c.subtitle ?? '', year: c.year, verified: false })),
        medals: [
          ...competitions.map((m) => ({ title: m.title, description: m.subtitle, year: m.year, kind: 'competition' as const })),
          ...achievements.map((m) => ({ title: m.title, description: m.subtitle, year: m.year, kind: 'achievement' as const })),
        ].map((m) => (m.description ? m : { title: m.title, year: m.year, kind: m.kind })),
        gymLocation: offersOffline
          ? { name: gymName.trim(), address: gymAddress.trim(), latitude: 0, longitude: 0, city, state: 'Maharashtra' }
          : undefined,
      };
      await updateTrainerProfile(p.id, changes);
      await updateUserProfile(user.id, { name: changes.name, ...(profilePhoto && { profilePhoto }) });
      setTrainerProfile({ ...p, ...changes });
      setUser({ ...user, name: changes.name!, profilePhoto });
      router.back();
    } catch (e: any) {
      Alert.alert('Could not save', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen preset="trainer" edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="close" label="Cancel" onPress={() => router.back()} />
        <Text style={type.headline}>Edit profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <PressableScale onPress={pickPhoto} style={styles.photoWrap} accessibilityLabel="Change photo">
            <Avatar uri={photo} name={name || 'Coach'} size={104} radius={52} />
            <View style={styles.camera}><Ionicons name="camera" size={16} color="#fff" /></View>
          </PressableScale>

          <Field label="Name"><Input value={name} onChangeText={setName} placeholder="Your full name" /></Field>

          <Field label="Bio" hint="What makes your coaching different? No phone numbers or links.">
            <Input value={bio} onChangeText={setBio} placeholder="e.g. Strength coach helping beginners lift safely…" multiline maxLength={400} style={{ minHeight: 96, textAlignVertical: 'top' }} />
          </Field>

          <Field label="City">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {CITIES.map((c) => <Chip key={c} label={c} active={city === c} onPress={() => setCity(c)} />)}
            </ScrollView>
          </Field>

          <Field label="Years of experience">
            <Input value={experience} onChangeText={(v) => setExperience(v.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={2} placeholder="e.g. 4" />
          </Field>

          <Field label="Specializations">
            <View style={styles.wrap}>
              {SPECIALIZATIONS.map((s) => <Chip key={s} label={s} active={specs.includes(s)} onPress={() => toggle(specs, setSpecs, s)} />)}
            </View>
          </Field>

          <Field label="How you train">
            <View style={styles.wrap}>
              {(['online', 'offline', 'both'] as SessionPreference[]).map((v) => (
                <Chip key={v} label={v === 'online' ? 'Online only' : v === 'offline' ? 'In person only' : 'Both'}
                  icon={v === 'online' ? 'videocam' : v === 'offline' ? 'barbell' : 'swap-horizontal'}
                  active={pref === v} onPress={() => setPref(v)} />
              ))}
            </View>
          </Field>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            {offersOnline && (
              <View style={{ flex: 1 }}>
                <Field label="Online ₹ / session">
                  <Input value={online} onChangeText={(v) => setOnline(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="499" />
                </Field>
              </View>
            )}
            {offersOffline && (
              <View style={{ flex: 1 }}>
                <Field label="In person ₹ / session">
                  <Input value={offline} onChangeText={(v) => setOffline(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="799" />
                </Field>
              </View>
            )}
          </View>
          <Text style={[type.caption, { marginTop: -10 }]}>Existing bookings keep the price they were booked at.</Text>

          {offersOffline && (
            <Field label="Gym">
              <Input value={gymName} onChangeText={setGymName} placeholder="Gym name, e.g. Anytime Fitness Baner" />
              <Input value={gymAddress} onChangeText={setGymAddress} placeholder="Area / address" />
            </Field>
          )}

          <CredentialsEditor
            label="Certifications"
            icon="ribbon"
            entries={certs}
            onChange={setCerts}
            titlePh="e.g. ACE Certified Personal Trainer"
            subtitlePh="Issued by, e.g. ACE"
            subtitleRequired
          />
          <CredentialsEditor
            label="Competitions"
            icon="medal"
            entries={competitions}
            onChange={setCompetitions}
            titlePh="e.g. Mumbai Powerlifting Open"
            subtitlePh="Result, e.g. Silver, 83kg"
          />
          <CredentialsEditor
            label="Achievements"
            icon="trophy"
            entries={achievements}
            onChange={setAchievements}
            titlePh="e.g. Coached 300+ clients"
            subtitlePh="Detail (optional)"
          />

          <Field label="Languages">
            <View style={styles.wrap}>
              {LANGUAGES.map((l) => <Chip key={l} label={l} active={languages.includes(l)} onPress={() => toggle(languages, setLanguages, l)} />)}
            </View>
          </Field>
        </ScrollView>

        <View style={styles.footer}>
          <Button title="Save changes" icon="checkmark" onPress={save} loading={saving} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  body: { padding: 20, gap: 22, paddingBottom: 40 },
  photoWrap: { alignSelf: 'center' },
  camera: {
    position: 'absolute', right: 2, bottom: 2, width: 32, height: 32, borderRadius: 16,
    backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: T.bg,
  },
  chips: { gap: 8, paddingRight: 20 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
});
