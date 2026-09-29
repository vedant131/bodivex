import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingShell } from '../../../components/ui/OnboardingShell';
import { Glass } from '../../../components/ui/Glass';
import { T, type } from '../../../constants/theme';
import { CONFIG } from '../../../constants/config';
import { useAuthStore } from '../../../stores/authStore';
import { createTrainerProfile } from '../../../services/trainers';
import { updateUserProfile } from '../../../services/auth';
import { uploadImage, uploadVideo } from '../../../services/storage';
import { Alert } from '../../../components/ui/Feedback';


// Verification is manual for v1: the Bodivex team checks ID + certificates
// with the trainer, then sets is_kyc_approved = true, kyc_status = 'approved' on the trainer row (Supabase Studio).
export default function TrainerStep5() {
  const { user, trainerProfile, setTrainerProfile, setUser } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Please log in again');
      router.replace('/welcome');
      return;
    }
    if (!trainerProfile?.videoIntroUrl) {
      Alert.alert('Intro video needed', 'Add a 30–60 second intro video first.');
      router.replace('/onboarding/trainer/step4');
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
        inPersonPlaces: trainerProfile?.inPersonPlaces ?? [],
        gyms: trainerProfile?.gyms ?? [],
        gymIds: trainerProfile?.gymIds ?? [],
        sessionPreference: trainerProfile?.sessionPreference ?? 'both',
        coachesLevels: trainerProfile?.coachesLevels ?? ['enthusiast'],
        federations: trainerProfile?.federations ?? [],
        languages: trainerProfile?.languages || ['English', 'Hindi'],
        videoIntroUrl: await uploadVideo(trainerProfile.videoIntroUrl, `users/${user.id}/intro.mp4`),
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
      step={5}
      total={5}
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
