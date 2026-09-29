import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert, Modal, TextInput, Pressable, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { subscribeToClientSessions, clientCompleteSession, clientCancelSession } from '../../services/bookings';
import { openVideoCall } from '../../services/video';
import { Screen } from '../../components/ui/Screen';
import { Glass } from '../../components/ui/Glass';
import { Button } from '../../components/ui/Button';
import { PressableScale } from '../../components/ui/PressableScale';
import { Avatar, Chip, IconButton } from '../../components/ui/Bits';
import { TAB_BAR_SPACE } from '../../components/ui/GlassTabBar';
import { T, type } from '../../constants/theme';
import { Session } from '../../types/session';

type Tab = 'upcoming' | 'past';

const STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Waiting for coach', color: T.warning },
  expired: { label: 'Expired', color: T.text3 },
  confirmed: { label: 'Confirmed', color: T.ring2 },
  completed: { label: 'Completed', color: T.ring3 },
  cancelled: { label: 'Cancelled', color: T.text3 },
  declined: { label: 'Declined by coach', color: T.danger },
};

export default function ClientSessionsScreen() {
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('upcoming');
  const [rateFor, setRateFor] = useState<Session | null>(null);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    return subscribeToClientSessions(user.id, (list) => {
      setSessions(list);
      setLoading(false);
    });
  }, [user?.id]);

  const now = Date.now();
  const statusOf = (s: Session) =>
    s.status === 'pending' && s.scheduledAt.getTime() < now ? 'expired'
      : s.status === 'cancelled' && s.cancelReason !== 'Cancelled by client' ? 'declined'
      : s.status;

  const list = useMemo(() => {
    const upcoming = (s: Session) => (s.status === 'pending' && s.scheduledAt.getTime() >= now) || s.status === 'confirmed';
    return sessions
      .filter((s) => (tab === 'upcoming' ? upcoming(s) : !upcoming(s)))
      .sort((a, b) => (tab === 'upcoming' ? 1 : -1) * (a.scheduledAt.getTime() - b.scheduledAt.getTime()));
  }, [sessions, tab]);

  const cancel = (s: Session) =>
    Alert.alert('Cancel request?', `Your request to ${s.trainerName} will be withdrawn.`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel request', style: 'destructive', onPress: () => clientCancelSession(s).catch((e) => Alert.alert('Error', e.message)) },
    ]);

  const submitRating = async () => {
    if (!rateFor) return;
    setSubmitting(true);
    try {
      await clientCompleteSession(rateFor.id, rating, review.trim() || undefined);
      setRateFor(null);
    } catch (e: any) {
      Alert.alert('Could not save', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen preset="calm" edges={['top']}>
      <View style={styles.head}>
        <Text style={type.title}>Bookings</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip label="Upcoming" active={tab === 'upcoming'} onPress={() => setTab('upcoming')} />
          <Chip label="Past" active={tab === 'past'} onPress={() => setTab('past')} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={T.text} style={{ marginTop: 40 }} />
        ) : list.length === 0 ? (
          <Glass radius={T.radius.xl} style={styles.empty}>
            <Ionicons name="calendar-outline" size={30} color={T.text2} />
            <Text style={type.headline}>{tab === 'upcoming' ? 'Nothing booked yet' : 'No past sessions'}</Text>
            {tab === 'upcoming' && (
              <Button title="Find a coach" icon="search" size="md" onPress={() => router.push('/(client)/search')} style={{ marginTop: 8 }} />
            )}
          </Glass>
        ) : (
          list.map((s) => {
            const st = STATUS[statusOf(s)];
            const confirmed = s.status === 'confirmed';
            const started = s.scheduledAt.getTime() <= now;
            return (
              <Glass key={s.id} radius={T.radius.xl} style={styles.card}>
                <View style={styles.top}>
                  <View style={styles.date}>
                    <Text style={styles.dateDay}>{s.scheduledAt.toLocaleDateString('en-IN', { weekday: 'short' })}</Text>
                    <Text style={styles.dateNum}>{s.scheduledAt.getDate()}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={type.headline}>{s.trainerName}</Text>
                    <Text style={type.caption}>
                      {s.scheduledAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })} · {s.type === 'online' ? 'Online' : s.placeLabel ?? 'In person'} · ₹{s.price}
                    </Text>
                    <View style={styles.status}>
                      <View style={[styles.dot, { backgroundColor: st.color }]} />
                      <Text style={[type.caption, { color: st.color }]}>{st.label}</Text>
                      {s.clientRating ? <Text style={type.caption}> · You rated {s.clientRating}★</Text> : null}
                    </View>
                  </View>
                  <Avatar uri={s.trainerPhoto} name={s.trainerName} size={44} radius={22} />
                </View>

                {(confirmed || s.status === 'pending') && statusOf(s) !== 'expired' && (
                  <View style={styles.actions}>
                    {confirmed && s.chatId && (
                      <IconButton icon="chatbubble-ellipses" label="Chat" size={42}
                        onPress={() => router.push({ pathname: '/chat/[id]', params: { id: s.chatId!, name: s.trainerName, photo: s.trainerPhoto } })} />
                    )}
                    {confirmed && s.trainerSocial?.instagram && (
                      <IconButton icon="logo-instagram" label={`${s.trainerName} on Instagram`} size={42}
                        onPress={() => Linking.openURL(`https://instagram.com/${s.trainerSocial!.instagram}`)} />
                    )}
                    {confirmed && s.trainerSocial?.youtube && (
                      <IconButton icon="logo-youtube" label={`${s.trainerName} on YouTube`} size={42}
                        onPress={() => Linking.openURL(`https://youtube.com/@${s.trainerSocial!.youtube}`)} />
                    )}
                    {confirmed && s.type === 'online' && (
                      <Button title="Join call" icon="videocam" variant="glass" size="sm" onPress={() => openVideoCall(s.videoCallRoomId)} />
                    )}
                    <View style={{ flex: 1 }} />
                    {confirmed && started && (
                      <Button title="Done · rate" size="sm" onPress={() => { setRateFor(s); setRating(5); setReview(''); }} />
                    )}
                    {s.status === 'pending' && (
                      <Button title="Cancel request" variant="danger" size="sm" onPress={() => cancel(s)} />
                    )}
                  </View>
                )}
              </Glass>
            );
          })
        )}
      </ScrollView>

      {/* Rate sheet */}
      <Modal visible={!!rateFor} transparent animationType="fade" onRequestClose={() => setRateFor(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Pressable style={styles.scrim} onPress={() => setRateFor(null)}>
            <Pressable onPress={() => {}}>
              <Glass radius={T.radius.xl} style={styles.sheet}>
                <Text style={type.title}>How was it?</Text>
                <Text style={type.caption}>Your rating helps other clients choose {rateFor?.trainerName}.</Text>
                <View style={styles.stars}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <PressableScale key={i} onPress={() => setRating(i)} accessibilityLabel={`${i} stars`}>
                      <Ionicons name={i <= rating ? 'star' : 'star-outline'} size={38} color={T.star} />
                    </PressableScale>
                  ))}
                </View>
                <Glass radius={T.radius.md} style={{ padding: 12 }}>
                  <TextInput
                    style={styles.reviewInput}
                    placeholder="Write a short review (optional)"
                    placeholderTextColor={T.text3}
                    value={review}
                    onChangeText={setReview}
                    multiline
                    maxLength={500}
                    selectionColor={T.accent}
                  />
                </Glass>
                <Button title="Submit" icon="checkmark" onPress={submitRating} loading={submitting} />
              </Glass>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 },
  list: { paddingHorizontal: 20, gap: 12, paddingBottom: TAB_BAR_SPACE },
  empty: { alignItems: 'center', gap: 8, padding: 28, marginTop: 20 },
  card: { padding: 14, gap: 12 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  date: { width: 52, height: 58, borderRadius: 16, backgroundColor: T.glassStrong, alignItems: 'center', justifyContent: 'center' },
  dateDay: { color: T.text2, fontSize: 11, fontWeight: '700' },
  dateNum: { color: T.text, fontSize: 20, fontWeight: '800' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scrim: { flex: 1, backgroundColor: T.scrim, justifyContent: 'flex-end', padding: 12 },
  sheet: { padding: 20, gap: 14, marginBottom: 8 },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 4 },
  reviewInput: { color: T.text, fontSize: 16, minHeight: 80, textAlignVertical: 'top' },
});
