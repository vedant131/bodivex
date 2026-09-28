import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../stores/authStore';
import { saveClientProfile, updateUserProfile } from '../services/auth';
import { uploadImage } from '../services/storage';
import { Screen } from '../components/ui/Screen';
import { Button } from '../components/ui/Button';
import { PressableScale } from '../components/ui/PressableScale';
import { Avatar, Chip, IconButton } from '../components/ui/Bits';
import { Field, Input } from '../components/ui/Form';
import { T, type } from '../constants/theme';
import { CITIES } from '../constants/config';
import {
  ClientProfile, FitnessGoal, FitnessGoalLabel, FitnessLevel, SessionPreference, BudgetRange, BudgetRangeLabel,
  AthleteLevel, AthleteLevelLabel, SPORTS, FEDERATIONS,
} from '../types/user';

const LEVELS: FitnessLevel[] = ['beginner', 'intermediate', 'advanced'];
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** Client edits their own profile (used to match coaches). */
export default function EditClientProfile() {
  const { user, clientProfile: p, setClientProfile, setUser } = useAuthStore();

  const [photo, setPhoto] = useState(p?.profilePhoto ?? user?.profilePhoto);
  const [name, setName] = useState(p?.name ?? user?.name ?? '');
  const [age, setAge] = useState(p?.age ? String(p.age) : '');
  const [city, setCity] = useState(p?.city ?? 'Mumbai');
  const [height, setHeight] = useState(p?.height ? String(p.height) : '');
  const [weight, setWeight] = useState(p?.weight ? String(p.weight) : '');
  const [level, setLevel] = useState<FitnessLevel>(p?.fitnessLevel ?? 'beginner');
  const [gym, setGym] = useState(p?.gymName ?? '');
  const [goals, setGoals] = useState<FitnessGoal[]>(p?.goals ?? []);
  const [pref, setPref] = useState<SessionPreference>(p?.sessionPreference ?? 'both');
  const [budget, setBudget] = useState<BudgetRange>(p?.budgetRange ?? '300_700');
  const [athleteLevel, setAthleteLevel] = useState<AthleteLevel>(p?.athleteLevel ?? 'enthusiast');
  const [sport, setSport] = useState(p?.sport ?? '');
  const [federation, setFederation] = useState(p?.federation ?? '');
  const [nextComp, setNextComp] = useState(p?.nextCompetition ?? '');
  const [saving, setSaving] = useState(false);

  if (!user || !p) return null;

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!res.canceled) setPhoto(res.assets[0].uri);
  };

  const save = async () => {
    const errors: string[] = [];
    if (name.trim().length < 2) errors.push('Enter your name');
    if (!(Number(age) >= 13 && Number(age) <= 100)) errors.push('Enter a valid age');
    if (!(Number(height) > 0)) errors.push('Enter your height');
    if (!(Number(weight) > 0)) errors.push('Enter your weight');
    if (!goals.length) errors.push('Pick at least one goal');
    if (athleteLevel !== 'enthusiast' && !sport) errors.push('Pick your sport');
    if (errors.length) return Alert.alert('Almost there', errors.join('\n'));

    setSaving(true);
    try {
      const profilePhoto = photo ? await uploadImage(photo, `users/${user.id}/profile.jpg`) : undefined;
      const changes: Partial<ClientProfile> = {
        name: name.trim(),
        age: Number(age),
        city,
        height: Number(height),
        heightUnit: 'cm',
        weight: Number(weight),
        fitnessLevel: level,
        currentlyGoesToGym: !!gym.trim(),
        gymName: gym.trim() || undefined,
        goals,
        sessionPreference: pref,
        budgetRange: budget,
        athleteLevel,
        sport: athleteLevel !== 'enthusiast' ? sport : undefined,
        federation: athleteLevel !== 'enthusiast' && federation ? federation : undefined,
        nextCompetition: athleteLevel !== 'enthusiast' && nextComp.trim() ? nextComp.trim() : undefined,
        profilePhoto,
      };
      await saveClientProfile(user.id, changes);
      await updateUserProfile(user.id, { name: changes.name, ...(profilePhoto && { profilePhoto }) });
      setClientProfile({ ...p, ...changes });
      setUser({ ...user, name: changes.name!, profilePhoto });
      router.back();
    } catch (e: any) {
      Alert.alert('Could not save', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen preset="calm" edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="close" label="Cancel" onPress={() => router.back()} />
        <Text style={type.headline}>Edit profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <PressableScale onPress={pickPhoto} style={{ alignSelf: 'center' }} accessibilityLabel="Change photo">
            <Avatar uri={photo} name={name || 'You'} size={104} radius={52} />
            <View style={styles.camera}><Ionicons name="camera" size={16} color="#fff" /></View>
          </PressableScale>

          <Field label="Name"><Input value={name} onChangeText={setName} placeholder="Your name" /></Field>

          <Field label="City">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
              {CITIES.map((c) => <Chip key={c} label={c} active={city === c} onPress={() => setCity(c)} />)}
            </ScrollView>
          </Field>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            {[
              { label: 'Age', value: age, set: setAge, ph: '26' },
              { label: 'Height (cm)', value: height, set: setHeight, ph: '170' },
              { label: 'Weight (kg)', value: weight, set: setWeight, ph: '68' },
            ].map((f) => (
              <View key={f.label} style={{ flex: 1 }}>
                <Field label={f.label}>
                  <Input value={f.value} onChangeText={(v) => f.set(v.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" maxLength={5} placeholder={f.ph} />
                </Field>
              </View>
            ))}
          </View>

          <Field label="You are">
            <View style={styles.wrap}>
              {(Object.keys(AthleteLevelLabel) as AthleteLevel[]).map((l) => (
                <Chip key={l} label={AthleteLevelLabel[l]} active={athleteLevel === l} onPress={() => setAthleteLevel(l)} />
              ))}
            </View>
          </Field>
          {athleteLevel !== 'enthusiast' && (
            <>
              <Field label="Sport">
                <View style={styles.wrap}>
                  {SPORTS.map((s) => <Chip key={s} label={s} active={sport === s} onPress={() => setSport(s)} />)}
                </View>
              </Field>
              <Field label="Federation">
                <View style={styles.wrap}>
                  {FEDERATIONS.map((f) => <Chip key={f} label={f} active={federation === f} onPress={() => setFederation(federation === f ? '' : f)} />)}
                </View>
              </Field>
              <Field label="Next competition"><Input value={nextComp} onChangeText={setNextComp} placeholder="e.g. IFBB Pro Mumbai Classic, Feb 2027" /></Field>
            </>
          )}

          <Field label="Fitness level">
            <View style={styles.wrap}>
              {LEVELS.map((l) => <Chip key={l} label={cap(l)} active={level === l} onPress={() => setLevel(l)} />)}
            </View>
          </Field>

          <Field label="Goals">
            <View style={styles.wrap}>
              {Object.values(FitnessGoal).map((g) => (
                <Chip key={g} label={FitnessGoalLabel[g]} active={goals.includes(g)}
                  onPress={() => setGoals(goals.includes(g) ? goals.filter((x) => x !== g) : [...goals, g])} />
              ))}
            </View>
          </Field>

          <Field label="How you want to train">
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

          <Field label="Your gym (optional)" hint="Helps us show coaches who train at your gym.">
            <Input value={gym} onChangeText={setGym} placeholder="e.g. Cult Baner" />
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
  camera: {
    position: 'absolute', right: 2, bottom: 2, width: 32, height: 32, borderRadius: 16,
    backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: T.bg,
  },
  row: { gap: 8, paddingRight: 20 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
});
