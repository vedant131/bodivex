import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../stores/authStore';
import {
  getRankedTrainers,
  MOCK_CLIENT_LEADERBOARD,
  RankingScope,
  RankingMode,
  RankingAudience,
  RankedTrainer,
} from '../services/trainers';
import { COLORS } from '../constants/colors';

const { width } = Dimensions.get('window');

export default function LeaderboardScreen() {
  const { user, trainerProfile } = useAuthStore();
  const [audience, setAudience] = useState<RankingAudience>('trainers');
  const [scope, setScope] = useState<RankingScope>('india');
  const [mode, setMode] = useState<RankingMode>('all');

  const userCity = trainerProfile?.city || 'Mumbai';

  // Ranked trainers calculated based on selected scope & mode
  const rankedTrainers = useMemo(() => {
    return getRankedTrainers(scope, userCity, mode);
  }, [scope, userCity, mode]);

  const topThree = rankedTrainers.slice(0, 3);
  const restTrainers = rankedTrainers.slice(3);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>🏆 Bodivex Arena</Text>
          <Text style={styles.headerSub}>Competitive rankings across India</Text>
        </View>
      </View>

      {/* Main Audience Switcher (Trainers vs Clients) */}
      <View style={styles.audienceTabWrap}>
        <TouchableOpacity
          style={[styles.audienceTab, audience === 'trainers' && styles.audienceTabActive]}
          onPress={() => setAudience('trainers')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="barbell"
            size={16}
            color={audience === 'trainers' ? COLORS.white : COLORS.textSecondary}
          />
          <Text
            style={[styles.audienceTabText, audience === 'trainers' && styles.audienceTabTextActive]}
          >
            Coach Leaderboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.audienceTab, audience === 'clients' && styles.audienceTabActive]}
          onPress={() => setAudience('clients')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="flame"
            size={16}
            color={audience === 'clients' ? COLORS.white : COLORS.textSecondary}
          />
          <Text
            style={[styles.audienceTabText, audience === 'clients' && styles.audienceTabTextActive]}
          >
            Client Streaks
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        {audience === 'trainers' ? (
          <>
            {/* Filters Row 1: Scope (Pan-India vs My City) */}
            <View style={styles.filterSection}>
              <View style={styles.scopePillContainer}>
                <TouchableOpacity
                  style={[styles.scopePill, scope === 'india' && styles.scopePillActive]}
                  onPress={() => setScope('india')}
                >
                  <Text style={[styles.scopePillText, scope === 'india' && styles.scopePillTextActive]}>
                    🇮🇳 Pan India
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.scopePill, scope === 'city' && styles.scopePillActive]}
                  onPress={() => setScope('city')}
                >
                  <Text style={[styles.scopePillText, scope === 'city' && styles.scopePillTextActive]}>
                    📍 {userCity}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Filters Row 2: Mode (All, Offline, Online, Both) */}
              <View style={styles.modeTabsRow}>
                {([
                  { id: 'all', label: 'All Modes' },
                  { id: 'offline', label: 'Offline Gym' },
                  { id: 'online', label: 'Online Live' },
                  { id: 'both', label: 'Hybrid' },
                ] as const).map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.modeChip, mode === m.id && styles.modeChipActive]}
                    onPress={() => setMode(m.id)}
                  >
                    <Text style={[styles.modeChipText, mode === m.id && styles.modeChipTextActive]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Top 3 Podium Card */}
            {topThree.length >= 3 && (
              <LinearGradient
                colors={['#1A1A2E', '#16213E']}
                style={styles.podiumContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.podiumTitle}>TOP PERFORMING COACHES</Text>
                <Text style={styles.podiumSub}>
                  Ranked by verified client sessions, ratings & consistency
                </Text>

                <View style={styles.podiumRow}>
                  {/* #2 Silver (Left) */}
                  <PodiumAvatar item={topThree[1]} rank={2} medal="🥈" color="#C0C0C0" height={100} />

                  {/* #1 Gold (Center) */}
                  <PodiumAvatar item={topThree[0]} rank={1} medal="🥇" color="#FFD700" height={130} isFirst />

                  {/* #3 Bronze (Right) */}
                  <PodiumAvatar item={topThree[2]} rank={3} medal="🥉" color="#CD7F32" height={85} />
                </View>
              </LinearGradient>
            )}

            {/* List of Ranked Coaches */}
            <View style={styles.listCard}>
              <Text style={styles.listHeaderTitle}>
                {scope === 'india' ? 'Pan-India Standings' : `Top Coaches in ${userCity}`}
              </Text>

              {restTrainers.map((item) => (
                <TouchableOpacity
                  key={item.trainer.id}
                  style={styles.rankRow}
                  onPress={() => router.push(`/trainer/${item.trainer.id}`)}
                  activeOpacity={0.8}
                >
                  <View style={styles.rankNumberBox}>
                    <Text style={styles.rankNumberText}>#{item.rank}</Text>
                  </View>

                  <View style={styles.trainerAvatar}>
                    {item.trainer.profilePhoto ? (
                      <Image source={{ uri: item.trainer.profilePhoto }} style={styles.avatarImg} contentFit="cover" />
                    ) : (
                      <Text style={styles.avatarInitial}>{item.trainer.name[0]}</Text>
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.trainerName} numberOfLines={1}>
                        {item.trainer.name}
                      </Text>
                      {item.trainer.isKYCApproved && (
                        <Ionicons name="shield-checkmark" size={13} color={COLORS.primary} />
                      )}
                    </View>
                    <Text style={styles.trainerMeta}>
                      {item.trainer.city} · {item.totalSessions}+ workouts · ⭐ {item.rating.toFixed(1)}
                    </Text>
                  </View>

                  <View style={styles.scoreBadge}>
                    <Text style={styles.scoreVal}>{item.score}</Text>
                    <Text style={styles.scoreLabel}>pts</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          /* Client Transformation & Workout Streaks */
          <View style={styles.listCard}>
            <View style={styles.clientStreakHeader}>
              <View style={styles.fireIconBg}>
                <Ionicons name="flame" size={24} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.listHeaderTitle}>Workout Consistency Hall of Fame</Text>
                <Text style={styles.clientStreakSub}>
                  Clients with highest completed workouts & daily logged streaks
                </Text>
              </View>
            </View>

            {MOCK_CLIENT_LEADERBOARD.map((c) => (
              <View key={c.id} style={styles.rankRow}>
                <View style={[styles.rankNumberBox, c.rank <= 3 && styles.rankNumberBoxTop]}>
                  <Text style={[styles.rankNumberText, c.rank <= 3 && { color: COLORS.white }]}>
                    {c.rank === 1 ? '🥇' : c.rank === 2 ? '🥈' : c.rank === 3 ? '🥉' : `#${c.rank}`}
                  </Text>
                </View>

                <View style={[styles.trainerAvatar, { backgroundColor: `${COLORS.primary}20` }]}>
                  <Text style={[styles.avatarInitial, { color: COLORS.primary }]}>{c.name[0]}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.trainerName}>{c.name}</Text>
                  <Text style={styles.trainerMeta}>
                    {c.city} · {c.totalWorkouts} sessions completed · {c.level}
                  </Text>
                </View>

                <View style={styles.streakBadge}>
                  <Ionicons name="flame" size={14} color="#E55A25" />
                  <Text style={styles.streakText}>{c.streakDays}d</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const PodiumAvatar = ({
  item,
  rank,
  medal,
  color,
  height,
  isFirst = false,
}: {
  item: RankedTrainer;
  rank: number;
  medal: string;
  color: string;
  height: number;
  isFirst?: boolean;
}) => (
  <TouchableOpacity
    style={[styles.podiumCol, isFirst && { marginTop: -16 }]}
    onPress={() => router.push(`/trainer/${item.trainer.id}`)}
    activeOpacity={0.85}
  >
    <View style={styles.avatarMedalWrap}>
      <View style={[styles.podiumAvatar, { borderColor: color }]}>
        {item.trainer.profilePhoto ? (
          <Image source={{ uri: item.trainer.profilePhoto }} style={styles.avatarImg} contentFit="cover" />
        ) : (
          <Text style={styles.podiumInitials}>{item.trainer.name[0]}</Text>
        )}
      </View>
      <View style={styles.medalPill}>
        <Text style={styles.medalText}>{medal}</Text>
      </View>
    </View>

    <Text style={styles.podiumName} numberOfLines={1}>
      {item.trainer.name.split(' ')[0]}
    </Text>
    <Text style={styles.podiumCity}>{item.trainer.city}</Text>

    {/* Pillar */}
    <View style={[styles.podiumPillar, { height, borderColor: `${color}40` }]}>
      <Text style={[styles.podiumRankNum, { color }]}>#{rank}</Text>
      <Text style={styles.podiumScore}>{item.score} pts</Text>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F3F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: COLORS.textPrimary },
  headerSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },

  // Audience Tabs
  audienceTabWrap: {
    flexDirection: 'row',
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#E9ECEF',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  audienceTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  audienceTabActive: {
    backgroundColor: COLORS.primary,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  audienceTabText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  audienceTabTextActive: { color: COLORS.white, fontWeight: '800' },

  scrollBody: { paddingHorizontal: 16, paddingTop: 6, gap: 14 },

  // Filter Section
  filterSection: { gap: 10 },
  scopePillContainer: { flexDirection: 'row', gap: 10 },
  scopePill: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  scopePillActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}08`,
  },
  scopePillText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  scopePillTextActive: { color: COLORS.primary, fontWeight: '800' },

  // Mode Chips
  modeTabsRow: { flexDirection: 'row', gap: 8 },
  modeChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modeChipActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  modeChipText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  modeChipTextActive: { color: COLORS.white },

  // Podium
  podiumContainer: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  podiumTitle: { fontSize: 12, fontWeight: '900', color: '#FFD700', letterSpacing: 1 },
  podiumSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 12 },
  podiumRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', width: '100%', gap: 12 },
  podiumCol: { alignItems: 'center', flex: 1 },
  avatarMedalWrap: { position: 'relative' },
  podiumAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    backgroundColor: '#2A2A40',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  podiumInitials: { color: COLORS.white, fontSize: 22, fontWeight: '800' },
  medalPill: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  medalText: { fontSize: 12 },
  podiumName: { color: COLORS.white, fontSize: 13, fontWeight: '800', marginTop: 10 },
  podiumCity: { color: 'rgba(255,255,255,0.6)', fontSize: 10, marginBottom: 8 },
  podiumPillar: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderBottomWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    gap: 2,
  },
  podiumRankNum: { fontSize: 20, fontWeight: '900' },
  podiumScore: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600' },

  // List Card
  listCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  listHeaderTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 6 },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  rankNumberBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F3F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankNumberBoxTop: { backgroundColor: COLORS.primary },
  rankNumberText: { fontSize: 12, fontWeight: '800', color: COLORS.textPrimary },
  trainerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarInitial: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  trainerName: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  trainerMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  scoreBadge: {
    alignItems: 'flex-end',
    backgroundColor: `${COLORS.primary}10`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  scoreVal: { fontSize: 14, fontWeight: '900', color: COLORS.primary },
  scoreLabel: { fontSize: 9, color: COLORS.primary, fontWeight: '600', marginTop: -2 },

  // Client Streak
  clientStreakHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  fireIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientStreakSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, lineHeight: 16 },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF0EA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  streakText: { fontSize: 13, fontWeight: '800', color: '#E55A25' },
});
