import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Platform
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useTrainerStore } from '../../stores/trainerStore';
import { useAuthStore } from '../../stores/authStore';
import { createBooking } from '../../services/bookings';
import { COLORS } from '../../constants/colors';
import { SessionType } from '../../types/session';

const DURATIONS = [30, 45, 60, 90, 120];

export default function BookingScreen() {
  const { selectedTrainer: trainer } = useTrainerStore();
  const { user } = useAuthStore();

  const [sessionType, setSessionType] = useState<SessionType>(
    trainer?.pricingOnline ? 'online' : 'offline'
  );
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [durationMins, setDurationMins] = useState(60);
  const [isLoading, setIsLoading] = useState(false);

  if (!trainer) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  const rate = sessionType === 'online'
    ? (trainer.pricingOnline ?? 0)
    : (trainer.pricingOffline ?? 0);
  const price = Math.round((rate / 60) * durationMins);

  // Android has no combined datetime picker: pick date, then time.
  const openAndroidPicker = () => {
    DateTimePickerAndroid.open({
      value: selectedDate,
      mode: 'date',
      minimumDate: new Date(),
      onChange: (e, date) => {
        if (e.type !== 'set' || !date) return;
        DateTimePickerAndroid.open({
          value: date,
          mode: 'time',
          onChange: (e2, time) => {
            if (e2.type === 'set' && time) setSelectedDate(time);
          },
        });
      },
    });
  };

  const handleBook = async () => {
    if (!user) return;
    if (selectedDate.getTime() < Date.now()) {
      Alert.alert('Pick a future time');
      return;
    }
    setIsLoading(true);
    try {
      await createBooking(
        { trainerId: trainer.id, type: sessionType, scheduledAt: selectedDate, durationMins, price },
        user.id,
        user.name,
        trainer
      );
      Alert.alert(
        'Request sent',
        `${trainer.name} will confirm your session. Chat unlocks once they accept.`,
        [{ text: 'OK', onPress: () => router.replace('/(client)/sessions') }]
      );
    } catch (e: any) {
      Alert.alert('Booking failed', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const dateLabel = selectedDate.toLocaleString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Session</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.trainerRow}>
          <View style={styles.trainerAvatar}>
            <Text style={styles.trainerAvatarText}>{trainer.name[0]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.trainerName}>{trainer.name}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={13} color="#FFB300" />
              <Text style={styles.ratingText}>{trainer.rating.toFixed(1)} · {trainer.experience} yrs exp</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Session Type</Text>
        <View style={styles.typeRow}>
          {(['online', 'offline'] as SessionType[]).map((type) => {
            const typeRate = type === 'online' ? trainer.pricingOnline : trainer.pricingOffline;
            const active = sessionType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[styles.typeBtn, active && styles.typeBtnActive, !typeRate && styles.typeBtnDisabled]}
                onPress={() => setSessionType(type)}
                disabled={!typeRate}
              >
                <Ionicons
                  name={type === 'online' ? 'videocam' : 'fitness'}
                  size={22}
                  color={active ? COLORS.white : COLORS.textSecondary}
                />
                <Text style={[styles.typeBtnText, active && styles.typeBtnTextActive]}>
                  {type === 'online' ? 'Online' : 'In person'}
                </Text>
                <Text style={[styles.typeBtnPrice, active && { color: 'rgba(255,255,255,0.85)' }]}>
                  {typeRate ? `₹${typeRate}/hr` : 'N/A'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Duration</Text>
        <View style={styles.durationRow}>
          {DURATIONS.map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.durationBtn, durationMins === d && styles.durationBtnActive]}
              onPress={() => setDurationMins(d)}
            >
              <Text style={[styles.durationText, durationMins === d && styles.durationTextActive]}>
                {d >= 60 ? `${d / 60}hr` : `${d}m`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Date & Time</Text>
        {Platform.OS === 'ios' ? (
          <View style={styles.datePickerContainer}>
            <DateTimePicker
              value={selectedDate}
              mode="datetime"
              minimumDate={new Date()}
              onChange={(_, date) => date && setSelectedDate(date)}
              style={{ alignSelf: 'flex-start' }}
            />
          </View>
        ) : (
          <TouchableOpacity style={styles.datePickerContainer} onPress={openAndroidPicker}>
            <Text style={styles.dateText}>{dateLabel}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.priceCard}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{durationMins} min @ ₹{rate}/hr</Text>
            <Text style={styles.priceValue}>₹{price}</Text>
          </View>
          <Text style={styles.payNote}>
            No payment in the app. Pay {trainer.name.split(' ')[0]} directly after they confirm.
          </Text>
        </View>

        <TouchableOpacity style={styles.bookBtn} onPress={handleBook} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.bookBtnText}>Send Booking Request</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  scroll: { padding: 20, gap: 14 },
  trainerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  trainerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trainerAvatarText: { color: COLORS.white, fontSize: 20, fontWeight: '700' },
  trainerName: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginTop: 4 },
  typeRow: { flexDirection: 'row', gap: 12 },
  typeBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    gap: 6,
  },
  typeBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeBtnDisabled: { opacity: 0.4 },
  typeBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  typeBtnTextActive: { color: COLORS.white },
  typeBtnPrice: { fontSize: 13, color: COLORS.textSecondary },
  durationRow: { flexDirection: 'row', gap: 8 },
  durationBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
  },
  durationBtnActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}12` },
  durationText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  durationTextActive: { color: COLORS.primary },
  datePickerContainer: { backgroundColor: COLORS.white, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  dateText: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, paddingVertical: 4 },
  priceCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { fontSize: 14, color: COLORS.textSecondary },
  priceValue: { fontSize: 20, fontWeight: '900', color: COLORS.primary },
  payNote: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  bookBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  bookBtnText: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
});
