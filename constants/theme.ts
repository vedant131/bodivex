import { Platform, TextStyle } from 'react-native';

/**
 * Bodivex design system — dark only, iOS-style glass.
 * One accent gradient (pink → orange) for primary actions; ring colours for progress.
 */
export const T = {
  // Surfaces
  bg: '#060609',
  bgRaised: '#0E0E14',
  glass: 'rgba(255,255,255,0.07)',       // fill behind blur
  glassStrong: 'rgba(255,255,255,0.12)',
  glassBorder: 'rgba(255,255,255,0.14)',
  hairline: 'rgba(255,255,255,0.08)',
  scrim: 'rgba(0,0,0,0.55)',

  // Text (Apple dark-mode label colours)
  text: '#F5F5F7',
  text2: 'rgba(235,235,245,0.64)',
  text3: 'rgba(235,235,245,0.38)',

  // Brand
  accent: '#FF2D6F',
  accent2: '#FF8A3D',
  gradient: ['#FF2D6F', '#FF8A3D'] as const,
  onAccent: '#FFFFFF',

  // Activity rings / status
  ring1: '#FF2D6F',
  ring2: '#9BFF3A',
  ring3: '#2EE6F0',
  success: '#34D399',
  warning: '#FFB020',
  danger: '#FF453A',
  star: '#FFC940',

  radius: { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
} as const;

const font = Platform.select({ ios: 'System', default: undefined });

export const type: Record<'display' | 'title' | 'headline' | 'body' | 'callout' | 'caption' | 'micro', TextStyle> = {
  display: { fontFamily: font, fontSize: 34, fontWeight: '800', letterSpacing: -0.8, color: T.text },
  title: { fontFamily: font, fontSize: 24, fontWeight: '800', letterSpacing: -0.5, color: T.text },
  headline: { fontFamily: font, fontSize: 17, fontWeight: '700', letterSpacing: -0.2, color: T.text },
  body: { fontFamily: font, fontSize: 15, fontWeight: '500', color: T.text, lineHeight: 21 },
  callout: { fontFamily: font, fontSize: 14, fontWeight: '600', color: T.text2 },
  caption: { fontFamily: font, fontSize: 12, fontWeight: '600', color: T.text2 },
  micro: { fontFamily: font, fontSize: 11, fontWeight: '700', color: T.text3, letterSpacing: 0.6, textTransform: 'uppercase' },
};
