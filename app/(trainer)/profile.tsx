import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../stores/authStore';
import {
  addTransformation, getTransformations, getTrainerQA, answerTrainerQuestion, getTrainerReviews,
} from '../../services/trainers';
import { logout as signOutUser } from '../../services/auth';
import { Screen } from '../../components/ui/Screen';
import { Glass } from '../../components/ui/Glass';
import { Button } from '../../components/ui/Button';
import { PressableScale } from '../../components/ui/PressableScale';
import { Avatar, Section } from '../../components/ui/Bits';
import { TAB_BAR_SPACE } from '../../components/ui/GlassTabBar';
import { T, type } from '../../constants/theme';
import { CONFIG, CONTACT_INFO_PATTERN, CONTACT_INFO_MESSAGE } from '../../constants/config';
import { Transformation, TrainerQA, TrainerReview } from '../../types/trainer';
import { Alert } from '../../components/ui/Feedback';

export default function TrainerProfileTab() {
  const { trainerProfile: p } = useAuthStore();
  const [results, setResults] = useState<Transformation[]>([]);
  const [qa, setQa] = useState<TrainerQA[]>([]);
  const [reviews, setReviews] = useState<TrainerReview[]>([]);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [answering, setAnswering] = useState<string | null>(null);

  // Add-result sheet
  const [addOpen, setAddOpen] = useState(false);
  const [before, setBefore] = useState<string | null>(null);
  const [after, setAfter] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [consent, setConsent] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!p) return;
    getTransformations(p.id).then(setResults).catch(() => {});
    getTrainerQA(p.id).then(setQa).catch(() => {});
    getTrainerReviews(p.id).then(setReviews).catch(() => {});
  }, [p?.id]);

  if (!p) return null;

  const pick = async (which: 'before' | 'after') => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 5], quality: 0.8 });
    if (!res.canceled) (which === 'before' ? setBefore : setAfter)(res.assets[0].uri);
  };

  const upload = async () => {
    if (!before || !after) return Alert.alert('Add both photos', 'Pick a before and an after photo.');
    if (!consent) return Alert.alert('Client consent needed', 'Only post results your client has agreed to share.');
    setUploading(true);
    try {
      await addTransformation({ trainerId: p.id, beforePhotoUrl: before, afterPhotoUrl: after, caption: caption.trim() || undefined, clientConsentGiven: true });
      setResults(await getTransformations(p.id));
      setAddOpen(false);
      setBefore(null); setAfter(null); setCaption(''); setConsent(false);
    } catch (e: any) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setUploading(false);
    }
  };

  const answer = async (q: TrainerQA) => {
    const text = replies[q.id]?.trim();
    if (!text) return;
    if (CONTACT_INFO_PATTERN.test(text)) return Alert.alert('Keep it on Bodivex', CONTACT_INFO_MESSAGE);
    setAnswering(q.id);
    try {
      await answerTrainerQuestion(q.id, text);
      setQa(qa.map((x) => (x.id === q.id ? { ...x, answer: text, answeredAt: new Date() } : x)));
      setReplies({ ...replies, [q.id]: '' });
    } catch (e: any) {
      Alert.alert('Not posted', e.message);
    } finally {
      setAnswering(null);
    }
  };

  const logout = () =>
    Alert.alert('Log out?', 'You can sign back in any time with your number.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: async () => { await signOutUser(); router.replace('/welcome'); } },
    ]);

  const unanswered = qa.filter((q) => !q.answer);
  const approved = p.kycStatus === 'approved';

  return (
    <Screen preset="trainer" edges={['top']}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Avatar uri={p.profilePhoto} name={p.name} size={84} radius={42} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={type.title} numberOfLines={1}>{p.name}</Text>
            <Text style={type.caption}>{p.city} · {p.experience} yrs coaching</Text>
            <View style={[styles.badge, { backgroundColor: approved ? 'rgba(46,230,240,0.14)' : 'rgba(255,176,32,0.14)' }]}>
              <Ionicons name={approved ? 'checkmark-circle' : 'hourglass-outline'} size={13} color={approved ? T.ring3 : T.warning} />
              <Text style={[styles.badgeText, { color: approved ? T.ring3 : T.warning }]}>{approved ? 'Verified coach' : 'Under review'}</Text>
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title="Edit profile" icon="create-outline" size="md" onPress={() => router.push('/profile-edit')} style={{ flex: 1 }} />
          <Button title="Preview" icon="eye-outline" variant="glass" size="md" onPress={() => router.push(`/trainer/${p.id}`)} style={{ flex: 1 }} />
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          {[
            { v: p.totalReviews ? p.rating.toFixed(1) : '–', l: `${p.totalReviews} reviews` },
            { v: `${p.totalSessions}`, l: 'sessions' },
            { v: `${p.leadCount ?? 0}`, l: 'clients won' },
          ].map((s) => (
            <Glass key={s.l} radius={T.radius.lg} style={styles.stat}>
              <Text style={styles.statV}>{s.v}</Text>
              <Text style={type.caption}>{s.l}</Text>
            </Glass>
          ))}
        </View>
        <Text style={type.caption}>
          {Math.max(0, CONFIG.freeClientsPerTrainer - (p.leadCount ?? 0)) > 0
            ? `${CONFIG.freeClientsPerTrainer - (p.leadCount ?? 0)} free new clients left · then ₹${CONFIG.newClientFee} per new client`
            : `₹${CONFIG.newClientFee} per new client · ₹${p.feesPaid ?? 0} paid so far`}
        </Text>

        {/* Questions */}
        <View>
          <Section title={unanswered.length ? `Questions · ${unanswered.length} to answer` : 'Questions'} />
          {qa.length === 0 ? (
            <Glass radius={T.radius.lg} style={styles.empty}>
              <Text style={type.caption}>No public questions yet. Answered questions help clients choose you.</Text>
            </Glass>
          ) : (
            <View style={{ gap: 10 }}>
              {[...unanswered, ...qa.filter((q) => q.answer).slice(0, 3)].map((q) => (
                <Glass key={q.id} radius={T.radius.lg} style={{ padding: 14, gap: 8 }}>
                  <Text style={type.caption}>{q.clientName}{q.askerRole === 'trainer' ? ' · Coach' : ''}</Text>
                  <Text style={type.body}>{q.question}</Text>
                  {q.answer ? (
                    <Text style={[type.caption, { color: T.text2 }]}>You: {q.answer}</Text>
                  ) : (
                    <View style={styles.replyRow}>
                      <TextInput
                        style={styles.reply}
                        placeholder="Write a public answer"
                        placeholderTextColor={T.text3}
                        value={replies[q.id] ?? ''}
                        onChangeText={(v) => setReplies({ ...replies, [q.id]: v })}
                        multiline
                        maxLength={1000}
                        selectionColor={T.accent}
                      />
                      <Button title="Post" size="sm" onPress={() => answer(q)} loading={answering === q.id} disabled={!replies[q.id]?.trim()} />
                    </View>
                  )}
                </Glass>
              ))}
            </View>
          )}
        </View>

        {/* Results */}
        <View>
          <Section title="Client results" action="Add" onAction={() => setAddOpen(true)} />
          {results.length === 0 ? (
            <PressableScale onPress={() => setAddOpen(true)}>
              <Glass radius={T.radius.lg} style={styles.empty}>
                <Ionicons name="images-outline" size={22} color={T.text2} />
                <Text style={type.caption}>Add a before & after. Real results are what clients look at first.</Text>
              </Glass>
            </PressableScale>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {results.map((r) => (
                <Glass key={r.id} radius={T.radius.lg} style={{ padding: 6, flexDirection: 'row', gap: 4 }}>
                  <Image source={{ uri: r.beforePhotoUrl }} style={styles.thumb} contentFit="cover" />
                  <Image source={{ uri: r.afterPhotoUrl }} style={styles.thumb} contentFit="cover" />
                </Glass>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Reviews */}
        {reviews.length > 0 && (
          <View>
            <Section title="Latest reviews" />
            <View style={{ gap: 10 }}>
              {reviews.slice(0, 3).map((r) => (
                <Glass key={r.id} radius={T.radius.lg} style={{ padding: 14, gap: 4 }}>
                  <Text style={type.headline}>{'★'.repeat(Math.round(r.rating))} <Text style={type.caption}>{r.clientName}</Text></Text>
                  {!!r.comment && <Text style={[type.body, { color: T.text2 }]}>{r.comment}</Text>}
                </Glass>
              ))}
            </View>
          </View>
        )}

        {/* Settings */}
        <Glass radius={T.radius.xl} style={{ paddingHorizontal: 16 }}>
          {[
            { icon: 'trophy-outline' as const, label: 'Coach rankings', onPress: () => router.push('/leaderboard') },
            { icon: 'help-circle-outline' as const, label: 'Help & support', onPress: () => Alert.alert('Help', `Write to us at ${CONFIG.supportEmail}`) },
          ].map((m) => (
            <PressableScale key={m.label} onPress={m.onPress}>
              <View style={styles.menuRow}>
                <Ionicons name={m.icon} size={20} color={T.text2} />
                <Text style={[type.body, { flex: 1 }]}>{m.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={T.text3} />
              </View>
            </PressableScale>
          ))}
          <PressableScale onPress={logout}>
            <View style={styles.menuRow}>
              <Ionicons name="log-out-outline" size={20} color={T.danger} />
              <Text style={[type.body, { color: T.danger }]}>Log out</Text>
            </View>
          </PressableScale>
        </Glass>
      </ScrollView>

      {/* Add result sheet */}
      <Modal visible={addOpen} transparent animationType="fade" onRequestClose={() => setAddOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Pressable style={styles.scrim} onPress={() => setAddOpen(false)}>
            <Pressable onPress={() => {}}>
              <Glass radius={T.radius.xl} style={styles.sheet}>
                <Text style={type.title}>Add a client result</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {(['before', 'after'] as const).map((w) => {
                    const uri = w === 'before' ? before : after;
                    return (
                      <PressableScale key={w} onPress={() => pick(w)} style={{ flex: 1 }} accessibilityLabel={`Pick ${w} photo`}>
                        <Glass radius={T.radius.lg} style={styles.pickBox}>
                          {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Ionicons name="add" size={28} color={T.text2} />}
                          <Text style={styles.pickLabel}>{w === 'before' ? 'Before' : 'After'}</Text>
                        </Glass>
                      </PressableScale>
                    );
                  })}
                </View>
                <Glass radius={T.radius.md} style={{ paddingHorizontal: 12 }}>
                  <TextInput style={styles.reply} placeholder="Caption, e.g. −8 kg in 12 weeks" placeholderTextColor={T.text3}
                    value={caption} onChangeText={setCaption} maxLength={120} selectionColor={T.accent} />
                </Glass>
                <View style={styles.consent}>
                  <Text style={[type.caption, { flex: 1 }]}>My client agreed to share these photos publicly</Text>
                  <Switch value={consent} onValueChange={setConsent} trackColor={{ true: T.ring2, false: T.glassStrong }} thumbColor="#fff" />
                </View>
                <Button title="Publish" icon="cloud-upload-outline" onPress={upload} loading={uploading} disabled={!before || !after || !consent} />
              </Glass>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 18, paddingBottom: TAB_BAR_SPACE },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 9, height: 24, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, padding: 12, gap: 2 },
  statV: { color: T.text, fontSize: 20, fontWeight: '800' },
  empty: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  replyRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  reply: { flex: 1, color: T.text, fontSize: 15, minHeight: 40, paddingVertical: 8 },
  thumb: { width: 72, height: 90, borderRadius: 12, backgroundColor: T.bgRaised },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.hairline },
  scrim: { flex: 1, backgroundColor: T.scrim, justifyContent: 'flex-end', padding: 12 },
  sheet: { padding: 20, gap: 14, marginBottom: 8 },
  pickBox: { height: 150, alignItems: 'center', justifyContent: 'center' },
  pickLabel: { position: 'absolute', bottom: 8, left: 10, color: '#fff', fontSize: 12, fontWeight: '800' },
  consent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
