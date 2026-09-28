import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, COLLECTIONS } from './firebase';
import { Chat, Message, MessageType, ScheduledCheckIn } from '../types/chat';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toMessage = (id: string, data: any): Message => ({
  id,
  ...data,
  timestamp: data.timestamp?.toDate?.() ?? new Date(),
});

const toChat = (id: string, data: any): Chat => ({
  id,
  ...data,
  lastMessageAt: data.lastMessageAt?.toDate?.() ?? undefined,
  createdAt: data.createdAt?.toDate?.() ?? new Date(),
});

// ─── Chat Management ──────────────────────────────────────────────────────────

export const getOrCreateChat = async (
  userId1: string,
  userId2: string,
  sessionId?: string
): Promise<string> => {
  const col = collection(db, COLLECTIONS.CHATS);
  // Check if chat already exists between these two users
  const q = query(col, where('participants', 'array-contains', userId1));
  const snap = await getDocs(q);
  const existing = snap.docs.find(d => {
    const parts = d.data().participants as string[];
    return parts.includes(userId2);
  });
  if (existing) return existing.id;

  // Create new chat (locked until trainer accepts session)
  const newChat: Omit<Chat, 'id'> = {
    participants: [userId1, userId2],
    participantNames: {},
    unreadCount: { [userId1]: 0, [userId2]: 0 },
    sessionId,
    isUnlocked: false,
    createdAt: new Date(),
  };
  const ref = await addDoc(col, { ...newChat, createdAt: serverTimestamp() });
  return ref.id;
};

export const unlockChat = async (chatId: string): Promise<void> => {
  const ref = doc(db, COLLECTIONS.CHATS, chatId);
  await updateDoc(ref, { isUnlocked: true });
};

// ─── Messages ─────────────────────────────────────────────────────────────────

export const sendMessage = async (
  chatId: string,
  message: Omit<Message, 'id' | 'timestamp' | 'read'>
): Promise<void> => {
  const msgCol = collection(db, COLLECTIONS.CHATS, chatId, COLLECTIONS.MESSAGES);
  await addDoc(msgCol, { ...message, timestamp: serverTimestamp(), read: false });

  // Update last message on chat document
  const chatRef = doc(db, COLLECTIONS.CHATS, chatId);
  const preview =
    message.type === 'text'
      ? message.text ?? ''
      : message.type === 'photo'
      ? '📷 Photo'
      : message.type === 'voice'
      ? '🎙️ Voice message'
      : 'Message';

  await updateDoc(chatRef, {
    lastMessage: preview,
    lastMessageType: message.type,
    lastMessageAt: serverTimestamp(),
    [`unreadCount.${message.senderId}`]: 0,
  });
};

export const markAsRead = async (chatId: string, userId: string): Promise<void> => {
  const chatRef = doc(db, COLLECTIONS.CHATS, chatId);
  await updateDoc(chatRef, { [`unreadCount.${userId}`]: 0 });

  // Mark all messages as read
  const msgCol = collection(db, COLLECTIONS.CHATS, chatId, COLLECTIONS.MESSAGES);
  const q = query(msgCol, where('read', '==', false));
  const snap = await getDocs(q);
  const updates = snap.docs
    .filter(d => d.data().senderId !== userId)
    .map(d => updateDoc(d.ref, { read: true }));
  await Promise.all(updates);
};

// ─── Real-time Subscriptions ──────────────────────────────────────────────────

export const subscribeToMessages = (
  chatId: string,
  callback: (messages: Message[]) => void
): (() => void) => {
  const msgCol = collection(db, COLLECTIONS.CHATS, chatId, COLLECTIONS.MESSAGES);
  const q = query(msgCol, orderBy('timestamp', 'asc'));
  return onSnapshot(q, snap => {
    const messages = snap.docs.map(d => toMessage(d.id, d.data()));
    callback(messages);
  });
};

export const subscribeToChats = (
  userId: string,
  callback: (chats: Chat[]) => void
): (() => void) => {
  const col = collection(db, COLLECTIONS.CHATS);
  const q = query(col, where('participants', 'array-contains', userId), orderBy('lastMessageAt', 'desc'));
  return onSnapshot(q, snap => {
    const chats = snap.docs.map(d => toChat(d.id, d.data()));
    callback(chats);
  });
};

export const subscribeToChat = (
  chatId: string,
  callback: (chat: Chat) => void
): (() => void) => {
  const ref = doc(db, COLLECTIONS.CHATS, chatId);
  return onSnapshot(ref, snap => {
    if (snap.exists()) callback(toChat(snap.id, snap.data()));
  });
};

// ─── Typing Indicators ────────────────────────────────────────────────────────

export const setTyping = async (
  chatId: string,
  userId: string,
  isTyping: boolean
): Promise<void> => {
  const ref = doc(db, COLLECTIONS.CHATS, chatId);
  if (isTyping) {
    await updateDoc(ref, { [`typing.${userId}`]: true });
  } else {
    await updateDoc(ref, { [`typing.${userId}`]: false });
  }
};

export const subscribeToTyping = (
  chatId: string,
  currentUserId: string,
  callback: (typingUsers: string[]) => void
): (() => void) => {
  const ref = doc(db, COLLECTIONS.CHATS, chatId);
  return onSnapshot(ref, snap => {
    if (!snap.exists()) return;
    const typing = snap.data().typing ?? {};
    const users = Object.entries(typing)
      .filter(([uid, isTyping]) => uid !== currentUserId && isTyping)
      .map(([uid]) => uid);
    callback(users);
  });
};

// ─── Scheduled Check-Ins ──────────────────────────────────────────────────────

export const createScheduledCheckIn = async (
  data: Omit<ScheduledCheckIn, 'id' | 'createdAt'>
): Promise<string> => {
  const col = collection(db, COLLECTIONS.SCHEDULED_CHECKINS);
  const ref = await addDoc(col, { ...data, createdAt: serverTimestamp() });
  return ref.id;
};

export const getScheduledCheckIns = async (
  trainerId: string,
  clientId: string
): Promise<ScheduledCheckIn[]> => {
  const col = collection(db, COLLECTIONS.SCHEDULED_CHECKINS);
  const q = query(
    col,
    where('trainerId', '==', trainerId),
    where('clientId', '==', clientId),
    where('isActive', '==', true)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    id: d.id,
    ...d.data(),
    scheduledFor: d.data().scheduledFor?.toDate?.() ?? new Date(),
    createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
  })) as ScheduledCheckIn[];
};
