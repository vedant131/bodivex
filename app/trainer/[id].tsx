import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert, Modal, TextInput,
  KeyboardAvoidingView, Platform, Pressable, useWindowDimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useTrainerStore } from '../../stores/trainerStore';
import { useAuthStore } from '../../stores/authStore';
import { getTransformations, getTrainerQA, getTrainerReviews, askTrainerQuestion } from '../../services/trainers';
import { Backdrop } from '../../components/ui/Backdrop';
import { Glass } from '../../components/ui/Glass';
import { Button } from '../../components/ui/Button';
import { PressableScale } from '../../components/ui/PressableScale';
import { Avatar, IconButton, StatusPill } from '../../components/ui/Bits';
import { T, type } from '../../constants/theme';
import { CONTACT_INFO_PATTERN, CONTACT_INFO_MESSAGE } from '../../constants/config';
import { Transformation, TrainerQA, TrainerReview } from '../../types/trainer';

type Tab = 'about' | 'results' | 'reviews' | 'qa';
const TABS: { key: Tab; label: string }[] = [
  { key: 'about', label: 'About' },
  { key: 'results', label: 'Results' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'qa', label: 'Q&A' },
];

const Stars = ({ n }: { n: number }) => (
  <View style={{ flexDirection: 'row', gap: 2 }}>
    {[1, 2, 3, 4, 5].map((i) => (
      <Ionicons key={i} name={i <= Math.round(n) ? 'star' : 'star-outline'} size={12} color={T.star} />
    ))}
  </View>
);

