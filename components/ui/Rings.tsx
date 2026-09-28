import React, { useEffect } from 'react';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withDelay, withTiming, Easing } from 'react-native-reanimated';
import { T } from '../../constants/theme';

const ACircle = Animated.createAnimatedComponent(Circle);

export interface Ring {
  /** 0..1 (values above 1 are clamped) */
  progress: number;
  color: string;
}

function RingArc({ r, stroke, color, progress, delay }: { r: number; stroke: number; color: string; progress: number; delay: number }) {
  const c = 2 * Math.PI * r;
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(Math.min(Math.max(progress, 0), 1), { duration: 1200, easing: Easing.out(Easing.cubic) }));
  }, [progress]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - p.value) }));
  return (
    <>
      <Circle r={r} stroke={color} strokeOpacity={0.2} strokeWidth={stroke} fill="none" />
      <ACircle
        r={r}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${c} ${c}`}
        animatedProps={props}
      />
    </>
  );
}

/** Apple Fitness-style concentric activity rings that animate in. */
export function Rings({ rings, size = 64, stroke }: { rings: Ring[]; size?: number; stroke?: number }) {
  const sw = stroke ?? Math.max(5, size / 9);
  const gap = sw * 1.25;
  return (
    <Svg width={size} height={size} viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} style={{ transform: [{ rotate: '-90deg' }] }}>
      {rings.map((ring, i) => (
        <RingArc key={i} r={size / 2 - sw / 2 - i * gap} stroke={sw} color={ring.color} progress={ring.progress} delay={i * 150} />
      ))}
    </Svg>
  );
}

export const RING_COLORS = [T.ring1, T.ring2, T.ring3] as const;
