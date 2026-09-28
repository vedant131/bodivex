import { TrainerRateHistory } from './trainer';

export interface FinanceDashboard {
  trainerId: string;
  availableBalance: number;
  escrowBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  thisWeek: number;
  thisMonth: number;
  allTime: number;
  pendingSessionsCount: number;
  completedSessionsCount: number;
}

export type WithdrawalStatus = 'pending' | 'processing' | 'settled' | 'failed';

export interface Withdrawal {
  id: string;
  trainerId: string;
  amount: number;
  bankLast4: string;
  bankName: string;
  razorpayPayoutId?: string;
  status: WithdrawalStatus;
  createdAt: Date;
  settledAt?: Date;
  failureReason?: string;
}

export interface TaxSummary {
  financialYear: string; // e.g. "2026-27"
  totalEarned: number;
  platformFeePaid: number;
  tdsDeducted?: number;
  netTaxable: number;
  totalSessions: number;
}

export interface ClientFinanceSummary {
  clientId: string;
  clientName: string;
  clientPhoto?: string;
  totalSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  totalEarned: number;
  currentRateOnline?: number;
  currentRateOffline?: number;
  rateHistory: TrainerRateHistory[];
  firstSessionAt: Date;
  lastSessionAt?: Date;
  nextSessionAt?: Date;
}

export interface EarningsChartData {
  label: string;   // "Mon", "Tue" or "Jan", "Feb" etc.
  amount: number;
  sessions: number;
}
