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
  serverTimestamp,
} from 'firebase/firestore';
import { db, COLLECTIONS } from './firebase';
import {
  FinanceDashboard,
  ClientFinanceSummary,
  Withdrawal,
  TaxSummary,
  EarningsChartData,
} from '../types/finance';
import { Session } from '../types/session';
import { getRateHistory } from './trainers';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toSession = (id: string, data: any): Session => ({
  id,
  ...data,
  scheduledAt: data.scheduledAt?.toDate?.() ?? new Date(),
  startedAt: data.startedAt?.toDate?.() ?? undefined,
  endedAt: data.endedAt?.toDate?.() ?? undefined,
  createdAt: data.createdAt?.toDate?.() ?? new Date(),
  updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
});

// ─── Finance Dashboard ────────────────────────────────────────────────────────

export const getFinanceDashboard = async (
  trainerId: string
): Promise<FinanceDashboard> => {
  const sessionsCol = collection(db, COLLECTIONS.SESSIONS);
  const q = query(sessionsCol, where('trainerId', '==', trainerId));
  const snap = await getDocs(q);
  const sessions = snap.docs.map(d => toSession(d.id, d.data()));

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let availableBalance = 0;
  let escrowBalance = 0;
  let totalEarned = 0;
  let totalWithdrawn = 0;
  let thisWeek = 0;
  let thisMonth = 0;
  let allTime = 0;
  let pendingCount = 0;
  let completedCount = 0;

  for (const s of sessions) {
    if (s.status === 'completed' && s.escrowStatus === 'released') {
      availableBalance += s.netEarned;
      totalEarned += s.netEarned;
      allTime += s.netEarned;
      completedCount++;
      if (s.scheduledAt >= weekStart) thisWeek += s.netEarned;
      if (s.scheduledAt >= monthStart) thisMonth += s.netEarned;
    } else if (s.escrowStatus === 'held') {
      escrowBalance += s.netEarned;
      pendingCount++;
    }
  }

  // Subtract withdrawals from available
  const wCol = collection(db, COLLECTIONS.WITHDRAWALS);
  const wQ = query(wCol, where('trainerId', '==', trainerId), where('status', 'in', ['pending', 'processing', 'settled']));
  const wSnap = await getDocs(wQ);
  for (const w of wSnap.docs) {
    const wd = w.data();
    if (wd.status === 'settled') totalWithdrawn += wd.amount;
    availableBalance -= wd.amount;
  }

  return {
    trainerId,
    availableBalance: Math.max(0, availableBalance),
    escrowBalance,
    totalEarned,
    totalWithdrawn,
    thisWeek,
    thisMonth,
    allTime,
    pendingSessionsCount: pendingCount,
    completedSessionsCount: completedCount,
  };
};

// ─── Session Log ──────────────────────────────────────────────────────────────

