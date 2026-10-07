import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../components/ui/Screen';
import { IconButton } from '../../components/ui/Bits';
import { T, type } from '../../constants/theme';
import { PRIVACY, TERMS } from '../../constants/legal';

/** /legal/privacy and /legal/terms — readable before signing in (linked from the welcome screen). */
export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const d = doc === 'terms' ? TERMS : PRIVACY;

  return (
    <Screen preset="calm" edges={['top']}>
      <View style={styles.header}>
        <IconButton icon="chevron-back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))} />
        <View style={{ flex: 1 }}>
          <Text style={type.title}>{d.title}</Text>
          <Text style={type.caption}>Last updated {d.updated}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {d.sections.map((s) => (
          <View key={s.heading} style={{ gap: 6 }}>
            <Text style={type.headline}>{s.heading}</Text>
            {s.body.map((p, i) => <Text key={i} style={[type.body, { color: T.text2 }]}>{p}</Text>)}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  body: { padding: 20, gap: 20, paddingBottom: 60 },
});
