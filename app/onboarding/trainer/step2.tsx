import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../../stores/authStore';
import { OnboardingShell } from '../../../components/ui/OnboardingShell';
import { Field, Tile } from '../../../components/ui/Form';
import { Chip } from '../../../components/ui/Bits';
import { SPECIALIZATIONS } from '../../../types/trainer';
import { SessionPreference, AthleteLevel, AthleteLevelLabel, FEDERATIONS } from '../../../types/user';
import { GymRef, InPersonPlace, PLACE_LABEL, PLACE_ICON } from '../../../types/gym';
import { GymPicker } from '../../../components/gym/GymPicker';
import { placesOf } from '../../../services/trainers';

const MODES: { value: SessionPreference; label: string; desc: string; icon: 'videocam' | 'barbell' | 'swap-horizontal' }[] = [
  { value: 'online', label: 'Online', desc: 'Video sessions', icon: 'videocam' },
  { value: 'offline', label: 'In person', desc: 'At your gym', icon: 'barbell' },
  { value: 'both', label: 'Both', desc: 'Online + gym', icon: 'swap-horizontal' },
];

export default function TrainerStep2() {
  const { trainerProfile, setTrainerProfile } = useAuthStore();
  const [specs, setSpecs] = useState<string[]>(trainerProfile?.specializations ?? []);
  const [pref, setPref] = useState<SessionPreference>(trainerProfile?.sessionPreference ?? 'both');
  const [places, setPlaces] = useState<InPersonPlace[]>(placesOf(trainerProfile ?? {}).length ? placesOf(trainerProfile ?? {}) : ['gym']);
  const [gyms, setGyms] = useState<GymRef[]>(trainerProfile?.gyms ?? []);
  const [levels, setLevels] = useState<AthleteLevel[]>(trainerProfile?.coachesLevels ?? ['enthusiast']);
  const [feds, setFeds] = useState<string[]>(trainerProfile?.federations ?? []);

  const inPerson = pref !== 'online';
  // In-person coaches must say where; "at a gym" needs at least one real gym (no invented ones)
  const valid = specs.length > 0 && levels.length > 0 && (!inPerson || (places.length > 0 && (!places.includes('gym') || gyms.length > 0)));

  const next = () => {
    setTrainerProfile({
      ...trainerProfile!,
      specializations: specs,
      sessionPreference: pref,
      coachesLevels: levels,
      federations: levels.some((l) => l !== 'enthusiast') ? feds : [],
      inPersonPlaces: inPerson ? places : [],
      gyms: inPerson && places.includes('gym') ? gyms : [],
      gymIds: inPerson && places.includes('gym') ? gyms.map((g) => g.id) : [],
      gymLocation: undefined,
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
        <View style={styles.grid}>
          {MODES.map((m) => <Tile key={m.value} icon={m.icon} title={m.label} desc={m.desc} selected={pref === m.value} onPress={() => setPref(m.value)} />)}
        </View>
      </Field>

      {inPerson && (
        <Field label="Where can you train clients in person?" hint="Home / society gyms and outdoor sessions have no gym entry fee for the client.">
          <View style={styles.wrap}>
            {(Object.keys(PLACE_LABEL) as InPersonPlace[]).map((pl) => (
              <Chip key={pl} label={PLACE_LABEL[pl]} icon={PLACE_ICON[pl]} active={places.includes(pl)}
                onPress={() => setPlaces(places.includes(pl) ? places.filter((x) => x !== pl) : [...places, pl])} />
            ))}
          </View>
        </Field>
      )}
      {inPerson && places.includes('gym') && (
        <Field label="Gyms where you're allowed to train" hint="Clients at these gyms see a “Trains at your gym” badge and pay no outside-trainer fee.">
          <GymPicker city={trainerProfile?.city ?? 'Mumbai'} multiple selected={gyms} onChange={setGyms} placeholder="Choose your gyms" />
        </Field>
      )}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
