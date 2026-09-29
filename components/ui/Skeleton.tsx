import React, { useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, useReducedMotion } from 'react-native-reanimated';
import { T } from '../../constants/theme';

/** A soft pulsing placeholder block. */
export function Bone({ w, h, r = 8, style }: { w?: number | `${number}%`; h: number; r?: number; style?: StyleProp<ViewStyle> }) {
  const reduce = useReducedMotion();
  const o = useSharedValue(0.5);
  useEffect(() => {
    if (!reduce) o.value = withRepeat(withTiming(1, { duration: 850, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [reduce]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width: w ?? '100%', height: h, borderRadius: r, backgroundColor: 'rgba(255,255,255,0.09)' }, anim, style]} />;
}

/** Placeholder shaped like the content it stands in for, so the layout doesn't jump when data arrives. */
export function Skeleton({ variant, count = 3 }: { variant: 'row' | 'portrait' | 'card' | 'chat'; count?: number }) {
  const items = Array.from({ length: count });
  if (variant === 'portrait') {
    return (
      <View style={styles.hRow} accessibilityLabel="Loading" accessible>
        {items.map((_, i) => <Bone key={i} w={160} h={220} r={24} />)}
      </View>
    );
  }
  return (
    <View style={{ gap: 10 }} accessibilityLabel="Loading" accessible>
      {items.map((_, i) => (
        <View key={i} style={[styles.card, variant === 'card' && { padding: 16 }]}>
          <Bone w={variant === 'chat' ? 52 : 62} h={variant === 'chat' ? 52 : 62} r={variant === 'chat' ? 26 : 18} />
          <View style={{ flex: 1, gap: 8 }}>
            <Bone w="60%" h={14} />
            <Bone w="85%" h={11} />
            {variant !== 'chat' && <Bone w="40%" h={11} />}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  hRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: T.radius.lg,
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: StyleSheet.hairlineWidth, borderColor: T.hairline,
  },
});
