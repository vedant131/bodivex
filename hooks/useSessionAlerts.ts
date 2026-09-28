import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { subscribeToClientSessions, subscribeToTrainerSessions } from '../services/bookings';
import { subscribeToOwnTrainerProfile } from '../services/trainers';
import { useAuthStore } from '../stores/authStore';
import { Session } from '../types/session';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const notify = (title: string, body: string) => {
  if (Platform.OS === 'web') return;
  Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null }).catch(() => {});
};

const when = (s: Session) =>
  s.scheduledAt.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/**
 * Local notifications for booking changes while the app is open or backgrounded.
 * Note: remote push (app killed) needs Expo push tokens + a Cloud Function sender; add at launch.
 */
export function useSessionAlerts(role: 'client' | 'trainer') {
  const user = useAuthStore((s) => s.user);
  const setTrainerProfile = useAuthStore((s) => s.setTrainerProfile);
  const seen = useRef<Map<string, Session['status']> | null>(null);

  useEffect(() => {
    if (!user) return;
    if (Platform.OS !== 'web') Notifications.requestPermissionsAsync().catch(() => {});
    seen.current = null;

    const onSessions = (list: Session[]) => {
      const prev = seen.current;
      seen.current = new Map(list.map((s) => [s.id, s.status]));
      if (!prev) return; // first snapshot: nothing is "new"

      for (const s of list) {
        const before = prev.get(s.id);
        if (role === 'client' && before === 'pending' && s.status === 'confirmed') {
          notify('Session confirmed ✅', `${s.trainerName} confirmed ${when(s)}. Chat is now open.`);
        }
        if (role === 'client' && before === 'pending' && s.status === 'cancelled') {
          notify('Request declined', `${s.trainerName} can't make ${when(s)}. Try another slot or coach.`);
        }
        if (role === 'trainer' && !before && s.status === 'pending') {
          notify('New booking request', `${s.clientName} wants ${when(s)}.`);
        }
      }
    };

    const unsubs = [
      role === 'client'
        ? subscribeToClientSessions(user.id, onSessions)
        : subscribeToTrainerSessions(user.id, onSessions),
    ];
    // Keep fee counters / approval fresh on the trainer side
    if (role === 'trainer') unsubs.push(subscribeToOwnTrainerProfile(user.id, (p) => p && setTrainerProfile(p)));
    return () => unsubs.forEach((u) => u());
  }, [user?.id, role]);
}
