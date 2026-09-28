import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTrainerStore } from '../../stores/trainerStore';
import { useAuthStore } from '../../stores/authStore';
import { COLORS } from '../../constants/colors';
import { SessionType } from '../../types/session';
import { CONFIG } from '../../constants/config';

const DURATIONS = [30, 45, 60, 90, 120];

export default function BookingScreen() {
  const { trainerId } = useLocalSearchParams<{ trainerId: string }>();
  const { selectedTrainer: trainer } = useTrainerStore();
  const { user } = useAuthStore();

  const [sessionType, setSessionType] = useState<SessionType>('online');
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
  const ratePerMin = rate / 60;
  const sessionCost = Math.round(ratePerMin * durationMins);
  const platformFee = Math.round(sessionCost * CONFIG.platformFeePercent / 100);
  const total = sessionCost + platformFee;

  const handleBook = async () => {
    if (total > (user?.walletBalance ?? 0)) {
      Alert.alert(
        'Insufficient Wallet Balance',
        `You need ₹${total - (user?.walletBalance ?? 0)} more. Add money to your wallet first.`,
        [
          { text: 'Add Money', onPress: () => {} },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }
    setIsLoading(true);
    try {
      // In production: create Razorpay order + Firestore session
      Alert.alert(
        'Booking Confirmed! 🎉',
        `Your session with ${trainer.name} is booked for ${selectedDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}.
        
₹${total} has been held in escrow. The trainer will confirm within 30 minutes.`,
        [{ text: 'OK', onPress: () => router.replace('/(client)/sessions') }]
      );
    } catch (e: any) {
      Alert.alert('Booking Failed', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Session</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Trainer Info */}
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

        {/* Session Type */}
        <Text style={styles.sectionLabel}>Session Type</Text>
        <View style={styles.typeRow}>
          {(['online', 'offline'] as SessionType[]).map((type) => {
            const available = type === 'online' ? !!trainer.pricingOnline : !!trainer.pricingOffline;
            const price = type === 'online' ? trainer.pricingOnline : trainer.pricingOffline;
            return (
              <TouchableOpacity
                key={type}
                style={[styles.typeBtn, sessionType === type && styles.typeBtnActive, !available && styles.typeBtnDisabled]}
                onPress={() => available && setSessionType(type)}
                disabled={!available}
              >
                <Ionicons
                  name={type === 'online' ? 'videocam' : 'fitness'}
                  size={22}
                  color={sessionType === type ? COLORS.white : COLORS.textSecondary}
                />
                <Text style={[styles.typeBtnText, sessionType === type && styles.typeBtnTextActive]}>
                  {type === 'online' ? 'Online' : 'Offline'}
                </Text>
                {available ? (
                  <Text style={[styles.typeBtnPrice, sessionType === type && { color: 'rgba(255,255,255,0.85)' }]}>
                    ₹{price}/hr
                  </Text>
                ) : (
                  <Text style={styles.notAvailable}>N/A</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Duration */}
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

        {/* Date/Time */}
        <Text style={styles.sectionLabel}>Date & Time</Text>
        <View style={styles.datePickerContainer}>
          <DateTimePicker
            value={selectedDate}
            mode="datetime"
            minimumDate={new Date()}
            onChange={(_, date) => date && setSelectedDate(date)}
            style={{ alignSelf: 'flex-start' }}
          />
        </View>

        {/* Order Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          <SummaryRow label={`Session (${durationMins} min @ ₹${rate}/hr)`} value={`₹${sessionCost}`} />
          <SummaryRow label={`Platform fee (${CONFIG.platformFeePercent}%)`} value={`₹${platformFee}`} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{total}</Text>
          </View>
        </View>

        {/* Escrow Notice */}
        <View style={styles.escrowNotice}>
          <Ionicons name="lock-closed" size={18} color={COLORS.primary} />
          <Text style={styles.escrowText}>
            ₹{total} will be held securely in escrow. Released to trainer only after you confirm satisfaction.
          </Text>
        </View>

        {/* Wallet Balance */}
        <View style={styles.walletRow}>
          <Ionicons name="wallet" size={18} color={COLORS.textSecondary} />
          <Text style={styles.walletText}>Wallet Balance: ₹{user?.walletBalance ?? 0}</Text>
          {(user?.walletBalance ?? 0) < total && (
            <TouchableOpacity style={styles.addMoneyBtn}>
              <Text style={styles.addMoneyText}>+ Add Money</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Book Button */}
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={handleBook}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
              <Text style={styles.bookBtnText}>Confirm Booking · ₹{total}</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.summaryRow}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue}>{value}</Text>
  </View>
);

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
  notAvailable: { fontSize: 12, color: COLORS.textMuted },
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
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 14, color: COLORS.textSecondary },
  summaryValue: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  totalLabel: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  totalValue: { fontSize: 20, fontWeight: '900', color: COLORS.primary },
  escrowNotice: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: `${COLORS.primary}10`,
    padding: 14,
    borderRadius: 14,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: `${COLORS.primary}25`,
  },
  escrowText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.white,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  walletText: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  addMoneyBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addMoneyText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  bookBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 58,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  bookBtnText: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
});
