import React, { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, useReducedMotion,
} from 'react-native-reanimated';
import { T } from '../../constants/theme';

type Orb = { color: string; x: number; y: number; r: number; opacity: number };

const PRESETS: Record<'hero' | 'calm' | 'trainer', Orb[]> = {
  hero: [
    { color: T.ring1, x: 0.85, y: 0.12, r: 0.75, opacity: 0.55 },
    { color: T.accent2, x: 0.1, y: 0.02, r: 0.5, opacity: 0.25 },
    { color: T.ring3, x: 0.05, y: 0.62, r: 0.6, opacity: 0.18 },
    { color: T.ring2, x: 0.95, y: 0.95, r: 0.5, opacity: 0.12 },
  ],
  calm: [
    { color: T.ring1, x: 0.9, y: 0.0, r: 0.6, opacity: 0.28 },
    { color: T.ring3, x: 0.0, y: 0.75, r: 0.55, opacity: 0.12 },
  ],
  trainer: [
    { color: T.ring2, x: 0.9, y: 0.08, r: 0.6, opacity: 0.22 },
    { color: T.ring1, x: 0.05, y: 0.35, r: 0.55, opacity: 0.25 },
    { color: T.ring3, x: 0.8, y: 0.9, r: 0.5, opacity: 0.14 },
  ],
};

/**
 * Screen background: near-black with soft colour glows that slowly drift.
 * Glass needs something colourful behind it — on flat black it reads as plain grey.
 */
export function Backdrop({ preset = 'calm' }: { preset?: keyof typeof PRESETS }) {
  const { width, height } = useWindowDimensions();
  const reduce = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduce) return;
    t.value = withRepeat(withTiming(1, { duration: 12000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduce]);

  const drift = useAnimatedStyle(() => ({
    transform: [{ translateX: (t.value - 0.5) * 30 }, { translateY: (t.value - 0.5) * -24 }, { scale: 1 + t.value * 0.06 }],
  }));

  const orbs = PRESETS[preset];
  const size = Math.max(width, height);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: T.bg }]} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, drift]}>
        <Svg width={width} height={height}>
          <Defs>
            {orbs.map((o, i) => (
              <RadialGradient key={i} id={`o${i}`} cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={o.color} stopOpacity={o.opacity} />
                <Stop offset="1" stopColor={o.color} stopOpacity={0} />
              </RadialGradient>
            ))}
          </Defs>
          {orbs.map((o, i) => (
            <Circle key={i} cx={o.x * width} cy={o.y * height} r={o.r * size * 0.6} fill={`url(#o${i})`} />
          ))}
        </Svg>
      </Animated.View>
    </View>
  );
}
