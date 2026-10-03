import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, Linking } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/ui/Screen';
import { Glass } from '../components/ui/Glass';
import { Button } from '../components/ui/Button';
import { Avatar, Chip, IconButton } from '../components/ui/Bits';
import { Skeleton } from '../components/ui/Skeleton';
import { Alert, toast } from '../components/ui/Feedback';
import { IntroVideoPlayer } from '../components/trainer/IntroVideo';
import { isAdmin, getCoachesForReview, reviewCoach, CoachForReview, ReviewStatus } from '../services/admin';
import { T, type } from '../constants/theme';

const TABS: { id: ReviewStatus; label: string }[] = [
  { id: 'pending', label: 'Waiting' },
  { id: 'rejected', label: 'Needs changes' },
  { id: 'approved', label: 'Approved' },
];

/** Bodivex team: approve or reject new coaches. Access is enforced on the server (admins table). */
export default function AdminScreen() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<ReviewStatus>('pending');
  const [coaches, setCoaches] = useState<CoachForReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { isAdmin().then(setAllowed).catch(() => setAllowed(false)); }, []);

  const load = useCallback(() => {
    setLoading(true);
    getCoachesForReview(tab).then(setCoaches).catch((e) => Alert.alert('Could not load', e.message)).finally(() => setLoading(false));
  }, [tab]);
  useEffect(() => { if (allowed) load(); }, [allowed, load]);

  const done = (id: string) => setCoaches((list) => list.filter((c) => c.id !== id));

  return (
    <Screen preset="calm" edges={['top']}>
      <View style={styles.header}>
        <IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <Text style={type.title}>Review coaches</Text>
          <Text style={type.caption}>Check ID and certificates before approving</Text>
        </View>
      </View>

      {allowed === false ? (
        <Glass radius={T.radius.xl} style={[styles.empty, { margin: 20 }]}>
          <Ionicons name="lock-closed-outline" size={26} color={T.text2} />
          <Text style={[type.caption, { textAlign: 'center' }]}>This area is only for the Bodivex team.</Text>
        </Glass>
      ) : (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.tabs}>
            {TABS.map((t) => <Chip key={t.id} label={t.label} active={tab === t.id} onPress={() => setTab(t.id)} />)}
          </View>
          {loading || allowed === null ? (
            <Skeleton variant="card" count={2} />
          ) : coaches.length === 0 ? (
            <Glass radius={T.radius.xl} style={styles.empty}>
              <Ionicons name="checkmark-done-outline" size={26} color={T.text2} />
              <Text style={[type.caption, { textAlign: 'center' }]}>
                {tab === 'pending' ? 'No coaches waiting. New sign-ups appear here.' : 'Nobody in this list.'}
              </Text>
            </Glass>
          ) : (
            coaches.map((c) => <CoachReviewCard key={c.id} coach={c} status={tab} onDone={done} />)
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

function CoachReviewCard({ coach: c, status, onDone }: { coach: CoachForReview; status: ReviewStatus; onDone: (id: string) => void }) {
  const [showVideo, setShowVideo] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const decide = async (approve: boolean) => {
    setBusy(true);
    try {
      await reviewCoach(c.id, approve, approve ? undefined : note);
      toast(approve ? `${c.name} approved` : `Sent back to ${c.name}`, approve ? 'They are now visible to clients.' : 'They will see your reason and can resubmit.', 'success');
      onDone(c.id);
    } catch (e: any) {
      Alert.alert('Could not save', e.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmApprove = () =>
    Alert.alert(`Approve ${c.name}?`, 'They become visible to clients and can take bookings.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: () => decide(true) },
    ]);

  const certs = c.certifications ?? [];
  const wins = (c.medals ?? []).filter((m) => m.kind !== 'achievement');

  return (
    <Glass radius={T.radius.xl} style={styles.card}>
      <View style={styles.row}>
        <Avatar uri={c.profilePhoto} name={c.name} size={56} radius={28} />
        <View style={{ flex: 1 }}>
          <Text style={type.headline}>{c.name}</Text>
          <Text style={type.caption}>{c.city} · {c.experience} yrs coaching · {c.sessionPreference === 'both' ? 'online + in person' : c.sessionPreference}</Text>
        </View>
      </View>

      <View style={styles.phone}>
        <Ionicons name="call-outline" size={16} color={T.text2} />
        <Text selectable style={[type.body, { flex: 1 }]}>{c.phone}</Text>
        <Button title="Call" size="sm" variant="glass" onPress={() => Linking.openURL(`tel:${c.phone}`)} />
      </View>

      {!!c.specializations?.length && <Text style={type.caption}>{c.specializations.join(' · ')}</Text>}
      {!!c.bio && <Text style={[type.body, { color: T.text2 }]}>{c.bio}</Text>}

      <View style={{ gap: 4 }}>
        <Text style={type.micro}>Certifications (to verify)</Text>
        {certs.length ? certs.map((x, i) => (
          <Text key={i} style={type.caption}>• {x.name}{x.issuedBy ? `, ${x.issuedBy}` : ''}{x.year ? ` (${x.year})` : ''}</Text>
        )) : <Text style={type.caption}>None listed</Text>}
      </View>
      {wins.length > 0 && (
        <View style={{ gap: 4 }}>
          <Text style={type.micro}>Competitions</Text>
          {wins.map((m, i) => <Text key={i} style={type.caption}>• {m.title}{m.description ? `, ${m.description}` : ''} ({m.year})</Text>)}
        </View>
      )}

      {c.videoIntroUrl && (showVideo
        ? <IntroVideoPlayer uri={c.videoIntroUrl} poster={c.profilePhoto} height={200} />
        : <Button title="Watch intro video" icon="play" size="sm" variant="glass" onPress={() => setShowVideo(true)} />)}

      {status === 'rejected' && !!c.kycNote && (
        <View style={styles.note}><Text style={type.caption}>Reason sent: {c.kycNote}</Text></View>
      )}

      {rejecting ? (
        <View style={{ gap: 8 }}>
          <Glass radius={T.radius.md} style={{ paddingHorizontal: 12 }}>
            <TextInput value={note} onChangeText={setNote} placeholder="What should the coach fix? e.g. Certificate photo unclear"
              placeholderTextColor={T.text3} style={styles.input} multiline maxLength={300} accessibilityLabel="Reason for the coach" />
          </Glass>
          <View style={styles.actions}>
            <Button title="Cancel" size="md" variant="ghost" onPress={() => setRejecting(false)} style={{ flex: 1 }} />
            <Button title="Send back" size="md" variant="danger" loading={busy} disabled={!note.trim()} onPress={() => decide(false)} style={{ flex: 1 }} />
          </View>
        </View>
      ) : (
        <View style={styles.actions}>
          <Button title={status === 'approved' ? 'Remove approval' : 'Needs changes'} size="md" variant="glass" onPress={() => setRejecting(true)} style={{ flex: 1 }} />
          {status !== 'approved' && <Button title="Approve" icon="checkmark" size="md" loading={busy} onPress={confirmApprove} style={{ flex: 1 }} />}
        </View>
      )}
    </Glass>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  body: { padding: 20, gap: 14, paddingBottom: 60 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  empty: { alignItems: 'center', gap: 8, padding: 24 },
  card: { padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  phone: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  note: { padding: 10, borderRadius: T.radius.md, backgroundColor: 'rgba(255,176,32,0.12)' },
  input: { color: T.text, fontSize: 15, minHeight: 70, textAlignVertical: 'top', paddingVertical: 10 },
  actions: { flexDirection: 'row', gap: 10 },
});
