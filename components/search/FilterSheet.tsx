import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Glass } from '../ui/Glass';
import { Chip } from '../ui/Bits';
import { Button } from '../ui/Button';
import { T, type } from '../../constants/theme';
import { InPersonPlace } from '../../types/gym';

export type Mode = 'all' | 'online' | 'offline';
export type Where = 'any' | 'mygym' | InPersonPlace;
export interface Filters { mode: Mode; where: Where; spec: string | null; athletes: boolean }

export const GOALS = [
  { label: 'Fat loss', spec: 'Weight Loss', icon: 'flame' as const },
  { label: 'Muscle', spec: 'Muscle Gain', icon: 'barbell' as const },
  { label: 'Strength', spec: 'Strength Training', icon: 'fitness' as const },
  { label: 'HIIT', spec: 'HIIT', icon: 'flash' as const },
  { label: 'Yoga', spec: 'Yoga', icon: 'leaf' as const },
  { label: 'Mobility', spec: 'Flexibility & Mobility', icon: 'body' as const },
];

export const NO_FILTERS: Filters = { mode: 'all', where: 'any', spec: null, athletes: false };

/** Everything except city lives here, so the search screen needs only one row of controls. */
export function FilterSheet({ visible, value, city, hasGym, athleteLabel, onApply, onClose }: {
  visible: boolean;
  value: Filters;
  city: string;
  hasGym: boolean;
  athleteLabel: string;
  onApply: (f: Filters) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(value);
  useEffect(() => { if (visible) setDraft(value); }, [visible]);
  const set = (patch: Partial<Filters>) => setDraft((d) => ({ ...d, ...patch }));

  const modes: { id: Mode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'all', label: `${city} + online`, icon: 'globe-outline' },
    { id: 'online', label: 'Online, any city', icon: 'videocam' },
    { id: 'offline', label: `In person, ${city}`, icon: 'barbell' },
  ];
  const places: { id: Where; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'any', label: 'Anywhere', icon: 'location-outline' },
    ...(hasGym ? [{ id: 'mygym' as Where, label: 'At my gym', icon: 'barbell' as const }] : []),
    { id: 'home', label: 'Home / society', icon: 'home' },
    { id: 'outdoor', label: 'Outdoors', icon: 'leaf' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close filters" />
      <Glass radius={T.radius.xl} style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.head}>
          <Text style={type.title}>Filters</Text>
          <Pressable onPress={() => setDraft(NO_FILTERS)} hitSlop={10} accessibilityRole="button">
            <Text style={[type.callout, { color: T.accent }]}>Reset</Text>
          </Pressable>
        </View>

        <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: 18 }} showsVerticalScrollIndicator={false}>
          <Group title="How do you want to train?">
            {modes.map((m) => (
              <Chip key={m.id} label={m.label} icon={m.icon} active={draft.mode === m.id}
                onPress={() => set({ mode: m.id, where: m.id === 'online' ? 'any' : draft.where })} />
            ))}
          </Group>

          {draft.mode !== 'online' && (
            <Group title="Where (in-person sessions)">
              {places.map((p) => <Chip key={p.id} label={p.label} icon={p.icon} active={draft.where === p.id} onPress={() => set({ where: p.id })} />)}
            </Group>
          )}

          <Group title="Goal">
            {GOALS.map((g) => (
              <Chip key={g.spec} label={g.label} icon={g.icon} active={draft.spec === g.spec}
                onPress={() => set({ spec: draft.spec === g.spec ? null : g.spec })} />
            ))}
          </Group>

          <Group title="Coach experience">
            <Chip label={athleteLabel} icon="medal" active={draft.athletes} onPress={() => set({ athletes: !draft.athletes })} />
          </Group>
        </ScrollView>

        <Button title="Show coaches" onPress={() => { onApply(draft); onClose(); }} />
      </Glass>
    </Modal>
  );
}

const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={{ gap: 10 }}>
    <Text style={type.micro}>{title}</Text>
    <View style={styles.wrap}>{children}</View>
  </View>
);

/** Number of filters that differ from the default, for the "Filters • 2" button. */
export const countFilters = (f: Filters) =>
  Number(f.mode !== 'all') + Number(f.where !== 'any') + Number(!!f.spec) + Number(f.athletes);

const styles = StyleSheet.create({
  // Backdrop fills the screen; the sheet is pinned to the bottom (a flex column let the
  // backdrop squeeze the sheet to zero height on web).
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: T.scrim },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 20, gap: 16 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
