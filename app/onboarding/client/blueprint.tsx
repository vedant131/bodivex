import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../../services/firebase';
import { useAuthStore } from '../../../stores/authStore';
import { COLORS } from '../../../constants/colors';
import { FitnessGoal, FitnessBlueprint, FitnessGoalLabel } from '../../../types/user';
import { CONFIG } from '../../../constants/config';

// ─── Gemini AI Blueprint Generator ──────────────────────────────────────────

const generateBlueprintWithAI = async (
  age: number,
  gender: string,
  weight: number,
  height: number,
  fitnessLevel: string,
  goals: FitnessGoal[]
): Promise<FitnessBlueprint> => {
  const goalLabels = goals.map(g => FitnessGoalLabel[g]).join(', ');

  const prompt = `You are a professional fitness advisor for Bodivex app.
A user has provided:
- Age: ${age} years, Gender: ${gender}
- Weight: ${weight}kg, Height: ${height}cm
- Fitness Level: ${fitnessLevel}
- Goals: ${goalLabels}

Generate a concise, motivating Fitness Blueprint as a JSON object with these exact fields:
{
  "trainerType": "string - what type of trainer they need e.g. 'Certified Personal Trainer specializing in body recomposition'",
  "recommendedStyle": "string - training style e.g. 'Progressive overload weight training + 2x cardio per week'",
  "estimatedTimeline": "string - realistic timeline e.g. '8–12 weeks to see visible results with consistency'",
  "additionalNotes": "string - 2-3 personalized tips based on their profile",
  "recommendedFilters": {
    "specializations": ["array", "of", "specializations"],
    "sessionPreference": "online or offline or both",
    "minExperience": 1
  }
}
Return ONLY valid JSON, no markdown.`;

  if (!CONFIG.gemini.apiKey) return getFallbackBlueprint(goals, fitnessLevel);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${CONFIG.gemini.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
        }),
      }
    );
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const parsed = JSON.parse(text.trim());
    return {
      goals,
      ...parsed,
      generatedAt: new Date(),
    } as FitnessBlueprint;
  } catch {
    // Fallback blueprint if AI fails
    return getFallbackBlueprint(goals, fitnessLevel);
  }
};

const getFallbackBlueprint = (goals: FitnessGoal[], fitnessLevel: string): FitnessBlueprint => {
  const isWeightLoss = goals.includes(FitnessGoal.WEIGHT_LOSS);
  const isMuscle = goals.includes(FitnessGoal.MUSCLE_GAIN);

  return {
    goals,
    trainerType: isWeightLoss && isMuscle
      ? 'Body Recomposition Specialist (CPT with nutrition background)'
      : isWeightLoss
      ? 'Weight Loss Specialist (Certified Personal Trainer)'
      : isMuscle
      ? 'Strength & Hypertrophy Coach'
      : 'General Fitness Coach (CPT)',
    recommendedStyle: isWeightLoss
      ? 'Strength training 3x/week + cardio 2x/week + calorie deficit diet'
      : isMuscle
      ? 'Progressive overload weight training 4–5x/week + high protein diet'
      : 'Full-body workouts 3x/week for balanced fitness',
    estimatedTimeline: fitnessLevel === 'beginner'
      ? '8–12 weeks to see visible results with consistency'
      : '6–8 weeks to notice significant improvement',
    additionalNotes:
      'Start with 3 sessions per week and build up. Consistency beats intensity. Track your food and workouts — what gets measured gets improved.',
    recommendedFilters: {
      specializations: isWeightLoss ? ['Weight Loss', 'HIIT'] : isMuscle ? ['Muscle Gain', 'Strength Training'] : ['General Fitness'],
      sessionPreference: 'both',
      minExperience: fitnessLevel === 'beginner' ? 1 : 2,
    },
    generatedAt: new Date(),
  };
};

