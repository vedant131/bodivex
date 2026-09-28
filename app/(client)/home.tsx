import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Modal, Pressable } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuthStore } from '../../stores/authStore';
import { useTrainerStore } from '../../stores/trainerStore';
import { subscribeToClientSessions } from '../../services/bookings';
import { TrainerCard } from '../../components/trainer/TrainerCard';
import { Backdrop } from '../../components/ui/Backdrop';
import { Glass } from '../../components/ui/Glass';
import { PressableScale } from '../../components/ui/PressableScale';
import { Rings } from '../../components/ui/Rings';
import { Avatar, Section } from '../../components/ui/Bits';
import { TAB_BAR_SPACE } from '../../components/ui/GlassTabBar';
import { T, type } from '../../constants/theme';
import { CITIES } from '../../constants/config';
import { Session } from '../../types/session';

const WEEKLY_GOAL = 3;

const startOfWeek = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
  return d;
};

function CitySheet({ visible, city, onPick, onClose }: {
  visible: boolean; city: string; onPick: (c: string) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Glass radius={T.radius.xl} style={styles.sheet}>
          <Text style={[type.title, { marginBottom: 8 }]}>Choose your city</Text>
          {CITIES.map((c) => (
            <PressableScale key={c} onPress={() => { onPick(c); onClose(); }} style={styles.cityRow}>
              <Text style={[type.body, c === city && { color: T.accent, fontWeight: '800' }]}>{c}</Text>
              {c === city && <Ionicons name="checkmark-circle" size={20} color={T.accent} />}
            </PressableScale>
          ))}
        </Glass>
      </Pressable>
    </Modal>
  );
}

