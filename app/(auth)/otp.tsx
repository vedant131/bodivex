import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { signInWithPhone, createUserProfile, loadSession, DEV_LOGIN } from '../../services/auth';
import { useAuthStore } from '../../stores/authStore';
import { homeRouteFor } from '../../services/routing';
import { Backdrop } from '../../components/ui/Backdrop';
import { Glass } from '../../components/ui/Glass';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/Bits';
import { T, type } from '../../constants/theme';
import { UserRole } from '../../types/user';
import { Alert } from '../../components/ui/Feedback';

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
      // Note: the code isn't checked in dev login; real SMS OTP comes with the launch build
      const fbUser = await signInWithPhone(phone);
      let session = await loadSession(fbUser.uid);
      if (!session.user) {
        const user = await createUserProfile(fbUser.uid, { phone, role: role ?? 'client' });
        session = { user, clientProfile: null, trainerProfile: null };
      }
      setSession(session);
      const actualRole = session.user!.role;
      if (role && actualRole !== role) {
        Alert.alert(
          `Registered as a ${actualRole === 'trainer' ? 'coach' : 'client'}`,
          `This number already has a ${actualRole === 'trainer' ? 'coach' : 'client'} account, so you're signed in as one. Use a different number for a ${role === 'trainer' ? 'coach' : 'client'} account.`
        );
      }
      router.replace(homeRouteFor(session));
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
    <View style={{ flex: 1 }}>
      <Backdrop preset="calm" />
      <SafeAreaView style={styles.safe}>
        <IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />

        <View style={{ marginTop: 32 }}>
          <Text style={[type.display]}>Enter the code</Text>
          <Text style={[type.body, { color: T.text2, marginTop: 10 }]}>
            Sent to <Text style={{ color: T.text, fontWeight: '700' }}>{maskedPhone}</Text>
          </Text>
          {DEV_LOGIN && <Text style={styles.devHint}>Dev mode · any 6 digits work</Text>}
        </View>

        <View style={styles.otpRow}>
          {otp.map((digit, i) => (
            <Glass key={i} radius={T.radius.md} style={[styles.box, digit ? styles.boxOn : null]}>
              <TextInput
                ref={(ref) => { inputs.current[i] = ref; }}
                style={styles.boxText}
                value={digit}
                onChangeText={(v) => handleOtpChange(v.replace(/\D/g, '').slice(-1), i)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                selectionColor={T.accent}
                accessibilityLabel={`Digit ${i + 1}`}
              />
            </Glass>
          ))}
        </View>

        <View style={styles.resendRow}>
          {countdown > 0 ? (
            <Text style={type.caption}>Resend code in {countdown}s</Text>
          ) : (
            <Text style={[type.caption, { color: T.accent }]} onPress={() => setCountdown(30)}>Resend code</Text>
          )}
        </View>

        <View style={{ flex: 1 }} />
        <Button
          title="Verify & continue"
          onPress={() => handleVerify()}
          disabled={otp.join('').length !== OTP_LENGTH}
          loading={isLoading}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  devHint: { fontSize: 12, fontWeight: '700', color: T.warning, marginTop: 10 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 32 },
  box: { width: 50, height: 62, alignItems: 'center', justifyContent: 'center' },
  boxOn: { borderColor: T.accent, borderWidth: 1.5 },
  boxText: { color: T.text, fontSize: 26, fontWeight: '800', textAlign: 'center', width: '100%', height: '100%' },
  resendRow: { marginTop: 20, alignItems: 'center' },
});
