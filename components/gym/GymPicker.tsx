import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, Modal, Pressable, ScrollView, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Glass } from '../ui/Glass';
import { Button } from '../ui/Button';
import { PressableScale } from '../ui/PressableScale';
import { getGymsInCity, addGym, toRef } from '../../services/gyms';
import { T, type } from '../../constants/theme';
import { CONTACT_INFO_PATTERN, CONTACT_INFO_MESSAGE } from '../../constants/config';
import { Gym, GymRef } from '../../types/gym';

interface Props {
  city: string;
  selected: GymRef[];
  onChange: (gyms: GymRef[]) => void;
  multiple?: boolean;
  placeholder?: string;
}

/** Choose gyms from the shared directory (or add a missing one). Selected gyms show as removable rows. */
export function GymPicker({ city, selected, onChange, multiple, placeholder = 'Choose your gym' }: Props) {
  const [open, setOpen] = useState(false);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [area, setArea] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getGymsInCity(city).then(setGyms).catch(() => {}).finally(() => setLoading(false));
  }, [open, city]);

  const results = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? gyms.filter((g) => `${g.name} ${g.area}`.toLowerCase().includes(n)) : gyms;
  }, [gyms, q]);

  const isOn = (id: string) => selected.some((g) => g.id === id);

  const pick = (g: Gym | GymRef) => {
    if (multiple) {
      onChange(isOn(g.id) ? selected.filter((x) => x.id !== g.id) : [...selected, toRef(g)]);
    } else {
      onChange([toRef(g)]);
      setOpen(false);
    }
  };

  const create = async () => {
    const name = q.trim();
    if (name.length < 2) return Alert.alert('Type the gym name first');
    if (CONTACT_INFO_PATTERN.test(name + ' ' + area)) return Alert.alert('Keep it on Bodivex', CONTACT_INFO_MESSAGE);
    setAdding(true);
    try {
      const g = await addGym({ name, area: area.trim(), city });
      setGyms([...gyms, g]);
      setQ(''); setArea('');
      pick(g);
    } catch (e: any) {
      Alert.alert('Could not add gym', e.message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <View style={{ gap: 8 }}>
      {selected.map((g) => (
        <Glass key={g.id} radius={T.radius.md} style={styles.row}>
          <Ionicons name="barbell" size={18} color={T.accent} />
          <View style={{ flex: 1 }}>
            <Text style={type.body}>{g.name}</Text>
            {!!g.area && <Text style={type.caption}>{g.area}</Text>}
          </View>
          <PressableScale onPress={() => onChange(selected.filter((x) => x.id !== g.id))} hitSlop={8} accessibilityLabel={`Remove ${g.name}`}>
            <Ionicons name="close-circle" size={22} color={T.text3} />
          </PressableScale>
        </Glass>
      ))}
      {(multiple || selected.length === 0) && (
        <PressableScale onPress={() => setOpen(true)} accessibilityLabel={placeholder}>
          <Glass radius={T.radius.md} style={[styles.row, { justifyContent: 'center' }]}>
            <Ionicons name={selected.length ? 'add-circle-outline' : 'search'} size={18} color={T.accent} />
            <Text style={[type.callout, { color: T.accent }]}>{selected.length ? 'Add another gym' : placeholder}</Text>
          </Glass>
        </PressableScale>
      )}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Pressable style={styles.scrim} onPress={() => setOpen(false)}>
            <Pressable onPress={() => {}} style={{ maxHeight: '80%' }}>
              <Glass radius={T.radius.xl} style={styles.sheet}>
                <Text style={type.title}>Gyms in {city}</Text>
                <Glass radius={T.radius.md} style={styles.search}>
                  <Ionicons name="search" size={16} color={T.text2} />
                  <TextInput style={styles.input} value={q} onChangeText={setQ} placeholder="Search or type a new gym name"
                    placeholderTextColor={T.text3} selectionColor={T.accent} autoFocus />
                </Glass>
                {loading ? (
                  <ActivityIndicator color={T.text} style={{ marginVertical: 20 }} />
                ) : (
                  <ScrollView style={{ maxHeight: 320 }} keyboardShouldPersistTaps="handled">
                    {results.map((g) => (
                      <PressableScale key={g.id} onPress={() => pick(g)} haptic={false}>
                        <View style={styles.item}>
                          <View style={{ flex: 1 }}>
                            <Text style={type.body}>{g.name}</Text>
                            {!!g.area && <Text style={type.caption}>{g.area}</Text>}
                          </View>
                          <Ionicons name={isOn(g.id) ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={isOn(g.id) ? T.accent : T.text3} />
                        </View>
                      </PressableScale>
                    ))}
                    {results.length === 0 && (
                      <Text style={[type.caption, { paddingVertical: 12 }]}>
                        {q.trim() ? `"${q.trim()}" isn't listed yet. Add it below.` : 'No gyms added in this city yet.'}
                      </Text>
                    )}
                  </ScrollView>
                )}
                {q.trim().length >= 2 && !results.some((g) => g.name.toLowerCase() === q.trim().toLowerCase()) && (
                  <View style={{ gap: 8 }}>
                    <Glass radius={T.radius.md} style={styles.search}>
                      <Ionicons name="location-outline" size={16} color={T.text2} />
                      <TextInput style={styles.input} value={area} onChangeText={setArea} placeholder="Area, e.g. Baner"
                        placeholderTextColor={T.text3} selectionColor={T.accent} />
                    </Glass>
                    <Button title={`Add "${q.trim()}"`} icon="add" size="md" onPress={create} loading={adding} />
                  </View>
                )}
                {multiple && <Button title="Done" variant="glass" size="md" onPress={() => setOpen(false)} />}
              </Glass>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  scrim: { flex: 1, backgroundColor: T.scrim, justifyContent: 'flex-end', padding: 12 },
  sheet: { padding: 18, gap: 12, marginBottom: 8 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  input: { flex: 1, color: T.text, fontSize: 16, minHeight: 44 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.hairline },
});