export default function TrainerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { fetchTrainerById, selectedTrainer } = useTrainerStore();
  const trainer = selectedTrainer?.id === id ? selectedTrainer : null;

  const [tab, setTab] = useState<Tab>('about');
  const [transformations, setTransformations] = useState<Transformation[]>([]);
  const [reviews, setReviews] = useState<TrainerReview[]>([]);
  const [qa, setQa] = useState<TrainerQA[]>([]);
  const [askOpen, setAskOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchTrainerById(id);
    getTransformations(id).then(setTransformations).catch(() => {});
    getTrainerReviews(id).then(setReviews).catch(() => {});
    getTrainerQA(id).then(setQa).catch(() => {});
  }, [id]);

  const submitQuestion = async () => {
    const text = question.trim();
    if (!text || !id || !user) return;
    if (CONTACT_INFO_PATTERN.test(text)) {
      Alert.alert('Keep it on Bodivex', CONTACT_INFO_MESSAGE);
      return;
    }
    setAsking(true);
    try {
      const askerRole = user.role === 'trainer' ? 'trainer' : 'client';
      const qId = await askTrainerQuestion(id, user.id, user.name || 'Member', text, askerRole, user.profilePhoto);
      setQa([{ id: qId, trainerId: id, clientId: user.id, clientName: user.name, askerRole, question: text, createdAt: new Date() }, ...qa]);
      setQuestion('');
      setAskOpen(false);
    } catch (e: any) {
      Alert.alert('Could not post', e.message);
    } finally {
      setAsking(false);
    }
  };

  if (!trainer) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Backdrop />
        <ActivityIndicator color={T.text} />
      </View>
    );
  }

  const prices = [trainer.pricingOnline, trainer.pricingOffline].filter((p): p is number => !!p);
  const from = prices.length ? Math.min(...prices) : 0;
  const isClient = user?.role === 'client';
  const heroH = Math.round(width * 1.05);
  const answered = qa.filter((q) => q.answer).length;

  return (
    <View style={{ flex: 1 }}>
      <Backdrop preset="calm" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        {/* Hero photo */}
        <View style={{ height: heroH }}>
          {trainer.profilePhoto ? (
            <Image source={{ uri: trainer.profilePhoto }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
          ) : (
            <Avatar name={trainer.name} size={width} radius={0} style={{ width, height: heroH }} />
          )}
          <LinearGradient colors={['rgba(6,6,9,0.35)', 'transparent', 'rgba(6,6,9,0.2)', T.bg]} locations={[0, 0.25, 0.6, 1]} style={StyleSheet.absoluteFill} />
        </View>

        {/* Sheet */}
        <Animated.View entering={FadeInDown.duration(500)} style={[styles.sheet, { marginTop: -90 }]}>
          <StatusPill on={trainer.isAvailableNow} />
          <View style={styles.nameRow}>
            <Text style={[type.display, { flexShrink: 1 }]} numberOfLines={2}>{trainer.name}</Text>
            {trainer.isKYCApproved && <Ionicons name="checkmark-circle" size={24} color={T.ring3} accessibilityLabel="Verified coach" />}
          </View>
          <Text style={type.callout}>
            {trainer.specializations.slice(0, 2).join(' · ')}{trainer.specializations.length ? ' · ' : ''}{trainer.city}
          </Text>

          <View style={styles.stats}>
            <Stat value={trainer.totalReviews ? trainer.rating.toFixed(1) : 'New'} label={`${trainer.totalReviews} reviews`} icon="star" color={T.star} />
            <Stat value={`${trainer.totalSessions}`} label="sessions" icon="flash" color={T.ring2} />
            <Stat value={`${trainer.experience} yrs`} label="coaching" icon="medal" color={T.ring3} />
          </View>

          {/* Segmented tabs */}
          <Glass radius={T.radius.pill} style={styles.segment}>
            {TABS.map((t) => (
              <PressableScale key={t.key} onPress={() => setTab(t.key)} style={[styles.segBtn, tab === t.key && styles.segOn]} accessibilityState={{ selected: tab === t.key }}>
                <Text style={[styles.segText, tab === t.key && { color: T.text }]}>
                  {t.label}{t.key === 'reviews' && reviews.length ? ` ${reviews.length}` : ''}{t.key === 'qa' && qa.length ? ` ${qa.length}` : ''}
                </Text>
              </PressableScale>
            ))}
          </Glass>

          <Animated.View key={tab} entering={FadeIn.duration(250)} style={{ gap: 12 }}>
            {tab === 'about' && (
              <>
                {!!trainer.bio && <Text style={[type.body, { color: T.text2 }]}>{trainer.bio}</Text>}
                <Text style={type.micro}>Sessions</Text>
                {trainer.pricingOnline ? (
                  <Option icon="videocam" tint={T.ring1} title="Online" sub="Live video · form check" price={trainer.pricingOnline} />
                ) : null}
                {trainer.pricingOffline ? (
                  <Option icon="barbell" tint={T.ring2} title="In person" sub={trainer.gymLocation?.name ?? 'At the gym'} price={trainer.pricingOffline} />
                ) : null}
                {trainer.certifications?.length > 0 && (
                  <>
                    <Text style={type.micro}>Certifications</Text>
                    {trainer.certifications.map((c, i) => (
                      <Glass key={i} radius={T.radius.md} style={styles.certRow}>
                        <Ionicons name="ribbon" size={18} color={T.warning} />
                        <View style={{ flex: 1 }}>
                          <Text style={type.body}>{c.name}</Text>
                          <Text style={type.caption}>{c.issuedBy} · {c.year}</Text>
                        </View>
                      </Glass>
                    ))}
                  </>
                )}
                {(['competition', 'achievement'] as const).map((kind) => {
                  const list = (trainer.medals ?? []).filter((m) => (m.kind ?? 'achievement') === kind);
                  if (!list.length) return null;
                  return (
                    <React.Fragment key={kind}>
                      <Text style={type.micro}>{kind === 'competition' ? 'Competitions' : 'Achievements'}</Text>
                      {list.map((m, i) => (
                        <Glass key={i} radius={T.radius.md} style={styles.certRow}>
                          <Ionicons name={kind === 'competition' ? 'medal' : 'trophy'} size={18} color={T.warning} />
                          <View style={{ flex: 1 }}>
                            <Text style={type.body}>{m.title}</Text>
                            <Text style={type.caption}>{[m.description, m.year].filter(Boolean).join(' · ')}</Text>
                          </View>
                        </Glass>
                      ))}
                    </React.Fragment>
                  );
                })}
                {trainer.languages?.length > 0 && (
                  <Text style={type.caption}>Speaks {trainer.languages.join(', ')}</Text>
                )}
              </>
            )}

            {tab === 'results' && (
              transformations.length === 0 ? (
                <Empty icon="images-outline" text="No before & after results yet." />
              ) : (
                transformations.map((tr) => (
                  <Glass key={tr.id} radius={T.radius.lg} style={{ padding: 10, gap: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {[tr.beforePhotoUrl, tr.afterPhotoUrl].map((u, i) => (
                        <View key={i} style={{ flex: 1 }}>
                          <Image source={{ uri: u }} style={styles.trPhoto} contentFit="cover" />
                          <Text style={styles.trLabel}>{i === 0 ? 'Before' : 'After'}</Text>
                        </View>
                      ))}
                    </View>
                    {!!tr.caption && <Text style={type.caption}>{tr.caption}</Text>}
                  </Glass>
                ))
              )
            )}

            {tab === 'reviews' && (
              reviews.length === 0 ? (
                <Empty icon="chatbubble-ellipses-outline" text="No reviews yet. Reviews come only from completed Bodivex sessions." />
              ) : (
                reviews.map((r) => (
                  <Glass key={r.id} radius={T.radius.lg} style={{ padding: 14, gap: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Avatar uri={r.clientPhoto} name={r.clientName} size={32} radius={16} />
                      <View style={{ flex: 1 }}>
                        <Text style={type.body}>{r.clientName}</Text>
                        <Stars n={r.rating} />
                      </View>
                      <Text style={type.caption}>{r.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
                    </View>
                    {!!r.comment && <Text style={[type.body, { color: T.text2 }]}>{r.comment}</Text>}
                  </Glass>
                ))
              )
            )}

            {tab === 'qa' && (
              <>
                <PressableScale onPress={() => setAskOpen(true)} accessibilityLabel="Ask a public question">
                  <Glass radius={T.radius.lg} interactive style={styles.askCard}>
                    <Ionicons name="chatbubbles" size={20} color={T.accent} />
                    <View style={{ flex: 1 }}>
                      <Text style={type.headline}>Ask {trainer.name.split(' ')[0]} a question</Text>
                      <Text style={type.caption}>Public · {answered} answered so far</Text>
                    </View>
                    <Ionicons name="add-circle" size={26} color={T.text} />
                  </Glass>
                </PressableScale>
                {qa.map((q) => (
                  <Glass key={q.id} radius={T.radius.lg} style={{ padding: 14, gap: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                      <Avatar uri={q.askerPhoto} name={q.clientName} size={26} radius={13} />
                      <Text style={type.caption}>{q.clientName}{q.askerRole === 'trainer' ? ' · Coach' : ''}</Text>
                    </View>
                    <Text style={type.body}>{q.question}</Text>
                    {q.answer ? (
                      <View style={styles.answer}>
                        <Text style={[type.caption, { color: T.accent }]}>{trainer.name.split(' ')[0]} replied</Text>
                        <Text style={[type.body, { color: T.text2 }]}>{q.answer}</Text>
                      </View>
                    ) : (
                      <Text style={[type.caption, { color: T.text3 }]}>Waiting for an answer</Text>
                    )}
                  </Glass>
                ))}
              </>
            )}
          </Animated.View>
        </Animated.View>
      </ScrollView>

      {/* Floating top controls */}
      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />
      </View>

      {/* Sticky booking bar (clients only) */}
      {isClient && (
        <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Glass radius={T.radius.xl} style={styles.bottomBar}>
            <View style={{ flex: 1 }}>
              <Text style={type.caption}>{trainer.isAvailableNow ? 'From' : 'Not taking bookings'}</Text>
              <Text style={styles.price}>₹{from}<Text style={type.caption}> / session</Text></Text>
            </View>
            <Button
              title={trainer.isAvailableNow ? 'Pick a slot' : 'Unavailable'}
              icon={trainer.isAvailableNow ? 'arrow-forward' : undefined}
              size="md"
              disabled={!trainer.isAvailableNow}
              onPress={() => router.push(`/booking/${trainer.id}` as any)}
            />
          </Glass>
        </View>
      )}

      {/* Ask question sheet */}
      <Modal visible={askOpen} transparent animationType="fade" onRequestClose={() => setAskOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Pressable style={styles.scrim} onPress={() => setAskOpen(false)}>
            <Pressable onPress={() => {}}>
              <Glass radius={T.radius.xl} style={styles.askSheet}>
                <Text style={type.title}>Ask publicly</Text>
                <Text style={type.caption}>Everyone can see questions and answers. Phone numbers and links aren't allowed.</Text>
                <Glass radius={T.radius.md} style={{ padding: 12 }}>
                  <TextInput
                    style={styles.askInput}
                    placeholder="e.g. Do you make vegetarian diet plans?"
                    placeholderTextColor={T.text3}
                    value={question}
                    onChangeText={setQuestion}
                    multiline
                    maxLength={500}
                    autoFocus
                    selectionColor={T.accent}
                  />
                </Glass>
                <Button title="Post question" icon="send" onPress={submitQuestion} loading={asking} disabled={!question.trim()} />
              </Glass>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function Stat({ value, label, icon, color }: { value: string; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }) {
  return (
    <Glass radius={T.radius.lg} style={styles.stat}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={type.caption}>{label}</Text>
    </Glass>
  );
}

function Option({ icon, tint, title, sub, price }: { icon: keyof typeof Ionicons.glyphMap; tint: string; title: string; sub: string; price: number }) {
  return (
    <Glass radius={T.radius.lg} style={styles.option}>
      <View style={[styles.optIcon, { backgroundColor: `${tint}26` }]}>
        <Ionicons name={icon} size={20} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={type.headline}>{title}</Text>
        <Text style={type.caption} numberOfLines={1}>{sub}</Text>
      </View>
      <Text style={styles.optPrice}>₹{price}</Text>
    </Glass>
  );
}

function Empty({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <Glass radius={T.radius.lg} style={{ alignItems: 'center', padding: 24, gap: 8 }}>
      <Ionicons name={icon} size={26} color={T.text2} />
      <Text style={[type.caption, { textAlign: 'center' }]}>{text}</Text>
    </Glass>
  );
}

const styles = StyleSheet.create({
  sheet: { paddingHorizontal: 20, gap: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stats: { flexDirection: 'row', gap: 10, marginTop: 4 },
  stat: { flex: 1, padding: 12, gap: 3 },
  statValue: { color: T.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  segment: { flexDirection: 'row', padding: 4, marginVertical: 8 },
  segBtn: { flex: 1, height: 36, borderRadius: T.radius.pill, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: T.glassStrong },
  segText: { color: T.text3, fontSize: 13, fontWeight: '700' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  optIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  optPrice: { color: T.text, fontSize: 20, fontWeight: '800' },
  certRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  trPhoto: { width: '100%', aspectRatio: 0.8, borderRadius: T.radius.md, backgroundColor: T.bgRaised },
  trLabel: { position: 'absolute', left: 8, top: 8, color: '#fff', fontSize: 11, fontWeight: '800', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, overflow: 'hidden' },
  askCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  answer: { borderLeftWidth: 2, borderLeftColor: T.accent, paddingLeft: 10, gap: 2 },
  topBar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  bottom: { position: 'absolute', left: 12, right: 12, bottom: 0 },
  bottomBar: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, paddingLeft: 18 },
  price: { color: T.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  scrim: { flex: 1, backgroundColor: T.scrim, justifyContent: 'flex-end', padding: 12 },
  askSheet: { padding: 20, gap: 14, marginBottom: 8 },
  askInput: { color: T.text, fontSize: 16, minHeight: 90, textAlignVertical: 'top' },
});
