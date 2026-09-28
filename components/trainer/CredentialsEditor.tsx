import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Glass } from '../ui/Glass';
import { Button } from '../ui/Button';
import { PressableScale } from '../ui/PressableScale';
import { Field, Input } from '../ui/Form';
import { T, type } from '../../constants/theme';
import { CONTACT_INFO_PATTERN, CONTACT_INFO_MESSAGE } from '../../constants/config';

export interface Entry {
  title: string;       // cert name / competition / achievement
  subtitle?: string;   // issued by / result / detail
  year: number;
}

const THIS_YEAR = new Date().getFullYear();

/** Add/remove list used for certifications, competitions and achievements. */
export function CredentialsEditor({ label, icon, entries, onChange, titlePh, subtitlePh, subtitleRequired }: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  entries: Entry[];
  onChange: (e: Entry[]) => void;
  titlePh: string;
  subtitlePh: string;
  subtitleRequired?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [year, setYear] = useState('');

  const add = () => {
    const y = Number(year);
    if (title.trim().length < 3) return Alert.alert('Add a name', 'At least 3 characters.');
    if (subtitleRequired && !subtitle.trim()) return Alert.alert('Almost there', `Add: ${subtitlePh}`);
    if (!(y >= 1970 && y <= THIS_YEAR)) return Alert.alert('Check the year', `Between 1970 and ${THIS_YEAR}.`);
    if (CONTACT_INFO_PATTERN.test(title + ' ' + subtitle)) return Alert.alert('Keep it on Bodivex', CONTACT_INFO_MESSAGE);
    onChange([...entries, { title: title.trim(), subtitle: subtitle.trim() || undefined, year: y }].sort((a, b) => b.year - a.year));
    setTitle(''); setSubtitle(''); setYear(''); setAdding(false);
  };

  return (
    <Field label={label}>
      {entries.map((e, i) => (
        <Glass key={`${e.title}-${i}`} radius={T.radius.md} style={styles.row}>
          <Ionicons name={icon} size={18} color={T.warning} />
          <View style={{ flex: 1 }}>
            <Text style={type.body}>{e.title}</Text>
            <Text style={type.caption}>{[e.subtitle, e.year].filter(Boolean).join(' · ')}</Text>
          </View>
          <PressableScale onPress={() => onChange(entries.filter((_, j) => j !== i))} accessibilityLabel={`Remove ${e.title}`} hitSlop={8}>
            <Ionicons name="close-circle" size={22} color={T.text3} />
          </PressableScale>
        </Glass>
      ))}

      {adding ? (
        <Glass radius={T.radius.lg} style={{ padding: 12, gap: 10 }}>
          <Input value={title} onChangeText={setTitle} placeholder={titlePh} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 2 }}><Input value={subtitle} onChangeText={setSubtitle} placeholder={subtitlePh} /></View>
            <View style={{ flex: 1 }}>
              <Input value={year} onChangeText={(v) => setYear(v.replace(/\D/g, ''))} placeholder="Year" keyboardType="number-pad" maxLength={4} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Cancel" variant="glass" size="sm" onPress={() => setAdding(false)} style={{ flex: 1 }} />
            <Button title="Add" icon="add" size="sm" onPress={add} style={{ flex: 1 }} />
          </View>
        </Glass>
      ) : (
        <PressableScale onPress={() => setAdding(true)} accessibilityLabel={`Add ${label}`}>
          <Glass radius={T.radius.md} style={[styles.row, styles.addRow]}>
            <Ionicons name="add-circle-outline" size={20} color={T.accent} />
            <Text style={[type.callout, { color: T.accent }]}>Add</Text>
          </Glass>
        </PressableScale>
      )}
    </Field>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  addRow: { justifyContent: 'center', borderStyle: 'dashed' },
});
