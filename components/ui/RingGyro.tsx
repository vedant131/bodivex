import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, {
  Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSpring, withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, RadialGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { DeviceMotion } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { T } from '../../constants/theme';

/**
 * The app's three activity rings orbiting the barbell mark in 3D, like a gyroscope.
 * Tilt the phone to tilt it; tap to spin it up. Static when Reduce Motion is on.
 */
const RINGS = [
  { colors: ['#FF2D6F', '#FF8A3D'], roll: 0, tilt: 66, turns: 4, dir: 1, arc: 0.82 },
  { colors: ['#9BFF3A', '#2EE6A0'], roll: 60, tilt: 66, turns: 3, dir: -1, arc: 0.7 },
  { colors: ['#2EE6F0', '#3B7BFF'], roll: 120, tilt: 66, turns: 2, dir: 1, arc: 0.9 },
] as const;

const STROKE = 14;
const CYCLE_MS = 36000; // whole turns per cycle, so the loop restarts seamlessly

function Ring({ size, ring, index, spin, boost, tiltX, tiltY, appear }: {
  size: number; ring: (typeof RINGS)[number]; index: number;
  spin: SharedValue<number>; boost: SharedValue<number>;
  tiltX: SharedValue<number>; tiltY: SharedValue<number>; appear: SharedValue<number>;
}) {
  const r = (size - STROKE) / 2;
  const c = 2 * Math.PI * r;
  const id = `g${index}`;

  const style = useAnimatedStyle(() => {
    const p = Math.min(1, Math.max(0, appear.value * 3 - index)); // staggered entrance
    return {
      opacity: p,
      transform: [
        // outermost first: phone tilt moves the whole gyroscope, then each ring is laid back
        // (tilt) and rolled 0/60/120° around the screen axis, then spins in its own plane
        { perspective: 900 },
        { rotateY: `${tiltY.value}deg` },
        { rotateX: `${tiltX.value}deg` },
        { rotateZ: `${ring.roll}deg` },
        { rotateX: `${ring.tilt}deg` },
        { rotateZ: `${(spin.value * 360 * ring.turns + boost.value * (index + 1)) * ring.dir}deg` },
        { scale: 0.6 + 0.4 * p },
      ],
    };
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={ring.colors[0]} />
            <Stop offset="1" stopColor={ring.colors[1]} />
          </SvgGradient>
        </Defs>
        {/* faint full track + bright progress arc, like the rings inside the app */}
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={ring.colors[0]} strokeOpacity={0.14} strokeWidth={STROKE} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r} stroke={`url(#${id})`} strokeWidth={STROKE} fill="none"
          strokeLinecap="round" strokeDasharray={`${c * ring.arc} ${c}`}
        />
      </Svg>
    </Animated.View>
  );
}

export function RingGyro({ size = 260 }: { size?: number }) {
  const reduce = useReducedMotion();
  const spin = useSharedValue(0);   // 0→1 per cycle
  const boost = useSharedValue(0);  // extra degrees added by taps
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  const appear = useSharedValue(reduce ? 1 : 0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reduce) return;
    appear.value = withDelay(150, withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }));
    spin.value = withRepeat(withTiming(1, { duration: CYCLE_MS, easing: Easing.linear }), -1, false);
    pulse.value = withRepeat(withTiming(1.06, { duration: 1800, easing: Easing.inOut(Easing.sin) }), -1, true);

    // Phone tilt → gyroscope tilt (relative to how the phone was held when the screen opened)
    let sub: { remove: () => void } | undefined;
    let base: { beta: number; gamma: number } | null = null;
    const clamp = (v: number) => Math.max(-22, Math.min(22, v));
    DeviceMotion.isAvailableAsync().then((ok) => {
      if (!ok) return;
      DeviceMotion.setUpdateInterval(50);
      sub = DeviceMotion.addListener(({ rotation }) => {
        if (!rotation) return;
        base ??= { beta: rotation.beta, gamma: rotation.gamma };
        const toDeg = 180 / Math.PI;
        tiltX.value = withSpring(clamp((rotation.beta - base.beta) * toDeg * 0.8), { damping: 18 });
        tiltY.value = withSpring(clamp((rotation.gamma - base.gamma) * toDeg * 0.8), { damping: 18 });
      });
    }).catch(() => {});
    return () => sub?.remove();
  }, [reduce]);

  const onTap = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (reduce) return;
    boost.value = withTiming(boost.value + 360, { duration: 1100, easing: Easing.out(Easing.cubic) });
  };

  const core = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [{ scale: pulse.value * (0.7 + 0.3 * appear.value) }],
  }));

  return (
    <Pressable onPress={onTap} accessibilityRole="image" accessibilityLabel="Bodivex rings. Tap to spin."
      style={{ width: size, height: size, alignSelf: 'center' }}>
      {RINGS.map((ring, i) => (
        <Ring key={i} size={size} ring={ring} index={i} spin={spin} boost={boost} tiltX={tiltX} tiltY={tiltY} appear={appear} />
      ))}
      <View style={styles.center} pointerEvents="none">
        <Animated.View style={core}>
          <Svg width={GLOW} height={GLOW} style={styles.glow}>
            <Defs>
              <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={T.accent} stopOpacity={0.55} />
                <Stop offset="1" stopColor={T.accent} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={GLOW / 2} cy={GLOW / 2} r={GLOW / 2} fill="url(#glow)" />
          </Svg>
          <LinearGradient colors={T.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.core}>
            <Ionicons name="barbell" size={30} color="#fff" />
          </LinearGradient>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const GLOW = 170;
const styles = StyleSheet.create({
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  core: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', left: (64 - GLOW) / 2, top: (64 - GLOW) / 2 },
});
