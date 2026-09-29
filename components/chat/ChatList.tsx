import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { subscribeToChats } from '../../services/chat';
import { Screen } from '../ui/Screen';
import { Glass } from '../ui/Glass';
import { PressableScale } from '../ui/PressableScale';
import { Avatar } from '../ui/Bits';
import { TAB_BAR_SPACE } from '../ui/GlassTabBar';
import { T, type } from '../../constants/theme';
import { Chat } from '../../types/chat';
import { Skeleton } from '../ui/Skeleton';

const when = (d?: Date) => {
  if (!d) return '';
  const today = new Date().toDateString() === d.toDateString();
  return today
    ? d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

/** Chats tab for both roles. */
export function ChatList({ role }: { role: 'client' | 'trainer' }) {
  const user = useAuthStore((s) => s.user);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    return subscribeToChats(user.id, (list) => {
      setChats(list);
      setLoading(false);
    });
  }, [user?.id]);

  const render = ({ item }: { item: Chat }) => {
    const otherId = item.participants.find((p) => p !== user?.id) ?? '';
    const name = item.participantNames?.[otherId] || (role === 'client' ? 'Coach' : 'Client');
    const photo = item.participantPhotos?.[otherId];
    const unread = item.unreadCount?.[user?.id ?? ''] ?? 0;
    const preview = !item.isUnlocked
      ? role === 'client' ? 'Waiting for coach to accept' : 'New request — accept to chat'
      : item.lastMessage || 'Booking confirmed. Say hi!';

    return (
      <PressableScale
        onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id, name, photo } })}
        accessibilityLabel={`Chat with ${name}${unread ? `, ${unread} unread` : ''}`}
      >
        <Glass radius={T.radius.lg} style={styles.row}>
          <Avatar uri={photo} name={name} size={52} radius={26} />
          <View style={{ flex: 1, gap: 3 }}>
            <View style={styles.top}>
              <Text style={type.headline} numberOfLines={1}>{name}</Text>
              <Text style={type.caption}>{when(item.lastMessageAt)}</Text>
            </View>
            <View style={styles.top}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 }}>
                {!item.isUnlocked && <Ionicons name="lock-closed" size={12} color={T.text3} />}
                <Text style={[type.caption, unread > 0 && { color: T.text }]} numberOfLines={1}>{preview}</Text>
              </View>
              {unread > 0 && (
                <View style={styles.badge}><Text style={styles.badgeText}>{unread}</Text></View>
              )}
            </View>
          </View>
        </Glass>
      </PressableScale>
    );
  };

  return (
    <Screen preset={role === 'trainer' ? 'trainer' : 'calm'} edges={['top']}>
      <Text style={[type.title, styles.title]}>Chats</Text>
      {loading ? (
        <View style={{ paddingHorizontal: 20 }}><Skeleton variant="chat" count={4} /></View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(c) => c.id}
          renderItem={render}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Glass radius={T.radius.xl} style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={30} color={T.text2} />
              <Text style={type.headline}>No chats yet</Text>
              <Text style={[type.caption, { textAlign: 'center' }]}>
                {role === 'client'
                  ? 'A private chat opens with a coach once they accept your booking.'
                  : 'A private chat opens with a client once you accept their booking.'}
              </Text>
            </Glass>
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  list: { paddingHorizontal: 20, gap: 10, paddingBottom: TAB_BAR_SPACE },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  empty: { alignItems: 'center', gap: 8, padding: 28, marginTop: 20 },
});
