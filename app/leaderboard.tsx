import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuthStore } from '../stores/authStore';
import { rankTrainers, RankingScope, RankingMode, RankedTrainer, getTrainers } from '../services/trainers';
import { Screen } from '../components/ui/Screen';
import { Glass } from '../components/ui/Glass';
import { PressableScale } from '../components/ui/PressableScale';
import { Avatar, Chip, IconButton } from '../components/ui/Bits';
import { T, type } from '../constants/theme';
import { TrainerProfile } from '../types/trainer';
import { Skeleton } from '../components/ui/Skeleton';

const MODES: { id: RankingMode; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'online', label: 'Online' },
  { id: 'offline', label: 'In person' },
];
const MEDAL = ['#FFD54A', '#D8DEE9', '#E0A06B'];

const open = (r: RankedTrainer) => router.push(`/trainer/${r.trainer.id}`);

function Podium({ r, place }: { r: RankedTrainer; place: 0 | 1 | 2 }) {
  const size = place === 0 ? 84 : 66;
  return (
    <PressableScale onPress={() => open(r)} style={[styles.podium, place === 0 && { marginTop: -18 }]} accessibilityLabel={`Rank ${r.rank}, ${r.trainer.name}`}>
      <View style={[styles.medalRing, { borderColor: MEDAL[place] }]}>
        <Avatar uri={r.trainer.profilePhoto} name={r.trainer.name} size={size} radius={size / 2} />
      </View>
      <View style={[styles.medal, { backgroundColor: MEDAL[place] }]}>
        <Text style={styles.medalText}>{r.rank}</Text>
      </View>
      <Text style={[type.headline, { fontSize: 14, textAlign: 'center' }]} numberOfLines={1}>{r.trainer.name.split(' ')[0]}</Text>
      <Text style={type.caption}>{r.rating ? `${r.rating.toFixed(1)}★` : 'New'}</Text>
    </PressableScale>
  );
}

export default function LeaderboardScreen() {
  const { trainerProfile, clientProfile } = useAuthStore();
  const city = trainerProfile?.city || clientProfile?.city || 'Mumbai';
  const [scope, setScope] = useState<RankingScope>('city');
  const [mode, setMode] = useState<RankingMode>('all');
  const [trainers, setTrainers] = useState<TrainerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTrainers().then(setTrainers).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const ranked = useMemo(() => rankTrainers(trainers, scope, city, mode), [trainers, scope, city, mode]);
  const podium = ranked.length >= 3 ? ranked.slice(0, 3) : [];
  const rest = podium.length ? ranked.slice(3) : ranked;
  const myRank = trainerProfile ? ranked.find((r) => r.trainer.id === trainerProfile.id)?.rank : undefined;

  return (
    <Screen preset="hero" edges={['top']}>
      <View style={styles.header}>
        <IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <Text style={type.title}>Coach rankings</Text>
          <Text style={type.caption}>Based on in-app sessions, ratings and reviews</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.filters}>
          <Chip label={city} icon="location" active={scope === 'city'} onPress={() => setScope('city')} />
          <Chip label="All cities" active={scope === 'india'} onPress={() => setScope('india')} />
          <View style={styles.vsep} />
          {MODES.map((m) => <Chip key={m.id} label={m.label} active={mode === m.id} onPress={() => setMode(m.id)} />)}
        </View>

        {myRank && (
          <LinearGradient colors={T.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.mine}>
            <Ionicons name="trophy" size={20} color="#fff" />
            <Text style={styles.mineText}>You're #{myRank} {scope === 'city' ? `in ${city}` : 'overall'}</Text>
          </LinearGradient>
        )}

        {loading ? (
          <Skeleton variant="row" count={5} />
        ) : ranked.length === 0 ? (
          <Glass radius={T.radius.xl} style={styles.empty}>
            <Text style={type.caption}>No coaches match these filters yet.</Text>
          </Glass>
        ) : (
          <>
            {podium.length > 0 && (
              <Animated.View entering={FadeInDown.duration(500)}>
                <Glass radius={T.radius.xl} style={styles.podiumCard}>
                  <Podium r={podium[1]} place={1} />
                  <Podium r={podium[0]} place={0} />
                  <Podium r={podium[2]} place={2} />
                </Glass>
              </Animated.View>
            )}
            <View style={{ gap: 8 }}>
              {rest.map((r, i) => (
                <Animated.View key={r.trainer.id} entering={FadeInDown.delay(Math.min(i, 8) * 40)}>
                  <PressableScale onPress={() => open(r)} accessibilityLabel={`Rank ${r.rank}, ${r.trainer.name}`}>
                    <Glass radius={T.radius.lg} style={[styles.row, r.trainer.id === trainerProfile?.id && styles.rowMine]}>
                      <Text style={styles.rank}>{r.rank}</Text>
                      <Avatar uri={r.trainer.profilePhoto} name={r.trainer.name} size={42} radius={21} />
                      <View style={{ flex: 1 }}>
                        <Text style={type.headline} numberOfLines={1}>{r.trainer.name}</Text>
                        <Text style={type.caption}>{r.trainer.city} · {r.totalSessions} sessions · {r.rating ? `${r.rating.toFixed(1)}★` : 'New'}</Text>
                      </View>
                      <Text style={styles.score}>{r.score}</Text>
                    </Glass>
                  </PressableScale>
                </Animated.View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  body: { padding: 20, gap: 16, paddingBottom: 40 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  vsep: { width: 1, height: 22, backgroundColor: T.glassBorder, marginHorizontal: 2 },
  mine: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: T.radius.lg },
  mineText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  empty: { alignItems: 'center', padding: 24 },
  podiumCard: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', paddingTop: 34, paddingBottom: 16, paddingHorizontal: 8 },
  podium: { alignItems: 'center', gap: 4, width: 96 },
  medalRing: { borderWidth: 3, borderRadius: 999, padding: 3 },
  medal: { marginTop: -14, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: T.bg },
  medalText: { color: '#1a1a1a', fontSize: 12, fontWeight: '900' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  rowMine: { borderColor: T.accent, borderWidth: 1.5 },
  rank: { color: T.text3, fontSize: 16, fontWeight: '800', width: 24, textAlign: 'center' },
  score: { color: T.text, fontSize: 15, fontWeight: '800' },
});
