import React, { useEffect, useRef } from 'react';
import { View, PanResponder, Platform } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { DeviceMotion } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { DataTexture, RGBAFormat, SRGBColorSpace, type Group } from 'three';
import { Canvas, useFrame } from './fiber';

/**
 * Landing hero: a real 3D chrome dumbbell lit by the brand's neon (pink, orange, cyan).
 * It drops in with a thud, idles in a slow spin, follows phone tilt, and you can
 * flick it with a finger — it keeps the momentum and eases back to idle.
 */

type Motion = { angle: number; vel: number; dragging: boolean; lastDx: number; tiltX: number; tiltZ: number };

const IDLE_SPEED = 0.45; // rad/s
const buzz = (style: Haptics.ImpactFeedbackStyle) => {
  if (Platform.OS !== 'web') Haptics.impactAsync(style).catch(() => {});
};

/**
 * Chrome look without image files or an environment map: a matcap generated in code.
 * Studio highlight top-left, a bright horizon stripe, and the brand neon reflected on
 * the sides (pink left, orange right, cyan from below). `dark` = gunmetal for the plates.
 */
function makeMatcap(dark: boolean) {
  const N = 256;
  const data = new Uint8Array(N * N * 4);
  const L = [-0.42, 0.62, 0.66];
  for (let row = 0; row < N; row++) {
    for (let col = 0; col < N; col++) {
      const x = (col / (N - 1)) * 2 - 1;
      const y = (row / (N - 1)) * 2 - 1; // row 0 = bottom in GL
      const rr = x * x + y * y;
      const z = Math.sqrt(Math.max(0, 1 - rr));
      const spec = Math.max(0, x * L[0] + y * L[1] + z * L[2]);
      const key = Math.pow(spec, 48) * 1.3 + Math.pow(spec, 5) * 0.28;
      const band = Math.exp(-(((y - 0.06) / 0.07) ** 2)) * 0.3 * (1 - Math.abs(x) * 0.6);
      const base = dark ? 0.05 : 0.16;
      const tone = dark ? 0.55 : 1;
      const pink = Math.pow(Math.max(0, -x), 2.2) * 0.95 * tone;
      const orange = Math.pow(Math.max(0, x), 2.2) * 0.85 * tone;
      const cyan = Math.pow(Math.max(0, -y), 3) * 0.45 * tone;
      const white = key + (dark ? band * 0.5 : band);
      const i = (row * N + col) * 4;
      data[i] = Math.min(255, 255 * (base + white + pink * 1.0 + orange * 1.0 + cyan * 0.18));
      data[i + 1] = Math.min(255, 255 * (base + white + pink * 0.18 + orange * 0.54 + cyan * 0.9));
      data[i + 2] = Math.min(255, 255 * (base * 1.15 + white + pink * 0.44 + orange * 0.24 + cyan * 0.94));
      data[i + 3] = 255;
    }
  }
  const tex = new DataTexture(data, N, N, RGBAFormat);
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
const CHROME = makeMatcap(false);
const GUNMETAL = makeMatcap(true);

// Dumbbell lies along X. [x offset, radius, thickness]
const PLATES: [number, number, number][] = [[0.6, 0.56, 0.16], [0.79, 0.46, 0.13]];

function Plate({ x, r, t }: { x: number; r: number; t: number }) {
  return (
    <group position={[x, 0, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r, r, t, 64]} />
        <meshMatcapMaterial matcap={GUNMETAL} />
      </mesh>
      {/* neon rim on each face of the plate */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * t) / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[r - 0.035, 0.014, 12, 96]} />
          <meshBasicMaterial color={x > 0 ? '#FF8A3D' : '#FF2D6F'} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function Dumbbell({ motion, reduce }: { motion: React.MutableRefObject<Motion>; reduce: boolean }) {
  const group = useRef<Group>(null);
  const drop = useRef({ y: reduce ? 0 : 2.8, v: 0, landed: reduce });

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const m = motion.current;
    dt = Math.min(dt, 1 / 20);

    // Entrance: damped spring from above, one haptic thud on first touchdown
    const d = drop.current;
    d.v += (-60 * d.y - 7 * d.v) * dt;
    d.y += d.v * dt;
    if (!d.landed && d.y < 0) { d.landed = true; buzz(Haptics.ImpactFeedbackStyle.Heavy); }

    // Spin: momentum from flicks decays back to the idle speed
    if (!m.dragging) {
      const idle = reduce ? 0 : IDLE_SPEED;
      m.vel += (idle - m.vel) * (1 - Math.exp(-dt * 1.4));
      m.angle += m.vel * dt;
    }
    const bob = reduce ? 0 : Math.sin(state.clock.elapsedTime * 1.6) * 0.05;
    g.position.y = d.y + bob;
    g.rotation.y = m.angle;
    g.rotation.x += (0.38 + m.tiltX - g.rotation.x) * Math.min(1, dt * 6);
    g.rotation.z += (-0.12 + m.tiltZ - g.rotation.z) * Math.min(1, dt * 6);
  });

  return (
    <group ref={group} scale={1.3}>
      {/* knurled handle */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.085, 0.085, 1.5, 40]} />
        <meshMatcapMaterial matcap={CHROME} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          {PLATES.map(([x, r, t]) => <Plate key={x} x={s * x} r={r} t={t} />)}
          {/* collar + end cap */}
          <mesh position={[s * 0.47, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.15, 0.15, 0.09, 40]} />
            <meshMatcapMaterial matcap={CHROME} />
          </mesh>
          <mesh position={[s * 0.92, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.11, 0.11, 0.1, 40]} />
            <meshMatcapMaterial matcap={CHROME} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Dumbbell3D({ height }: { height: number }) {
  const reduce = useReducedMotion();
  const motion = useRef<Motion>({ angle: 0.6, vel: reduce ? 0 : IDLE_SPEED, dragging: false, lastDx: 0, tiltX: 0, tiltZ: 0 });

  // Finger flick → spin with momentum
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4,
    onPanResponderGrant: () => { motion.current.dragging = true; motion.current.vel = 0; },
    onPanResponderMove: (_, g) => {
      const m = motion.current;
      m.angle += (g.dx - m.lastDx) * 0.012;
      m.lastDx = g.dx;
    },
    onPanResponderRelease: (_, g) => {
      const m = motion.current;
      m.dragging = false;
      m.lastDx = 0;
      m.vel = Math.max(-18, Math.min(18, g.vx * 12)); // px/ms → rad/s
      if (Math.abs(m.vel) > 6) buzz(Haptics.ImpactFeedbackStyle.Light);
    },
    onPanResponderTerminate: () => { motion.current.dragging = false; motion.current.lastDx = 0; },
  })).current;

  // Phone tilt → model tilt (relative to how the phone was held when the screen opened)
  useEffect(() => {
    if (reduce || Platform.OS === 'web') return;
    let sub: { remove: () => void } | undefined;
    let base: { beta: number; gamma: number } | null = null;
    const clamp = (v: number) => Math.max(-0.35, Math.min(0.35, v));
    DeviceMotion.isAvailableAsync().then((ok) => {
      if (!ok) return;
      DeviceMotion.setUpdateInterval(50);
      sub = DeviceMotion.addListener(({ rotation }) => {
        if (!rotation) return;
        base ??= { beta: rotation.beta, gamma: rotation.gamma };
        motion.current.tiltX = clamp((rotation.beta - base.beta) * 0.6);
        motion.current.tiltZ = clamp(-(rotation.gamma - base.gamma) * 0.6);
      });
    }).catch(() => {});
    return () => sub?.remove();
  }, [reduce]);

  return (
    <View style={{ height, marginHorizontal: -20 }} {...pan.panHandlers}
      accessible accessibilityRole="image" accessibilityLabel="3D dumbbell. Swipe to spin it.">
        <Canvas camera={{ position: [0, 0.35, 4.3], fov: 34 }} style={{ flex: 1 }}>
          <Dumbbell motion={motion} reduce={reduce} />
        </Canvas>
    </View>
  );
}
