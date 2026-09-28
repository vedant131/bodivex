import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTrainerStore } from '../../stores/trainerStore';
import { COLORS } from '../../constants/colors';
import { SPECIALIZATIONS, Specialization } from '../../types/trainer';
import { SessionPreference } from '../../types/user';
import { TrainerCard } from '../../components/trainer/TrainerCard';

const MOOD_OPTIONS = [
  { label: '🔥 Rapid Fat Loss', spec: 'Weight Loss' },
  { label: '💪 Hypertrophy & Muscle', spec: 'Muscle Gain' },
  { label: '⚡ High Energy Cardio', spec: 'HIIT' },
  { label: '🏋️ Heavy Strength', spec: 'Strength Training' },
  { label: '🧘 Mobility & Posture', spec: 'Flexibility & Mobility' },
];

export default function SearchScreen() {
  const { trainers, isLoading, fetchTrainers, filter, setFilter, resetFilter } = useTrainerStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpec, setSelectedSpec] = useState<string | null>(null);
  const [selectedPref, setSelectedPref] = useState<SessionPreference | 'all'>('all');
  const [nearGym, setNearGym] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    applyFilters();
  }, [selectedSpec, selectedPref, nearGym]);

  const applyFilters = () => {
    fetchTrainers({
      searchQuery: searchQuery.trim() || undefined,
      specializations: selectedSpec ? [selectedSpec] : undefined,
      sessionPreference: selectedPref === 'all' ? undefined : selectedPref,
      gymName: nearGym.trim() || undefined,
    });
  };

  const handleSearchSubmit = () => {
    applyFilters();
  };

  const handleMoodSelect = (spec: string) => {
    if (selectedSpec === spec) {
      setSelectedSpec(null);
    } else {
      setSelectedSpec(spec);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header & Search Bar */}
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search" size={20} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search trainer, city, or fitness goal..."
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.filterToggleBtn, showFilters && styles.filterToggleBtnActive]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={showFilters ? COLORS.white : COLORS.textPrimary}
            />
          </TouchableOpacity>
        </View>

        {/* View Toggle */}
        <View style={styles.viewToggleRow}>
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
              onPress={() => setViewMode('list')}
            >
              <Ionicons
                name="list"
                size={16}
                color={viewMode === 'list' ? COLORS.white : COLORS.textSecondary}
              />
              <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>
                List
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
              onPress={() => setViewMode('map')}
            >
              <Ionicons
                name="map"
                size={16}
                color={viewMode === 'map' ? COLORS.white : COLORS.textSecondary}
              />
              <Text style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>
                Map
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.resultsCount}>{trainers.length} coaches found</Text>
        </View>
      </View>

      {/* Expandable Filter Panel */}
      {showFilters && (
        <View style={styles.filterPanel}>
          <Text style={styles.filterTitle}>Near Specific Gym</Text>
          <View style={styles.gymInputRow}>
            <Ionicons name="barbell-outline" size={18} color={COLORS.primary} />
            <TextInput
              style={styles.gymInput}
              placeholder="e.g. Gold's Gym, Cult.Fit, Anytime Fitness"
              placeholderTextColor={COLORS.textMuted}
              value={nearGym}
              onChangeText={setNearGym}
            />
          </View>

          <Text style={styles.filterTitle}>Session Mode</Text>
          <View style={styles.prefRow}>
            {(['all', 'online', 'offline'] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.prefChip, selectedPref === mode && styles.prefChipActive]}
                onPress={() => setSelectedPref(mode)}
              >
                <Text style={[styles.prefText, selectedPref === mode && styles.prefTextActive]}>
                  {mode === 'all' ? 'All Modes' : mode === 'online' ? '🌐 Online' : '🏋️ Offline'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Mood-Based Quick Picks */}
      <View style={styles.moodSection}>
        <Text style={styles.moodSectionTitle}>Targeted Focus (Mood Picks)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moodList}>
          {MOOD_OPTIONS.map((mood) => {
            const active = selectedSpec === mood.spec;
            return (
              <TouchableOpacity
                key={mood.label}
                style={[styles.moodChip, active && styles.moodChipActive]}
                onPress={() => handleMoodSelect(mood.spec)}
              >
                <Text style={[styles.moodText, active && styles.moodTextActive]}>
                  {mood.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Content: List or Map View */}
      {viewMode === 'map' ? (
        <View style={styles.mapContainer}>
          <View style={styles.mapMock}>
            <Ionicons name="location" size={48} color={COLORS.primary} />
            <Text style={styles.mapTitle}>Interactive Map View</Text>
            <Text style={styles.mapSub}>
              Showing gym hubs and certified trainers in your area
            </Text>
            <View style={styles.mapBadge}>
              <Text style={styles.mapBadgeText}>📍 Mumbai / Pan-India Coverage</Text>
            </View>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.resultsList} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View style={styles.loadingWrapper}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Searching certified coaches...</Text>
            </View>
          ) : trainers.length === 0 ? (
            <View style={styles.emptyWrapper}>
              <Ionicons name="search-outline" size={54} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No trainers match your criteria</Text>
              <Text style={styles.emptySubtitle}>
                Try clearing filters or searching for another gym/specialization.
              </Text>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => {
                  setSelectedSpec(null);
                  setSelectedPref('all');
                  setNearGym('');
                  setSearchQuery('');
                  resetFilter();
                  fetchTrainers();
                }}
              >
                <Text style={styles.resetBtnText}>Reset Filters</Text>
              </TouchableOpacity>
            </View>
          ) : (
            trainers.map((trainer) => (
              <TrainerCard key={trainer.id} trainer={trainer} variant="full" />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary },
  filterToggleBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterToggleBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  viewToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  toggleBtnActive: { backgroundColor: COLORS.primary },
  toggleText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  toggleTextActive: { color: COLORS.white },
  resultsCount: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  filterPanel: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  filterTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase' },
  gymInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    borderRadius: 10,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gymInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary },
  prefRow: { flexDirection: 'row', gap: 8 },
  prefChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  prefChipActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}12` },
  prefText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  prefTextActive: { color: COLORS.primary, fontWeight: '700' },
  moodSection: {
    backgroundColor: COLORS.white,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  moodSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  moodList: { paddingHorizontal: 16, gap: 8 },
  moodChip: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  moodChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  moodText: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  moodTextActive: { color: COLORS.white, fontWeight: '700' },
  resultsList: { padding: 16, gap: 14 },
  loadingWrapper: { paddingVertical: 50, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: COLORS.textSecondary },
  emptyWrapper: { paddingVertical: 60, alignItems: 'center', gap: 8, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  resetBtn: {
    marginTop: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  resetBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  mapContainer: { flex: 1, padding: 16 },
  mapMock: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  mapTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  mapSub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  mapBadge: {
    backgroundColor: `${COLORS.primary}15`,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  mapBadgeText: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
});
