import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';

interface Props {
  current: number;
  total: number;
  showLabel?: boolean;
}

export function OnboardingProgress({ current, total, showLabel = true }: Props) {
  const progress = current / total;

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
      {showLabel && (
        <Text style={styles.label}>
          Step {current} of {total}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingTop: 16, gap: 8 },
  track: {
    height: 5,
    borderRadius: 10,
    backgroundColor: COLORS.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  label: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
});
