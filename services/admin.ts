import { sb, fromRow, must } from './backend';
import { TrainerProfile } from '../types/trainer';

export type ReviewStatus = 'pending' | 'rejected' | 'approved';
export type CoachForReview = TrainerProfile & { phone: string };

/** True if the signed-in account is on the server-side admins list. */
export const isAdmin = async (): Promise<boolean> => !!must(await sb.rpc('is_admin'));

/** Coaches by review status, newest first, with their account phone number (admins only). */
export const getCoachesForReview = async (status: ReviewStatus): Promise<CoachForReview[]> =>
  (must(await sb.rpc('admin_list_trainers', { p_status: status })) as any[])
    .map((r) => ({ ...fromRow<TrainerProfile>(r.trainer), phone: r.phone }));

/** Approve, or reject with a reason the coach will see (admins only; enforced on the server). */
export const reviewCoach = async (trainerId: string, approve: boolean, note?: string): Promise<void> => {
  must(await sb.rpc('admin_review_trainer', { p_trainer: trainerId, p_approve: approve, p_note: note ?? null }));
};
