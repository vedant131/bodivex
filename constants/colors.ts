export const COLORS = {
  // Athletic Coral-Crimson (Cult.fit & Nike style dynamic energy)
  primary: '#FF462B',
  primaryDark: '#E02E1B',
  primaryLight: '#FF6F5E',
  primaryMuted: 'rgba(255, 70, 43, 0.12)',

  // Deep Obsidian & Midnight Slate (Whoop & Strava style contrast)
  secondary: '#0B0F19',
  secondaryLight: '#161F30',
  accent: '#111827',
  accentMuted: '#1F2937',

  // Status
  success: '#10B981',
  successMuted: 'rgba(16, 185, 129, 0.12)',
  warning: '#F59E0B',
  warningMuted: 'rgba(245, 158, 11, 0.12)',
  danger: '#EF4444',
  dangerMuted: 'rgba(239, 68, 68, 0.12)',

  // Surfaces & Crisp Neutral Slate
  surface: '#FFFFFF',
  background: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',

  // Readability & High Contrast Typography
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(11, 15, 25, 0.65)',

  // Gradients
  gradientStart: '#FF462B',
  gradientEnd: '#E02E1B',

  // Mobile Tabs
  tabBar: '#FFFFFF',
  tabBarActive: '#FF462B',
  tabBarInactive: '#94A3B8',

  // Shimmers
  shimmer: '#E2E8F0',
  shimmerHighlight: '#F8FAFC',
} as const;

export type ColorKey = keyof typeof COLORS;
