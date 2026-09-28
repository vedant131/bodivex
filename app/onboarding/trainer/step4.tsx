import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingShell } from '../../../components/ui/OnboardingShell';
import { Glass } from '../../../components/ui/Glass';
import { T, type } from '../../../constants/theme';
import { CONFIG } from '../../../constants/config';
import { useAuthStore } from '../../../stores/authStore';
import { createTrainerProfile } from '../../../services/trainers';
import { updateUserProfile } from '../../../services/auth';
import { uploadImage } from '../../../services/storage';


// Verification is manual for v1: the Bodivex team checks ID + certificates
// with the trainer, then sets kycStatus = 'approved' in the Firebase console.
export default function TrainerStep4() {
  const { user, trainerProfile, setTrainerProfile, setUser } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Please log in again');
      router.replace('/welcome');
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
        coachesLevels: trainerProfile?.coachesLevels ?? ['enthusiast'],
        federations: trainerProfile?.federations ?? [],
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
    <OnboardingShell
      preset="trainer"
      step={4}
      total={4}
      title="Almost live"
      subtitle="Every coach is checked by our team before clients can book."
      cta="Submit for review"
      onNext={handleSubmit}
      loading={isSubmitting}
    >
      <Step icon="call-outline" text="We'll contact you on your registered number" />
      <Step icon="id-card-outline" text="Keep a government ID and your certificates ready" />
      <Step icon="time-outline" text={`Approval usually takes under ${CONFIG.trainerApprovalHours} hours`} />
      <Step icon="gift-outline" text={`Listing is free. Your first ${CONFIG.freeClientsPerTrainer} clients are free too.`} />
    </OnboardingShell>
  );
}

const Step = ({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) => (
  <Glass radius={T.radius.lg} style={styles.step}>
    <View style={styles.stepIcon}><Ionicons name={icon} size={18} color={T.accent} /></View>
    <Text style={[type.body, { flex: 1 }]}>{text}</Text>
  </Glass>
);

const styles = StyleSheet.create({
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  stepIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: 'rgba(255,45,111,0.16)', alignItems: 'center', justifyContent: 'center' },
});
