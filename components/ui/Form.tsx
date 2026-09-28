import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Glass } from './Glass';
import { PressableScale } from './PressableScale';
import { Avatar } from './Bits';
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

/** Round photo with a camera badge; picks a square image from the library. */
export function PhotoPick({ uri, name, onPick, size = 104 }: { uri?: string | null; name: string; onPick: (uri: string) => void; size?: number }) {
  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!res.canceled) onPick(res.assets[0].uri);
  };
  return (
    <PressableScale onPress={pick} style={{ alignSelf: 'center' }} accessibilityLabel={uri ? 'Change photo' : 'Add photo'}>
      <Avatar uri={uri ?? undefined} name={name || '+'} size={size} radius={size / 2} />
      <View style={styles.camera}><Ionicons name="camera" size={16} color="#fff" /></View>
    </PressableScale>
  );
}

/** Selectable glass tile for single/multi choice (goals, level, training mode). */
export function Tile({ icon, title, desc, selected, onPress }: {
  icon: keyof typeof Ionicons.glyphMap; title: string; desc?: string; selected: boolean; onPress: () => void;
}) {
  return (
    <PressableScale onPress={onPress} accessibilityState={{ selected }} accessibilityLabel={title} style={{ flexGrow: 1, flexBasis: '46%' }}>
      <Glass radius={T.radius.lg} style={[styles.tile, selected && styles.tileOn]}>
        <View style={[styles.tileIcon, selected && { backgroundColor: T.accent }]}>
          <Ionicons name={icon} size={18} color={selected ? '#fff' : T.text2} />
        </View>
        <Text style={type.headline}>{title}</Text>
        {desc && <Text style={type.caption}>{desc}</Text>}
        {selected && <Ionicons name="checkmark-circle" size={20} color={T.accent} style={styles.tick} />}
      </Glass>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  tile: { padding: 14, gap: 6, minHeight: 104 },
  tileOn: { borderColor: T.accent, borderWidth: 1.5 },
  tileIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: T.glassStrong, alignItems: 'center', justifyContent: 'center' },
  tick: { position: 'absolute', top: 10, right: 10 },
  camera: {
    position: 'absolute', right: 2, bottom: 2, width: 32, height: 32, borderRadius: 16,
    backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: T.bg,
  },
  wrap: { paddingHorizontal: 14, paddingVertical: 4 },
  input: { color: T.text, fontSize: 16, fontWeight: '600', minHeight: 44 },
});
