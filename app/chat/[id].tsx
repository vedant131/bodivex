import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../stores/authStore';
import { subscribeToMessages, subscribeToChat, sendMessage, markAsRead, setTyping } from '../../services/chat';
import { uploadImage } from '../../services/storage';
import { Screen } from '../../components/ui/Screen';
import { Glass } from '../../components/ui/Glass';
import { PressableScale } from '../../components/ui/PressableScale';
import { Avatar, IconButton } from '../../components/ui/Bits';
import { T, type } from '../../constants/theme';
import { Chat, Message } from '../../types/chat';
import { Alert } from '../../components/ui/Feedback';
import { Bone } from '../../components/ui/Skeleton';

const dayLabel = (d: Date) => {
  const today = new Date();
  const y = new Date(); y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};
const time = (d: Date) => d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

export default function ChatScreen() {
  const { id: chatId, name, photo } = useLocalSearchParams<{ id: string; name: string; photo?: string }>();
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [chat, setChat] = useState<Chat | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);
  const typingRef = useRef(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!chatId || !user) return;
    const unsubMsgs = subscribeToMessages(chatId, (msgs) => {
      setMessages(msgs);
      setLoading(false);
      if (msgs.some((m) => !m.read && m.senderId !== user.id)) markAsRead(chatId, user.id).catch(() => {});
    });
    const unsubChat = subscribeToChat(chatId, setChat);
    return () => {
      unsubMsgs();
      unsubChat();
      if (typingRef.current) setTyping(chatId, user.id, false).catch(() => {});
    };
  }, [chatId, user?.id]);

  const unlocked = !!chat?.isUnlocked;
  const otherTyping = !!chat && Object.entries(chat.typing ?? {}).some(([uid, v]) => uid !== user?.id && v);

  // One write when typing starts and one when it stops, not one per keystroke
  const onChangeText = (text: string) => {
    setInput(text);
    if (!user || !unlocked) return;
    if (!typingRef.current) {
      typingRef.current = true;
      setTyping(chatId, user.id, true).catch(() => {});
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      typingRef.current = false;
      setTyping(chatId, user.id, false).catch(() => {});
    }, 2500);
  };

  const send = async (msg: Pick<Message, 'type' | 'text' | 'photoUrl'>) => {
    if (!user) return;
    setSending(true);
    try {
      await sendMessage(chatId, { chatId, senderId: user.id, senderName: user.name, ...msg });
      return true;
    } catch (e: any) {
      Alert.alert('Not sent', e.code === 'permission-denied' ? 'Chat opens once the coach accepts your booking.' : e.message);
      return false;
    } finally {
      setSending(false);
    }
  };

  const sendText = async () => {
    const text = input.trim();
    if (!text) return;
    setInput(''); // optimistic
    if (!(await send({ type: 'text', text }))) setInput(text); // restore on failure, never lose it
  };

  const sendPhoto = async () => {
    if (!user) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (res.canceled) return;
    setSending(true);
    try {
      // Upload first so the other person can actually see it (a local file:// path only exists on this phone)
      const url = await uploadImage(res.assets[0].uri, `users/${user.id}/chat_${Date.now()}.jpg`);
      await send({ type: 'photo', photoUrl: url });
    } catch (e: any) {
      Alert.alert('Photo not sent', e.message);
      setSending(false);
    }
  };

  const renderItem = useCallback(({ item, index }: { item: Message; index: number }) => {
    const me = item.senderId === user?.id;
    const prev = messages[index - 1];
    const newDay = !prev || prev.timestamp.toDateString() !== item.timestamp.toDateString();
    return (
      <View>
        {newDay && <Text style={styles.day}>{dayLabel(item.timestamp)}</Text>}
        <View style={[styles.row, me && { justifyContent: 'flex-end' }]}>
          {me ? (
            <LinearGradient colors={T.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.bubble, styles.mine]}>
              <Body item={item} me />
            </LinearGradient>
          ) : (
            <Glass radius={20} style={[styles.bubble, styles.theirs]}>
              <Body item={item} />
            </Glass>
          )}
        </View>
      </View>
    );
  }, [messages, user?.id]);

  return (
    <Screen preset="calm" edges={['top', 'bottom']}>
      <Glass radius={0} style={styles.header}>
        <IconButton icon="chevron-back" label="Back" onPress={() => router.back()} size={38} />
        <Avatar uri={photo} name={name || 'Chat'} size={40} radius={20} />
        <View style={{ flex: 1 }}>
          <Text style={type.headline} numberOfLines={1}>{name}</Text>
          <Text style={[type.caption, otherTyping && { color: T.ring2 }]}>
            {otherTyping ? 'typing…' : unlocked ? 'Booking confirmed' : 'Waiting for coach to accept'}
          </Text>
        </View>
      </Glass>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {loading ? (
          <View style={{ flex: 1, padding: 14, gap: 10 }}><Bone w="55%" h={40} r={20} /><Bone w="40%" h={40} r={20} style={{ alignSelf: 'flex-end' }} /><Bone w="65%" h={56} r={20} /></View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name={unlocked ? 'chatbubbles-outline' : 'lock-closed-outline'} size={32} color={T.text2} />
                <Text style={[type.caption, { textAlign: 'center' }]}>
                  {unlocked
                    ? 'Say hi and plan your first session.'
                    : 'This chat opens as soon as the coach accepts the booking. Use the public Q&A on their profile until then.'}
                </Text>
              </View>
            }
          />
        )}

        <View style={styles.composerWrap}>
          <Glass radius={26} style={[styles.composer, !unlocked && { opacity: 0.5 }]}>
            <PressableScale onPress={sendPhoto} disabled={!unlocked || sending} accessibilityLabel="Send photo" hitSlop={8}>
              <Ionicons name="image-outline" size={22} color={T.text2} />
            </PressableScale>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={onChangeText}
              placeholder={unlocked ? 'Message' : 'Chat locked until accepted'}
              placeholderTextColor={T.text3}
              editable={unlocked}
              multiline
              maxLength={1000}
              selectionColor={T.accent}
            />
            <PressableScale onPress={sendText} disabled={!unlocked || !input.trim() || sending} accessibilityLabel="Send">
              <LinearGradient colors={T.gradient} style={styles.send}>
                {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="arrow-up" size={20} color="#fff" />}
              </LinearGradient>
            </PressableScale>
          </Glass>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Body({ item, me }: { item: Message; me?: boolean }) {
  return (
    <>
      {item.type === 'photo' && item.photoUrl ? (
        <Image source={{ uri: item.photoUrl }} style={styles.photo} contentFit="cover" />
      ) : (
        <Text style={styles.text}>{item.text}</Text>
      )}
      <View style={styles.meta}>
        <Text style={[styles.time, me && { color: 'rgba(255,255,255,0.75)' }]}>{time(item.timestamp)}</Text>
        {me && <Ionicons name={item.read ? 'checkmark-done' : 'checkmark'} size={13} color="rgba(255,255,255,0.85)" />}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 0 },
  list: { padding: 14, gap: 6, flexGrow: 1 },
  day: { alignSelf: 'center', color: T.text3, fontSize: 12, fontWeight: '700', marginVertical: 10 },
  row: { flexDirection: 'row' },
  bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  mine: { borderBottomRightRadius: 6 },
  theirs: { borderBottomLeftRadius: 6 },
  text: { color: T.text, fontSize: 16, lineHeight: 21 },
  photo: { width: 220, height: 220, borderRadius: 14 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', marginTop: 3 },
  time: { color: T.text3, fontSize: 11 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  composerWrap: { paddingHorizontal: 12, paddingBottom: 8, paddingTop: 4 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingLeft: 16, paddingRight: 6, paddingVertical: 6 },
  input: { flex: 1, color: T.text, fontSize: 16, maxHeight: 120, paddingVertical: 8 },
  send: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
