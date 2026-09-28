import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuthStore } from '../../stores/authStore';
import { logout as signOutUser } from '../../services/auth';
import { COLORS } from '../../constants/colors';
import { CONFIG } from '../../constants/config';
import { FitnessGoalLabel } from '../../types/user';
import { Screen } from '../../components/ui/Screen';

export default function ClientProfileScreen() {
  const { user, clientProfile } = useAuthStore();

  const bmi =
    clientProfile?.weight && clientProfile?.height
      ? (
          clientProfile.weight /
          Math.pow(
            clientProfile.heightUnit === 'cm'
              ? clientProfile.height / 100
              : clientProfile.height * 0.3048,
            2
          )
        ).toFixed(1)
      : null;

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of Bodivex?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await signOutUser();
          router.replace('/welcome');
        },
      },
    ]);
  };

  return (
    <Screen preset="calm" style={{ paddingBottom: 88 }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.headerCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              {user?.profilePhoto ? (
                <Image source={{ uri: user.profilePhoto }} style={styles.avatarImg} contentFit="cover" />
              ) : (
                <Text style={styles.avatarText}>{user?.name?.[0] ?? 'C'}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{user?.name || 'Client'}</Text>
              <Text style={styles.phone}>{user?.phone || '+91'}</Text>
              <View style={styles.badgeRow}>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>Client Member</Text>
                </View>
                {clientProfile?.aadhaarVerified && (
                  <View style={styles.kycBadge}>
                    <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
                    <Text style={styles.kycBadgeText}>KYC Verified</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Body Stats & Fitness Profile */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Physical Stats & Profile</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statBoxVal}>{clientProfile?.height ?? '--'} {clientProfile?.heightUnit ?? 'cm'}</Text>
              <Text style={styles.statBoxLabel}>Height</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxVal}>{clientProfile?.weight ?? '--'} kg</Text>
              <Text style={styles.statBoxLabel}>Weight</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxVal}>{bmi ?? '--'}</Text>
              <Text style={styles.statBoxLabel}>Est. BMI</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxVal}>
                {clientProfile?.fitnessLevel
                  ? clientProfile.fitnessLevel.charAt(0).toUpperCase() + clientProfile.fitnessLevel.slice(1)
                  : '--'}
              </Text>
              <Text style={styles.statBoxLabel}>Level</Text>
            </View>
          </View>

          {clientProfile?.gymName && (
            <View style={styles.infoRow}>
              <Ionicons name="barbell-outline" size={18} color={COLORS.primary} />
              <Text style={styles.infoRowText}>Home Gym: {clientProfile.gymName}</Text>
            </View>
          )}

          {/* Fitness Goals */}
          {clientProfile?.goals && clientProfile.goals.length > 0 && (
            <View style={styles.goalsContainer}>
              <Text style={styles.subTitle}>Selected Goals</Text>
              <View style={styles.goalChips}>
                {clientProfile.goals.map((g) => (
                  <View key={g} style={styles.goalChip}>
                    <Text style={styles.goalChipText}>{FitnessGoalLabel[g] || g}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* AI Blueprint Quick Link */}
        {clientProfile?.fitnessBlueprint && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI Fitness Blueprint</Text>
            <TouchableOpacity
              style={styles.blueprintCard}
              onPress={() => router.push('/onboarding/client/blueprint')}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.blueprintTitle}>Personalized strategy</Text>
                <Text style={styles.blueprintSub} numberOfLines={2}>
                  {clientProfile.fitnessBlueprint.trainerType} · {clientProfile.fitnessBlueprint.estimatedTimeline}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Settings & Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings & About</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Alert.alert('Bodivex Support', `Need help? Reach our team at ${CONFIG.supportEmail}`)}
          >
            <Ionicons name="help-circle-outline" size={20} color={COLORS.textPrimary} />
            <Text style={styles.menuItemText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Alert.alert('About Bodivex', `${CONFIG.appName} - ${CONFIG.tagline}\nOfficial website: ${CONFIG.website}`)}
          >
            <Ionicons name="information-circle-outline" size={20} color={COLORS.textPrimary} />
            <Text style={styles.menuItemText}>About Bodivex</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerCard: {
    backgroundColor: COLORS.card,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { color: COLORS.onColor, fontSize: 26, fontWeight: '800' },
  name: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  phone: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' },
  roleBadge: {
    backgroundColor: `${COLORS.secondary}15`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.secondary },
  kycBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${COLORS.success}18`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  kycBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.success },
  section: {
    backgroundColor: COLORS.card,
    marginTop: 12,
    padding: 18,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  statsGrid: { flexDirection: 'row', gap: 10 },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statBoxVal: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  statBoxLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 10,
  },
  infoRowText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  goalsContainer: { gap: 6 },
  subTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  goalChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  goalChip: {
    backgroundColor: `${COLORS.primary}12`,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  goalChipText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  blueprintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  blueprintTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  blueprintSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuItemText: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  logoutItem: { borderBottomWidth: 0 },
  logoutText: { fontSize: 14, fontWeight: '700', color: COLORS.danger },
});
