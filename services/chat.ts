import { sb, toRow, fromRow, must, live } from './backend';
import { Chat, Message } from '../types/chat';

const toChat = (row: any) => fromRow<Chat>(row);
const toMessage = (row: any): Message => {
  const { createdAt, ...m } = fromRow<any>(row);
  return { ...m, timestamp: createdAt };
};

// ─── Chat Management ──────────────────────────────────────────────────────────

export const getOrCreateChat = async (
  client: { id: string; name: string },
  trainer: { id: string; name: string },
  sessionId?: string
): Promise<string> => {
  const existing = must(await sb.from('chats').select('id').contains('participants', [client.id, trainer.id]).limit(1));
  if (existing.length) return existing[0].id;

  // Locked until the trainer accepts a booking (only accept_booking can unlock)
  const row = must(await sb.from('chats').insert(toRow({
    participants: [client.id, trainer.id],
    participantNames: { [client.id]: client.name, [trainer.id]: trainer.name },
    trainerId: trainer.id,
    unreadCount: { [client.id]: 0, [trainer.id]: 0 },
    sessionId,
  })).select('id').single());
  return row.id;
};

/** Sends through the send_message DB function (checks unlock + updates unread counts atomically). */
export const sendMessage = async (chatId: string, message: Omit<Message, 'id' | 'timestamp' | 'read'>): Promise<void> => {
  must(await sb.rpc('send_message', {
    p_chat: chatId,
    p_type: message.type,
    p_text: message.text ?? null,
    p_photo_url: message.photoUrl ?? null,
    p_voice_url: message.voiceUrl ?? null,
    p_voice_secs: message.voiceDurationSecs ?? null,
    p_sender_name: message.senderName ?? '',
  }));
};

export const markAsRead = async (chatId: string, _userId: string): Promise<void> => {
  must(await sb.rpc('mark_chat_read', { p_chat: chatId }));
};

// ─── Real-time Subscriptions ──────────────────────────────────────────────────

const getMessages = async (chatId: string) =>
  must(await sb.from('messages').select().eq('chat_id', chatId).order('created_at', { ascending: true })).map(toMessage);

export const subscribeToMessages = (chatId: string, callback: (messages: Message[]) => void) =>
  live([{ table: 'messages', filter: `chat_id=eq.${chatId}` }], async () => callback(await getMessages(chatId)));

// Only this user's chats wake the listener (client side or trainer side), not every chat in the app.
export const subscribeToChats = (userId: string, callback: (chats: Chat[]) => void) =>
  live([{ table: 'chats', filter: `client_id=eq.${userId}` }, { table: 'chats', filter: `trainer_id=eq.${userId}` }], async () => {
    const rows = must(await sb.from('chats').select().contains('participants', [userId]).order('last_message_at', { ascending: false }));
    callback(rows.map(toChat));
  });

export const subscribeToChat = (chatId: string, callback: (chat: Chat) => void) =>
  live([{ table: 'chats', filter: `id=eq.${chatId}` }], async () => {
    const row = must(await sb.from('chats').select().eq('id', chatId).maybeSingle());
    if (row) callback(toChat(row));
  });

// ─── Typing Indicators ────────────────────────────────────────────────────────

export const setTyping = async (chatId: string, _userId: string, isTyping: boolean): Promise<void> => {
  must(await sb.rpc('set_typing', { p_chat: chatId, p_typing: isTyping }));
};
