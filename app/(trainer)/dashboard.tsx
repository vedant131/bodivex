import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useAuthStore } from '../../stores/authStore';
import {
  updateAvailability, getTrainerProfileReachScore, getTransformations, getTrainerQA,
} from '../../services/trainers';
import {
  subscribeToTrainerSessions, trainerAcceptSession, getAcceptFee, trainerRejectSession,
} from '../../services/bookings';
import { openVideoCall } from '../../services/video';
import { Backdrop } from '../../components/ui/Backdrop';
import { Glass } from '../../components/ui/Glass';
import { Button } from '../../components/ui/Button';
import { PressableScale } from '../../components/ui/PressableScale';
import { Rings } from '../../components/ui/Rings';
import { Avatar, Section, IconButton } from '../../components/ui/Bits';
import { TAB_BAR_SPACE } from '../../components/ui/GlassTabBar';
import { T, type } from '../../constants/theme';
import { CONFIG } from '../../constants/config';
import { Session } from '../../types/session';

const WEEK_TARGET = 10;
const when = (d: Date) => d.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export default function TrainerDashboardScreen() {
  const { user, trainerProfile, setTrainerProfile } = useAuthStore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [counts, setCounts] = useState({ transformations: 0, answeredQA: 0 });

  const trainerId = trainerProfile?.id ?? '';
  const approved = trainerProfile?.kycStatus === 'approved';

  useEffect(() => {
    if (!trainerId) return;
    const unsub = subscribeToTrainerSessions(trainerId, (list) => {
      setSessions(list);
      setLoading(false);
    });
    Promise.all([getTransformations(trainerId), getTrainerQA(trainerId)])
      .then(([tr, qa]) => setCounts({ transformations: tr.length, answeredQA: qa.filter((q) => q.answer).length }))
      .catch(() => {});
    return unsub;
  }, [trainerId]);

  const toggleBookings = async (value: boolean) => {
    if (!trainerProfile) return;
    setTrainerProfile({ ...trainerProfile, isAvailableNow: value });
    try {
      await updateAvailability(trainerProfile.id, value);
    } catch (e: any) {
      setTrainerProfile({ ...trainerProfile, isAvailableNow: !value });
      Alert.alert('Could not update', e.message);
    }
  };

  const confirmAccept = async (req: Session, payment?: 'dev-simulated') => {
    setBusyId(req.id);
    try {
      const { fee } = await trainerAcceptSession(req.id, payment);
      Alert.alert('Booking confirmed', `${fee ? `Paid ₹${fee}. ` : ''}${req.clientName} has been notified and chat is open.`);
    } catch (e: any) {
      Alert.alert('Could not accept', e.message);
    } finally {
      setBusyId(null);
    }
  };

  const accept = async (req: Session) => {
    if (!trainerProfile) return;
    try {
      const fee = await getAcceptFee(trainerProfile.id, req.clientId, trainerProfile.leadCount ?? 0);
      if (fee === 0) return confirmAccept(req);
      // Note: simulated payment in dev; Razorpay checkout replaces this at launch
      Alert.alert(
        `Pay ₹${fee} to accept`,
        `${req.clientName} is a new client. Your ${CONFIG.freeClientsPerTrainer} free clients are used, so a one-time ₹${fee} applies. Returning clients are always free.`,
        [{ text: 'Not now', style: 'cancel' }, { text: `Pay ₹${fee} (test)`, onPress: () => confirmAccept(req, 'dev-simulated') }]
      );
    } catch (e: any) {
      Alert.alert('Could not accept', e.message);
    }
  };

  const decline = (req: Session) =>
    Alert.alert('Decline request?', `${req.clientName} will be told you can't make ${when(req.scheduledAt)}.`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: () => trainerRejectSession(req.id, 'Trainer declined').catch((e) => Alert.alert('Error', e.message)),
      },
    ]);

  const stats = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 864e5;
    const inWeek = now + 7 * 864e5;
    return {
      pending: sessions.filter((s) => s.status === 'pending' && s.scheduledAt.getTime() > now)
        .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime()),
      upcoming: sessions.filter((s) => s.status === 'confirmed' && s.scheduledAt.getTime() > now - 3600e3)
        .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime()),
      week: sessions.filter((s) => ['confirmed', 'completed'].includes(s.status) && s.scheduledAt.getTime() > weekAgo && s.scheduledAt.getTime() < inWeek).length,
      clients: new Set(sessions.filter((s) => s.status !== 'cancelled').map((s) => s.clientId)).size,
    };
  }, [sessions]);

  const reach = getTrainerProfileReachScore(trainerProfile, counts);
  const nextTodo = reach.checklist.find((c) => !c.completed);
  const freeLeft = Math.max(0, CONFIG.freeClientsPerTrainer - (trainerProfile?.leadCount ?? 0));
  const first = (trainerProfile?.name || user?.name || 'Coach').split(' ')[0];
  const rating = trainerProfile?.totalReviews ? trainerProfile.rating : 0;

  return (
    <View style={{ flex: 1 }}>
      <Backdrop preset="trainer" />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: TAB_BAR_SPACE, gap: 14 }} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={type.callout}>Hi {first}</Text>
              <Text style={styles.hero}>
                {stats.pending.length > 0 ? (
                  <>
                    <Text style={{ color: T.accent }}>{stats.pending.length} new</Text> request{stats.pending.length > 1 ? 's' : ''}
                  </>
                ) : stats.upcoming.length > 0 ? (
                  `${stats.upcoming.length} session${stats.upcoming.length > 1 ? 's' : ''} ahead`
                ) : (
                  'All caught up'
                )}
              </Text>
            </View>
            <IconButton icon="trophy-outline" label="Rankings" onPress={() => router.push('/leaderboard')} />
          </View>

          {!approved && (
            <Glass radius={T.radius.lg} style={styles.banner}>
              <Ionicons name="hourglass-outline" size={20} color={T.warning} />
              <View style={{ flex: 1 }}>
                <Text style={type.headline}>Profile under review</Text>
                <Text style={type.caption}>Clients can see you once our team verifies your ID and certificates.</Text>
              </View>
            </Glass>
          )}

          {/* Rings */}
          <Animated.View entering={FadeInDown.duration(500)}>
            <Glass radius={T.radius.xl} style={styles.ringsCard}>
              <Rings
                size={96}
                rings={[
                  { progress: stats.week / WEEK_TARGET, color: T.ring1 },
                  { progress: stats.clients / 15, color: T.ring2 },
                  { progress: rating / 5, color: T.ring3 },
                ]}
              />
              <View style={{ flex: 1, gap: 8 }}>
                <RingStat color={T.ring1} value={`${stats.week}`} label="sessions this week" />
                <RingStat color={T.ring2} value={`${stats.clients}`} label="clients" />
                <RingStat color={T.ring3} value={rating ? rating.toFixed(1) : '–'} label="rating" />
              </View>
            </Glass>
          </Animated.View>

          {/* Taking bookings */}
          <Glass radius={T.radius.lg} style={styles.toggle}>
            <View style={[styles.statusDot, { backgroundColor: trainerProfile?.isAvailableNow ? T.ring2 : T.text3 }]} />
            <View style={{ flex: 1 }}>
              <Text style={type.headline}>{trainerProfile?.isAvailableNow ? 'Taking bookings' : 'Not taking bookings'}</Text>
              <Text style={type.caption}>
                {trainerProfile?.isAvailableNow ? 'Clients can send you requests' : "Clients see you but can't book"}
              </Text>
            </View>
            <Switch
              value={!!trainerProfile?.isAvailableNow}
              onValueChange={toggleBookings}
              trackColor={{ true: T.ring2, false: T.glassStrong }}
              thumbColor="#fff"
              accessibilityLabel="Taking bookings"
            />
          </Glass>

          {/* Requests */}
          <View style={{ marginTop: 8 }}>
            <Section title="Requests" action={freeLeft > 0 ? `${freeLeft} free left` : `₹${CONFIG.newClientFee}/new client`} />
            {loading ? (
              <ActivityIndicator color={T.text} />
            ) : stats.pending.length === 0 ? (
              <Glass radius={T.radius.lg} style={styles.empty}>
                <Ionicons name="mail-open-outline" size={20} color={T.text2} />
                <Text style={type.caption}>No pending requests. New ones show up here instantly.</Text>
              </Glass>
            ) : (
              <View style={{ gap: 10 }}>
                {stats.pending.map((req) => (
                  <Animated.View key={req.id} layout={LinearTransition} entering={FadeInDown}>
                    <Glass radius={T.radius.xl} style={styles.req}>
                      <View style={styles.reqTop}>
                        <Avatar uri={req.clientPhoto} name={req.clientName} size={44} radius={22} />
                        <View style={{ flex: 1 }}>
                          <Text style={type.headline}>{req.clientName}</Text>
                          <Text style={type.caption}>
                            {when(req.scheduledAt)} · {req.type === 'online' ? 'Online' : 'In person'}
                          </Text>
                        </View>
                        <Text style={styles.reqPrice}>₹{req.price}</Text>
                      </View>
                      <View style={styles.reqActions}>
                        <Button title="Decline" variant="glass" size="md" onPress={() => decline(req)} style={{ flex: 1 }} />
                        <Button title="Accept" size="md" icon="checkmark" onPress={() => accept(req)} loading={busyId === req.id} style={{ flex: 1.6 }} />
                      </View>
                    </Glass>
                  </Animated.View>
                ))}
              </View>
            )}
          </View>

          {/* Upcoming */}
          {stats.upcoming.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Section title="Upcoming" />
              <View style={{ gap: 10 }}>
                {stats.upcoming.map((s) => (
                  <Glass key={s.id} radius={T.radius.lg} style={styles.up}>
                    <View style={styles.upTime}>
                      <Text style={styles.upDay}>{s.scheduledAt.toLocaleDateString('en-IN', { weekday: 'short' })}</Text>
                      <Text style={styles.upHour}>{s.scheduledAt.toLocaleTimeString('en-IN', { hour: 'numeric', hour12: true })}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={type.headline}>{s.clientName}</Text>
                      <Text style={type.caption}>{s.type === 'online' ? 'Online video' : 'At the gym'} · {s.durationMins} min</Text>
                    </View>
                    {s.chatId && (
                      <IconButton icon="chatbubble-ellipses" label={`Chat with ${s.clientName}`} size={38}
                        onPress={() => router.push({ pathname: '/chat/[id]', params: { id: s.chatId!, name: s.clientName } })} />
                    )}
                    {s.type === 'online' && (
                      <IconButton icon="videocam" label="Start call" size={38} onPress={() => openVideoCall(s.videoCallRoomId)} />
                    )}
                  </Glass>
                ))}
              </View>
            </View>
          )}

          {/* Profile strength */}
          {nextTodo && (
            <PressableScale onPress={() => router.push('/(trainer)/profile')} accessibilityLabel="Improve your profile">
              <Glass radius={T.radius.lg} style={styles.reach}>
                <View style={styles.reachRing}>
                  <Rings size={44} stroke={6} rings={[{ progress: reach.score / 100, color: T.ring2 }]} />
                  <Text style={styles.reachPct}>{reach.score}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={type.headline}>Profile {reach.score}% complete</Text>
                  <Text style={type.caption}>Next: {nextTodo.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={T.text3} />
              </Glass>
            </PressableScale>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const RingStat = ({ color, value, label }: { color: string; value: string; label: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
    <Text style={{ color: T.text, fontSize: 20, fontWeight: '800' }}>{value}</Text>
    <Text style={type.caption}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  hero: { color: T.text, fontSize: 32, fontWeight: '900', letterSpacing: -1, marginTop: 2 },
  banner: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, borderColor: 'rgba(255,176,32,0.35)' },
  ringsCard: { flexDirection: 'row', alignItems: 'center', gap: 18, padding: 18 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  empty: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  req: { padding: 14, gap: 12 },
  reqTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reqPrice: { color: T.text, fontSize: 18, fontWeight: '800' },
  reqActions: { flexDirection: 'row', gap: 10 },
  up: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  upTime: { width: 56, height: 56, borderRadius: 16, backgroundColor: T.glassStrong, alignItems: 'center', justifyContent: 'center' },
  upDay: { color: T.text2, fontSize: 11, fontWeight: '700' },
  upHour: { color: T.text, fontSize: 15, fontWeight: '800' },
  reach: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginTop: 8 },
  reachRing: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  reachPct: { position: 'absolute', color: T.text, fontSize: 12, fontWeight: '800' },
});
