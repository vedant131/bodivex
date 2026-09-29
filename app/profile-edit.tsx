import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../stores/authStore';
import { updateTrainerProfile, getTrainerSocial, saveTrainerSocial, placesOf } from '../services/trainers';
import { GymPicker } from '../components/gym/GymPicker';
import { GymRef, InPersonPlace, PLACE_LABEL, PLACE_ICON } from '../types/gym';
import { updateUserProfile } from '../services/auth';
import { uploadImage, uploadVideo } from '../services/storage';
import { IntroVideoPicker } from '../components/trainer/IntroVideo';
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
import { SessionPreference, AthleteLevel, AthleteLevelLabel, FEDERATIONS } from '../types/user';
import { Alert } from '../components/ui/Feedback';

/** Accepts "@name", "name" or a pasted profile URL; returns just the handle. */
const cleanHandle = (v: string) =>
  v.trim().replace(/^https?:\/\/(www\.)?(instagram\.com|youtube\.com)\//i, '').replace(/^@/, '').replace(/[/?].*$/, '');
const HANDLE = /^[A-Za-z0-9._]{2,30}$/;

const LANGUAGES = ['English', 'Hindi', 'Marathi', 'Gujarati', 'Tamil', 'Telugu', 'Kannada', 'Bengali'];

/** Trainer edits their public profile. Approval/rating/fee fields are server-only (see firestore.rules). */
export default function EditTrainerProfile() {
  const { user, trainerProfile, setTrainerProfile, setUser } = useAuthStore();
  const p = trainerProfile;

  const [photo, setPhoto] = useState(p?.profilePhoto);
  const [video, setVideo] = useState(p?.videoIntroUrl);
  const [name, setName] = useState(p?.name ?? '');
  const [bio, setBio] = useState(p?.bio ?? '');
  const [city, setCity] = useState(p?.city ?? 'Mumbai');
  const [experience, setExperience] = useState(String(p?.experience ?? ''));
  const [specs, setSpecs] = useState<string[]>(p?.specializations ?? []);
  const [pref, setPref] = useState<SessionPreference>(p?.sessionPreference ?? 'both');
  const [levels, setLevels] = useState<AthleteLevel[]>(p?.coachesLevels ?? ['enthusiast']);
  const [feds, setFeds] = useState<string[]>(p?.federations ?? []);
  const [online, setOnline] = useState(p?.pricingOnline ? String(p.pricingOnline) : '');
  const [offline, setOffline] = useState(p?.pricingOffline ? String(p.pricingOffline) : '');
  const [places, setPlaces] = useState<InPersonPlace[]>(p && placesOf(p).length ? placesOf(p) : ['gym']);
  const [gyms, setGyms] = useState<GymRef[]>(
    p?.gyms ?? []
  );
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
  const [instagram, setInstagram] = useState('');
  const [youtube, setYoutube] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!p) return;
    getTrainerSocial(p.id).then((s) => { setInstagram(s.instagram ?? ''); setYoutube(s.youtube ?? ''); }).catch(() => {});
  }, [p?.id]);

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
    if (!video) errors.push('Add a 30–60 second intro video');
    if (name.trim().length < 2) errors.push('Enter your name');
    if (bio.trim().length < 20) errors.push('Write a bio of at least 20 characters');
    if (CONTACT_INFO_PATTERN.test(bio) || CONTACT_INFO_PATTERN.test(name)) errors.push(CONTACT_INFO_MESSAGE);
    if (!specs.length) errors.push('Pick at least one specialization');
    if (offersOnline && !(Number(online) > 0)) errors.push('Set your online price');
    if (offersOffline && !(Number(offline) > 0)) errors.push('Set your in-person price');
    if (offersOffline && !places.length) errors.push('Pick where you train clients in person');
    if (offersOffline && places.includes('gym') && !gyms.length) errors.push('Choose at least one gym where you train');
    const ig = cleanHandle(instagram);
    const yt = cleanHandle(youtube);
    if ((ig && !HANDLE.test(ig)) || (yt && !HANDLE.test(yt))) errors.push('Social handles can only use letters, numbers, dots and underscores');
    if (errors.length) return Alert.alert('Almost there', errors.join('\n'));

    setSaving(true);
    try {
      const profilePhoto = photo ? await uploadImage(photo, `users/${user.id}/profile.jpg`) : undefined;
      const videoIntroUrl = await uploadVideo(video!, `users/${user.id}/intro.mp4`);
      const changes: Partial<TrainerProfile> = {
        videoIntroUrl,
        name: name.trim(),
        bio: bio.trim(),
        city,
        experience: Number(experience) || 0,
        specializations: specs,
        sessionPreference: pref,
        coachesLevels: levels,
        federations: levels.some((l) => l !== 'enthusiast') ? feds : [],
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
        inPersonPlaces: offersOffline ? places : [],
        gyms: offersOffline && places.includes('gym') ? gyms : [],
        gymIds: offersOffline && places.includes('gym') ? gyms.map((g) => g.id) : [],
        gymLocation: undefined, // legacy single-gym field, replaced by `gyms`
      };
      await updateTrainerProfile(p.id, changes);
      await saveTrainerSocial(p.id, { instagram: ig || undefined, youtube: yt || undefined });
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

          <Field label="Intro video" hint="Required. 30–60 seconds, plays muted at the top of your profile.">
            <IntroVideoPicker uri={video} onChange={setVideo} />
          </Field>

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

          <Field label="Who do you coach?">
            <View style={styles.wrap}>
              {(Object.keys(AthleteLevelLabel) as AthleteLevel[]).map((l) => (
                <Chip key={l} label={AthleteLevelLabel[l]} active={levels.includes(l)}
                  onPress={() => setLevels(levels.includes(l) ? levels.filter((x) => x !== l) : [...levels, l])} />
              ))}
            </View>
          </Field>
          {levels.some((l) => l !== 'enthusiast') && (
            <Field label="Federations you've prepped athletes for">
              <View style={styles.wrap}>
                {FEDERATIONS.map((f) => (
                  <Chip key={f} label={f} active={feds.includes(f)} onPress={() => setFeds(feds.includes(f) ? feds.filter((x) => x !== f) : [...feds, f])} />
                ))}
              </View>
            </Field>
          )}

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
            <Field label="Where you train clients in person" hint="Home / society gyms and outdoors have no gym entry fee for the client.">
              <View style={styles.wrap}>
                {(Object.keys(PLACE_LABEL) as InPersonPlace[]).map((pl) => (
                  <Chip key={pl} label={PLACE_LABEL[pl]} icon={PLACE_ICON[pl]} active={places.includes(pl)}
                    onPress={() => setPlaces(places.includes(pl) ? places.filter((x) => x !== pl) : [...places, pl])} />
                ))}
              </View>
            </Field>
          )}
          {offersOffline && places.includes('gym') && (
            <Field label="Gyms where you're allowed to train" hint={p.gymLocation && !gyms.length ? `You previously entered "${p.gymLocation.name}". Pick it from the list or add it.` : undefined}>
              <GymPicker city={city} multiple selected={gyms} onChange={setGyms} placeholder="Choose your gyms" />
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

          <Field label="Social handles" hint="Shared with a client only after you accept their booking, so first contact stays on Bodivex.">
            <Input value={instagram} onChangeText={setInstagram} placeholder="Instagram, e.g. arjun.fitness" autoCapitalize="none" autoCorrect={false} />
            <Input value={youtube} onChangeText={setYoutube} placeholder="YouTube handle, e.g. arjuntrains" autoCapitalize="none" autoCorrect={false} />
          </Field>

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
