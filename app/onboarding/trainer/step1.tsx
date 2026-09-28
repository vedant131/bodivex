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
import { CityPicker } from '../../../components/shared/CityPicker';
import { OnboardingProgress } from '../../../components/shared/OnboardingProgress';

const TOTAL_STEPS = 5;

export default function TrainerStep1() {
  const { trainerProfile, setTrainerProfile } = useAuthStore();
  const [name, setName] = useState(trainerProfile?.name ?? '');
  const [bio, setBio] = useState(trainerProfile?.bio ?? '');
  const [city, setCity] = useState<string>(trainerProfile?.city ?? 'Mumbai');
  const [experience, setExperience] = useState(trainerProfile?.experience?.toString() ?? '3');
  const [photo, setPhoto] = useState<string | null>(trainerProfile?.profilePhoto ?? null);

  const isValid = name.trim().length >= 2 && bio.trim().length >= 10 && Number(experience) >= 0;

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleNext = () => {
    setTrainerProfile({
      ...trainerProfile!,
      name: name.trim(),
      bio: bio.trim(),
      city,
      experience: Number(experience),
      profilePhoto: photo ?? undefined,
    } as any);
    router.push('/onboarding/trainer/step2');
  };

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingProgress current={1} total={TOTAL_STEPS} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Trainer Profile</Text>
          <Text style={styles.subtitle}>Introduce yourself to gym-goers and athletes across India</Text>

          {/* Profile Photo */}
          <TouchableOpacity style={styles.photoCircle} onPress={pickPhoto}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.photoImg} contentFit="cover" />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera" size={28} color={COLORS.textMuted} />
                <Text style={styles.photoLabel}>Trainer Photo</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Name */}
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Arjun Sharma"
            placeholderTextColor={COLORS.textMuted}
            value={name}
            onChangeText={setName}
          />

          {/* City */}
          <Text style={styles.label}>Primary City *</Text>
          <CityPicker value={city} onChange={setCity} />

          {/* Experience */}
          <Text style={styles.label}>Years of Experience *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 4"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="number-pad"
            value={experience}
            onChangeText={setExperience}
          />

          {/* Bio */}
          <Text style={styles.label}>Bio / Training Philosophy *</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            placeholder="Tell clients about your background, training style, certifications, and results..."
            placeholderTextColor={COLORS.textMuted}
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
          />

          <TouchableOpacity
            style={[styles.nextBtn, !isValid && styles.nextBtnDisabled]}
            onPress={handleNext}
            disabled={!isValid}
          >
            <Text style={styles.nextBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scroll: { padding: 24, gap: 12 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary, marginTop: 8 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 8 },
  photoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
    marginVertical: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  photoImg: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, gap: 4 },
  photoLabel: { fontSize: 11, color: COLORS.textMuted },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginTop: 4 },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
  },
  bioInput: { height: 90, textAlignVertical: 'top' },
  nextBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
  },
  nextBtnDisabled: { backgroundColor: COLORS.textMuted, opacity: 0.5 },
  nextBtnText: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
});
