import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../stores/authStore';
import {
  updateAvailability,
  getTrainerProfileReachScore,
  calculateTrainerScore,
} from '../../services/trainers';
import {
  subscribeToTrainerSessions,
  trainerAcceptSession,
  trainerRejectSession,
} from '../../services/bookings';
import { COLORS } from '../../constants/colors';
import { Session } from '../../types/session';

export default function TrainerDashboardScreen() {
  const { user, trainerProfile, setTrainerProfile } = useAuthStore();
  const [isAvailableNow, setIsAvailableNow] = useState(trainerProfile?.isAvailableNow ?? false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const trainerId = trainerProfile?.id ?? '';

  useEffect(() => {
    if (!trainerId) return;
    const unsub = subscribeToTrainerSessions(trainerId, (list) => {
      setSessions(list);
      setIsLoading(false);
    });
    return unsub;
  }, [trainerId]);

  const handleToggleAvailability = async (value: boolean) => {
    setIsAvailableNow(value);
    const activeId = trainerProfile?.id || user?.id || 'trainer_demo';
    if (trainerProfile) {
      setTrainerProfile({
        ...trainerProfile,
        id: activeId,
        isAvailableNow: value,
        availabilityStatus: value ? 'available_now' : 'offline',
      });
    }
    await updateAvailability(activeId, value);
  };

  const handleAccept = async (sessionId: string, clientName: string) => {
    try {
      await trainerAcceptSession(sessionId);
      Alert.alert(
        'Session Accepted! 🤝',
        `You are now connected with ${clientName}. Chat has been unlocked and the booking is confirmed.`
      );
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleReject = async (sessionId: string, clientName: string) => {
    Alert.alert('Decline Session', `Are you sure you want to decline ${clientName}'s request?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline & Refund',
        style: 'destructive',
        onPress: async () => {
          try {
            await trainerRejectSession(sessionId, 'Trainer declined session');
            Alert.alert('Session Declined', 'Client has been notified and refunded.');
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const pendingRequests = sessions.filter((s) => s.status === 'pending');
  const todaySessions = sessions.filter((s) => s.status === 'confirmed');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Trainer Dashboard</Text>
            <Text style={styles.welcomeName}>Welcome back, {trainerProfile?.name || 'Coach'} 💪</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={styles.arenaShortcut}
              onPress={() => router.push('/leaderboard')}
              activeOpacity={0.85}
            >
              <Text style={styles.arenaShortcutText}>🏆 Rank</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.financeShortcut}
              onPress={() => router.push('/(trainer)/finance')}
            >
              <Ionicons name="wallet-outline" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Strength & Reach Multiplier (Algorithmic Reach) */}
        {(() => {
          const { score, checklist } = getTrainerProfileReachScore(trainerProfile);
          const uncompleted = checklist.filter((c) => !c.completed);
          return (
            <LinearGradient
              colors={[COLORS.secondary, '#0F172A']}
              style={styles.reachScoreCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.reachScoreTop}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.reachBadgeText}>ALGORITHM REACH</Text>
                    <View style={styles.reachMultiplierPill}>
                      <Text style={styles.reachMultiplierText}>
                        {score >= 80 ? '🚀 3.8x Visibility' : '⚡ Boost Available'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.reachTitle}>
                    Profile Completeness: <Text style={{ color: COLORS.primary }}>{score}%</Text>
                  </Text>
                  <Text style={styles.reachSub}>
                    {uncompleted.length === 0
                      ? 'Your profile has maximum discovery ranking on Bodivex Search!'
                      : `Complete ${uncompleted.length} recommended items to rank higher on client home feeds.`}
                  </Text>
                </View>

                <View style={styles.scoreCircle}>
                  <Text style={styles.scoreCircleVal}>{score}%</Text>
                  <Text style={styles.scoreCircleLabel}>reach</Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.reachProgressBarBg}>
                <View style={[styles.reachProgressBarFill, { width: `${score}%` }]} />
              </View>

              {/* Next Recommendation */}
              {uncompleted.length > 0 && (
                <TouchableOpacity
                  style={styles.recommendationPill}
                  onPress={() => router.push('/(trainer)/profile')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="sparkles" size={14} color="#FFD700" />
                  <Text style={styles.recommendationText} numberOfLines={1}>
                    Next: {uncompleted[0].label} (+{uncompleted[0].points} pts)
                  </Text>
                  <Ionicons name="arrow-forward" size={12} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
              )}
            </LinearGradient>
          );
        })()}

        {/* Coach Quick Actions Launchpad */}
        <View style={styles.quickLaunchpad}>
          <TouchableOpacity
            style={styles.launchBtn}
            onPress={() => router.push('/(trainer)/profile')}
            activeOpacity={0.8}
          >
            <View style={[styles.launchIconBg, { backgroundColor: `${COLORS.primary}18` }]}>
              <Ionicons name="camera" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.launchLabel}>Upload Transformation</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.launchBtn}
            onPress={() => router.push('/leaderboard')}
            activeOpacity={0.8}
          >
            <View style={[styles.launchIconBg, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="trophy" size={20} color="#D97706" />
            </View>
            <Text style={styles.launchLabel}>Pan-India Rankings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.launchBtn}
            onPress={() => router.push('/(trainer)/profile')}
            activeOpacity={0.8}
          >
            <View style={[styles.launchIconBg, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="chatbubbles" size={20} color="#0284C7" />
            </View>
            <Text style={styles.launchLabel}>Answer Q&A</Text>
          </TouchableOpacity>
        </View>

        {/* AstroTalk Style "Available Now" Switcher */}
        <View style={[styles.statusCard, isAvailableNow && styles.statusCardActive]}>
          <View style={{ flex: 1 }}>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, isAvailableNow && styles.statusDotActive]} />
              <Text style={styles.statusTitle}>
                {isAvailableNow ? 'Available for Instant Sessions' : 'Offline / Standard Booking'}
              </Text>
            </View>
            <Text style={styles.statusSub}>
              {isAvailableNow
                ? 'Clients can connect with you right now for live consultations!'
                : 'Turn ON to show a green "Available Now" badge on discovery.'}
            </Text>
          </View>
          <Switch
            value={isAvailableNow}
            onValueChange={handleToggleAvailability}
            trackColor={{ true: COLORS.success, false: COLORS.border }}
            thumbColor={COLORS.white}
          />
        </View>

        {/* Pending Requests Section (Escrow Protected Bookings) */}
        {pendingRequests.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>⚡ Booking Requests ({pendingRequests.length})</Text>
              <Text style={styles.escrowNoticeText}>Payment guaranteed in escrow</Text>
            </View>

            {pendingRequests.map((req) => (
              <View key={req.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View style={styles.clientAvatar}>
                    <Text style={styles.clientAvatarText}>{req.clientName[0]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.requestName}>{req.clientName}</Text>
                    <Text style={styles.requestTime}>
                      {format(new Date(req.scheduledAt), 'dd MMM yyyy · hh:mm a')}
                    </Text>
                  </View>
                  <View style={styles.earnedBadge}>
                    <Text style={styles.earnedAmount}>+₹{req.netEarned}</Text>
                    <Text style={styles.earnedSub}>Escrow held</Text>
                  </View>
                </View>

                <View style={styles.requestMeta}>
                  <Text style={styles.metaLabel}>
                    Mode: <Text style={styles.metaVal}>{req.type.toUpperCase()}</Text>
                  </Text>
                  <Text style={styles.metaLabel}>
                    Duration: <Text style={styles.metaVal}>{req.durationMins} mins</Text>
                  </Text>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.declineBtn}
                    onPress={() => handleReject(req.id, req.clientName)}
                  >
                    <Text style={styles.declineText}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.acceptBtn}
                    onPress={() => handleAccept(req.id, req.clientName)}
                  >
                    <Text style={styles.acceptText}>Accept & Unlock Chat</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Confirmed Sessions Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Confirmed Sessions</Text>
          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={COLORS.primary} />
            </View>
          ) : todaySessions.length === 0 ? (
            <View style={styles.proEmptyCard}>
              <View style={styles.proEmptyIconWrap}>
                <Ionicons name="sparkles" size={28} color={COLORS.primary} />
              </View>
              <Text style={styles.proEmptyTitle}>Ready to take on new clients!</Text>
              <Text style={styles.proEmptySub}>
                Your profile is active. While you await incoming bookings, here is how top coaches on Bodivex get clients faster:
              </Text>

              {/* Coach Tips */}
              <View style={styles.proTipsWrap}>
                <View style={styles.proTipItem}>
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                  <Text style={styles.proTipText}>Keep "Available Now" toggle ON during gym rush hours (6-9 AM & 6-9 PM)</Text>
                </View>
                <View style={styles.proTipItem}>
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                  <Text style={styles.proTipText}>Add Before & After client results to get AI-verified trust badge</Text>
                </View>
                <View style={styles.proTipItem}>
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                  <Text style={styles.proTipText}>Answer prospective client community questions promptly</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.proEmptyActionBtn}
                onPress={() => router.push(`/trainer/${trainerProfile?.id || 'trainer_1'}`)}
              >
                <Ionicons name="eye-outline" size={16} color={COLORS.white} />
                <Text style={styles.proEmptyActionBtnText}>Preview My Public Profile</Text>
              </TouchableOpacity>
            </View>
          ) : (
            todaySessions.map((session) => (
              <View key={session.id} style={styles.sessionCard}>
                <View style={styles.sessionTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sessionClientName}>{session.clientName}</Text>
                    <Text style={styles.sessionDate}>
                      {format(new Date(session.scheduledAt), 'EEE, dd MMM yyyy · hh:mm a')}
                    </Text>
                  </View>
                  <View style={styles.confirmedBadge}>
                    <Text style={styles.confirmedText}>Confirmed</Text>
                  </View>
                </View>

                <View style={styles.sessionFooter}>
                  <View style={styles.typeBadge}>
                    <Ionicons
                      name={session.type === 'online' ? 'videocam' : 'barbell'}
                      size={13}
                      color={COLORS.textSecondary}
                    />
                    <Text style={styles.typeText}>
                      {session.type === 'online' ? 'Online Video' : 'Gym Offline'} ({session.durationMins}m)
                    </Text>
                  </View>

                  <View style={styles.sessionButtons}>
                    {session.chatId && (
                      <TouchableOpacity
                        style={styles.chatBtn}
                        onPress={() =>
                          router.push({
                            pathname: '/chat/[id]',
                            params: { id: session.chatId!, name: session.clientName },
                          })
                        }
                      >
                        <Ionicons name="chatbubble-outline" size={16} color={COLORS.primary} />
                      </TouchableOpacity>
                    )}
                    {session.type === 'online' && (
                      <TouchableOpacity
                        style={styles.startCallBtn}
                        onPress={() =>
                          Alert.alert('Live Session', `Starting video training with ${session.clientName}...`)
                        }
                      >
                        <Ionicons name="videocam" size={16} color={COLORS.white} />
                        <Text style={styles.startCallText}>Start Call</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  greeting: { fontSize: 13, color: COLORS.textMuted, fontWeight: '700', textTransform: 'uppercase' },
  welcomeName: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginTop: 2 },
  financeShortcut: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arenaShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
  },
  arenaShortcutText: { fontSize: 13, fontWeight: '800', color: '#D97706' },

  // Reach Score & Multiplier
  reachScoreCard: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 20,
    padding: 18,
    gap: 12,
  },
  reachScoreTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reachBadgeText: { fontSize: 10, fontWeight: '900', color: '#FFD700', letterSpacing: 1 },
  reachMultiplierPill: {
    backgroundColor: 'rgba(255,70,43,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  reachMultiplierText: { fontSize: 10, fontWeight: '800', color: COLORS.white },
  reachTitle: { fontSize: 16, fontWeight: '900', color: COLORS.white, marginTop: 4 },
  reachSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 16, marginTop: 2 },
  scoreCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreCircleVal: { fontSize: 16, fontWeight: '900', color: COLORS.white },
  scoreCircleLabel: { fontSize: 8, fontWeight: '700', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' },
  reachProgressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  reachProgressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  recommendationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 2,
  },
  recommendationText: { fontSize: 11, color: COLORS.white, fontWeight: '700', flex: 1 },

  // Quick Action Launchpad
  quickLaunchpad: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  launchBtn: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  launchIconBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  launchLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center', lineHeight: 14 },

  // Pro Empty State
  proEmptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  proEmptyIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: `${COLORS.primary}12`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  proEmptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  proEmptySub: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 18 },
  proTipsWrap: { width: '100%', gap: 8, marginVertical: 4 },
  proTipItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  proTipText: { fontSize: 12, color: COLORS.textPrimary, flex: 1, lineHeight: 17, fontWeight: '500' },
  proEmptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 6,
    width: '100%',
  },
  proEmptyActionBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '800' },
  statusCard: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  statusCardActive: { borderColor: COLORS.success, backgroundColor: `${COLORS.success}08` },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.textMuted },
  statusDotActive: { backgroundColor: COLORS.success },
  statusTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  statusSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, lineHeight: 16 },
  section: { paddingHorizontal: 16, marginTop: 10, gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  escrowNoticeText: { fontSize: 11, color: COLORS.warning, fontWeight: '700' },
  requestCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: `${COLORS.primary}40`,
    gap: 12,
  },
  requestHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  clientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientAvatarText: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  requestName: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  requestTime: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  earnedBadge: { alignItems: 'flex-end' },
  earnedAmount: { fontSize: 16, fontWeight: '800', color: COLORS.success },
  earnedSub: { fontSize: 10, color: COLORS.warning, fontWeight: '600' },
  requestMeta: {
    flexDirection: 'row',
    gap: 16,
    backgroundColor: COLORS.background,
    padding: 10,
    borderRadius: 10,
  },
  metaLabel: { fontSize: 12, color: COLORS.textSecondary },
  metaVal: { fontWeight: '700', color: COLORS.textPrimary },
  actionButtons: { flexDirection: 'row', gap: 10 },
  declineBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 14 },
  acceptBtn: {
    flex: 2,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  center: { paddingVertical: 40, alignItems: 'center' },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  emptySub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 18 },
  sessionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  sessionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  sessionClientName: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  sessionDate: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  confirmedBadge: {
    backgroundColor: `${COLORS.success}15`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  confirmedText: { fontSize: 11, fontWeight: '700', color: COLORS.success },
  sessionFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  sessionButtons: { flexDirection: 'row', gap: 8 },
  chatBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 10,
  },
  startCallText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
});
