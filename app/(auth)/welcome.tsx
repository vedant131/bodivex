import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useFonts, BigShouldersDisplay_900Black } from '@expo-google-fonts/big-shoulders-display';
import { Backdrop } from '../../components/ui/Backdrop';
import { Glass } from '../../components/ui/Glass';
import { PressableScale } from '../../components/ui/PressableScale';
import { Hero3D } from '../../components/hero/Hero3D';
import { T, type } from '../../constants/theme';
import { UserRole } from '../../types/user';

const LINES = ['Your coach.', 'Your city.', 'Your pace.'];

function RoleCard({ role, icon, title, sub, delay }: {
  role: UserRole; icon: keyof typeof Ionicons.glyphMap; title: string; sub: string; delay: number;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify().damping(16)}>
      <PressableScale onPress={() => router.push({ pathname: '/(auth)/phone', params: { role } })} accessibilityLabel={title}>
        <Glass radius={T.radius.xl} interactive style={styles.card}>
          <LinearGradient colors={role === 'client' ? T.gradient : [T.ring3, '#3B5BFF']} style={styles.cardIcon}>
            <Ionicons name={icon} size={22} color="#fff" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={type.headline}>{title}</Text>
            <Text style={[type.caption, { marginTop: 3 }]}>{sub}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={T.text3} />
        </Glass>
      </PressableScale>
    </Animated.View>
  );
}

export default function WelcomeScreen() {
  const { width, height } = useWindowDimensions();
  const [fontLoaded] = useFonts({ BigShouldersDisplay_900Black });
  const compact = height < 740; // iPhone SE / small Androids
  const heroH = Math.min(width * 0.8, height * (compact ? 0.26 : 0.34), 340);
  const lineH = compact ? 46 : 62;
  const headline = fontLoaded
    ? { fontFamily: 'BigShouldersDisplay_900Black', fontSize: lineH, lineHeight: lineH * 0.98, letterSpacing: 0.5, textTransform: 'uppercase' as const }
    : { fontSize: lineH * 0.78, lineHeight: lineH * 0.9, fontWeight: '900' as const, letterSpacing: -1.4 };

  return (
    // overflow hidden: the 3D hero bleeds edge to edge
    <View style={{ flex: 1, overflow: 'hidden' }}>
      <Backdrop preset="hero" />
      <SafeAreaView style={styles.safe}>
        <Animated.View entering={FadeIn.duration(500)} style={styles.brandRow}>
          <Text style={styles.brand}>bodivex</Text>
        </Animated.View>

        <Hero3D height={heroH} />

        <View>
          {/* One orchestrated entrance: each line rises out of its own mask after the rings appear */}
          {LINES.map((line, i) => (
            <View key={line} style={{ overflow: 'hidden', height: lineH }}>
              <Animated.Text entering={FadeInUp.delay(450 + i * 120).duration(650)} style={[styles.headline, headline]}>
                {line}
              </Animated.Text>
            </View>
          ))}
          <Animated.Text entering={FadeIn.delay(900).duration(600)} style={styles.sub}>
            Book verified personal trainers across Maharashtra, online or at your gym.
          </Animated.Text>
        </View>

        <View style={{ gap: 10 }}>
          <RoleCard role="client" icon="search" title="Find a coach" sub="Browse verified trainers and book a session" delay={1000} />
          <RoleCard role="trainer" icon="barbell" title="I'm a coach" sub="List for free and get clients near you" delay={1100} />
          <Text style={styles.terms}>
            By continuing you agree to our{' '}
            <Text style={styles.link} onPress={() => router.push('/legal/terms' as any)} accessibilityRole="link">Terms</Text> and{' '}
            <Text style={styles.link} onPress={() => router.push('/legal/privacy' as any)} accessibilityRole="link">Privacy Policy</Text>
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 20, paddingBottom: 10, justifyContent: 'space-between' },
  brandRow: { marginTop: 6 },
  brand: { color: T.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  headline: { color: T.text },
  sub: { ...type.body, color: T.text2, marginTop: 12, maxWidth: 340 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  cardIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  terms: { ...type.caption, textAlign: 'center', color: T.text3, marginTop: 6 },
  link: { color: T.text2, textDecorationLine: 'underline' },
});
