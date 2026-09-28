import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { format } from 'date-fns';
import { useAuthStore } from '../../stores/authStore';
import { subscribeToChats } from '../../services/chat';
import { COLORS } from '../../constants/colors';
import { Chat } from '../../types/chat';

export default function TrainerChatsScreen() {
  const { user } = useAuthStore();
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const unsub = subscribeToChats(user.id, (list) => {
      setChats(list);
      setIsLoading(false);
    });
    return unsub;
  }, [user?.id]);

  const renderChatItem = ({ item }: { item: Chat }) => {
    const otherUserId = item.participants.find((p) => p !== user?.id) ?? '';
    const otherUserName = item.participantNames[otherUserId] || 'Client';
    const otherUserPhoto = item.participantPhotos?.[otherUserId];
    const unread = item.unreadCount?.[user?.id ?? ''] ?? 0;

    return (
      <TouchableOpacity
        style={styles.chatCard}
        onPress={() =>
          router.push({
            pathname: '/chat/[id]',
            params: { id: item.id, name: otherUserName, photo: otherUserPhoto },
          })
        }
        activeOpacity={0.7}
      >
        <View style={styles.avatar}>
          {otherUserPhoto ? (
            <Image source={{ uri: otherUserPhoto }} style={styles.avatarImg} contentFit="cover" />
          ) : (
            <Text style={styles.avatarText}>{otherUserName[0]}</Text>
          )}
        </View>

        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={styles.name}>{otherUserName}</Text>
            {item.lastMessageAt && (
              <Text style={styles.time}>
                {format(new Date(item.lastMessageAt), 'hh:mm a')}
              </Text>
            )}
          </View>

          <View style={styles.messageRow}>
            <Text style={[styles.lastMsg, unread > 0 && styles.lastMsgUnread]} numberOfLines={1}>
              {item.lastMessage || 'Booking confirmed. Chat unlocked.'}
            </Text>
            {unread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unread}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Client Chats</Text>
          <Text style={styles.headerSub}>Active direct chats unlocked upon confirmed booking</Text>
        </View>
      </View>

      {/* Chat unlock notice */}
      <View style={styles.escrowNoticeCard}>
        <Ionicons name="shield-checkmark" size={16} color={COLORS.success} />
        <Text style={styles.escrowNoticeCardText}>
          Chats unlock when you accept a booking. Questions before booking go to your public Q&A.
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : chats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={60} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No client chats yet</Text>
          <Text style={styles.emptySub}>
            When you accept booking requests, conversations will automatically appear here with full photo & voice messaging.
          </Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(c) => c.id}
          renderItem={renderChatItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  headerSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  escrowNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FFF4',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C6F6D5',
  },
  escrowNoticeCardText: { fontSize: 12, color: '#1B5E20', lineHeight: 16, flex: 1, fontWeight: '500' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
    gap: 10,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  emptySub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  list: { paddingVertical: 8 },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { color: COLORS.white, fontSize: 20, fontWeight: '700' },
  chatContent: { flex: 1, gap: 4 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  time: { fontSize: 11, color: COLORS.textMuted },
  messageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMsg: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  lastMsgUnread: { color: COLORS.textPrimary, fontWeight: '700' },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  unreadText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
});
