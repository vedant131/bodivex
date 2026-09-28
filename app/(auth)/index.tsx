import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../types/user';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const { setPhoneNumber } = useAuthStore();

  const handleSelectRole = (role: UserRole) => {
    useAuthStore.getState().setUser(null);
    // Store role intent temporarily
    useAuthStore.setState({ user: null });
    router.push({ pathname: '/(auth)/phone', params: { role } });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.secondary, '#0F172A', '#1E293B']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Ionicons name="barbell" size={46} color={COLORS.primary} />
          </View>
          <Text style={styles.appName}>Bodivex</Text>
          <Text style={styles.tagline}>Find · Train · Transform</Text>
        </View>

        {/* Features */}
        <View style={styles.featuresRow}>
          {[
            { icon: 'shield-checkmark', text: '100% Escrow' },
            { icon: 'videocam', text: 'Live Coaching' },
            { icon: 'trophy', text: 'Arena Ranks' },
          ].map((f) => (
            <View key={f.text} style={styles.featureItem}>
              <View style={styles.featureIconWrap}>
                <Ionicons name={f.icon as any} size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* CTA Buttons */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>Select your role</Text>

          <TouchableOpacity
            style={styles.clientBtn}
            onPress={() => handleSelectRole('client')}
            activeOpacity={0.88}
          >
            <View style={styles.btnIconWrap}>
              <Ionicons name="person" size={22} color={COLORS.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.clientBtnText}>I'm a Client / Gym-Goer</Text>
              <Text style={styles.clientBtnSub}>Book verified coaches with escrow safety</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.trainerBtn}
            onPress={() => handleSelectRole('trainer')}
            activeOpacity={0.88}
          >
            <View style={[styles.btnIconWrap, { backgroundColor: 'rgba(255,70,43,0.15)' }]}>
              <Ionicons name="fitness" size={22} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.trainerBtnText}>I'm a Fitness Coach</Text>
              <Text style={styles.trainerBtnSub}>Get clients, showcase proofs & earn guaranteed</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <Text style={styles.termsText}>
            By continuing, you agree to Bodivex{' '}
            <Text style={styles.termsLink}>Terms</Text>
            {' & '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.secondary },
  gradient: { flex: 1, paddingHorizontal: 24 },
  logoSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  logoCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(255,70,43,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  appName: {
    fontSize: 44,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 6,
    letterSpacing: 3,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 24,
  },
  featureItem: { alignItems: 'center', gap: 6 },
  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: { color: '#CBD5E1', fontSize: 12, fontWeight: '700' },
  ctaSection: { paddingBottom: 44, gap: 14 },
  ctaTitle: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  btnIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  clientBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  clientBtnSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  trainerBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  trainerBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  trainerBtnSub: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  termsText: { color: '#64748B', fontSize: 12, textAlign: 'center', marginTop: 8 },
  termsLink: { color: COLORS.primaryLight, fontWeight: '600' },
});