export default function BlueprintScreen() {
  const { clientProfile, user, setClientProfile } = useAuthStore();
  const [blueprint, setBlueprint] = useState<FitnessBlueprint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    generateBlueprint();
  }, []);

  const generateBlueprint = async () => {
    setIsLoading(true);
    try {
      const bp = await generateBlueprintWithAI(
        clientProfile?.age ?? 25,
        clientProfile?.gender ?? 'male',
        clientProfile?.weight ?? 70,
        clientProfile?.height ?? 170,
        clientProfile?.fitnessLevel ?? 'beginner',
        clientProfile?.goals ?? [FitnessGoal.GENERAL_FITNESS]
      );
      setBlueprint(bp);
      // Save to Firestore non-blockingly
      if (user?.id && !user.id.startsWith('dev_')) {
        addDoc(collection(db, COLLECTIONS.CLIENTS), {
          ...clientProfile,
          userId: user.id,
          fitnessBlueprint: bp,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }).catch((e) => console.log('Firestore write skipped/failed:', e));
      }
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    } catch (e) {
      console.error('Blueprint error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingTitle}>Analyzing your profile...</Text>
            <Text style={styles.loadingSubtitle}>
              Our AI is creating your personalized Fitness Blueprint ✨
            </Text>
          </View>
        ) : blueprint ? (
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Header */}
            <LinearGradient
              colors={[COLORS.secondary, COLORS.accent]}
              style={styles.header}
            >
              <Text style={styles.headerEmoji}>🤖</Text>
              <Text style={styles.headerTitle}>Your Fitness Blueprint</Text>
              <Text style={styles.headerSub}>Personalized for {clientProfile?.name}</Text>
            </LinearGradient>

            {/* Blueprint Card */}
            <View style={styles.card}>
              <InfoRow emoji="🏋️" label="Ideal Trainer" value={blueprint.trainerType} />
              <Divider />
              <InfoRow emoji="📋" label="Training Style" value={blueprint.recommendedStyle} />
              <Divider />
              <InfoRow emoji="⏳" label="Timeline" value={blueprint.estimatedTimeline} />
              <Divider />
              <InfoRow emoji="💡" label="Tips" value={blueprint.additionalNotes} />
            </View>

            {/* Goals Confirmed */}
            <View style={styles.goalsCard}>
              <Text style={styles.goalsTitle}>Your Goals</Text>
              <View style={styles.goalChips}>
                {blueprint.goals.map((g) => (
                  <View key={g} style={styles.goalChip}>
                    <Text style={styles.goalChipText}>{FitnessGoalLabel[g]}</Text>
                  </View>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={styles.findBtn}
              onPress={() => router.replace('/(client)/home')}
              activeOpacity={0.85}
            >
              <Ionicons name="search" size={20} color={COLORS.white} />
              <Text style={styles.findBtnText}>Find My Perfect Trainer</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={generateBlueprint} style={styles.regenerateBtn}>
              <Ionicons name="refresh" size={16} color={COLORS.textSecondary} />
              <Text style={styles.regenerateBtnText}>Regenerate Blueprint</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const InfoRow = ({ emoji, label, value }: { emoji: string; label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoEmoji}>{emoji}</Text>
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const Divider = () => <View style={styles.divider} />;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 24, gap: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 120, gap: 16 },
  loadingTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  loadingSubtitle: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  header: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  headerEmoji: { fontSize: 40 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.white },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)' },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    gap: 4,
  },
  infoRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', paddingVertical: 8 },
  infoEmoji: { fontSize: 22, marginTop: 2 },
  infoLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 15, color: COLORS.textPrimary, lineHeight: 22, marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 2 },
  goalsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    gap: 12,
  },
  goalsTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  goalChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  goalChip: {
    backgroundColor: `${COLORS.primary}15`,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${COLORS.primary}40`,
  },
  goalChipText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  findBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 58,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  findBtnText: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
  regenerateBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  regenerateBtnText: { color: COLORS.textSecondary, fontSize: 14 },
});
