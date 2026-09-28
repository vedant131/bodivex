import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const APressable = Animated.createAnimatedComponent(Pressable);

interface Props extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
  scaleTo?: number;
}

/** Pressable that springs down on touch (iOS feel) with a light haptic tick. */
export function PressableScale({ style, haptic = true, scaleTo = 0.96, onPressIn, onPressOut, onPress, disabled, ...rest }: Props) {
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));

  return (
    <APressable
      accessibilityRole="button"
      disabled={disabled}
      onPressIn={(e) => {
        s.value = withSpring(scaleTo, { damping: 18, stiffness: 400 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.value = withSpring(1, { damping: 14, stiffness: 300 });
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic && Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
        onPress?.(e);
      }}
      style={[anim, disabled && { opacity: 0.45 }, style]}
      {...rest}
    />
  );
}
