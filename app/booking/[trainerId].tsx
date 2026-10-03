import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
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
import { LinearGradient } from 'expo-linear-gradient';
import { Backdrop } from '../../components/ui/Backdrop';
import { Glass } from '../../components/ui/Glass';
import { Button } from '../../components/ui/Button';
import { PressableScale } from '../../components/ui/PressableScale';
import { Avatar, IconButton, Chip } from '../../components/ui/Bits';
import { placesOf } from '../../services/trainers';
import { InPersonPlace } from '../../types/gym';
import { T, type } from '../../constants/theme';
import { CONFIG } from '../../constants/config';
import { SessionType } from '../../types/session';
import { Alert, celebrate } from '../../components/ui/Feedback';
import { Bone } from '../../components/ui/Skeleton';

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
  const [placeKey, setPlaceKey] = useState<string | null>(null);
  const myGymId = useAuthStore((s) => s.clientProfile?.gym?.id);
  const myCity = useAuthStore((s) => s.clientProfile?.city);
  const otherCity = !!trainer && !!myCity && trainer.city !== myCity;
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
        <Backdrop />
        <ActivityIndicator color={T.text} />
      </View>
    );
  }

  const offersBoth = !!trainer.pricingOnline && !!trainer.pricingOffline;
  // In-person place options: each of the trainer's gyms, then home/society and outdoors
  type PlaceOpt = { key: string; place: InPersonPlace; label: string; icon: 'barbell' | 'home' | 'leaf'; mine?: boolean };
  const placeOptions = ([
    ...(placesOf(trainer).includes('gym')
      ? (trainer.gyms?.length ? trainer.gyms : trainer.gymLocation ? [{ id: 'legacy', name: trainer.gymLocation.name, area: '' }] : [])
          .map((g) => ({ key: g.id, place: 'gym' as const, label: g.name, icon: 'barbell' as const, mine: g.id === myGymId }))
      : []),
    ...(placesOf(trainer).includes('home') ? [{ key: 'home', place: 'home' as const, label: 'My home / society gym', icon: 'home' as const }] : []),
    ...(placesOf(trainer).includes('outdoor') ? [{ key: 'outdoor', place: 'outdoor' as const, label: 'Outdoors', icon: 'leaf' as const }] : []),
  ] as PlaceOpt[]).sort((a, b) => Number(!!b.mine) - Number(!!a.mine));
  const chosenPlace = placeOptions.find((o) => o.key === placeKey) ?? placeOptions[0];
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
          ...(sessionType === 'offline' && chosenPlace && {
            place: chosenPlace.place,
            placeLabel: chosenPlace.place === 'home' ? "Client's home / society gym" : chosenPlace.label,
          }),
        },
        user.id,
        user.name,
        trainer
      );
      celebrate('Request sent', `${trainer.name.split(' ')[0]} will confirm your ${timeLabel(slot)} slot.`);
      router.replace('/(client)/sessions');
    } catch (e: any) {
      Alert.alert('Could not book', e.message);
      setSlot(null);
      loadBooked();
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Backdrop preset="calm" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />
          <Avatar uri={trainer.profilePhoto} name={trainer.name} size={40} radius={20} />
          <View style={{ flex: 1 }}>
            <Text style={type.headline}>Pick a time</Text>
            <Text style={type.caption}>{trainer.name} · {CONFIG.slots.sessionMins} min</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {offersBoth && (
            <Glass radius={T.radius.pill} style={styles.segment}>
              {(['online', 'offline'] as SessionType[]).map((t) => {
                const active = sessionType === t;
                return (
                  <PressableScale key={t} onPress={() => setSessionType(t)} style={[styles.segBtn, active && styles.segOn]} accessibilityState={{ selected: active }}>
                    <Ionicons name={t === 'online' ? 'videocam' : 'barbell'} size={15} color={active ? T.text : T.text3} />
                    <Text style={[styles.segText, active && { color: T.text }]}>{t === 'online' ? 'Online' : 'In person'}</Text>
                  </PressableScale>
                );
              })}
            </Glass>
          )}

          {otherCity && sessionType === 'offline' && (
            <Glass radius={T.radius.lg} style={styles.cityNote}>
              <Ionicons name="location-outline" size={16} color={T.warning} />
              <Text style={[type.caption, { flex: 1 }]}>{trainer.name.split(' ')[0]} trains in person in {trainer.city}. Choose Online if you're in {myCity}.</Text>
            </Glass>
          )}
          {sessionType === 'offline' && placeOptions.length > 0 && (
            <View style={{ marginBottom: 18, gap: 8 }}>
              <Text style={type.micro}>Where</Text>
              <View style={styles.placeWrap}>
                {placeOptions.map((o) => (
                  <Chip key={o.key} label={o.mine ? `${o.label} · your gym` : o.label} icon={o.icon}
                    active={chosenPlace?.key === o.key} onPress={() => setPlaceKey(o.key)} />
                ))}
              </View>
              {chosenPlace?.place === 'gym' && !chosenPlace.mine && (
                <Text style={type.caption}>Not your gym: it may charge an entry fee for outside members. Check with the coach in chat.</Text>
              )}
            </View>
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
            {days.map((d, i) => {
              const active = dateKey(d) === dateKey(day);
              const hasSlots = slotsForDay(d).some(available);
              return (
                <PressableScale
                  key={dateKey(d)}
                  onPress={() => { setDay(d); setSlot(null); }}
                  disabled={!hasSlots}
                  accessibilityState={{ selected: active, disabled: !hasSlots }}
                  accessibilityLabel={`${dayLabel(d, i)} ${d.getDate()}`}
                >
                  {active ? (
                    <View style={[styles.day, styles.dayOn]}>
                      <Text style={[styles.dayName, { color: T.bg }]}>{dayLabel(d, i)}</Text>
                      <Text style={[styles.dayNum, { color: T.bg }]}>{d.getDate()}</Text>
                      <View style={styles.dayDot} />
                    </View>
                  ) : (
                    <Glass radius={T.radius.lg} style={styles.day}>
                      <Text style={styles.dayName}>{dayLabel(d, i)}</Text>
                      <Text style={styles.dayNum}>{d.getDate()}</Text>
                    </Glass>
                  )}
                </PressableScale>
              );
            })}
          </ScrollView>

          {loadingSlots ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{Array.from({ length: 9 }).map((_, i) => <Bone key={i} w="31%" h={48} r={14} />)}</View>
          ) : (
            PERIODS.map((period) => {
              const list = daySlots.filter((s) => slotPeriod(s) === period);
              if (!list.some(available)) return null;
              return (
                <View key={period} style={{ marginBottom: 20 }}>
                  <View style={styles.periodRow}>
                    <Ionicons name={period === 'Morning' ? 'sunny-outline' : period === 'Afternoon' ? 'partly-sunny-outline' : 'moon-outline'} size={15} color={T.text2} />
                    <Text style={type.caption}>{period}</Text>
                  </View>
                  <View style={styles.grid}>
                    {list.map((s) => {
                      const ok = available(s);
                      const active = slot?.getTime() === s.getTime();
                      return (
                        <PressableScale key={s.getTime()} onPress={() => setSlot(s)} disabled={!ok} style={styles.slotWrap} accessibilityState={{ selected: active, disabled: !ok }}>
                          {active ? (
                            <LinearGradient colors={T.gradient} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={[styles.slot, styles.slotGlow]}>
                              <Text style={[styles.slotText, { color: '#fff' }]}>{timeLabel(s)}</Text>
                            </LinearGradient>
                          ) : (
                            <Glass radius={T.radius.md} style={styles.slot}>
                              <Text style={[styles.slotText, !ok && styles.slotOff]}>{timeLabel(s)}</Text>
                            </Glass>
                          )}
                        </PressableScale>
                      );
                    })}
                  </View>
                </View>
              );
            })
          )}
          {!loadingSlots && !daySlots.some(available) && (
            <Text style={[type.caption, { textAlign: 'center', marginTop: 12 }]}>No slots left on this day. Try another date.</Text>
          )}
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.footerWrap}>
          <Glass radius={T.radius.xl} style={styles.footer}>
            <View style={{ flex: 1 }}>
              <Text style={type.caption} numberOfLines={1}>
                {slot ? slot.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Pay coach directly'}
              </Text>
              <Text style={styles.price}>₹{price}</Text>
            </View>
            <Button
              title={slot ? `Request ${timeLabel(slot)}` : 'Pick a time'}
              size="md"
              icon={slot ? 'send' : undefined}
              onPress={handleBook}
              disabled={!slot}
              loading={isBooking}
            />
          </Glass>
        </SafeAreaView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  cityNote: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  scroll: { padding: 16, paddingBottom: 130 },
  segment: { flexDirection: 'row', padding: 4, marginBottom: 18 },
  segBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, height: 38, borderRadius: T.radius.pill },
  segOn: { backgroundColor: T.glassStrong },
  segText: { fontSize: 14, fontWeight: '700', color: T.text3 },
  placeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayRow: { gap: 10, paddingBottom: 22 },
  day: { width: 62, height: 76, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: T.radius.lg },
  dayOn: { backgroundColor: T.text },
  dayName: { fontSize: 12, fontWeight: '700', color: T.text2 },
  dayNum: { fontSize: 22, fontWeight: '800', color: T.text },
  dayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: T.accent, marginTop: 2 },
  periodRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slotWrap: { width: '31%' },
  slot: { height: 48, borderRadius: T.radius.md, alignItems: 'center', justifyContent: 'center' },
  slotGlow: { shadowColor: T.accent, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  slotText: { fontSize: 15, fontWeight: '700', color: T.text },
  slotOff: { color: T.text3, textDecorationLine: 'line-through' },
  footerWrap: { position: 'absolute', left: 12, right: 12, bottom: 0 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, paddingLeft: 18, marginBottom: 8 },
  price: { color: T.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
});
