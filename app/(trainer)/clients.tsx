import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { getClientSummaries } from '../../services/bookings';
import { sendMessage } from '../../services/chat';
import { Screen } from '../../components/ui/Screen';
import { Glass } from '../../components/ui/Glass';
import { Button } from '../../components/ui/Button';
import { Avatar, IconButton } from '../../components/ui/Bits';
import { TAB_BAR_SPACE } from '../../components/ui/GlassTabBar';
import { T, type } from '../../constants/theme';
import { ClientSummary } from '../../types/session';
import { Alert } from '../../components/ui/Feedback';
import { Skeleton } from '../../components/ui/Skeleton';

const since = (d: Date) => d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

export default function TrainerClientsScreen() {
  const { trainerProfile, user } = useAuthStore();
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkInFor, setCheckInFor] = useState<ClientSummary | null>(null);
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!trainerProfile) return;
    getClientSummaries(trainerProfile.id)
      .then(setClients)
      .catch((e) => Alert.alert('Could not load clients', e.message))
      .finally(() => setLoading(false));
  }, [trainerProfile?.id]);

  const openChat = (c: ClientSummary) =>
    c.chatId
      ? router.push({ pathname: '/chat/[id]', params: { id: c.chatId, name: c.clientName } })
      : Alert.alert('No chat yet', 'Chat opens once you accept a booking from this client.');

  // Note: sent now as a chat message; recurring weekly check-ins need a scheduled Cloud Function
  const sendCheckIn = async () => {
    if (!checkInFor?.chatId || !user || !msg.trim()) return;
    setSending(true);
    try {
      await sendMessage(checkInFor.chatId, { chatId: checkInFor.chatId, senderId: user.id, senderName: user.name, type: 'text', text: msg.trim() });
      setCheckInFor(null);
      setMsg('');
    } catch (e: any) {
      Alert.alert('Not sent', e.code === 'permission-denied' ? 'Chat opens once you accept a booking from this client.' : e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen preset="trainer" edges={['top']}>
      <View style={styles.head}>
        <Text style={type.title}>Clients</Text>
        <Text style={type.caption}>{clients.length} total</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {loading ? (
          <Skeleton variant="card" count={3} />
        ) : clients.length === 0 ? (
          <Glass radius={T.radius.xl} style={styles.empty}>
            <Ionicons name="people-outline" size={30} color={T.text2} />
            <Text style={type.headline}>No clients yet</Text>
            <Text style={[type.caption, { textAlign: 'center' }]}>
              Clients who book you show up here. Keep "Taking bookings" on and answer public questions to get discovered.
            </Text>
          </Glass>
        ) : (
          clients.map((c) => (
            <Glass key={c.clientId} radius={T.radius.xl} style={styles.card}>
              <View style={styles.row}>
                <Avatar uri={c.clientPhoto} name={c.clientName} size={50} radius={25} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={type.headline}>{c.clientName}</Text>
                  <Text style={type.caption}>Client since {since(c.firstSessionAt)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.count}>{c.completedSessions}</Text>
                  <Text style={type.caption}>of {c.totalSessions} done</Text>
                </View>
              </View>
              <View style={styles.actions}>
                <IconButton icon="chatbubble-ellipses" label={`Chat with ${c.clientName}`} size={40} onPress={() => openChat(c)} />
                <Button
                  title="Send check-in"
                  icon="paper-plane-outline"
                  variant="glass"
                  size="sm"
                  disabled={!c.chatId}
                  onPress={() => { setCheckInFor(c); setMsg('Hi! How did this week go? Share your weight and a quick progress photo.'); }}
                />
              </View>
            </Glass>
          ))
        )}
      </ScrollView>

      <Modal visible={!!checkInFor} transparent animationType="fade" onRequestClose={() => setCheckInFor(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Pressable style={styles.scrim} onPress={() => setCheckInFor(null)}>
            <Pressable onPress={() => {}}>
              <Glass radius={T.radius.xl} style={styles.sheet}>
                <Text style={type.title}>Check in with {checkInFor?.clientName.split(' ')[0]}</Text>
                <Text style={type.caption}>Sent to your chat right away.</Text>
                <Glass radius={T.radius.md} style={{ padding: 12 }}>
                  <TextInput style={styles.input} value={msg} onChangeText={setMsg} multiline maxLength={1000}
                    placeholderTextColor={T.text3} selectionColor={T.accent} autoFocus />
                </Glass>
                <Button title="Send" icon="send" onPress={sendCheckIn} loading={sending} disabled={!msg.trim()} />
              </Glass>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 },
  list: { paddingHorizontal: 20, gap: 12, paddingBottom: TAB_BAR_SPACE },
  empty: { alignItems: 'center', gap: 8, padding: 28, marginTop: 20 },
  card: { padding: 14, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  count: { color: T.text, fontSize: 22, fontWeight: '800' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scrim: { flex: 1, backgroundColor: T.scrim, justifyContent: 'flex-end', padding: 12 },
  sheet: { padding: 20, gap: 14, marginBottom: 8 },
  input: { color: T.text, fontSize: 16, minHeight: 90, textAlignVertical: 'top' },
});
