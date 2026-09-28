import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Backdrop } from '../../components/ui/Backdrop';
import { Glass } from '../../components/ui/Glass';
import { PressableScale } from '../../components/ui/PressableScale';
import { T, type } from '../../constants/theme';
import { UserRole } from '../../types/user';

function RoleCard({ role, icon, title, sub, delay }: {
  role: UserRole; icon: keyof typeof Ionicons.glyphMap; title: string; sub: string; delay: number;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify().damping(16)}>
      <PressableScale onPress={() => router.push({ pathname: '/(auth)/phone', params: { role } })} accessibilityLabel={title}>
        <Glass radius={T.radius.xl} interactive style={styles.card}>
          <LinearGradient colors={role === 'client' ? T.gradient : [T.ring3, '#3B5BFF']} style={styles.cardIcon}>
            <Ionicons name={icon} size={24} color="#fff" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={type.headline}>{title}</Text>
            <Text style={[type.caption, { marginTop: 3 }]}>{sub}</Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color={T.text2} />
        </Glass>
      </PressableScale>
    </Animated.View>
  );
}

export default function WelcomeScreen() {
  return (
    <View style={{ flex: 1 }}>
      <Backdrop preset="hero" />
      <SafeAreaView style={styles.safe}>
        <Animated.View entering={FadeInDown.duration(600)} style={styles.brandRow}>
          <LinearGradient colors={T.gradient} style={styles.logo}>
            <Ionicons name="barbell" size={20} color="#fff" />
          </LinearGradient>
          <Text style={styles.brand}>bodivex</Text>
        </Animated.View>

        <View style={styles.hero}>
          <Animated.Text entering={FadeInDown.delay(100).duration(700)} style={styles.headline}>
            Your coach.{'\n'}
            <Text style={styles.headlineAccent}>Your city.</Text>{'\n'}
            Your pace.
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(250).duration(700)} style={[type.body, { color: T.text2, marginTop: 14 }]}>
            Verified personal trainers across Maharashtra. Online or at your gym.
          </Animated.Text>
        </View>

        <View style={{ gap: 12 }}>
          <RoleCard role="client" icon="flash" title="I want to train" sub="Find and book a verified coach" delay={350} />
          <RoleCard role="trainer" icon="barbell" title="I'm a coach" sub="Get clients near you · free to list" delay={450} />
          <Text style={[type.caption, { textAlign: 'center', color: T.text3, marginTop: 8 }]}>
            By continuing you agree to our Terms & Privacy Policy
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 20, paddingBottom: 12, justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  logo: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  brand: { color: T.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.6 },
  hero: { flex: 1, justifyContent: 'center' },
  headline: { color: T.text, fontSize: 46, fontWeight: '900', letterSpacing: -1.6, lineHeight: 50 },
  headlineAccent: { color: T.accent },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  cardIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
