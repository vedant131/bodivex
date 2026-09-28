import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { COLORS } from '../../constants/colors';
import { useAuthStore } from '../../stores/authStore';
import { logout } from '../../services/auth';

/** Shown during onboarding so a user can get back to role selection / another number. */
export function SwitchAccountLink() {
  const phone = useAuthStore((s) => s.user?.phone);
  return (
    <TouchableOpacity
      style={styles.wrap}
      onPress={async () => {
        await logout();
        router.replace('/welcome');
      }}
      accessibilityRole="button"
    >
      <Text style={styles.text}>
        {phone ? `${phone} · ` : ''}
        <Text style={styles.link}>Not you? Log out</Text>
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'flex-end', paddingHorizontal: 20, paddingVertical: 6 },
  text: { fontSize: 12, color: COLORS.textMuted },
  link: { color: COLORS.primary, fontWeight: '700' },
});
