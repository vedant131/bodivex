import React from 'react';
import { Text, StyleSheet, ActivityIndicator, View, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from './PressableScale';
import { Glass } from './Glass';
import { T } from '../../constants/theme';

interface Props {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'glass' | 'ghost' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  size?: 'lg' | 'md' | 'sm';
  style?: StyleProp<ViewStyle>;
}

const HEIGHT = { lg: 56, md: 46, sm: 36 };

export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, size = 'lg', style }: Props) {
  const h = HEIGHT[size];
  const content = (
    <View style={[styles.row, { height: h, paddingHorizontal: size === 'sm' ? 14 : 22 }]}>
      {loading ? (
        <ActivityIndicator color={T.text} />
      ) : (
        <>
          <Text style={[styles.text, size === 'sm' && { fontSize: 13 }, variant === 'danger' && { color: T.danger }]}>
            {title}
          </Text>
          {icon && <Ionicons name={icon} size={size === 'sm' ? 15 : 18} color={variant === 'danger' ? T.danger : T.text} />}
        </>
      )}
    </View>
  );

  return (
    <PressableScale onPress={onPress} disabled={disabled || loading} style={style} accessibilityLabel={title}>
      {variant === 'primary' ? (
        <LinearGradient colors={T.gradient} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={[styles.pill, styles.glow]}>
          {content}
        </LinearGradient>
      ) : variant === 'glass' ? (
        <Glass radius={T.radius.pill} interactive>{content}</Glass>
      ) : (
        <View style={[styles.pill, variant === 'danger' && styles.dangerBg]}>{content}</View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  pill: { borderRadius: T.radius.pill },
  glow: { shadowColor: T.accent, shadowOpacity: 0.45, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  text: { color: T.text, fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  dangerBg: { backgroundColor: 'rgba(255,69,58,0.12)' },
});
