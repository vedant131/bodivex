import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, ImageStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from './PressableScale';
import { Glass } from './Glass';
import { T, type } from '../../constants/theme';

const AVATAR_GRADS: [string, string][] = [
  ['#FF2D6F', '#7B2FF7'],
  ['#FF8A3D', '#FF2D6F'],
  ['#2EE6F0', '#3B5BFF'],
  ['#9BFF3A', '#12B886'],
  ['#B06CFF', '#2EE6F0'],
];

/** Photo if present, otherwise a gradient tile with initials (stable colour per name). */
export function Avatar({ uri, name, size = 44, radius, style }: {
  uri?: string; name: string; size?: number; radius?: number; style?: StyleProp<ImageStyle & ViewStyle>;
}) {
  const r = radius ?? size * 0.32;
  if (uri) {
    return <Image source={{ uri }} style={[{ width: size, height: size, borderRadius: r }, style]} contentFit="cover" transition={200} />;
  }
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const grad = AVATAR_GRADS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_GRADS.length];
  return (
    <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ width: size, height: size, borderRadius: r, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.36 }}>{initials}</Text>
    </LinearGradient>
  );
}

export function Chip({ label, active, icon, onPress }: {
  label: string; active?: boolean; icon?: keyof typeof Ionicons.glyphMap; onPress?: () => void;
}) {
  return (
    <PressableScale onPress={onPress} accessibilityState={{ selected: active }}>
      {active ? (
        <LinearGradient colors={T.gradient} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.chip}>
          {icon && <Ionicons name={icon} size={14} color="#fff" />}
          <Text style={[styles.chipText, { color: '#fff' }]}>{label}</Text>
        </LinearGradient>
      ) : (
        <Glass radius={T.radius.pill} style={styles.chip}>
          {icon && <Ionicons name={icon} size={14} color={T.text2} />}
          <Text style={styles.chipText}>{label}</Text>
        </Glass>
      )}
    </PressableScale>
  );
}

export function Section({ title, action, onAction, style }: {
  title: string; action?: string; onAction?: () => void; style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.section, style]}>
      <Text style={type.headline}>{title}</Text>
      {action && (
        <PressableScale onPress={onAction} haptic={false} hitSlop={10}>
          <Text style={styles.action}>{action}</Text>
        </PressableScale>
      )}
    </View>
  );
}

export function IconButton({ icon, onPress, label, size = 40 }: {
  icon: keyof typeof Ionicons.glyphMap; onPress?: () => void; label: string; size?: number;
}) {
  return (
    <PressableScale onPress={onPress} accessibilityLabel={label} hitSlop={6}>
      <Glass radius={size / 2} interactive style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={size * 0.48} color={T.text} />
      </Glass>
    </PressableScale>
  );
}

/** Small "● Taking bookings" status pill. */
export function StatusPill({ on, onText = 'Taking bookings', offText = 'Not taking bookings' }: {
  on: boolean; onText?: string; offText?: string;
}) {
  return (
    <Glass radius={T.radius.pill} variant="clear" style={styles.status}>
      <View style={[styles.dot, { backgroundColor: on ? T.ring2 : T.text3 }]} />
      <Text style={styles.statusText}>{on ? onText : offText}</Text>
    </Glass>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36, borderRadius: T.radius.pill },
  chipText: { fontSize: 13, fontWeight: '700', color: T.text2 },
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  action: { fontSize: 13, fontWeight: '700', color: T.accent },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 26, alignSelf: 'flex-start' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '700', color: T.text },
});
