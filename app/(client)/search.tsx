import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTrainerStore } from '../../stores/trainerStore';
import { useAuthStore } from '../../stores/authStore';
import { TrainerCard } from '../../components/trainer/TrainerCard';
import { Backdrop } from '../../components/ui/Backdrop';
import { Glass } from '../../components/ui/Glass';
import { Chip } from '../../components/ui/Bits';
import { TAB_BAR_SPACE } from '../../components/ui/GlassTabBar';
import { T, type } from '../../constants/theme';
import { Skeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Feedback';
import { CITIES } from '../../constants/config';
import { FilterSheet, Filters, GOALS, countFilters } from '../../components/search/FilterSheet';

export default function SearchScreen() {
  const params = useLocalSearchParams<{ spec?: string }>();
  const { trainers, isLoading, isLoadingMore, hasMore, fetchTrainers, fetchMore } = useTrainerStore();
  const homeCity = useAuthStore((s) => s.clientProfile?.city ?? 'Mumbai');
  const [city, setCity] = useState(homeCity); // browse another city without editing the profile
  useEffect(() => setCity(homeCity), [homeCity]);
  const pickCity = () =>
    Alert.alert('Choose a city', 'In-person coaches are shown for this city. Online coaches from anywhere are always included.', [
      ...CITIES.map((c) => ({ text: c === homeCity ? `${c} (your city)` : c, onPress: () => setCity(c) })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  const myLevel = useAuthStore((s) => s.clientProfile?.athleteLevel);
  const myGym = useAuthStore((s) => s.clientProfile?.gym);
  const athleteLabel = myLevel === 'pro' ? 'Coaches pro athletes' : 'Coaches competitive athletes';

  const [q, setQ] = useState('');
  const [query, setQuery] = useState(''); // q after the user pauses typing
  useEffect(() => { const t = setTimeout(() => setQuery(q.trim()), 350); return () => clearTimeout(t); }, [q]);

  const [filters, setFilters] = useState<Filters>({
    mode: 'all', where: 'any', spec: params.spec ?? null, athletes: !!myLevel && myLevel !== 'enthusiast',
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const { mode, where, spec, athletes } = filters;
  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));
  useEffect(() => { if (params.spec) set({ spec: params.spec }); }, [params.spec]);

  // Removable tags for whatever is switched on, shown after the Filters button
  const active: { key: string; label: string; clear: () => void }[] = [
    ...(mode !== 'all' ? [{ key: 'mode', label: mode === 'online' ? 'Online, any city' : 'In person', clear: () => set({ mode: 'all' }) }] : []),
    ...(where !== 'any' ? [{ key: 'where', label: where === 'mygym' ? 'At my gym' : where === 'home' ? 'Home / society' : 'Outdoors', clear: () => set({ where: 'any' }) }] : []),
    ...(spec ? [{ key: 'spec', label: GOALS.find((g) => g.spec === spec)?.label ?? spec, clear: () => set({ spec: null }) }] : []),
    ...(athletes ? [{ key: 'ath', label: 'Athlete coaches', clear: () => set({ athletes: false }) }] : []),
  ];

  // In-person coaching needs the same city; online doesn't. 'All' = this city's coaches first,
  // then online coaches from every other city. The server filters, searches and sorts
  // (coaches at my gym first) and returns one page at a time.
  useEffect(() => {
    fetchTrainers({
      city: mode === 'online' ? undefined : city,
      onlineAnywhere: mode === 'all',
      searchQuery: query || undefined,
      preferGymId: myGym?.id,
      specializations: spec ? [spec] : undefined,
      sessionPreference: mode === 'all' ? undefined : mode,
      athleteLevel: athletes ? (myLevel === 'pro' ? 'pro' : 'competitive') : undefined,
      gymId: where === 'mygym' ? myGym?.id : undefined,
      inPersonPlace: where === 'home' || where === 'outdoor' ? where : undefined,
    });
  }, [spec, mode, city, athletes, where, query]);

  const results = trainers;

  return (
    <View style={{ flex: 1 }}>
      <Backdrop preset="calm" />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={type.title}>Find a coach</Text>
          <Glass radius={T.radius.lg} style={styles.searchBox}>
            <Ionicons name="search" size={18} color={T.text2} />
            <TextInput
              style={styles.input}
              placeholder="Name, goal or gym"
              placeholderTextColor={T.text3}
              value={q}
              onChangeText={setQ}
              returnKeyType="search"
              selectionColor={T.accent}
              accessibilityLabel="Search coaches"
            />
            {q.length > 0 && (
              <Ionicons name="close-circle" size={18} color={T.text3} onPress={() => setQ('')} accessibilityLabel="Clear search" />
            )}
          </Glass>

          {/* One row: city, Filters, then removable tags for active filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
            <Chip label={`${city} ▾`} icon="location" active={city !== homeCity} onPress={pickCity} />
            <Chip label={active.length ? `Filters · ${countFilters(filters)}` : 'Filters'} icon="options" active={active.length > 0} onPress={() => setSheetOpen(true)} />
            {active.map((f) => <Chip key={f.key} label={`${f.label}  ✕`} active onPress={f.clear} />)}
          </ScrollView>
        </View>

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false} keyboardDismissMode="on-drag">
          <Text style={[type.micro, { marginBottom: 4 }]}>
            {isLoading ? 'Searching…' : `${results.length}${hasMore ? '+' : ''} coach${results.length === 1 && !hasMore ? '' : 'es'}`}
          </Text>
          {isLoading ? (
            <Skeleton variant="row" count={4} />
          ) : results.length === 0 ? (
            <Glass radius={T.radius.xl} style={styles.empty}>
              <Ionicons name="search-outline" size={30} color={T.text2} />
              <Text style={type.headline}>No coaches match</Text>
              <Text style={[type.caption, { textAlign: 'center' }]}>
                Try another goal, switch to Online, or clear the search.
              </Text>
            </Glass>
          ) : (
            <>
              {results.map((t) => <TrainerCard key={t.id} trainer={t} variant="full" />)}
              {hasMore && <Button title="Show more coaches" variant="glass" size="md" loading={isLoadingMore} onPress={fetchMore} />}
            </>
          )}
        </ScrollView>
      <FilterSheet visible={sheetOpen} value={filters} city={city} hasGym={!!myGym} athleteLabel={athleteLabel}
        onApply={setFilters} onClose={() => setSheetOpen(false)} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 8, gap: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingHorizontal: 16 },
  input: { flex: 1, color: T.text, fontSize: 16, fontWeight: '600' },
  chips: { gap: 8, paddingRight: 20 },
  list: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: TAB_BAR_SPACE, gap: 10 },
  empty: { alignItems: 'center', gap: 8, padding: 28, marginTop: 20 },
});
