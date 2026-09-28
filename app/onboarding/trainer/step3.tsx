import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../constants/colors';
import { useAuthStore } from '../../../stores/authStore';
import { OnboardingProgress } from '../../../components/shared/OnboardingProgress';

const TOTAL_STEPS = 5;

export default function TrainerStep3() {
  const { trainerProfile, setTrainerProfile } = useAuthStore();
  const [onlinePrice, setOnlinePrice] = useState(
    trainerProfile?.pricingOnline?.toString() ?? '499'
  );
  const [offlinePrice, setOfflinePrice] = useState(
    trainerProfile?.pricingOffline?.toString() ?? '799'
  );
  const [monthlyPrice, setMonthlyPrice] = useState(
    trainerProfile?.pricingMonthly?.toString() ?? '4999'
  );

  const isValid = Number(onlinePrice) > 0 || Number(offlinePrice) > 0;

  const handleNext = () => {
    setTrainerProfile({
      ...trainerProfile!,
      pricingOnline: Number(onlinePrice) || undefined,
      pricingOffline: Number(offlinePrice) || undefined,
      pricingMonthly: Number(monthlyPrice) || undefined,
    } as any);
    router.push('/onboarding/trainer/step4');
  };

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingProgress current={3} total={TOTAL_STEPS} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.title}>Set Your Rates</Text>
        <Text style={styles.subtitle}>
          Clients pay upfront through Bodivex Escrow. Funds are protected and released after each satisfied session.
        </Text>

        {/* Pricing inputs */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="videocam" size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Online 1-on-1 Video Session</Text>
          </View>
          <Text style={styles.cardSub}>Rate per 60-minute live video workout / consult</Text>
          <View style={styles.priceInputWrapper}>
            <Text style={styles.currency}>₹</Text>
            <TextInput
              style={styles.priceInput}
              placeholder="499"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad"
              value={onlinePrice}
              onChangeText={setOnlinePrice}
            />
            <Text style={styles.unit}>/ session</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="fitness" size={20} color={COLORS.secondary} />
            <Text style={styles.cardTitle}>Offline Gym / In-Person Session</Text>
          </View>
          <Text style={styles.cardSub}>Rate per 60-minute in-gym or field training</Text>
          <View style={styles.priceInputWrapper}>
            <Text style={styles.currency}>₹</Text>
            <TextInput
              style={styles.priceInput}
              placeholder="799"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad"
              value={offlinePrice}
              onChangeText={setOfflinePrice}
            />
            <Text style={styles.unit}>/ session</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="calendar" size={20} color={COLORS.success} />
            <Text style={styles.cardTitle}>Monthly Comprehensive Package</Text>
          </View>
          <Text style={styles.cardSub}>Includes custom workouts, diet plans & 12 sessions</Text>
          <View style={styles.priceInputWrapper}>
            <Text style={styles.currency}>₹</Text>
            <TextInput
              style={styles.priceInput}
              placeholder="4999"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad"
              value={monthlyPrice}
              onChangeText={setMonthlyPrice}
            />
            <Text style={styles.unit}>/ month</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.nextBtn, !isValid && styles.nextBtnDisabled]}
          onPress={handleNext}
          disabled={!isValid}
        >
          <Text style={styles.nextBtnText}>Continue to KYC & Bank</Text>
          <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scroll: { padding: 24, gap: 14 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary, marginTop: 4 },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: 8,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  cardSub: { fontSize: 12, color: COLORS.textSecondary },
  priceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    height: 52,
    marginTop: 4,
  },
  currency: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginRight: 4 },
  priceInput: { flex: 1, fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  unit: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  nextBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  nextBtnDisabled: { backgroundColor: COLORS.textMuted, opacity: 0.5 },
  nextBtnText: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
});
