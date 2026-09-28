import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { format } from 'date-fns';
import { useAuthStore } from '../../stores/authStore';
import {
  subscribeToClientSessions,
  clientCompleteSession,
} from '../../services/bookings';
import { COLORS } from '../../constants/colors';
import { openVideoCall } from '../../services/video';
import { Session } from '../../types/session';
import { Screen } from '../../components/ui/Screen';

type FilterTab = 'upcoming' | 'completed' | 'all';

export default function ClientSessionsScreen() {
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('upcoming');

  // Rating modal state
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const unsub = subscribeToClientSessions(user.id, (list) => {
      setSessions(list);
      setIsLoading(false);
    });
    return unsub;
  }, [user?.id]);

  const filteredSessions = sessions.filter((s) => {
    if (activeTab === 'upcoming') {
      return s.status === 'pending' || s.status === 'confirmed';
    }
    if (activeTab === 'completed') {
      return s.status === 'completed';
    }
    return true;
  });

  const handleConfirmSatisfied = (session: Session) => {
    setSelectedSession(session);
    setRating(5);
    setReview('');
    setShowRatingModal(true);
  };

  const submitSatisfaction = async () => {
    if (!selectedSession) return;
    try {
      await clientCompleteSession(selectedSession.id, rating, review.trim() || undefined);
      setShowRatingModal(false);
      Alert.alert('Thanks for the feedback!');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <Screen preset="calm" style={{ paddingBottom: 88 }} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Sessions</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabRow}>
        {(['upcoming', 'completed', 'all'] as FilterTab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, activeTab === t && styles.tabActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
              {t === 'upcoming' ? 'Upcoming' : t === 'completed' ? 'Completed' : 'All Sessions'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : filteredSessions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={56} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No {activeTab} sessions</Text>
            <Text style={styles.emptySub}>
              Browse coaches and book your next workout session.
            </Text>
            <TouchableOpacity
              style={styles.bookBtn}
              onPress={() => router.push('/(client)/search')}
            >
              <Text style={styles.bookBtnText}>Explore Trainers</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredSessions.map((session) => {
            const isConfirmed = session.status === 'confirmed';
            const isPending = session.status === 'pending';
            const isCompleted = session.status === 'completed';

            return (
              <View key={session.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.trainerAvatar}>
                    {session.trainerPhoto ? (
                      <Image source={{ uri: session.trainerPhoto }} style={styles.avatarImg} contentFit="cover" />
                    ) : (
                      <Text style={styles.avatarText}>{session.trainerName[0]}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.trainerName}>{session.trainerName}</Text>
                    <Text style={styles.sessionDate}>
                      {format(new Date(session.scheduledAt), 'EEE, dd MMM yyyy · hh:mm a')}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      isConfirmed && styles.statusConfirmed,
                      isPending && styles.statusPending,
                      isCompleted && styles.statusCompleted,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        isConfirmed && { color: COLORS.primary },
                        isPending && { color: COLORS.warning },
                        isCompleted && { color: COLORS.success },
                      ]}
                    >
                      {isPending
                        ? 'Waiting for coach'
                        : isConfirmed
                        ? 'Confirmed'
                        : isCompleted
                        ? 'Completed'
                        : session.status}
                    </Text>
                  </View>
                </View>

                {/* Session Meta */}
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons
                      name={session.type === 'online' ? 'videocam' : 'barbell'}
                      size={14}
                      color={COLORS.textSecondary}
                    />
                    <Text style={styles.metaText}>
                      {session.type === 'online' ? 'Online Video' : 'In-Person Offline'}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.metaText}>{session.durationMins} mins</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="cash-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.metaText}>₹{session.price} · pay trainer</Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.actionsRow}>
                  {session.chatId && (
                    <TouchableOpacity
                      style={styles.chatActionBtn}
                      onPress={() =>
                        router.push({
                          pathname: '/chat/[id]',
                          params: {
                            id: session.chatId!,
                            name: session.trainerName,
                            photo: session.trainerPhoto,
                          },
                        })
                      }
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={16} color={COLORS.primary} />
                      <Text style={styles.chatActionText}>Chat</Text>
                    </TouchableOpacity>
                  )}

                  {session.type === 'online' && isConfirmed && (
                    <TouchableOpacity
                      style={styles.joinCallBtn}
                      onPress={() => openVideoCall(session.videoCallRoomId)}
                    >
                      <Ionicons name="videocam" size={16} color={COLORS.onColor} />
                      <Text style={styles.joinCallText}>Join Live Call</Text>
                    </TouchableOpacity>
                  )}

                  {isConfirmed && (
                    <TouchableOpacity
                      style={styles.releaseBtn}
                      onPress={() => handleConfirmSatisfied(session)}
                    >
                      <Text style={styles.releaseBtnText}>Mark Done</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Satisfaction & Release Modal */}
      <Modal visible={showRatingModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>How was your session?</Text>
            <Text style={styles.modalSub}>
              Rate {selectedSession?.trainerName}. Your review helps other clients.
            </Text>

            {/* Stars */}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => setRating(s)}>
                  <Ionicons
                    name={s <= rating ? 'star' : 'star-outline'}
                    size={36}
                    color="#FFB300"
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.reviewInput}
              placeholder="Leave an optional review for the trainer..."
              placeholderTextColor={COLORS.textMuted}
              value={review}
              onChangeText={setReview}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowRatingModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.confirmReleaseBtn} onPress={submitSatisfaction}>
                <Text style={styles.confirmReleaseText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.background,
  },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.onColor, fontWeight: '700' },
  list: { padding: 16, gap: 14 },
  center: { paddingVertical: 60, alignItems: 'center' },
  emptyContainer: { paddingVertical: 60, alignItems: 'center', gap: 10, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  emptySub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  bookBtn: {
    marginTop: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },
  bookBtnText: { color: COLORS.onColor, fontWeight: '700', fontSize: 14 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  trainerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { color: COLORS.onColor, fontSize: 18, fontWeight: '700' },
  trainerName: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  sessionDate: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusConfirmed: { backgroundColor: `${COLORS.primary}15` },
  statusPending: { backgroundColor: `${COLORS.warning}18` },
  statusCompleted: { backgroundColor: `${COLORS.success}15` },
  statusText: { fontSize: 11, fontWeight: '700' },
  metaRow: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: COLORS.background,
    padding: 10,
    borderRadius: 10,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', alignItems: 'center' },
  chatActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  chatActionText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  joinCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  joinCallText: { color: COLORS.onColor, fontWeight: '700', fontSize: 13 },
  releaseBtn: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  releaseBtnText: { color: COLORS.onColor, fontWeight: '700', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 14,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  modalSub: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 8 },
  reviewInput: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
  },
  modalActions: { gap: 10, marginTop: 8 },
  confirmReleaseBtn: {
    backgroundColor: COLORS.success,
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmReleaseText: { color: COLORS.onColor, fontSize: 16, fontWeight: '700' },
  cancelBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 15 },
});
