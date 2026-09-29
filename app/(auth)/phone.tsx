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
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Backdrop } from '../../components/ui/Backdrop';
import { Glass } from '../../components/ui/Glass';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/Bits';
import { T, type } from '../../constants/theme';
import { UserRole } from '../../types/user';
import { Alert } from '../../components/ui/Feedback';

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
    <View style={{ flex: 1 }}>
      <Backdrop preset="calm" />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
          <IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />

          <View style={{ marginTop: 32 }}>
            <Text style={type.micro}>{role === 'trainer' ? 'Coach account' : 'Client account'}</Text>
            <Text style={[type.display, { marginTop: 8 }]}>What's your{'\n'}number?</Text>
            <Text style={[type.body, { color: T.text2, marginTop: 10 }]}>We'll text you a 6-digit code.</Text>
          </View>

          <Glass radius={T.radius.lg} style={styles.inputWrap}>
            <Text style={styles.dial}>{INDIA_DIAL_CODE}</Text>
            <View style={styles.sep} />
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="98765 43210"
              placeholderTextColor={T.text3}
              keyboardType="number-pad"
              maxLength={10}
              value={phone}
              onChangeText={(v) => setPhone(v.replace(/\D/g, ''))}
              autoFocus
              selectionColor={T.accent}
              accessibilityLabel="Mobile number"
            />
          </Glass>

          <View style={{ flex: 1 }} />
          <Button title="Send code" icon="arrow-forward" onPress={handleSendOTP} disabled={!isValid} loading={isLoading} />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  inner: { flex: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', marginTop: 32, height: 64, paddingHorizontal: 18 },
  dial: { color: T.text, fontSize: 20, fontWeight: '700' },
  sep: { width: 1, height: 26, backgroundColor: T.glassBorder, marginHorizontal: 14 },
  input: { flex: 1, color: T.text, fontSize: 22, fontWeight: '700', letterSpacing: 1 },
});
