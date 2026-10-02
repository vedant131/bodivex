import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../ui/Form';
import { T } from '../../constants/theme';
import { TrainerSocial } from '../../types/trainer';

/** The social platforms a coach can link. Shown to a client only after a booking is accepted. */
export const SOCIALS: { key: keyof TrainerSocial; label: string; icon: keyof typeof Ionicons.glyphMap; url: (h: string) => string; example: string }[] = [
  { key: 'instagram', label: 'Instagram', icon: 'logo-instagram', url: (h) => `https://instagram.com/${h}`, example: 'arjun.fitness' },
  { key: 'youtube', label: 'YouTube', icon: 'logo-youtube', url: (h) => `https://youtube.com/@${h}`, example: 'arjuntrains' },
  { key: 'facebook', label: 'Facebook', icon: 'logo-facebook', url: (h) => `https://facebook.com/${h}`, example: 'arjun.sharma.fit' },
  { key: 'x', label: 'X (Twitter)', icon: 'logo-x', url: (h) => `https://x.com/${h}`, example: 'arjunlifts' },
];

const HANDLE = /^[A-Za-z0-9._-]{2,50}$/;

/** Accepts a handle, @handle or a pasted profile link and returns the bare handle. */
export const cleanHandle = (v: string) =>
  v.trim()
    .replace(/^https?:\/\/(www\.|m\.)?(instagram\.com|youtube\.com|facebook\.com|fb\.com|x\.com|twitter\.com)\//i, '')
    .replace(/^@/, '')
    .replace(/[/?#].*$/, '');

/** Cleans every field; `error` is set when any handle has characters platforms don't allow. */
export const cleanSocial = (s: TrainerSocial): { social: TrainerSocial; error?: string } => {
  const social: TrainerSocial = {};
  for (const { key } of SOCIALS) {
    const h = cleanHandle(s[key] ?? '');
    if (h && !HANDLE.test(h)) return { social, error: 'Social handles can only use letters, numbers, dots, dashes and underscores.' };
    if (h) social[key] = h;
  }
  return { social };
};

export function SocialFields({ value, onChange }: { value: TrainerSocial; onChange: (v: TrainerSocial) => void }) {
  return (
    <View style={{ gap: 8 }}>
      {SOCIALS.map((s) => (
        <View key={s.key} style={styles.row}>
          <View style={styles.icon}><Ionicons name={s.icon} size={18} color={T.text2} /></View>
          <View style={{ flex: 1 }}>
            <Input
              value={value[s.key] ?? ''}
              onChangeText={(v) => onChange({ ...value, [s.key]: v })}
              placeholder={`${s.label}, e.g. ${s.example}`}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel={`${s.label} handle`}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 40, height: 40, borderRadius: 12, backgroundColor: T.glassStrong, alignItems: 'center', justifyContent: 'center' },
});
