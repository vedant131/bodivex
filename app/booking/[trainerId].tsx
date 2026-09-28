import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTrainerStore } from '../../stores/trainerStore';
import { useAuthStore } from '../../stores/authStore';
import { createBooking } from '../../services/bookings';
import {
  nextDays, slotsForDay, slotKey, dateKey, isBookable, slotPeriod, getBookedSlotKeys,
} from '../../services/slots';
import { COLORS } from '../../constants/colors';
import { CONFIG } from '../../constants/config';
import { SessionType } from '../../types/session';

const PERIODS = ['Morning', 'Afternoon', 'Evening'] as const;

const dayLabel = (d: Date, i: number) =>
  i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short' });

const timeLabel = (d: Date) =>
  d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });

export default function BookingScreen() {
  const { trainerId } = useLocalSearchParams<{ trainerId: string }>();
  const { selectedTrainer, fetchTrainerById } = useTrainerStore();
  const trainer = selectedTrainer?.id === trainerId ? selectedTrainer : null;
  const { user } = useAuthStore();

  useEffect(() => {
    if (!trainer && trainerId) fetchTrainerById(trainerId);
  }, [trainerId]);

  const [sessionType, setSessionType] = useState<SessionType>('online');
  useEffect(() => {
    if (trainer && !trainer.pricingOnline) setSessionType('offline');
  }, [trainer?.id]);
  const days = useMemo(() => nextDays(), []);
  const [day, setDay] = useState(days[0]);
  const [slot, setSlot] = useState<Date | null>(null);
  const [booked, setBooked] = useState<Set<string>>(new Set());
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [isBooking, setIsBooking] = useState(false);

  const loadBooked = () => {
    if (!trainer) return;
    setLoadingSlots(true);
    getBookedSlotKeys(trainer.id)
      .then(setBooked)
      .catch((e) => console.warn('Could not load booked slots', e))
      .finally(() => setLoadingSlots(false));
  };
  useEffect(loadBooked, [trainer?.id]);

  // Open on the first day that still has a free slot (e.g. tomorrow, late in the evening)
  useEffect(() => {
    if (loadingSlots) return;
    const open = (d: Date) => slotsForDay(d).some((s) => isBookable(s) && !booked.has(slotKey(s)));
    if (!open(day)) setDay(days.find(open) ?? day);
  }, [loadingSlots, booked]);

  if (!trainer || user?.role !== 'client') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  const offersBoth = !!trainer.pricingOnline && !!trainer.pricingOffline;
  const price = (sessionType === 'online' ? trainer.pricingOnline : trainer.pricingOffline) ?? 0;
  const daySlots = slotsForDay(day);
  const available = (s: Date) => isBookable(s) && !booked.has(slotKey(s));

  const handleBook = async () => {
    if (!slot) return;
    setIsBooking(true);
    try {
      await createBooking(
        {
          trainerId: trainer.id,
          type: sessionType,
          scheduledAt: slot,
          durationMins: CONFIG.slots.sessionMins,
          price,
        },
        user.id,
        user.name,
        trainer
      );
      Alert.alert(
        'Request sent',
        `${trainer.name} will confirm your ${timeLabel(slot)} slot. Chat unlocks once they accept.`,
        [{ text: 'OK', onPress: () => router.replace('/(client)/sessions') }]
      );
    } catch (e: any) {
      Alert.alert('Could not book', e.message);
      setSlot(null);
      loadBooked();
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Book a session</Text>
          <Text style={styles.headerSub}>with {trainer.name} · {CONFIG.slots.sessionMins} min</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {offersBoth && (
          <View style={styles.segment}>
            {(['online', 'offline'] as SessionType[]).map((type) => {
              const active = sessionType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                  onPress={() => setSessionType(type)}
                  accessibilityState={{ selected: active }}
                >
                  <Ionicons
                    name={type === 'online' ? 'videocam-outline' : 'barbell-outline'}
                    size={16}
                    color={active ? COLORS.textPrimary : COLORS.textSecondary}
                  />
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                    {type === 'online' ? 'Online' : 'In person'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text style={styles.sectionLabel}>When should the session happen?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
          {days.map((d, i) => {
            const active = dateKey(d) === dateKey(day);
            const hasSlots = slotsForDay(d).some(available);
            return (
              <TouchableOpacity
                key={dateKey(d)}
                style={[styles.dayChip, active && styles.chipActive, !hasSlots && styles.chipDisabled]}
                onPress={() => { setDay(d); setSlot(null); }}
                disabled={!hasSlots}
                accessibilityState={{ selected: active, disabled: !hasSlots }}
              >
                <Text style={[styles.dayName, active && styles.chipTextActive]}>{dayLabel(d, i)}</Text>
                <Text style={[styles.dayNum, active && styles.chipTextActive]}>{d.getDate()}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.sectionLabel}>Select start time</Text>
        {loadingSlots ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 24 }} />
        ) : (
          PERIODS.map((period) => {
            const list = daySlots.filter((s) => slotPeriod(s) === period);
            if (!list.some(available)) return null;
            return (
              <View key={period} style={styles.periodBlock}>
                <Text style={styles.periodLabel}>{period}</Text>
                <View style={styles.slotGrid}>
                  {list.map((s) => {
                    const ok = available(s);
                    const active = slot?.getTime() === s.getTime();
                    return (
                      <TouchableOpacity
                        key={s.getTime()}
                        style={[styles.slotChip, active && styles.chipActive, !ok && styles.chipDisabled]}
                        onPress={() => setSlot(s)}
                        disabled={!ok}
                        accessibilityState={{ selected: active, disabled: !ok }}
                      >
                        <Text
                          style={[
                            styles.slotText,
                            active && styles.chipTextActive,
                            !ok && styles.slotTextDisabled,
                          ]}
                        >
                          {timeLabel(s)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })
        )}
        {!loadingSlots && !daySlots.some(available) && (
          <Text style={styles.empty}>No slots left on this day. Try another date.</Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View style={{ flex: 1 }}>
          <Text style={styles.price}>₹{price}</Text>
          <Text style={styles.payNote}>Pay the trainer directly</Text>
        </View>
        <TouchableOpacity
          style={[styles.bookBtn, (!slot || isBooking) && styles.bookBtnDisabled]}
          onPress={handleBook}
          disabled={!slot || isBooking}
        >
          {isBooking ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.bookBtnText}>
              {slot ? `Request ${timeLabel(slot)}` : 'Pick a time'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  headerSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  scroll: { padding: 16, paddingBottom: 32 },

  segment: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 9,
  },
  segmentBtnActive: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  segmentText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  segmentTextActive: { color: COLORS.textPrimary },

  sectionLabel: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },

  dayRow: { gap: 10, paddingBottom: 24 },
  dayChip: {
    width: 68,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: 2,
  },
  dayName: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  dayNum: { fontSize: 18, color: COLORS.textPrimary, fontWeight: '700' },

  periodBlock: { marginBottom: 18 },
  periodLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 8 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slotChip: {
    width: '30.5%',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  slotText: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  slotTextDisabled: { textDecorationLine: 'line-through' },

  chipActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  chipTextActive: { color: COLORS.white },
  chipDisabled: { opacity: 0.35 },

  empty: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 12 },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    backgroundColor: COLORS.white,
  },
  price: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  payNote: { fontSize: 12, color: COLORS.textSecondary },
  bookBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 160,
  },
  bookBtnDisabled: { opacity: 0.4 },
  bookBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
});
