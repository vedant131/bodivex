import React from 'react';
import { Platform, StyleSheet, View, ViewProps, StyleProp, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { T } from '../../constants/theme';

const LIQUID = Platform.OS === 'ios' && isLiquidGlassAvailable();
// Note: Android real blur needs a BlurTargetView per screen; translucent fill until then.
const BLUR = Platform.OS === 'ios' || Platform.OS === 'web';

interface Props extends ViewProps {
  radius?: number;
  /** 'regular' = frosted panel, 'clear' = lighter tint for overlays on photos */
  variant?: 'regular' | 'clear';
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Frosted glass surface: native Liquid Glass on iOS 26+, blur + tint + hairline elsewhere. */
export function Glass({ radius = T.radius.lg, variant = 'regular', interactive, style, children, ...rest }: Props) {
  const shape = { borderRadius: radius, overflow: 'hidden' as const };

  if (LIQUID) {
    return (
      <GlassView glassEffectStyle={variant} colorScheme="dark" isInteractive={interactive} style={[shape, style]} {...rest}>
        {children}
      </GlassView>
    );
  }

  return (
    <View
      style={[shape, styles.fallback, variant === 'clear' && styles.clear, !BLUR && styles.solid, style]}
      {...rest}
    >
      {BLUR && <BlurView tint="dark" intensity={variant === 'clear' ? 30 : 55} style={StyleSheet.absoluteFill} />}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: T.glass, borderWidth: StyleSheet.hairlineWidth, borderColor: T.glassBorder },
  clear: { backgroundColor: 'rgba(20,20,26,0.35)' },
  solid: { backgroundColor: 'rgba(30,30,40,0.72)' },
});
