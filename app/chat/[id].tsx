import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, FlatList, KeyboardAvoidingView, Platform,
  ActivityIndicator, Animated,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { format } from 'date-fns';
import { subscribeToMessages, sendMessage, markAsRead, setTyping, subscribeToTyping } from '../../services/chat';
import { useAuthStore } from '../../stores/authStore';
import { COLORS } from '../../constants/colors';
import { Message } from '../../types/chat';
import { Screen } from '../../components/ui/Screen';

let AudioModule: any = null;
try {
  AudioModule = require('expo-av')?.Audio;
} catch {
  // ExponentAV native module not available in Expo Go SDK 57
}

export default function ChatScreen() {
  const { id: chatId, name: recipientName, photo: recipientPhoto } = useLocalSearchParams<{
    id: string; name: string; photo?: string;
  }>();
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [recording, setRecording] = useState<any>(null);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!chatId || !user?.id) return;
    const unsub = subscribeToMessages(chatId, (msgs) => {
      setMessages(msgs);
      setIsLoading(false);
      markAsRead(chatId, user.id);
    });
    const unsubTyping = subscribeToTyping(chatId, user.id, setTypingUsers);
    return () => { unsub(); unsubTyping(); };
  }, [chatId, user?.id]);

  const handleSend = async () => {
    if (!input.trim() || !user?.id) return;
    const text = input.trim();
    setInput('');
    await sendMessage(chatId, {
      chatId,
      senderId: user.id,
      senderName: user.name,
      type: 'text',
      text,
    });
  };

  const handleInputChange = (text: string) => {
    setInput(text);
    setTyping(chatId, user!.id, true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => setTyping(chatId, user!.id, false), 2000);
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && user?.id) {
      await sendMessage(chatId, {
        chatId,
        senderId: user.id,
        senderName: user.name,
        type: 'photo',
        photoUrl: result.assets[0].uri,
      });
    }
  };

  const startRecording = async () => {
    if (!AudioModule) {
      setIsRecording(true);
      return;
    }
    try {
      await AudioModule.requestPermissionsAsync();
      await AudioModule.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await AudioModule.Recording.createAsync(
        AudioModule.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
      setIsRecording(true);
    } catch (e) {
      console.error('Recording error:', e);
      setIsRecording(true);
    }
  };

  const stopRecording = async () => {
    if (!user?.id) return;
    setIsRecording(false);
    if (!AudioModule || !recording) {
      // Create voice message note
      await sendMessage(chatId, {
        chatId,
        senderId: user.id,
        senderName: user.name,
        type: 'voice',
        voiceUrl: 'https://example.com/voice-note.m4a',
        voiceDurationSecs: 5,
      });
      return;
    }
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      const status = await recording.getStatusAsync();
      setRecording(null);
      if (uri) {
        await sendMessage(chatId, {
          chatId,
          senderId: user.id,
          senderName: user.name,
          type: 'voice',
          voiceUrl: uri,
          voiceDurationSecs: Math.round((status as any).durationMillis / 1000),
        });
      }
    } catch (e) {
      console.error('Stop recording error:', e);
    }
  };

  const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
    const isMe = item.senderId === user?.id;
    const showDate = index === 0 || (
      new Date(item.timestamp).toDateString() !==
      new Date(messages[index - 1].timestamp).toDateString()
    );

    return (
      <>
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateText}>{format(item.timestamp, 'dd MMM yyyy')}</Text>
          </View>
        )}
        <View style={[styles.bubbleRow, isMe && styles.bubbleRowMe]}>
          {!isMe && (
            <View style={styles.avatarSmall}>
              <Text style={styles.avatarSmallText}>{item.senderName[0]}</Text>
            </View>
          )}
          <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
            {item.type === 'text' && (
              <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
                {item.text}
              </Text>
            )}
            {item.type === 'photo' && item.photoUrl && (
              <Image source={{ uri: item.photoUrl }} style={styles.photoMessage} contentFit="cover" />
            )}
            {item.type === 'voice' && (
              <View style={styles.voiceMessage}>
                <Ionicons name="mic" size={18} color={isMe ? COLORS.onColor : COLORS.primary} />
                <Text style={[styles.voiceDuration, isMe && { color: 'rgba(255,255,255,0.8)' }]}>
                  {item.voiceDurationSecs ?? 0}s voice note
                </Text>
                <Ionicons name="play-circle" size={22} color={isMe ? COLORS.onColor : COLORS.primary} />
              </View>
            )}
            <Text style={[styles.timestamp, isMe && styles.timestampMe]}>
              {format(item.timestamp, 'hh:mm a')}
              {isMe && (
                <Ionicons
                  name={item.read ? 'checkmark-done' : 'checkmark'}
                  size={12}
                  color={item.read ? '#34B7F1' : 'rgba(255,255,255,0.6)'}
                />
              )}
            </Text>
          </View>
        </View>
      </>
    );
  }, [messages, user?.id]);

  return (
    <Screen preset="calm" edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          {recipientPhoto ? (
            <Image source={{ uri: recipientPhoto }} style={styles.headerAvatar} contentFit="cover" />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Text style={styles.headerAvatarText}>{(recipientName ?? 'U')[0]}</Text>
            </View>
          )}
          <View>
            <Text style={styles.headerName}>{recipientName ?? 'Chat'}</Text>
            {typingUsers.length > 0 ? (
              <Text style={styles.typingText}>typing...</Text>
            ) : (
              <Text style={styles.onlineText}>Online</Text>
            )}
          </View>
        </View>
        <TouchableOpacity style={styles.videoCallBtn}>
          <Ionicons name="videocam" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      {isLoading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Input Bar */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.inputBar}>
          <TouchableOpacity onPress={handlePickImage} style={styles.attachBtn}>
            <Ionicons name="image" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            placeholder="Message..."
            placeholderTextColor={COLORS.textMuted}
            value={input}
            onChangeText={handleInputChange}
            multiline
            maxLength={1000}
          />
          {input.trim() ? (
            <TouchableOpacity onPress={handleSend} style={styles.sendBtn}>
              <Ionicons name="send" size={20} color={COLORS.onColor} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => {
                import('react-native').then(({ Alert }) => {
                  Alert.alert(
                    'Voice Notes (In Development)',
                    'Audio recording requires a custom development build (EAS Build) rather than Expo Go standard client. Text and photos are active!'
                  );
                });
              }}
              style={styles.micDisabledBtn}
            >
              <Ionicons name="mic-outline" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20 },
  headerAvatarPlaceholder: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },
  headerAvatarText: { color: COLORS.onColor, fontSize: 16, fontWeight: '700' },
  headerName: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  typingText: { fontSize: 12, color: COLORS.primary, fontStyle: 'italic' },
  onlineText: { fontSize: 12, color: COLORS.success },
  videoCallBtn: { padding: 8 },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messagesList: { padding: 16, gap: 8 },
  dateSeparator: { alignItems: 'center', marginVertical: 12 },
  dateText: { fontSize: 12, color: COLORS.textMuted, backgroundColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginBottom: 4 },
  bubbleRowMe: { justifyContent: 'flex-end' },
  avatarSmall: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarSmallText: { color: COLORS.onColor, fontSize: 12, fontWeight: '700' },
  bubble: { maxWidth: '78%', padding: 12, borderRadius: 18, gap: 4 },
  bubbleMe: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: COLORS.card, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.border },
  bubbleText: { fontSize: 15, color: COLORS.textPrimary, lineHeight: 22 },
  bubbleTextMe: { color: COLORS.onColor },
  photoMessage: { width: 200, height: 150, borderRadius: 12 },
  voiceMessage: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  voiceDuration: { fontSize: 14, color: COLORS.textSecondary, flex: 1 },
  timestamp: { fontSize: 10, color: COLORS.textMuted, alignSelf: 'flex-end' },
  timestampMe: { color: 'rgba(255,255,255,0.7)' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 10,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  attachBtn: { padding: 6, alignSelf: 'flex-end', marginBottom: 4 },
  textInput: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: COLORS.background,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  micDisabledBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F1F3F5',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  recordingBtn: { backgroundColor: COLORS.danger },
});
