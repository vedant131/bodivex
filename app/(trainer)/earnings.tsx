import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { subscribeToTrainerSessions } from '../../services/bookings';
import { getTrainerLeads, Lead } from '../../services/trainers';
import { Screen } from '../../components/ui/Screen';
import { Glass } from '../../components/ui/Glass';
import { PressableScale } from '../../components/ui/PressableScale';
import { Avatar, Section } from '../../components/ui/Bits';
import { TAB_BAR_SPACE } from '../../components/ui/GlassTabBar';
import { T, type } from '../../constants/theme';
import { CONFIG } from '../../constants/config';
import { Session } from '../../types/session';
import { Bone } from '../../components/ui/Skeleton';

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const WEEKS = 8;
const CHART_H = 120;

const weekStart = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};

/**
 * Trainer money view. Clients pay trainers directly, so "earned" is the agreed price of
 * completed sessions (what the trainer should have collected), not money held by Bodivex.
 */
export default function EarningsScreen() {
  const { trainerProfile: p } = useAuthStore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    if (!p) return;
    getTrainerLeads(p.id).then(setLeads).catch(() => {});
    return subscribeToTrainerSessions(p.id, (list) => {
      setSessions(list);
      setLoading(false);
    });
  }, [p?.id]);

  const m = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const done = sessions.filter((s) => s.status === 'completed');
    const sum = (l: Session[]) => l.reduce((a, s) => a + (s.price || 0), 0);
    const thisWeek = weekStart(now).getTime();
    const weeks = Array.from({ length: WEEKS }, (_, i) => {
      const start = thisWeek - (WEEKS - 1 - i) * 7 * 864e5;
      const list = done.filter((s) => s.scheduledAt.getTime() >= start && s.scheduledAt.getTime() < start + 7 * 864e5);
      return { start: new Date(start), amount: sum(list), count: list.length };
    });
    return {
      month: sum(done.filter((s) => s.scheduledAt.getTime() >= monthStart)),
      monthCount: done.filter((s) => s.scheduledAt.getTime() >= monthStart).length,
      allTime: sum(done),
      upcoming: sum(sessions.filter((s) => s.status === 'confirmed' && s.scheduledAt.getTime() > now.getTime())),
      weeks,
      max: Math.max(1, ...weeks.map((w) => w.amount)),
    };
  }, [sessions]);

  if (!p) return null;
  const feesPaid = leads.reduce((a, l) => a + (l.fee || 0), 0);
  const freeLeft = Math.max(0, CONFIG.freeClientsPerTrainer - (p.leadCount ?? 0));
  const shown = picked ?? WEEKS - 1;
  const w = m.weeks[shown];

  return (
    <Screen preset="trainer" edges={['top']}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={type.title}>Earnings</Text>

        {loading ? (
          <View style={{ gap: 12 }}><Bone h={120} r={28} /><Bone h={72} r={20} /><Bone h={200} r={28} /></View>
        ) : (
          <>
            {/* Hero number */}
            <Glass radius={T.radius.xl} style={styles.hero}>
              <Text style={type.micro}>This month</Text>
              <Text style={styles.big}>{inr(m.month)}</Text>
              <Text style={type.caption}>{m.monthCount} completed session{m.monthCount === 1 ? '' : 's'} · collected by you from clients</Text>
            </Glass>

            <View style={styles.tiles}>
              <Glass radius={T.radius.lg} style={styles.tile}>
                <Text style={styles.tileV}>{inr(m.upcoming)}</Text>
                <Text style={type.caption}>booked ahead</Text>
              </Glass>
              <Glass radius={T.radius.lg} style={styles.tile}>
                <Text style={styles.tileV}>{inr(m.allTime)}</Text>
                <Text style={type.caption}>all time</Text>
              </Glass>
            </View>

            {/* Weekly bars: single series, one hue, tap a bar for its value */}
            <Glass radius={T.radius.xl} style={styles.chartCard}>
              <View style={styles.chartHead}>
                <Text style={type.headline}>Last {WEEKS} weeks</Text>
                <Text style={type.caption}>
                  Week of {w.start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}: <Text style={{ color: T.text }}>{inr(w.amount)}</Text> · {w.count} session{w.count === 1 ? '' : 's'}
                </Text>
              </View>
              <View style={styles.chart} accessibilityLabel={`Weekly earnings, latest week ${inr(m.weeks[WEEKS - 1].amount)}`}>
                {m.weeks.map((wk, i) => (
                  <PressableScale key={i} onPress={() => setPicked(i)} haptic={false} style={styles.barHit}
                    accessibilityLabel={`Week of ${wk.start.toDateString()}: ${inr(wk.amount)}`}>
                    <View style={[
                      styles.bar,
                      { height: Math.max(3, (wk.amount / m.max) * CHART_H), opacity: i === shown ? 1 : 0.45 },
                    ]} />
                  </PressableScale>
                ))}
              </View>
              <View style={styles.axis}>
                <Text style={type.caption}>{m.weeks[0].start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
                <Text style={type.caption}>This week</Text>
              </View>
            </Glass>

            {/* Paid to Bodivex */}
            <View>
              <Section title="Paid to Bodivex" action={inr(feesPaid)} />
              <Glass radius={T.radius.lg} style={styles.freeRow}>
                <Ionicons name="gift-outline" size={20} color={T.ring2} />
                <Text style={[type.caption, { flex: 1 }]}>
                  {freeLeft > 0
                    ? `${freeLeft} of ${CONFIG.freeClientsPerTrainer} free new clients left. After that ₹${CONFIG.newClientFee} per new client.`
                    : `Free clients used. ₹${CONFIG.newClientFee} per new client; returning clients are always free.`}
                </Text>
              </Glass>
              {leads.length === 0 ? (
                <Text style={[type.caption, { marginTop: 10 }]}>No clients accepted yet.</Text>
              ) : (
                <View style={{ gap: 8, marginTop: 10 }}>
                  {leads.map((l) => (
                    <Glass key={l.clientId} radius={T.radius.lg} style={styles.leadRow}>
                      <Avatar name={l.clientName} size={36} radius={18} />
                      <View style={{ flex: 1 }}>
                        <Text style={type.body}>{l.clientName}</Text>
                        <Text style={type.caption}>New client · {l.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
                      </View>
                      <Text style={[styles.fee, !l.fee && { color: T.ring2 }]}>{l.fee ? inr(l.fee) : 'Free'}</Text>
                    </Glass>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 16, paddingBottom: TAB_BAR_SPACE },
  hero: { padding: 20, gap: 4 },
  big: { color: T.text, fontSize: 44, fontWeight: '900', letterSpacing: -1.4 },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, padding: 14, gap: 2 },
  tileV: { color: T.text, fontSize: 20, fontWeight: '800' },
  chartCard: { padding: 16, gap: 12 },
  chartHead: { gap: 4 },
  chart: { height: CHART_H, flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  barHit: { flex: 1, height: CHART_H, justifyContent: 'flex-end', paddingHorizontal: 4 },
  bar: { backgroundColor: T.accent, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.hairline, paddingTop: 6 },
  freeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  leadRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  fee: { color: T.text, fontSize: 16, fontWeight: '800' },
});
