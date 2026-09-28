import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuthStore } from '../../stores/authStore';
import { useTrainerStore } from '../../stores/trainerStore';
import { COLORS } from '../../constants/colors';
import { TrainerProfile } from '../../types/trainer';
import { TrainerCard } from '../../components/trainer/TrainerCard';

export default function HomeScreen() {
  const { user, clientProfile } = useAuthStore();
  const { trainers, topTrainers, isLoading, fetchTrainers, fetchTopTrainers } = useTrainerStore();

  const city = 'Mumbai'; // Will use GPS-detected city in production

  useEffect(() => {
    fetchTrainers(clientProfile?.fitnessBlueprint?.recommendedFilters
      ? {
          specializations: clientProfile.fitnessBlueprint.recommendedFilters.specializations,
          sessionPreference: clientProfile.sessionPreference,
        }
      : undefined
    );
    fetchTopTrainers(city);
  }, []);

  const onRefresh = useCallback(() => {
    fetchTrainers();
    fetchTopTrainers(city);
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()}, {user?.name?.split(' ')[0] ?? 'there'} 👋</Text>
            <Text style={styles.subtitle}>Find your perfect trainer</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(client)/profile')} style={styles.avatarBtn}>
            {user?.profilePhoto ? (
              <Image source={{ uri: user.profilePhoto }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{user?.name?.[0] ?? 'U'}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Search Bar (tap → navigate to search) */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => router.push('/(client)/search')}
          activeOpacity={0.8}
        >
          <Ionicons name="search" size={20} color={COLORS.textMuted} />
          <Text style={styles.searchPlaceholder}>Search trainers, specializations...</Text>
          <Ionicons name="options" size={20} color={COLORS.primary} />
        </TouchableOpacity>

        {/* AI Blueprint Banner (if user has blueprint) */}
        {clientProfile?.fitnessBlueprint && (
          <TouchableOpacity style={styles.blueprintBanner} activeOpacity={0.85}>
            <View>
              <Text style={styles.blueprintTitle}>🤖 Your Fitness Blueprint</Text>
              <Text style={styles.blueprintSub} numberOfLines={1}>
                {clientProfile.fitnessBlueprint.trainerType}
              </Text>
            </View>
            <Ionicons name="arrow-forward-circle" size={28} color={COLORS.primary} />
          </TouchableOpacity>
        )}

        {/* Quick Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filtersContent}>
          {[
            { label: '🟢 Available Now', key: 'available' },
            { label: '🔥 Weight Loss', key: 'weight_loss' },
            { label: '💪 Muscle Gain', key: 'muscle' },
            { label: '🌐 Online', key: 'online' },
            { label: '📍 Near Me', key: 'nearby' },
            { label: '⭐ Top Rated', key: 'top' },
          ].map((f) => (
            <TouchableOpacity key={f.key} style={styles.filterChip}>
              <Text style={styles.filterChipText}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 🏆 Bodivex Arena Leaderboard Banner */}
        <TouchableOpacity
          style={styles.arenaBanner}
          onPress={() => router.push('/leaderboard')}
          activeOpacity={0.85}
        >
          <View style={styles.arenaBannerIconWrap}>
            <Ionicons name="trophy" size={22} color="#D97706" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.arenaBannerTitle}>Bodivex Arena · Coach & Client Rankings</Text>
            <Text style={styles.arenaBannerSub}>
              Discover India's top certified coaches and daily client streak leaders
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
        </TouchableOpacity>

        {/* Top Trainers */}
        {topTrainers.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🏆 Top in {city}</Text>
              <TouchableOpacity onPress={() => router.push('/(client)/search')}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingRight: 24 }}>
              {topTrainers.slice(0, 5).map((trainer) => (
                <TrainerCard key={trainer.id} trainer={trainer} variant="compact" />
              ))}
            </ScrollView>
          </View>
        )}

        {/* AI Matched Trainers */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>✨ Matched for You</Text>
            <TouchableOpacity onPress={() => router.push('/(client)/search')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          {isLoading ? (
            <View style={styles.loadingPlaceholder}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={styles.skeletonCard} />
              ))}
            </View>
          ) : trainers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No trainers found</Text>
              <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
            </View>
          ) : (
            <View style={styles.trainerList}>
              {trainers.map((trainer) => (
                <TrainerCard key={trainer.id} trainer={trainer} variant="full" />
              ))}
            </View>
          )}
        </View>
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
    paddingBottom: 8,
  },
  greeting: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  avatarBtn: { width: 44, height: 44 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginVertical: 10,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  searchPlaceholder: { flex: 1, fontSize: 14, color: COLORS.textMuted, fontWeight: '500' },
  blueprintBanner: {
    marginHorizontal: 20,
    backgroundColor: COLORS.secondary,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  blueprintTitle: { fontSize: 14, fontWeight: '800', color: COLORS.white },
  blueprintSub: { fontSize: 12, color: '#94A3B8', marginTop: 2, maxWidth: 240 },
  filtersScroll: { marginTop: 2 },
  filtersContent: { paddingHorizontal: 20, gap: 8, paddingVertical: 8 },
  filterChip: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  filterChipText: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  arenaBanner: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: '#FFFBEB',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
  },
  arenaBannerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arenaBannerTitle: { fontSize: 13, fontWeight: '800', color: '#92400E' },
  arenaBannerSub: { fontSize: 11, color: '#B45309', marginTop: 2, lineHeight: 15 },
  section: { marginTop: 22 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  seeAll: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  trainerList: { paddingHorizontal: 20, gap: 14, paddingBottom: 24 },
  loadingPlaceholder: { paddingHorizontal: 20, gap: 14 },
  skeletonCard: {
    height: 140,
    borderRadius: 16,
    backgroundColor: COLORS.shimmer,
  },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '700', color: COLORS.textSecondary },
  emptySubtext: { fontSize: 14, color: COLORS.textMuted },
});
