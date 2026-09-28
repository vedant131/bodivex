import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db, COLLECTIONS } from './firebase';
import { Session, SessionStatus, BookingRequest, ClientSummary } from '../types/session';
import { TrainerProfile } from '../types/trainer';
import { getOrCreateChat, unlockChat } from './chat';
import { slotKey, dateKey } from './slots';

const toSession = (id: string, data: any): Session => ({
  id,
  ...data,
  scheduledAt: data.scheduledAt?.toDate?.() ?? new Date(data.scheduledAt),
  endedAt: data.endedAt?.toDate?.() ?? undefined,
  createdAt: data.createdAt?.toDate?.() ?? new Date(),
  updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
});

export const createBooking = async (
  request: BookingRequest,
  clientId: string,
  clientName: string,
  trainer: TrainerProfile
): Promise<string> => {
  // Chat stays locked until the trainer accepts
  const chatId = await getOrCreateChat({ id: clientId, name: clientName }, { id: trainer.id, name: trainer.name });

  const key = slotKey(request.scheduledAt);
  const sessionRef = doc(collection(db, COLLECTIONS.SESSIONS));
  const sessionData: Omit<Session, 'id' | 'createdAt' | 'updatedAt'> = {
    clientId,
    trainerId: trainer.id,
    clientName,
    trainerName: trainer.name,
    ...(trainer.profilePhoto && { trainerPhoto: trainer.profilePhoto }),
    type: request.type,
    status: 'pending' as SessionStatus,
    scheduledAt: request.scheduledAt,
    durationMins: request.durationMins,
    slotKey: key,
    price: request.price,
    chatId,
  };

  // The slot lock can only be created once (see firestore.rules), so two clients
  // tapping the same slot can't both succeed.
  const batch = writeBatch(db);
  batch.set(sessionRef, { ...sessionData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  batch.set(doc(db, COLLECTIONS.TRAINERS, trainer.id, 'slots', key), {
    sessionId: sessionRef.id,
    date: dateKey(request.scheduledAt),
    createdAt: serverTimestamp(),
  });
  try {
    await batch.commit();
  } catch (e: any) {
    if (e.code === 'permission-denied') throw new Error('Sorry, that slot was just booked. Please pick another time.');
    throw e;
  }
  return sessionRef.id;
};

export const trainerAcceptSession = async (sessionId: string): Promise<void> => {
  const ref = doc(db, COLLECTIONS.SESSIONS, sessionId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();

  await updateDoc(ref, {
    status: 'confirmed',
    updatedAt: serverTimestamp(),
  });

  // Unlock chat between trainer and client
  if (data.chatId) {
    await unlockChat(data.chatId);
  }
};

export const trainerRejectSession = async (
  sessionId: string,
  reason?: string
): Promise<void> => {
  const ref = doc(db, COLLECTIONS.SESSIONS, sessionId);
  const snap = await getDoc(ref);
  const batch = writeBatch(db);
  batch.update(ref, {
    status: 'cancelled',
    cancelReason: reason ?? 'Declined by trainer',
    updatedAt: serverTimestamp(),
  });
  // Free the slot for other clients
  const data = snap.data();
  if (data?.slotKey) batch.delete(doc(db, COLLECTIONS.TRAINERS, data.trainerId, 'slots', data.slotKey));
  await batch.commit();
};

export const clientCompleteSession = async (
  sessionId: string,
  rating?: number,
  review?: string
): Promise<void> => {
  const ref = doc(db, COLLECTIONS.SESSIONS, sessionId);
  await updateDoc(ref, {
    status: 'completed',
    ...(rating && { clientRating: rating }),
    ...(review && { clientReview: review }),
    endedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (rating) {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      await setDoc(doc(db, COLLECTIONS.REVIEWS, sessionId), {
        sessionId,
        clientId: data.clientId,
        clientName: data.clientName,
        trainerId: data.trainerId,
        rating,
        comment: review ?? '',
        createdAt: serverTimestamp(),
      });
    }
  }
};

export const getClientSessions = async (clientId: string): Promise<Session[]> => {
  const col = collection(db, COLLECTIONS.SESSIONS);
  const q = query(col, where('clientId', '==', clientId), orderBy('scheduledAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toSession(d.id, d.data()));
};

export const getTrainerSessions = async (trainerId: string): Promise<Session[]> => {
  const col = collection(db, COLLECTIONS.SESSIONS);
  const q = query(col, where('trainerId', '==', trainerId), orderBy('scheduledAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toSession(d.id, d.data()));
};

export const getSessionById = async (id: string): Promise<Session | null> => {
  const ref = doc(db, COLLECTIONS.SESSIONS, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return toSession(snap.id, snap.data());
};

export const subscribeToClientSessions = (
  clientId: string,
  callback: (sessions: Session[]) => void
): (() => void) => {
  const col = collection(db, COLLECTIONS.SESSIONS);
  const q = query(col, where('clientId', '==', clientId), orderBy('scheduledAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => toSession(d.id, d.data())));
  });
};

export const subscribeToTrainerSessions = (
  trainerId: string,
  callback: (sessions: Session[]) => void
): (() => void) => {
  const col = collection(db, COLLECTIONS.SESSIONS);
  const q = query(col, where('trainerId', '==', trainerId), orderBy('scheduledAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => toSession(d.id, d.data())));
  });
};

export const getClientSummaries = async (trainerId: string): Promise<ClientSummary[]> => {
  const sessions = await getTrainerSessions(trainerId);
  const byClient: Record<string, Session[]> = {};
  for (const s of sessions) (byClient[s.clientId] ??= []).push(s);

  return Object.entries(byClient)
    .map(([clientId, list]) => {
      const sorted = [...list].sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
      const completed = sorted.filter((s) => s.status === 'completed');
      return {
        clientId,
        clientName: sorted[0].clientName,
        clientPhoto: sorted[0].clientPhoto,
        chatId: sorted.find((s) => s.chatId)?.chatId,
        totalSessions: sorted.length,
        completedSessions: completed.length,
        firstSessionAt: sorted[0].scheduledAt,
        lastSessionAt: completed[completed.length - 1]?.scheduledAt,
      };
    })
    .sort((a, b) => b.totalSessions - a.totalSessions);
};