export const getSessionLog = async (
  trainerId: string,
  limitCount: number = 50
): Promise<Session[]> => {
  const col = collection(db, COLLECTIONS.SESSIONS);
  const q = query(
    col,
    where('trainerId', '==', trainerId),
    orderBy('scheduledAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.slice(0, limitCount).map(d => toSession(d.id, d.data()));
};

// ─── Per-Client Summary ───────────────────────────────────────────────────────

export const getClientFinanceSummary = async (
  trainerId: string,
  clientId: string
): Promise<ClientFinanceSummary | null> => {
  const col = collection(db, COLLECTIONS.SESSIONS);
  const q = query(
    col,
    where('trainerId', '==', trainerId),
    where('clientId', '==', clientId),
    orderBy('scheduledAt', 'asc')
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const sessions = snap.docs.map(d => toSession(d.id, d.data()));
  const completed = sessions.filter(s => s.status === 'completed');
  const cancelled = sessions.filter(s => s.status === 'cancelled');
  const totalEarned = completed.reduce((acc, s) => acc + s.netEarned, 0);
  const rateHistory = await getRateHistory(trainerId);

  const firstSession = sessions[0];
  const lastCompleted = completed[completed.length - 1];
  const nextSession = sessions.find(
    s => s.scheduledAt > new Date() && s.status === 'confirmed'
  );

  // Get client info
  const clientRef = doc(db, COLLECTIONS.CLIENTS, clientId);
  const clientSnap = await getDoc(clientRef);
  const clientData = clientSnap.data();

  return {
    clientId,
    clientName: firstSession.clientName,
    clientPhoto: firstSession.clientPhoto,
    totalSessions: sessions.length,
    completedSessions: completed.length,
    cancelledSessions: cancelled.length,
    totalEarned,
    rateHistory,
    firstSessionAt: firstSession.scheduledAt,
    lastSessionAt: lastCompleted?.scheduledAt,
    nextSessionAt: nextSession?.scheduledAt,
  };
};

export const getAllClientSummaries = async (
  trainerId: string
): Promise<ClientFinanceSummary[]> => {
  const col = collection(db, COLLECTIONS.SESSIONS);
  const q = query(col, where('trainerId', '==', trainerId));
  const snap = await getDocs(q);
  const sessions = snap.docs.map(d => toSession(d.id, d.data()));

  // Group by clientId
  const clientMap: Record<string, Session[]> = {};
  for (const s of sessions) {
    if (!clientMap[s.clientId]) clientMap[s.clientId] = [];
    clientMap[s.clientId].push(s);
  }

  const summaries: ClientFinanceSummary[] = [];
  for (const [clientId, clientSessions] of Object.entries(clientMap)) {
    const completed = clientSessions.filter(s => s.status === 'completed');
    const totalEarned = completed.reduce((acc, s) => acc + s.netEarned, 0);
    const sorted = clientSessions.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
    const rateHistory = await getRateHistory(trainerId);

    summaries.push({
      clientId,
      clientName: clientSessions[0].clientName,
      clientPhoto: clientSessions[0].clientPhoto,
      totalSessions: clientSessions.length,
      completedSessions: completed.length,
      cancelledSessions: clientSessions.filter(s => s.status === 'cancelled').length,
      totalEarned,
      rateHistory,
      firstSessionAt: sorted[0].scheduledAt,
      lastSessionAt: completed[completed.length - 1]?.scheduledAt,
    });
  }

  return summaries.sort((a, b) => b.totalEarned - a.totalEarned);
};

// ─── Withdrawals ──────────────────────────────────────────────────────────────

export const initiateWithdrawal = async (
  trainerId: string,
  amount: number,
  bankLast4: string,
  bankName: string
): Promise<string> => {
  const col = collection(db, COLLECTIONS.WITHDRAWALS);
  const ref = await addDoc(col, {
    trainerId,
    amount,
    bankLast4,
    bankName,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const getWithdrawalHistory = async (trainerId: string): Promise<Withdrawal[]> => {
  const col = collection(db, COLLECTIONS.WITHDRAWALS);
  const q = query(col, where('trainerId', '==', trainerId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    id: d.id,
    ...d.data(),
    createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
    settledAt: d.data().settledAt?.toDate?.() ?? undefined,
  })) as Withdrawal[];
};

// ─── Tax Summary ──────────────────────────────────────────────────────────────

export const getTaxSummary = async (
  trainerId: string,
  financialYear: string // e.g. "2026-27"
): Promise<TaxSummary> => {
  const [startYear, endYear] = financialYear.split('-').map(Number);
  const fyStart = new Date(`20${startYear < 100 ? startYear : startYear}-04-01`);
  const fyEnd = new Date(`20${endYear < 100 ? endYear : endYear}-03-31`);

  const col = collection(db, COLLECTIONS.SESSIONS);
  const q = query(col, where('trainerId', '==', trainerId), where('status', '==', 'completed'));
  const snap = await getDocs(q);
  const sessions = snap.docs
    .map(d => toSession(d.id, d.data()))
    .filter(s => s.scheduledAt >= fyStart && s.scheduledAt <= fyEnd);

  const totalEarned = sessions.reduce((acc, s) => acc + s.netEarned, 0);
  const platformFeePaid = sessions.reduce((acc, s) => acc + s.platformFee, 0);
  const tds = totalEarned > 30000 ? totalEarned * 0.1 : 0;

  return {
    financialYear,
    totalEarned,
    platformFeePaid,
    tdsDeducted: tds > 0 ? tds : undefined,
    netTaxable: totalEarned - (tds > 0 ? tds : 0),
    totalSessions: sessions.length,
  };
};

// ─── Earnings Chart Data ──────────────────────────────────────────────────────

export const getEarningsChartData = async (
  trainerId: string,
  period: 'week' | 'month' | 'year'
): Promise<EarningsChartData[]> => {
  const col = collection(db, COLLECTIONS.SESSIONS);
  const q = query(
    col,
    where('trainerId', '==', trainerId),
    where('status', '==', 'completed'),
    where('escrowStatus', '==', 'released')
  );
  const snap = await getDocs(q);
  const sessions = snap.docs.map(d => toSession(d.id, d.data()));

  const now = new Date();
  const data: EarningsChartData[] = [];

  if (period === 'week') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dayStr = days[d.getDay()];
      const daySessions = sessions.filter(s => {
        const sd = new Date(s.scheduledAt);
        return sd.getDate() === d.getDate() &&
          sd.getMonth() === d.getMonth() &&
          sd.getFullYear() === d.getFullYear();
      });
      data.push({
        label: dayStr,
        amount: daySessions.reduce((acc, s) => acc + s.netEarned, 0),
        sessions: daySessions.length,
      });
    }
  } else if (period === 'month') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthSessions = sessions.filter(s => {
        const sd = new Date(s.scheduledAt);
        return sd.getMonth() === d.getMonth() && sd.getFullYear() === d.getFullYear();
      });
      data.push({
        label: months[d.getMonth()],
        amount: monthSessions.reduce((acc, s) => acc + s.netEarned, 0),
        sessions: monthSessions.length,
      });
    }
  }

  return data;
};
