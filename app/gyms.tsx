import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { getGymsInCity, getTrainerCountsByGym } from '../services/gyms';
import { Screen } from '../components/ui/Screen';
import { Glass } from '../components/ui/Glass';
import { PressableScale } from '../components/ui/PressableScale';
import { Chip, IconButton } from '../components/ui/Bits';
import { GymPicker } from '../components/gym/GymPicker';
import { T, type } from '../constants/theme';
import { CITIES } from '../constants/config';
import { Gym } from '../types/gym';

/** Gyms in your area, for clients and trainers: how many Bodivex coaches train at each. */
export default function GymsScreen() {
  const { user, clientProfile, trainerProfile } = useAuthStore();
  const isTrainer = user?.role === 'trainer';
  const [city, setCity] = useState<string>(trainerProfile?.city ?? clientProfile?.city ?? 'Mumbai');
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const mine = new Set(isTrainer ? trainerProfile?.gymIds ?? [] : clientProfile?.gym ? [clientProfile.gym.id] : []);

  useEffect(() => {
    setLoading(true);
    Promise.all([getGymsInCity(city), getTrainerCountsByGym(city)])
      .then(([g, c]) => { setGyms(g); setCounts(c); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [city]);

  const sorted = useMemo(
    () => [...gyms].sort((a, b) =>
      Number(mine.has(b.id)) - Number(mine.has(a.id)) || (counts[b.id] ?? 0) - (counts[a.id] ?? 0) || a.name.localeCompare(b.name)),
    [gyms, counts, clientProfile?.gym?.id, trainerProfile?.gymIds]
  );

  return (
    <Screen preset={isTrainer ? 'trainer' : 'calm'} edges={['top']}>
      <View style={styles.header}>
        <IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <Text style={type.title}>Gyms in your area</Text>
          <Text style={type.caption}>
            {isTrainer ? 'Mark where you train so nearby clients find you' : 'See which coaches train at each gym'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {CITIES.map((c) => <Chip key={c} label={c} icon={c === city ? 'location' : undefined} active={c === city} onPress={() => setCity(c)} />)}
        </ScrollView>

        <GymPicker city={city} selected={[]} onChange={(g) => g[0] && router.push(`/gym/${g[0].id}` as any)} placeholder="Find or add a gym" />

        {loading ? (
          <ActivityIndicator color={T.text} style={{ marginTop: 30 }} />
        ) : sorted.length === 0 ? (
          <Glass radius={T.radius.xl} style={styles.empty}>
            <Ionicons name="barbell-outline" size={28} color={T.text2} />
            <Text style={[type.caption, { textAlign: 'center' }]}>No gyms added in {city} yet. Add yours above.</Text>
          </Glass>
        ) : (
          sorted.map((g) => {
            const n = counts[g.id] ?? 0;
            const isMine = mine.has(g.id);
            return (
              <PressableScale key={g.id} onPress={() => router.push(`/gym/${g.id}` as any)} accessibilityLabel={`${g.name}, ${n} coaches`}>
                <Glass radius={T.radius.lg} style={[styles.row, isMine && styles.rowMine]}>
                  <View style={[styles.icon, isMine && { backgroundColor: 'rgba(155,255,58,0.18)' }]}>
                    <Ionicons name="barbell" size={18} color={isMine ? T.ring2 : T.text2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={type.headline} numberOfLines={1}>{g.name}</Text>
                    <Text style={type.caption}>{[g.area, isMine ? (isTrainer ? 'you train here' : 'your gym') : null].filter(Boolean).join(' · ')}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.count}>{n}</Text>
                    <Text style={type.caption}>coach{n === 1 ? '' : 'es'}</Text>
                  </View>
                </Glass>
              </PressableScale>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  body: { padding: 20, gap: 12, paddingBottom: 40 },
  empty: { alignItems: 'center', gap: 8, padding: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  rowMine: { borderColor: T.ring2, borderWidth: 1.5 },
  icon: { width: 40, height: 40, borderRadius: 13, backgroundColor: T.glassStrong, alignItems: 'center', justifyContent: 'center' },
  count: { color: T.text, fontSize: 20, fontWeight: '800' },
});
