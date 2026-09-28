import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuthStore } from '../../stores/authStore';
import { updateUserProfile } from '../../services/auth';
import { COLORS } from '../../constants/colors';
import { CONFIG } from '../../constants/config';
import { FitnessGoalLabel } from '../../types/user';

export default function ClientProfileScreen() {
  const { user, clientProfile, logout, setUser } = useAuthStore();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [addAmount, setAddAmount] = useState('');

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

  const handleAddMoney = async () => {
    const amt = Number(addAmount);
    if (!amt || amt < 100) {
      Alert.alert('Minimum recharge is ₹100');
      return;
    }
    if (!user) return;

    // Simulate instant wallet recharge (in prod via Razorpay checkout)
    const newBalance = (user.walletBalance ?? 0) + amt;
    await updateUserProfile(user.id, { walletBalance: newBalance });
    setUser({ ...user, walletBalance: newBalance });
    setShowWalletModal(false);
    setAddAmount('');
    Alert.alert('Wallet Recharged! 💳', `Added ₹${amt} to your Bodivex Wallet.`);
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of Bodivex?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/(auth)');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
                {clientProfile?.aadhaarVerified ? (
                  <View style={styles.kycBadge}>
                    <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
                    <Text style={styles.kycBadgeText}>KYC Verified</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.verifyPrompt}
                    onPress={() => Alert.alert('Aadhaar KYC', 'DigiLocker verification coming in next update.')}
                  >
                    <Text style={styles.verifyPromptText}>+ Verify Aadhaar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Bodivex Escrow Wallet */}
        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <View>
              <Text style={styles.walletLabel}>Bodivex Wallet (Escrow Protected)</Text>
              <Text style={styles.walletBalance}>
                ₹{(user?.walletBalance ?? 0).toLocaleString('en-IN')}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.addMoneyBtn}
              onPress={() => setShowWalletModal(true)}
            >
              <Ionicons name="add" size={18} color={COLORS.white} />
              <Text style={styles.addMoneyText}>Add Money</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.walletHint}>
            Funds are deducted only during bookings and held securely until you confirm session satisfaction.
          </Text>
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
                <Text style={styles.blueprintTitle}>🤖 Personalized Strategy</Text>
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

      {/* Add Money Modal */}
      <Modal visible={showWalletModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Recharge Bodivex Wallet</Text>
            <Text style={styles.modalSub}>
              Top up via UPI, Netbanking, or Cards. Unused balance can be refunded anytime.
            </Text>

            <TextInput
              style={styles.amountInput}
              placeholder="₹ Amount (e.g. 1000)"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad"
              value={addAmount}
              onChangeText={setAddAmount}
            />

            <View style={styles.quickAddRow}>
              {[500, 1000, 2000, 5000].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={styles.quickAddBtn}
                  onPress={() => setAddAmount(amt.toString())}
                >
                  <Text style={styles.quickAddText}>+₹{amt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowWalletModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rechargeBtn} onPress={handleAddMoney}>
                <Text style={styles.rechargeText}>Pay & Add Funds</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerCard: {
    backgroundColor: COLORS.white,
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
  avatarText: { color: COLORS.white, fontSize: 26, fontWeight: '800' },
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
  verifyPrompt: {
    backgroundColor: `${COLORS.primary}12`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifyPromptText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  walletCard: {
    margin: 16,
    backgroundColor: COLORS.secondary,
    borderRadius: 18,
    padding: 18,
    gap: 10,
  },
  walletHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  walletLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  walletBalance: { fontSize: 28, fontWeight: '900', color: COLORS.white, marginTop: 4 },
  addMoneyBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addMoneyText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
  walletHint: { fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 16 },
  section: {
    backgroundColor: COLORS.white,
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
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 14,
  },
  modalTitle: { fontSize: 19, fontWeight: '800', color: COLORS.textPrimary },
  modalSub: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  amountInput: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  quickAddRow: { flexDirection: 'row', gap: 8 },
  quickAddBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  quickAddText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 14 },
  rechargeBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rechargeText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
});
