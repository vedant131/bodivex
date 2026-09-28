import React from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { logout as signOutUser } from '../../services/auth';
import { Screen } from '../../components/ui/Screen';
import { Glass } from '../../components/ui/Glass';
import { Button } from '../../components/ui/Button';
import { PressableScale } from '../../components/ui/PressableScale';
import { Avatar, Section } from '../../components/ui/Bits';
import { TAB_BAR_SPACE } from '../../components/ui/GlassTabBar';
import { T, type } from '../../constants/theme';
import { CONFIG } from '../../constants/config';
import { FitnessGoalLabel, BudgetRangeLabel } from '../../types/user';

function MenuRow({ icon, label, onPress, danger }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean;
}) {
  return (
    <PressableScale onPress={onPress} accessibilityLabel={label}>
      <View style={styles.menuRow}>
        <Ionicons name={icon} size={20} color={danger ? T.danger : T.text2} />
        <Text style={[type.body, { flex: 1 }, danger && { color: T.danger }]}>{label}</Text>
        {!danger && <Ionicons name="chevron-forward" size={18} color={T.text3} />}
      </View>
    </PressableScale>
  );
}

export default function ClientProfileScreen() {
  const { user, clientProfile: p } = useAuthStore();
  const bmi = p?.weight && p?.height ? (p.weight / Math.pow(p.height / 100, 2)).toFixed(1) : '–';
  const bp = p?.fitnessBlueprint;

  const logout = () =>
    Alert.alert('Log out?', 'You can sign back in any time with your number.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: async () => { await signOutUser(); router.replace('/welcome'); } },
    ]);

  return (
    <Screen preset="calm" edges={['top']}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Avatar uri={user?.profilePhoto} name={user?.name || 'You'} size={84} radius={42} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={type.title} numberOfLines={1}>{user?.name || 'You'}</Text>
            <Text style={type.caption}>{user?.phone} · {p?.city}</Text>
          </View>
        </View>
        <Button title="Edit profile" icon="create-outline" variant="glass" size="md" onPress={() => router.push('/client-edit')} />

        {/* Stats */}
        <View style={styles.stats}>
          {[
            { v: p?.height ? `${p.height}` : '–', l: 'cm tall' },
            { v: p?.weight ? `${p.weight}` : '–', l: 'kg' },
            { v: bmi, l: 'BMI' },
            { v: p?.fitnessLevel ? p.fitnessLevel[0].toUpperCase() + p.fitnessLevel.slice(1) : '–', l: 'level' },
          ].map((s) => (
            <Glass key={s.l} radius={T.radius.lg} style={styles.stat}>
              <Text style={styles.statV} numberOfLines={1} adjustsFontSizeToFit>{s.v}</Text>
              <Text style={type.caption}>{s.l}</Text>
            </Glass>
          ))}
        </View>

        {/* Goals & preferences */}
        <View>
          <Section title="Your goals" />
          <View style={styles.wrap}>
            {(p?.goals ?? []).map((g) => (
              <Glass key={g} radius={T.radius.pill} style={styles.tag}>
                <Text style={styles.tagText}>{FitnessGoalLabel[g] ?? g}</Text>
              </Glass>
            ))}
          </View>
          <Text style={[type.caption, { marginTop: 10 }]}>
            {p?.sessionPreference === 'online' ? 'Online' : p?.sessionPreference === 'offline' ? 'In person' : 'Online or in person'}
            {p?.budgetRange ? ` · ${BudgetRangeLabel[p.budgetRange]} per session` : ''}
            {p?.gymName ? ` · ${p.gymName}` : ''}
          </Text>
        </View>

        {/* Blueprint, shown inline (opening onboarding used to regenerate + re-save it) */}
        {bp && (
          <View>
            <Section title="Your blueprint" />
            <Glass radius={T.radius.xl} style={styles.bp}>
              {[
                { icon: 'fitness' as const, label: 'Ideal coach', v: bp.trainerType },
                { icon: 'list' as const, label: 'Training style', v: bp.recommendedStyle },
                { icon: 'time' as const, label: 'Timeline', v: bp.estimatedTimeline },
              ].map((r) => (
                <View key={r.label} style={styles.bpRow}>
                  <View style={styles.bpIcon}><Ionicons name={r.icon} size={16} color={T.accent} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={type.micro}>{r.label}</Text>
                    <Text style={[type.body, { marginTop: 2 }]}>{r.v}</Text>
                  </View>
                </View>
              ))}
              {!!bp.additionalNotes && <Text style={[type.caption, { lineHeight: 18 }]}>{bp.additionalNotes}</Text>}
            </Glass>
          </View>
        )}

        {/* Settings */}
        <Glass radius={T.radius.xl} style={{ paddingHorizontal: 16 }}>
          <MenuRow icon="help-circle-outline" label="Help & support" onPress={() => Alert.alert('Help', `Write to us at ${CONFIG.supportEmail}`)} />
          <View style={styles.sep} />
          <MenuRow icon="information-circle-outline" label="About Bodivex" onPress={() => Alert.alert(CONFIG.appName, `${CONFIG.tagline}\n${CONFIG.website}`)} />
          <View style={styles.sep} />
          <MenuRow icon="log-out-outline" label="Log out" onPress={logout} danger />
        </Glass>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 20, paddingBottom: TAB_BAR_SPACE },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, padding: 12, gap: 2, alignItems: 'center' },
  statV: { color: T.text, fontSize: 18, fontWeight: '800' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 14, height: 34, justifyContent: 'center' },
  tagText: { color: T.text, fontSize: 13, fontWeight: '700' },
  bp: { padding: 16, gap: 14 },
  bpRow: { flexDirection: 'row', gap: 12 },
  bpIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,45,111,0.16)', alignItems: 'center', justifyContent: 'center' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: T.hairline },
});
