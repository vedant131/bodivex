export type MessageType = 'text' | 'photo' | 'voice' | 'system';

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  type: MessageType;
  text?: string;
  photoUrl?: string;
  voiceUrl?: string;
  voiceDurationSecs?: number;
  timestamp: Date;
  read: boolean;
  translated?: Record<string, string>; // langCode -> translated text
}

export interface Chat {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  participantPhotos?: Record<string, string>;
  lastMessage?: string;
  lastMessageType?: MessageType;
  lastMessageAt?: Date;
  unreadCount: Record<string, number>; // userId -> count
  sessionId?: string;
  trainerId: string;
  isUnlocked: boolean; // false until trainer accepts booking
  typing?: Record<string, boolean>;
  createdAt: Date;
}

export interface ScheduledCheckIn {
  id: string;
  trainerId: string;
  clientId: string;
  message: string;
  scheduledFor: Date;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  dayOfWeek?: number; // 0-6 for weekly
  isActive: boolean;
  createdAt: Date;
}

export interface TypingStatus {
  chatId: string;
  typingUsers: string[]; // userIds currently typing
}
