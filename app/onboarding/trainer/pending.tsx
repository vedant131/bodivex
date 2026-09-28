import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../constants/colors';

export default function TrainerPendingScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="checkmark-done" size={54} color={COLORS.success} />
        </View>

        <Text style={styles.title}>Registration Submitted!</Text>
        <Text style={styles.subtitle}>
          Your trainer profile and KYC documents are under automated verification. You can now explore your coaching dashboard and set up your session logs.
        </Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>Aadhaar & PAN KYC linked</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="wallet-outline" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>Escrow Payouts enabled</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="flash-outline" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>AstroTalk-style instant mode active</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.dashboardBtn}
          onPress={() => router.replace('/(trainer)/dashboard')}
        >
          <Text style={styles.dashboardBtnText}>Go to Trainer Dashboard</Text>
          <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  dashboardBtnText: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
});