export default function HomeScreen() {
  const { user, clientProfile } = useAuthStore();
  const { trainers, topTrainers, isLoading, fetchTrainers, fetchTopTrainers } = useTrainerStore();

  const [city, setCity] = useState<string>(clientProfile?.city ?? 'Mumbai');
  const [cityOpen, setCityOpen] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    if (clientProfile?.city) setCity(clientProfile.city);
  }, [clientProfile?.city]);

  useEffect(() => {
    if (!user) return;
    return subscribeToClientSessions(user.id, setSessions);
  }, [user?.id]);

  const load = useCallback(() => {
    fetchTrainers({
      city,
      specializations: clientProfile?.fitnessBlueprint?.recommendedFilters?.specializations,
      sessionPreference: clientProfile?.sessionPreference,
      athleteLevel: clientProfile?.athleteLevel && clientProfile.athleteLevel !== 'enthusiast' ? clientProfile.athleteLevel : undefined,
    });
    fetchTopTrainers(city);
  }, [city, clientProfile]);
  useEffect(load, [load]);

  const week = useMemo(() => {
    const from = startOfWeek().getTime();
    const thisWeek = sessions.filter((s) => s.scheduledAt.getTime() >= from && ['confirmed', 'completed'].includes(s.status));
    const next = sessions
      .filter((s) => s.status === 'confirmed' && s.scheduledAt.getTime() > Date.now())
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0];
    return {
      done: thisWeek.filter((s) => s.status === 'completed').length,
      booked: thisWeek.length,
      pending: sessions.filter((s) => s.status === 'pending').length,
      next,
    };
  }, [sessions]);

  const firstName = user?.name?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const matched = trainers.filter((t) => !topTrainers.slice(0, 6).some((x) => x.id === t.id));

  return (
    <View style={{ flex: 1 }}>
      <Backdrop preset="hero" />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE }}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={load} tintColor={T.text} />}
        >
          {/* Top bar */}
          <View style={styles.topBar}>
            <PressableScale onPress={() => setCityOpen(true)} accessibilityLabel={`City: ${city}. Change city`}>
              <Glass radius={T.radius.pill} interactive style={styles.cityPill}>
                <Ionicons name="location" size={14} color={T.accent} />
                <Text style={styles.cityText}>{city}</Text>
                <Ionicons name="chevron-down" size={14} color={T.text2} />
              </Glass>
            </PressableScale>
            <PressableScale onPress={() => router.push('/(client)/profile')} accessibilityLabel="Profile">
              <Avatar uri={user?.profilePhoto} name={user?.name || 'You'} size={40} radius={20} />
            </PressableScale>
          </View>

          {/* Greeting */}
          <Animated.View entering={FadeInDown.duration(500)} style={styles.px}>
            <Text style={[type.callout, { marginTop: 18 }]}>{hello}, {firstName}</Text>
            <Text style={styles.hero}>
              Let's get{'\n'}<Text style={{ color: T.accent }}>stronger.</Text>
            </Text>
          </Animated.View>

          {/* Weekly rings */}
          <Animated.View entering={FadeInDown.delay(120).duration(500)} style={styles.px}>
            <PressableScale onPress={() => router.push('/(client)/sessions')} accessibilityLabel="Your week">
              <Glass radius={T.radius.xl} style={styles.weekCard}>
                <Rings
                  size={78}
                  rings={[
                    { progress: week.booked / WEEKLY_GOAL, color: T.ring1 },
                    { progress: week.done / WEEKLY_GOAL, color: T.ring2 },
                    { progress: week.pending ? 0.35 : 0, color: T.ring3 },
                  ]}
                />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={type.headline}>{week.booked} of {WEEKLY_GOAL} sessions this week</Text>
                  <Text style={type.caption} numberOfLines={2}>
                    {week.next
                      ? `Next: ${week.next.scheduledAt.toLocaleString('en-IN', { weekday: 'short', hour: 'numeric', minute: '2-digit' })} with ${week.next.trainerName.split(' ')[0]}`
                      : week.pending
                      ? `${week.pending} request${week.pending > 1 ? 's' : ''} waiting for the coach`
                      : 'Book your first session to start your streak'}
                  </Text>
                  <View style={styles.legend}>
                    <Legend color={T.ring1} label="Booked" />
                    <Legend color={T.ring2} label="Done" />
                    <Legend color={T.ring3} label="Pending" />
                  </View>
                </View>
              </Glass>
            </PressableScale>
          </Animated.View>

          {/* Search */}
          <View style={styles.px}>
            <PressableScale onPress={() => router.push('/(client)/search')} accessibilityLabel="Search coaches">
              <Glass radius={T.radius.lg} interactive style={styles.search}>
                <Ionicons name="search" size={18} color={T.text2} />
                <Text style={[type.callout, { flex: 1, color: T.text3 }]}>Try "yoga for back pain"</Text>
                <View style={styles.searchBtn}>
                  <Ionicons name="options-outline" size={16} color={T.text} />
                </View>
              </Glass>
            </PressableScale>
          </View>

          {/* Two quick tiles, each going somewhere different (search already has its own tab) */}
          <View style={[styles.px, styles.tiles]}>
            <PressableScale style={{ flex: 1 }} onPress={() => router.push('/(client)/profile')} accessibilityLabel="Your plan">
              <LinearGradient colors={T.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tile}>
                <Ionicons name="sparkles" size={24} color="#fff" />
                <View>
                  <Text style={styles.tileTitle}>Your plan</Text>
                  <Text style={styles.tileSub} numberOfLines={2}>
                    {clientProfile?.fitnessBlueprint?.trainerType ?? 'Goals, style & timeline'}
                  </Text>
                </View>
              </LinearGradient>
            </PressableScale>
            <PressableScale style={{ flex: 1 }} onPress={() => router.push('/leaderboard')} accessibilityLabel="Coach rankings">
              <Glass radius={T.radius.xl} style={styles.tile}>
                <View style={styles.tileIcon}><Ionicons name="trophy" size={20} color={T.warning} /></View>
                <View>
                  <Text style={styles.tileTitle}>Rankings</Text>
                  <Text style={[styles.tileSub, { color: T.text2 }]}>Top coaches in {city}</Text>
                </View>
              </Glass>
            </PressableScale>
          </View>

          {/* Top coaches carousel */}
          <View style={{ marginTop: 28 }}>
            <Section title={`Top coaches in ${city}`} action="See all" onAction={() => router.push('/(client)/search')} style={styles.px} />
            {topTrainers.length === 0 && !isLoading ? (
              <View style={styles.px}>
                <Glass radius={T.radius.lg} style={styles.empty}>
                  <Ionicons name="people-outline" size={22} color={T.text2} />
                  <Text style={type.caption}>No coaches in {city} yet. Try Online coaches or another city.</Text>
                </Glass>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
                {topTrainers.map((t) => <TrainerCard key={t.id} trainer={t} variant="compact" />)}
              </ScrollView>
            )}
          </View>

          {/* Matched list */}
          {matched.length > 0 && (
            <View style={[styles.px, { marginTop: 28, gap: 10 }]}>
              <Section title="Matched for you" />
              {matched.map((t) => <TrainerCard key={t.id} trainer={t} variant="full" />)}
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
      <CitySheet visible={cityOpen} city={city} onPick={setCity} onClose={() => setCityOpen(false)} />
    </View>
  );
}

const Legend = ({ color, label }: { color: string; label: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />
    <Text style={{ color: T.text3, fontSize: 11, fontWeight: '700' }}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  px: { paddingHorizontal: 20 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8 },
  cityPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38 },
  cityText: { color: T.text, fontSize: 14, fontWeight: '700' },
  hero: { color: T.text, fontSize: 40, fontWeight: '900', letterSpacing: -1.4, lineHeight: 44, marginTop: 4 },
  weekCard: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, marginTop: 20 },
  legend: { flexDirection: 'row', gap: 10, marginTop: 4 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 54, paddingLeft: 16, paddingRight: 8, marginTop: 14 },
  searchBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: T.glassStrong, alignItems: 'center', justifyContent: 'center' },
  tiles: { flexDirection: 'row', gap: 10, height: 132, marginTop: 20 },
  tile: { flex: 1, borderRadius: T.radius.xl, padding: 16, justifyContent: 'space-between' },
  tileTitle: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  tileSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600', marginTop: 2 },
  tileIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,176,32,0.16)', alignItems: 'center', justifyContent: 'center' },
  empty: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  scrim: { flex: 1, backgroundColor: T.scrim, justifyContent: 'flex-end', padding: 12 },
  sheet: { padding: 20, gap: 2, marginBottom: 12 },
  cityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
});
