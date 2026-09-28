import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, TextInput } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../constants/colors';
import { useAuthStore } from '../../../stores/authStore';
import { FitnessLevel } from '../../../types/user';
import { OnboardingProgress } from '../../../components/shared/OnboardingProgress';
import { Screen } from '../../../components/ui/Screen';

const TOTAL_STEPS = 3;

export default function ClientStep2() {
  const { clientProfile, setClientProfile } = useAuthStore();
  const [height, setHeight] = useState(clientProfile?.height?.toString() ?? '');
  const [weight, setWeight] = useState(clientProfile?.weight?.toString() ?? '');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>(clientProfile?.heightUnit ?? 'cm');
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>(clientProfile?.fitnessLevel ?? 'beginner');
  const [goesToGym, setGoesToGym] = useState(clientProfile?.currentlyGoesToGym ?? false);
  const [gymName, setGymName] = useState(clientProfile?.gymName ?? '');

  const isValid = !!height && !!weight;

  const handleNext = () => {
    setClientProfile({
      ...clientProfile!,
      height: Number(height),
      weight: Number(weight),
      heightUnit,
      fitnessLevel,
      currentlyGoesToGym: goesToGym,
      gymName: goesToGym ? gymName : undefined,
    } as any);
    router.push('/onboarding/client/step3');
  };

  const FITNESS_LEVELS: { value: FitnessLevel; label: string; desc: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { value: 'beginner', label: 'Beginner', desc: 'Just starting out', icon: 'leaf' },
    { value: 'intermediate', label: 'Intermediate', desc: 'Training for 6+ months', icon: 'barbell' },
    { value: 'advanced', label: 'Advanced', desc: 'Serious athlete', icon: 'trophy' },
  ];

  return (
    <Screen preset="calm">
      <OnboardingProgress current={2} total={TOTAL_STEPS} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.title}>Your Body Stats</Text>
        <Text style={styles.subtitle}>Helps us match you with the right trainer</Text>

        {/* Height */}
        <Text style={styles.label}>Height *</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder={heightUnit === 'cm' ? 'e.g. 175' : 'e.g. 5.10'}
            placeholderTextColor={COLORS.textMuted}
            value={height}
            onChangeText={setHeight}
            keyboardType="decimal-pad"
          />
          <View style={styles.unitToggle}>
            {(['cm', 'ft'] as const).map((u) => (
              <TouchableOpacity
                key={u}
                style={[styles.unitBtn, heightUnit === u && styles.unitBtnActive]}
                onPress={() => setHeightUnit(u)}
              >
                <Text style={[styles.unitText, heightUnit === u && styles.unitTextActive]}>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Weight */}
        <Text style={styles.label}>Weight (kg) *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 70"
          placeholderTextColor={COLORS.textMuted}
          value={weight}
          onChangeText={setWeight}
          keyboardType="decimal-pad"
        />

        {/* Fitness Level */}
        <Text style={styles.label}>Current Fitness Level *</Text>
        {FITNESS_LEVELS.map((fl) => (
          <TouchableOpacity
            key={fl.value}
            style={[styles.levelBtn, fitnessLevel === fl.value && styles.levelBtnActive]}
            onPress={() => setFitnessLevel(fl.value)}
          >
            <Ionicons name={fl.icon} size={26} color={COLORS.textPrimary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.levelLabel, fitnessLevel === fl.value && styles.levelLabelActive]}>
                {fl.label}
              </Text>
              <Text style={styles.levelDesc}>{fl.desc}</Text>
            </View>
            {fitnessLevel === fl.value && (
              <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
            )}
          </TouchableOpacity>
        ))}

        {/* Gym Toggle */}
        <View style={styles.gymToggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.gymToggleLabel}>Do you currently go to a gym?</Text>
            <Text style={styles.gymToggleSub}>Helps find trainers near your gym</Text>
          </View>
          <Switch
            value={goesToGym}
            onValueChange={setGoesToGym}
            trackColor={{ true: COLORS.primary, false: COLORS.border }}
            thumbColor={COLORS.onColor}
          />
        </View>

        {goesToGym && (
          <>
            <Text style={styles.label}>Gym Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Gold's Gym Andheri"
              placeholderTextColor={COLORS.textMuted}
              value={gymName}
              onChangeText={setGymName}
            />
          </>
        )}

        <TouchableOpacity
          style={[styles.nextBtn, !isValid && styles.nextBtnDisabled]}
          onPress={handleNext}
          disabled={!isValid}
        >
          <Text style={styles.nextBtnText}>Next</Text>
          <Ionicons name="arrow-forward" size={20} color={COLORS.onColor} />
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.card },
  scroll: { padding: 24, gap: 12 },
  backBtn: { marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginTop: 8 },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
  },
  unitToggle: { flexDirection: 'row', borderRadius: 12, overflow: 'hidden', borderWidth: 1.5, borderColor: COLORS.border },
  unitBtn: { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.background },
  unitBtnActive: { backgroundColor: COLORS.primary },
  unitText: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary },
  unitTextActive: { color: COLORS.onColor },
  levelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  levelBtnActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}08` },
  levelEmoji: { fontSize: 26 },
  levelLabel: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  levelLabelActive: { color: COLORS.primary },
  levelDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  gymToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginTop: 8,
  },
  gymToggleLabel: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  gymToggleSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  nextBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 24,
  },
  nextBtnDisabled: { backgroundColor: COLORS.textMuted, opacity: 0.5 },
  nextBtnText: { color: COLORS.onColor, fontSize: 18, fontWeight: '700' },
});
