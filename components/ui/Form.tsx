import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Glass } from './Glass';
import { T, type } from '../../constants/theme';

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={type.micro}>{label}</Text>
      {children}
      {hint && <Text style={type.caption}>{hint}</Text>}
    </View>
  );
}

export function Input(props: React.ComponentProps<typeof TextInput>) {
  return (
    <Glass radius={T.radius.md} style={styles.wrap}>
      <TextInput placeholderTextColor={T.text3} selectionColor={T.accent} {...props} style={[styles.input, props.style]} />
    </Glass>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 14, paddingVertical: 4 },
  input: { color: T.text, fontSize: 16, fontWeight: '600', minHeight: 44 },
});
