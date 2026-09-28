import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../constants/colors';
import { useAuthStore } from '../../../stores/authStore';
import { Gender } from '../../../types/user';
import { CityPicker } from '../../../components/shared/CityPicker';
import { SwitchAccountLink } from '../../../components/shared/SwitchAccountLink';
import { OnboardingProgress } from '../../../components/shared/OnboardingProgress';
import { Screen } from '../../../components/ui/Screen';

const TOTAL_STEPS = 3;

export default function ClientStep1() {
  const { clientProfile, setClientProfile } = useAuthStore();
  const [name, setName] = useState(clientProfile?.name ?? '');
  const [age, setAge] = useState(clientProfile?.age?.toString() ?? '');
  const [gender, setGender] = useState<Gender>(clientProfile?.gender ?? 'male');
  const [city, setCity] = useState<string>(clientProfile?.city ?? 'Mumbai');
  const [photo, setPhoto] = useState<string | null>(clientProfile?.profilePhoto ?? null);

  const isValid = name.trim().length >= 2 && Number(age) >= 13 && Number(age) <= 80;

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleNext = () => {
    setClientProfile({
      ...clientProfile!,
      name: name.trim(),
      age: Number(age),
      gender,
      city,
      profilePhoto: photo ?? undefined,
    } as any);
    router.push('/onboarding/client/step2');
  };

  const GENDERS: { value: Gender; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { value: 'male', label: 'Male', icon: 'man' },
    { value: 'female', label: 'Female', icon: 'woman' },
    { value: 'prefer_not_to_say', label: 'Prefer not to say', icon: 'person' },
  ];

  return (
    <Screen preset="calm">
      <OnboardingProgress current={1} total={TOTAL_STEPS} />
      <SwitchAccountLink />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Tell us about yourself</Text>
          <Text style={styles.subtitle}>We'll personalize your Bodivex experience</Text>

          {/* Profile Photo */}
          <TouchableOpacity style={styles.photoCircle} onPress={pickPhoto}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.photoImg} contentFit="cover" />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera" size={28} color={COLORS.textMuted} />
                <Text style={styles.photoLabel}>Add Photo</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Name */}
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            placeholderTextColor={COLORS.textMuted}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          {/* Age */}
          <Text style={styles.label}>Age *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 25"
            placeholderTextColor={COLORS.textMuted}
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            maxLength={2}
          />

          {/* Gender */}
          <Text style={styles.label}>Gender *</Text>
          <View style={styles.genderRow}>
            {GENDERS.map((g) => (
              <TouchableOpacity
                key={g.value}
                style={[styles.genderBtn, gender === g.value && styles.genderBtnActive]}
                onPress={() => setGender(g.value)}
              >
                <Ionicons name={g.icon} size={26} color={COLORS.textPrimary} />
                <Text style={[styles.genderText, gender === g.value && styles.genderTextActive]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Your City *</Text>
          <CityPicker value={city} onChange={setCity} />

          <TouchableOpacity
            style={[styles.nextBtn, !isValid && styles.nextBtnDisabled]}
            onPress={handleNext}
            disabled={!isValid}
          >
            <Text style={styles.nextBtnText}>Next</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.onColor} />
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.card },
  scroll: { padding: 24, gap: 12 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary, marginTop: 8 },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, marginBottom: 8 },
  photoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
    marginVertical: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  photoImg: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, gap: 4 },
  photoLabel: { fontSize: 12, color: COLORS.textMuted },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginTop: 8 },
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
  genderRow: { flexDirection: 'row', gap: 10 },
  genderBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.background,
  },
  genderBtnActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}12` },
  genderEmoji: { fontSize: 22 },
  genderText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', textAlign: 'center' },
  genderTextActive: { color: COLORS.primary },
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
