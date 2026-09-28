import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Keyboard,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { USE_EMULATORS } from '../../services/firebase';
import { signInWithPhone, createUserProfile, loadSession } from '../../services/auth';
import { useAuthStore } from '../../stores/authStore';
import { COLORS } from '../../constants/colors';
import { UserRole } from '../../types/user';

const OTP_LENGTH = 6;

export default function OTPScreen() {
  const { role, phone } = useLocalSearchParams<{ role: UserRole; phone: string }>();
  const [otp, setOtp] = useState<string[]>(new Array(OTP_LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const inputs = useRef<(TextInput | null)[]>([]);
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    // Auto advance
    if (value && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
    // Auto verify when all filled
    if (newOtp.every((d) => d !== '') && newOtp.join('').length === OTP_LENGTH) {
      Keyboard.dismiss();
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (otpValue?: string) => {
    const code = otpValue ?? otp.join('');
    if (code.length !== OTP_LENGTH) return;
    Keyboard.dismiss();
    setIsLoading(true);
    try {
      // Note: the code isn't checked in dev (emulator); real SMS OTP comes with the launch build
      const fbUser = await signInWithPhone(phone);
      let session = await loadSession(fbUser.uid);
      if (!session.user) {
        const user = await createUserProfile(fbUser.uid, { phone, role: role ?? 'client' });
        session = { user, clientProfile: null, trainerProfile: null };
      }
      setSession(session);
      router.replace('/'); // entry screen routes by role + onboarding state
    } catch (e: any) {
      Alert.alert('Sign-in failed', e.message);
      setOtp(new Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const maskedPhone = phone.replace(/(\+\d{2})(\d{5})(\d{5})/, '$1 *****$3');

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.iconBadge}>
          <Ionicons name="chatbubble-ellipses" size={28} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>Verify your number</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit OTP sent to{'\n'}
          <Text style={styles.phoneText}>{maskedPhone}</Text>
        </Text>
        {USE_EMULATORS && (
          <Text style={styles.devHint}>Dev mode: any 6 digits work (local emulator)</Text>
        )}

        {/* OTP Input */}
        <View style={styles.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={(ref) => { inputs.current[i] = ref; }}
              style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
              value={digit}
              onChangeText={(v) => handleOtpChange(v.slice(-1), i)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        {isLoading && (
          <ActivityIndicator color={COLORS.primary} size="large" style={{ marginVertical: 20 }} />
        )}

        <TouchableOpacity
          style={[styles.verifyBtn, otp.join('').length !== OTP_LENGTH && styles.verifyBtnDisabled]}
          onPress={() => handleVerify()}
          disabled={otp.join('').length !== OTP_LENGTH || isLoading}
        >
          <Text style={styles.verifyBtnText}>Verify & Continue</Text>
        </TouchableOpacity>

        {/* Resend */}
        <View style={styles.resendRow}>
          <Text style={styles.resendText}>Didn't receive OTP? </Text>
          {countdown > 0 ? (
            <Text style={styles.countdown}>Resend in {countdown}s</Text>
          ) : (
            <TouchableOpacity onPress={() => setCountdown(30)}>
              <Text style={styles.resendLink}>Resend OTP</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  devHint: { fontSize: 12, color: COLORS.warning, textAlign: 'center', marginTop: 6 },
  container: { flex: 1, backgroundColor: COLORS.white },
  backBtn: { margin: 24, alignSelf: 'flex-start' },
  content: { flex: 1, paddingHorizontal: 24, gap: 16 },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: `${COLORS.primary}18`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, lineHeight: 24 },
  phoneText: { fontWeight: '700', color: COLORS.textPrimary },
  otpRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  otpBox: {
    flex: 1,
    height: 58,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.border,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
  },
  otpBoxFilled: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}08` },
  verifyBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  verifyBtnDisabled: { backgroundColor: COLORS.textMuted, opacity: 0.5 },
  verifyBtnText: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  resendRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  resendText: { color: COLORS.textSecondary, fontSize: 14 },
  countdown: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
  resendLink: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
});
