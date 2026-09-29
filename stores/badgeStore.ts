import { create } from 'zustand';

/** Counts shown on the tab bar (kept fresh by hooks/useSessionAlerts). */
export const useBadges = create<{ chatsUnread: number; pendingRequests: number }>(() => ({
  chatsUnread: 0,
  pendingRequests: 0,
}));
