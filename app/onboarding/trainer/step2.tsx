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
import { SPECIALIZATIONS } from '../../../types/trainer';
import { SessionPreference } from '../../../types/user';
import { OnboardingProgress } from '../../../components/shared/OnboardingProgress';

const TOTAL_STEPS = 5;

export default function TrainerStep2() {
  const { trainerProfile, setTrainerProfile } = useAuthStore();
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>(
    trainerProfile?.specializations ?? ['Weight Loss', 'Strength Training']
  );
  const [sessionPref, setSessionPref] = useState<SessionPreference>(
    trainerProfile?.sessionPreference ?? 'both'
  );
  const [gymName, setGymName] = useState(trainerProfile?.gymLocation?.name ?? '');
  const [gymAddress, setGymAddress] = useState(trainerProfile?.gymLocation?.address ?? '');

  const toggleSpec = (s: string) => {
    if (selectedSpecs.includes(s)) {
      setSelectedSpecs(selectedSpecs.filter((item) => item !== s));
    } else {
      setSelectedSpecs([...selectedSpecs, s]);
    }
  };

  const handleNext = () => {
    setTrainerProfile({
      ...trainerProfile!,
      specializations: selectedSpecs,
      sessionPreference: sessionPref,
      gymLocation:
        sessionPref !== 'online'
          ? {
              name: gymName.trim() || 'Local Partner Gym',
              address: gymAddress.trim() || 'Area Gym',
              latitude: 19.076,
              longitude: 72.8777,
              city: trainerProfile?.city ?? 'Mumbai',
              state: 'Maharashtra',
            }
          : undefined,
    } as any);
    router.push('/onboarding/trainer/step3');
  };

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingProgress current={2} total={TOTAL_STEPS} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.title}>Specializations & Mode</Text>
        <Text style={styles.subtitle}>Select what you coach and how you prefer to train clients</Text>

        {/* Specializations Chips */}
        <Text style={styles.label}>Select Your Specializations (min 1) *</Text>
        <View style={styles.specsGrid}>
          {SPECIALIZATIONS.map((s) => {
            const active = selectedSpecs.includes(s);
            return (
              <TouchableOpacity
                key={s}
                style={[styles.specChip, active && styles.specChipActive]}
                onPress={() => toggleSpec(s)}
              >
                <Text style={[styles.specText, active && styles.specTextActive]}>{s}</Text>
                {active && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Session Mode */}
        <Text style={styles.label}>Training Preference *</Text>
        <View style={styles.modeRow}>
          {[
            { value: 'online', label: 'Online Only', icon: 'videocam' },
            { value: 'offline', label: 'In-Person Only', icon: 'barbell' },
            { value: 'both', label: 'Both (Recommended)', icon: 'swap-horizontal' },
          ].map((m) => (
            <TouchableOpacity
              key={m.value}
              style={[styles.modeBtn, sessionPref === m.value && styles.modeBtnActive]}
              onPress={() => setSessionPref(m.value as SessionPreference)}
            >
              <Ionicons
                name={m.icon as any}
                size={20}
                color={sessionPref === m.value ? COLORS.white : COLORS.textSecondary}
              />
              <Text style={[styles.modeText, sessionPref === m.value && styles.modeTextActive]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Offline Gym Location */}
        {sessionPref !== 'online' && (
          <View style={styles.gymCard}>
            <Text style={styles.gymCardTitle}>Gym / Offline Location</Text>
            <Text style={styles.gymCardSub}>Where do you take in-person training sessions?</Text>

            <TextInput
              style={styles.input}
              placeholder="Primary Gym Name (e.g. Gold's Gym Andheri West)"
              placeholderTextColor={COLORS.textMuted}
              value={gymName}
              onChangeText={setGymName}
            />
            <TextInput
              style={styles.input}
              placeholder="Address / Area Landmark"
              placeholderTextColor={COLORS.textMuted}
              value={gymAddress}
              onChangeText={setGymAddress}
            />
          </View>
        )}

        <TouchableOpacity
          style={[styles.nextBtn, selectedSpecs.length === 0 && styles.nextBtnDisabled]}
          onPress={handleNext}
          disabled={selectedSpecs.length === 0}
        >
          <Text style={styles.nextBtnText}>Continue to Pricing</Text>
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
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 4 },
  label: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginTop: 6 },
  specsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  specChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  specChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  specText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  specTextActive: { color: COLORS.white },
  modeRow: { gap: 10 },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  modeBtnActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  modeText: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  modeTextActive: { color: COLORS.white },
  gymCard: {
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
    marginTop: 6,
  },
  gymCardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  gymCardSub: { fontSize: 12, color: COLORS.textSecondary },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
  },
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
