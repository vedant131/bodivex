import React from 'react';
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from './Screen';
import { Button } from './Button';
import { IconButton } from './Bits';
import { SwitchAccountLink } from '../shared/SwitchAccountLink';
import { T, type } from '../../constants/theme';

interface Props {
  step: number;
  total: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  cta: string;
  onNext: () => void;
  canNext?: boolean;
  loading?: boolean;
  preset?: 'calm' | 'trainer';
}

/** Shared frame for every onboarding step: progress, back, title, sticky primary button. */
export function OnboardingShell({ step, total, title, subtitle, children, cta, onNext, canNext = true, loading, preset = 'calm' }: Props) {
  return (
    <Screen preset={preset} edges={['top', 'bottom']}>
      <View style={styles.top}>
        {step > 1 ? <IconButton icon="chevron-back" label="Back" onPress={() => router.back()} size={38} /> : <View style={{ width: 38 }} />}
        <View style={styles.track} accessibilityLabel={`Step ${step} of ${total}`}>
          <LinearGradient colors={T.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.fill, { width: `${(step / total) * 100}%` }]} />
        </View>
        <Text style={type.caption}>{step}/{total}</Text>
      </View>
      {step === 1 && <SwitchAccountLink />}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(450)} style={{ gap: 6, marginBottom: 6 }}>
            <Text style={type.display}>{title}</Text>
            {subtitle && <Text style={[type.body, { color: T.text2 }]}>{subtitle}</Text>}
          </Animated.View>
          {children}
        </ScrollView>
        <View style={styles.footer}>
          <Button title={cta} icon="arrow-forward" onPress={onNext} disabled={!canNext} loading={loading} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 6 },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: T.glassStrong, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  body: { padding: 20, gap: 22, paddingBottom: 30 },
  footer: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 8 },
});
