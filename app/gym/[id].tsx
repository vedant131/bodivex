import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { getGym, getTrainersAtGym, toRef } from '../../services/gyms';
import { updateTrainerProfile, placesOf } from '../../services/trainers';
import { saveClientProfile } from '../../services/auth';
import { TrainerCard } from '../../components/trainer/TrainerCard';
import { Screen } from '../../components/ui/Screen';
import { Glass } from '../../components/ui/Glass';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/Bits';
import { T, type } from '../../constants/theme';
import { Gym } from '../../types/gym';
import { TrainerProfile } from '../../types/trainer';
import { Alert } from '../../components/ui/Feedback';

export default function GymScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, clientProfile, trainerProfile, setClientProfile, setTrainerProfile } = useAuthStore();
  const isTrainer = user?.role === 'trainer';
  const [gym, setGym] = useState<Gym | null>(null);
  const [trainers, setTrainers] = useState<TrainerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const g = await getGym(id);
    setGym(g);
    if (g) setTrainers(await getTrainersAtGym(g));
    setLoading(false);
  };
  useEffect(() => { load().catch(() => setLoading(false)); }, [id]);

  if (loading || !gym) {
    return (
      <Screen preset="calm">
        {loading ? <ActivityIndicator color={T.text} style={{ marginTop: 80 }} /> : <Text style={[type.body, { padding: 24 }]}>Gym not found.</Text>}
      </Screen>
    );
  }

  const isMyGym = clientProfile?.gym?.id === gym.id;
  const iTrainHere = !!trainerProfile?.gymIds?.includes(gym.id);

  const setAsMyGym = async () => {
    if (!user || !clientProfile) return;
    setSaving(true);
    try {
      const changes = { gym: toRef(gym), gymName: gym.name, currentlyGoesToGym: true };
      await saveClientProfile(user.id, changes);
      setClientProfile({ ...clientProfile, ...changes });
    } catch (e: any) {
      Alert.alert('Could not save', e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleTrainHere = async () => {
    if (!trainerProfile) return;
    setSaving(true);
    try {
      const gyms = iTrainHere ? (trainerProfile.gyms ?? []).filter((g) => g.id !== gym.id) : [...(trainerProfile.gyms ?? []), toRef(gym)];
      const places = placesOf(trainerProfile);
      const changes = {
        gyms,
        gymIds: gyms.map((g) => g.id),
        inPersonPlaces: gyms.length && !places.includes('gym') ? [...places, 'gym' as const] : places,
      };
      await updateTrainerProfile(trainerProfile.id, changes);
      setTrainerProfile({ ...trainerProfile, ...changes });
      await load();
    } catch (e: any) {
      Alert.alert('Could not update', e.message);
    } finally {
      setSaving(false);
    }
  };

  const others = trainers.filter((t) => t.id !== trainerProfile?.id);

  return (
    <Screen preset={isTrainer ? 'trainer' : 'calm'} edges={['top']}>
      <View style={styles.header}>
        <IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 4 }}>
          <View style={styles.badge}><Ionicons name="barbell" size={26} color={T.ring2} /></View>
          <Text style={type.display}>{gym.name}</Text>
          <Text style={type.callout}>{[gym.area, gym.city].filter(Boolean).join(', ')}</Text>
        </View>

        {!isTrainer && clientProfile && (
          isMyGym ? (
            <Glass radius={T.radius.lg} style={styles.note}>
              <Ionicons name="checkmark-circle" size={18} color={T.ring2} />
              <Text style={[type.caption, { flex: 1 }]}>This is your gym. Coaches below train here, so there's no outside-trainer fee.</Text>
            </Glass>
          ) : (
            <Button title="Set as my gym" icon="barbell" variant="glass" size="md" onPress={setAsMyGym} loading={saving} />
          )
        )}
        {isTrainer && trainerProfile && (
          <Button
            title={iTrainHere ? 'Remove: I no longer train here' : 'I train here'}
            icon={iTrainHere ? 'close' : 'add'}
            variant={iTrainHere ? 'glass' : 'primary'}
            size="md"
            onPress={toggleTrainHere}
            loading={saving}
          />
        )}

        <Text style={type.headline}>
          {others.length ? (others.length === 1 ? '1 coach trains here' : `${others.length} coaches train here`) : 'No Bodivex coaches here yet'}
        </Text>
        {others.map((t) => <TrainerCard key={t.id} trainer={t} variant="full" />)}
        {!others.length && !isTrainer && (
          <Text style={type.caption}>Coaches offering home / society or outdoor sessions nearby are in Search.</Text>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingVertical: 8 },
  body: { padding: 20, gap: 14, paddingBottom: 40 },
  badge: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(155,255,58,0.16)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
});
