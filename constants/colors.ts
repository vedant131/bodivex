import { T } from './theme';

// Legacy token names mapped onto the dark design system (constants/theme.ts).
// New UI should import `T` directly; these keep older screens consistent.
export const COLORS = {
  primary: T.accent,
  primaryDark: '#E0245F',
  primaryLight: '#FF5C8F',
  primaryMuted: 'rgba(255,45,111,0.16)',

  secondary: '#1C1C24',
  secondaryLight: '#24242E',
  accent: '#16161D',
  accentMuted: '#1F1F28',

  success: T.success,
  successMuted: 'rgba(52,211,153,0.16)',
  warning: T.warning,
  warningMuted: 'rgba(255,176,32,0.16)',
  danger: T.danger,
  dangerMuted: 'rgba(255,69,58,0.16)',

  // "white" is used both as card background and as text on accent buttons;
  // a dark card colour keeps both readable (dark on pink ≈ 5:1).
  surface: '#15151C',
  background: T.bg,
  card: '#15151C',
  border: 'rgba(255,255,255,0.10)',
  borderLight: 'rgba(255,255,255,0.06)',

  textPrimary: T.text,
  textSecondary: T.text2,
  textMuted: T.text3,
  white: '#15151C',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.7)',

  gradientStart: T.gradient[0],
  gradientEnd: T.gradient[1],

  tabBar: 'transparent',
  tabBarActive: T.text,
  tabBarInactive: T.text3,

  shimmer: '#1C1C24',
  shimmerHighlight: '#26262F',
} as const;

export type ColorKey = keyof typeof COLORS;
