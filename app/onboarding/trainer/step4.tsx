import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../constants/colors';
import { CONFIG } from '../../../constants/config';
import { useAuthStore } from '../../../stores/authStore';
import { createTrainerProfile } from '../../../services/trainers';
import { updateUserProfile } from '../../../services/auth';
import { uploadImage } from '../../../services/storage';
import { OnboardingProgress } from '../../../components/shared/OnboardingProgress';

const TOTAL_STEPS = 5;

// Verification is manual for v1: the Bodivex team checks ID + certificates
// with the trainer, then sets kycStatus = 'approved' in the Firebase console.
export default function TrainerStep4() {
  const { user, trainerProfile, setTrainerProfile, setUser } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Please log in again');
      router.replace('/(auth)');
      return;
    }
    setIsSubmitting(true);
    try {
      const profileData = {
        userId: user.id,
        name: trainerProfile?.name || user.name || 'Coach',
        bio: trainerProfile?.bio || '',
        city: trainerProfile?.city || 'Mumbai',
        state: 'Maharashtra',
        experience: trainerProfile?.experience || 1,
        specializations: trainerProfile?.specializations || [],
        certifications: trainerProfile?.certifications || [],
        medals: [],
        pricingOnline: trainerProfile?.pricingOnline,
        pricingOffline: trainerProfile?.pricingOffline,
        pricingMonthly: trainerProfile?.pricingMonthly,
        gymLocation: trainerProfile?.gymLocation,
        sessionPreference: trainerProfile?.sessionPreference ?? 'both',
        languages: trainerProfile?.languages || ['English', 'Hindi'],
        profilePhoto: trainerProfile?.profilePhoto
          ? await uploadImage(trainerProfile.profilePhoto, `users/${user.id}/profile.jpg`)
          : undefined,
      };

      await createTrainerProfile(user.id, profileData);
      await updateUserProfile(user.id, { name: profileData.name });
      setUser({ ...user, name: profileData.name });
      setTrainerProfile({
        id: user.id, ...profileData, rating: 0, totalReviews: 0, totalSessions: 0,
        isKYCApproved: false, kycStatus: 'pending', isAvailableNow: false, availabilityStatus: 'offline',
      } as any);
      router.replace('/onboarding/trainer/pending');
    } catch (e: any) {
      Alert.alert('Could not submit', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingProgress current={4} total={TOTAL_STEPS} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.title}>Almost done</Text>
        <Text style={styles.subtitle}>
          Every coach on Bodivex is verified by our team before going live.
        </Text>

        <Step icon="call-outline" text="We'll contact you on your registered number" />
        <Step icon="id-card-outline" text="Keep a government ID and your certificates ready" />
        <Step icon="time-outline" text={`Approval usually takes under ${CONFIG.trainerApprovalHours} hours`} />
        <Step icon="gift-outline" text={`Listing is free. Your first ${CONFIG.freeClientsPerTrainer} clients are free too.`} />

        <TouchableOpacity
          style={[styles.nextBtn, isSubmitting && styles.nextBtnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.nextBtnText}>Submit for Review</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const Step = ({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) => (
  <View style={styles.stepRow}>
    <Ionicons name={icon} size={22} color={COLORS.primary} />
    <Text style={styles.stepText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scroll: { padding: 24, gap: 12 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary, marginTop: 4 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 8 },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.background,
  },
  stepText: { flex: 1, fontSize: 14, color: COLORS.textPrimary, lineHeight: 20 },
  nextBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
});
