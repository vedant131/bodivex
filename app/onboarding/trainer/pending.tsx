import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../constants/colors';
import { CONFIG } from '../../../constants/config';
import { useAuthStore } from '../../../stores/authStore';
import { subscribeToOwnTrainerProfile } from '../../../services/trainers';

export default function TrainerPendingScreen() {
  const { user, trainerProfile, setTrainerProfile } = useAuthStore();
  const approved = trainerProfile?.kycStatus === 'approved';

  // Flips to "You're live" as soon as the team approves the profile
  useEffect(() => {
    if (!user) return;
    return subscribeToOwnTrainerProfile(user.id, (p) => p && setTrainerProfile(p));
  }, [user?.id]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.iconCircle, !approved && { backgroundColor: `${COLORS.warning}18` }]}>
          <Ionicons
            name={approved ? 'checkmark-done' : 'hourglass-outline'}
            size={54}
            color={approved ? COLORS.success : COLORS.warning}
          />
        </View>

        <Text style={styles.title}>{approved ? "You're live!" : 'Profile under review'}</Text>
        <Text style={styles.subtitle}>
          {approved
            ? 'Clients in your city can now find and book you.'
            : `We'll contact you to verify your ID and certificates, usually within ${CONFIG.trainerApprovalHours} hours. You can set up your profile meanwhile.`}
        </Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              Your first {CONFIG.freeClientsPerTrainer} clients are free
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="cash-outline" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>Clients pay you directly</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.dashboardBtn} onPress={() => router.replace('/(trainer)/dashboard')}>
          <Text style={styles.dashboardBtnText}>Go to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${COLORS.success}18`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  infoCard: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginVertical: 12,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoText: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '600' },
  dashboardBtn: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  dashboardBtnText: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
});
