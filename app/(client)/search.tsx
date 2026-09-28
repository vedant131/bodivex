import React, { useEffect, useMemo, useState } from 'react';
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

const GOALS = [
  { label: 'Fat loss', spec: 'Weight Loss', icon: 'flame' as const },
  { label: 'Muscle', spec: 'Muscle Gain', icon: 'barbell' as const },
  { label: 'Strength', spec: 'Strength Training', icon: 'fitness' as const },
  { label: 'HIIT', spec: 'HIIT', icon: 'flash' as const },
  { label: 'Yoga', spec: 'Yoga', icon: 'leaf' as const },
  { label: 'Mobility', spec: 'Flexibility & Mobility', icon: 'body' as const },
];

type Mode = 'all' | 'online' | 'offline';

export default function SearchScreen() {
  const params = useLocalSearchParams<{ spec?: string }>();
  const { trainers, isLoading, fetchTrainers } = useTrainerStore();
  const city = useAuthStore((s) => s.clientProfile?.city ?? 'Mumbai');

  const [q, setQ] = useState('');
  const [spec, setSpec] = useState<string | null>(params.spec ?? null);
  const [mode, setMode] = useState<Mode>('all');

  useEffect(() => { if (params.spec) setSpec(params.spec); }, [params.spec]);

  // Online coaches can train anyone; in-person ones only in your city.
  useEffect(() => {
    fetchTrainers({
      city: mode === 'online' ? undefined : city,
      specializations: spec ? [spec] : undefined,
      sessionPreference: mode === 'all' ? undefined : mode,
    });
  }, [spec, mode, city]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return trainers;
    return trainers.filter((t) =>
      [t.name, t.bio, t.gymLocation?.name, ...t.specializations].some((f) => f?.toLowerCase().includes(needle))
    );
  }, [trainers, q]);

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

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {(['all', 'online', 'offline'] as Mode[]).map((m) => (
              <Chip
                key={m}
                label={m === 'all' ? `All in ${city}` : m === 'online' ? 'Online' : 'In person'}
                icon={m === 'online' ? 'videocam' : m === 'offline' ? 'location' : undefined}
                active={mode === m}
                onPress={() => setMode(m)}
              />
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {GOALS.map((g) => (
              <Chip key={g.spec} label={g.label} icon={g.icon} active={spec === g.spec} onPress={() => setSpec(spec === g.spec ? null : g.spec)} />
            ))}
          </ScrollView>
        </View>

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false} keyboardDismissMode="on-drag">
          <Text style={[type.micro, { marginBottom: 4 }]}>
            {isLoading ? 'Searching…' : `${results.length} coach${results.length === 1 ? '' : 'es'}`}
          </Text>
          {isLoading ? (
            <ActivityIndicator color={T.text} style={{ marginTop: 40 }} />
          ) : results.length === 0 ? (
            <Glass radius={T.radius.xl} style={styles.empty}>
              <Ionicons name="search-outline" size={30} color={T.text2} />
              <Text style={type.headline}>No coaches match</Text>
              <Text style={[type.caption, { textAlign: 'center' }]}>
                Try another goal, switch to Online, or clear the search.
              </Text>
            </Glass>
          ) : (
            results.map((t) => <TrainerCard key={t.id} trainer={t} variant="full" />)
          )}
        </ScrollView>
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
