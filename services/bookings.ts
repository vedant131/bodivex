import { sb, toRow, fromRow, must, live } from './backend';
import { Session, BookingRequest, ClientSummary } from '../types/session';
import { TrainerProfile } from '../types/trainer';
import { getOrCreateChat } from './chat';
import { slotKey } from './slots';

const toSession = (row: any) => fromRow<Session>(row);

export const createBooking = async (
  request: BookingRequest,
  clientId: string,
  clientName: string,
  trainer: TrainerProfile
): Promise<string> => {
  // Chat stays locked until the trainer accepts
  const chatId = await getOrCreateChat({ id: clientId, name: clientName }, { id: trainer.id, name: trainer.name });
  const { data, error } = await sb
    .from('sessions')
    .insert(toRow({
      clientId,
      trainerId: trainer.id,
      clientName,
      trainerName: trainer.name,
      trainerPhoto: trainer.profilePhoto,
      type: request.type,
      scheduledAt: request.scheduledAt,
      durationMins: request.durationMins,
      slotKey: slotKey(request.scheduledAt),
      price: request.price,
      place: request.place,
      placeLabel: request.place ? request.placeLabel : undefined,
      chatId,
    }))
    .select('id')
    .single();
  // The DB's slot lock (unique trainer+hour) rejects the second of two clients tapping the same slot
  if (error?.code === '23505') throw new Error('Sorry, that slot was just booked. Please pick another time.');
  if (error) throw new Error(error.message);
  return data.id;
};

/** Fee the trainer pays to accept this client now (0 for free quota or returning client). */
export const getAcceptFee = async (_trainerId: string, clientId: string, _leadCount: number): Promise<number> =>
  must(await sb.rpc('accept_fee', { p_client: clientId })) as number;

/**
 * Accepts through the accept_booking DB function, which charges the new-client fee,
 * confirms the session and unlocks chat. `payment` is a test payment until Razorpay.
 */
export const trainerAcceptSession = async (sessionId: string, payment?: 'test'): Promise<{ fee: number }> => {
  const { data, error } = await sb.rpc('accept_booking', { p_session: sessionId, p_payment: payment ?? null });
  if (error?.message === 'payment-required') throw new Error(`A ₹${error.details} new-client fee is due to accept this booking.`);
  if (error) throw new Error(error.message);
  return { fee: (data as any).fee };
};

// Cancelling frees the slot automatically (the lock only counts live bookings).
export const trainerRejectSession = async (sessionId: string, reason?: string): Promise<void> => {
  must(await sb.from('sessions').update({ status: 'cancelled', cancel_reason: reason ?? 'Declined by trainer' }).eq('id', sessionId));
};

/** Client withdraws a pending request. */
export const clientCancelSession = async (session: Session): Promise<void> => {
  must(await sb.from('sessions').update({ status: 'cancelled', cancel_reason: 'Cancelled by client' }).eq('id', session.id));
};

/** Completes the session and saves the review in one server transaction (complete_session). */
export const clientCompleteSession = async (sessionId: string, rating?: number, review?: string): Promise<void> => {
  must(await sb.rpc('complete_session', { p_session: sessionId, p_rating: rating || null, p_review: review ?? null }));
};

const sessionsBy = async (col: 'client_id' | 'trainer_id', id: string) =>
  must(await sb.from('sessions').select().eq(col, id).order('scheduled_at', { ascending: false })).map(toSession);

export const getClientSessions = (clientId: string) => sessionsBy('client_id', clientId);
export const getTrainerSessions = (trainerId: string) => sessionsBy('trainer_id', trainerId);

export const subscribeToClientSessions = (clientId: string, callback: (sessions: Session[]) => void) =>
  live([{ table: 'sessions', filter: `client_id=eq.${clientId}` }], async () => callback(await getClientSessions(clientId)));

export const subscribeToTrainerSessions = (trainerId: string, callback: (sessions: Session[]) => void) =>
  live([{ table: 'sessions', filter: `trainer_id=eq.${trainerId}` }], async () => callback(await getTrainerSessions(trainerId)));

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
