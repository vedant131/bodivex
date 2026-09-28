import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { UserRole } from '../../types/user';

const INDIA_DIAL_CODE = '+91';

export default function PhoneScreen() {
  const { role } = useLocalSearchParams<{ role: UserRole }>();
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const isValid = phone.length === 10 && /^\d+$/.test(phone);

  const handleSendOTP = async () => {
    if (!isValid) return;
    setIsLoading(true);
    try {
      // Store phone and navigate to OTP screen
      const fullPhone = `${INDIA_DIAL_CODE}${phone}`;
      router.push({
        pathname: '/(auth)/otp',
        params: { role, phone: fullPhone },
      });
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconBadge}>
            <Ionicons
              name={role === 'trainer' ? 'barbell' : 'person'}
              size={28}
              color={COLORS.primary}
            />
          </View>
          <Text style={styles.title}>Enter your number</Text>
          <Text style={styles.subtitle}>
            {role === 'trainer'
              ? "You're signing up as a Fitness Trainer"
              : "You're signing up as a Client"}
          </Text>
        </View>

        {/* Phone Input */}
        <View style={styles.inputWrapper}>
          <View style={styles.dialCode}>
            <Text style={styles.flag}>🇮🇳</Text>
            <Text style={styles.dialCodeText}>{INDIA_DIAL_CODE}</Text>
          </View>
          <View style={styles.divider} />
          <TextInput
            ref={inputRef}
            style={styles.phoneInput}
            placeholder="98765 43210"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="number-pad"
            maxLength={10}
            value={phone}
            onChangeText={setPhone}
            autoFocus
          />
        </View>

        <Text style={styles.hint}>
          We'll send you a one-time password to verify your number.
        </Text>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.sendBtn, !isValid && styles.sendBtnDisabled]}
          onPress={handleSendOTP}
          disabled={!isValid || isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Text style={styles.sendBtnText}>Send OTP</Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.terms}>
          By proceeding, you accept our Terms & Privacy Policy
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  inner: { flex: 1, paddingHorizontal: 24 },
  backBtn: { marginTop: 12, marginBottom: 8, alignSelf: 'flex-start' },
  header: { marginTop: 32, marginBottom: 40, gap: 12 },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: `${COLORS.primary}18`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: 15, color: COLORS.textSecondary },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 62,
    backgroundColor: `${COLORS.primary}08`,
  },
  dialCode: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flag: { fontSize: 22 },
  dialCodeText: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  divider: { width: 1.5, height: 30, backgroundColor: COLORS.border, marginHorizontal: 12 },
  phoneInput: { flex: 1, fontSize: 20, fontWeight: '600', color: COLORS.textPrimary, letterSpacing: 1 },
  hint: { fontSize: 13, color: COLORS.textMuted, marginTop: 12, lineHeight: 20 },
  sendBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 32,
  },
  sendBtnDisabled: { backgroundColor: COLORS.textMuted, opacity: 0.5 },
  sendBtnText: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  terms: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginTop: 20 },
});
