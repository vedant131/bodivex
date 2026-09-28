export type SessionType = 'online' | 'offline';

export type SessionStatus =
  | 'pending'       // Created, awaiting trainer acceptance
  | 'confirmed'     // Trainer accepted, chat unlocked
  | 'active'        // Session in progress
  | 'completed'     // Session done, awaiting client confirmation
  | 'disputed'      // Client raised dispute
  | 'cancelled'     // Trainer rejected or no-show
  | 'refunded';     // Money returned to client

export type EscrowStatus = 'held' | 'released' | 'refunded' | 'partial_refund';

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
  startedAt?: Date;
  endedAt?: Date;
  durationMins: number;
  rateAtBooking: number;       // Exact rate at time of booking (preserved forever)
  platformFeePercent: number;  // Fee % at time of booking
  platformFee: number;         // Calculated fee amount
  totalPaid: number;           // What client paid
  netEarned: number;           // What trainer receives
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpayTransferId?: string;
  escrowStatus: EscrowStatus;
  chatId?: string;
  videoCallRoomId?: string;
  recordingUrl?: string;
  clientRating?: number;
  clientReview?: string;
  disputeReason?: string;
  adminNotes?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingRequest {
  trainerId: string;
  type: SessionType;
  scheduledAt: Date;
  durationMins: number;
  trainerRate: number;
}

export interface BookingOrderResponse {
  sessionId: string;
  orderId: string;
  amount: number; // in paise
  currency: string;
  keyId: string;
}
