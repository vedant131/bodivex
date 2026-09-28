export type SessionType = 'online' | 'offline';

// Clients pay trainers directly, so a session is just a booking request.
export type SessionStatus =
  | 'pending'       // Created, awaiting trainer acceptance
  | 'confirmed'     // Trainer accepted, chat unlocked
  | 'completed'     // Client marked it done
  | 'cancelled';    // Trainer declined or someone cancelled

export interface Session {
  id: string;
  clientId: string;
  trainerId: string;
  clientName: string;
  trainerName: string;
  clientPhoto?: string;
  trainerPhoto?: string;
  type: SessionType;
  status: SessionStatus;
  scheduledAt: Date;
  endedAt?: Date;
  durationMins: number;
  slotKey: string;             // YYYY-MM-DD-HH, doc id of the trainer's slot lock
  price: number;               // Trainer's quoted price, paid directly to trainer
  chatId?: string;
  trainerSocial?: { instagram?: string; youtube?: string }; // revealed after acceptance
  videoCallRoomId?: string;     // Jitsi room for online sessions (set on accept)
  confirmedAt?: Date;
  clientRating?: number;
  clientReview?: string;
  cancelReason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingRequest {
  trainerId: string;
  type: SessionType;
  scheduledAt: Date;
  durationMins: number;
  price: number;
}

export interface ClientSummary {
  clientId: string;
  clientName: string;
  clientPhoto?: string;
  chatId?: string;
  totalSessions: number;
  completedSessions: number;
  firstSessionAt: Date;
  lastSessionAt?: Date;
}
