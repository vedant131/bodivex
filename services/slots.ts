import { sb, must } from './backend';
import { CONFIG } from '../constants/config';

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar date, YYYY-MM-DD. Note: device timezone; fine while India-only (IST). */
export const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Slot lock key: YYYY-MM-DD-HH (one live booking per trainer per key, enforced by the DB) */
export const slotKey = (d: Date) => `${dateKey(d)}-${pad(d.getHours())}`;

export const nextDays = (count = CONFIG.slots.daysAhead, from = new Date()): Date[] =>
  Array.from({ length: count }, (_, i) => {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    return d;
  });

export const slotsForDay = (day: Date): Date[] => {
  const out: Date[] = [];
  for (let h = CONFIG.slots.firstHour; h <= CONFIG.slots.lastHour; h++) {
    out.push(new Date(day.getFullYear(), day.getMonth(), day.getDate(), h));
  }
  return out;
};

export const isBookable = (slot: Date, now = new Date()) =>
  slot.getTime() - now.getTime() >= CONFIG.slots.minLeadMins * 60_000;

export const slotPeriod = (slot: Date): 'Morning' | 'Afternoon' | 'Evening' =>
  slot.getHours() < 12 ? 'Morning' : slot.getHours() < 17 ? 'Afternoon' : 'Evening';

/** Slot keys already taken for this trainer from today onward. */
export const getBookedSlotKeys = async (trainerId: string): Promise<Set<string>> =>
  new Set(must(await sb.rpc('booked_slot_keys', { p_trainer: trainerId })) as string[]);
