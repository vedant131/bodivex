import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useAuthStore } from '../../../stores/authStore';
import { subscribeToOwnTrainerProfile } from '../../../services/trainers';
import { Screen } from '../../../components/ui/Screen';
import { Glass } from '../../../components/ui/Glass';
import { Button } from '../../../components/ui/Button';
import { T, type } from '../../../constants/theme';
import { CONFIG } from '../../../constants/config';
import { celebrate } from '../../../components/ui/Feedback';

export default function TrainerPendingScreen() {
  const { user, trainerProfile, setTrainerProfile } = useAuthStore();
  const approved = trainerProfile?.kycStatus === 'approved';
  const rejected = trainerProfile?.kycStatus === 'rejected';
  const wasApproved = useRef(approved);
  useEffect(() => {
    if (approved && !wasApproved.current) celebrate("You're live!", 'Clients can now find and book you.');
    wasApproved.current = approved;
  }, [approved]);

  // Flips to "You're live" as soon as the team approves the profile
  useEffect(() => {
    if (!user) return;
    return subscribeToOwnTrainerProfile(user.id, (p) => p && setTrainerProfile(p));
  }, [user?.id]);

  return (
    <Screen preset={approved ? 'hero' : 'trainer'} edges={['top', 'bottom']}>
      <View style={styles.body}>
        <Animated.View entering={ZoomIn.springify().damping(14)} style={[styles.badge, { backgroundColor: approved ? 'rgba(155,255,58,0.16)' : 'rgba(255,176,32,0.16)' }]}>
          <Ionicons name={approved ? 'checkmark-done' : 'hourglass-outline'} size={52} color={approved ? T.ring2 : T.warning} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150)} style={{ gap: 8, alignItems: 'center' }}>
          <Text style={[type.display, { textAlign: 'center' }]}>{approved ? "You're live!" : rejected ? 'A few changes needed' : 'Under review'}</Text>
          <Text style={[type.body, { color: T.text2, textAlign: 'center' }]}>
            {approved
              ? 'Clients in your city can now find and book you.'
              : rejected
              ? `Our team's note: ${trainerProfile?.kycNote ?? 'please update your profile.'} Fix it in Edit profile and save; your profile goes back for review automatically.`
              : `We'll contact you to verify your ID and certificates, usually within ${CONFIG.trainerApprovalHours} hours. You can set up your profile meanwhile.`}
          </Text>
        </Animated.View>

        <Glass radius={T.radius.xl} style={styles.card}>
          <Row icon="people-outline" text={`Your first ${CONFIG.freeClientsPerTrainer} clients are free`} />
          <Row icon="cash-outline" text="Clients pay you directly" />
          <Row icon="chatbubbles-outline" text="Answer public questions to get discovered" />
        </Glass>
      </View>

      <View style={styles.footer}>
        {rejected && <Button title="Edit profile" icon="create-outline" onPress={() => router.push('/profile-edit')} />}
        <Button title="Go to dashboard" icon="arrow-forward" variant={rejected ? 'glass' : 'primary'} onPress={() => router.replace('/(trainer)/dashboard')} />
      </View>
    </Screen>
  );
}

const Row = ({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
    <Ionicons name={icon} size={20} color={T.accent} />
    <Text style={type.body}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, gap: 24 },
  badge: { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center' },
  card: { alignSelf: 'stretch', padding: 18, gap: 16 },
  footer: { paddingHorizontal: 20, paddingBottom: 8, gap: 10 },
});
