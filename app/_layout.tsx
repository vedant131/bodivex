import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { subscribeToAuthState, loadSession } from '../services/auth';
import { StyleSheet } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import '../global.css';
import { T } from '../constants/theme';
import { FeedbackHost } from '../components/ui/Feedback';

// @ts-ignore
if (typeof StyleSheet.setFlag === 'function') {
  // @ts-ignore
  StyleSheet.setFlag('darkMode', 'class');
}

export default function RootLayout() {
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    return subscribeToAuthState(async (firebaseUser) => {
      if (!firebaseUser) {
        setSession({ user: null, clientProfile: null, trainerProfile: null });
        return;
      }
      try {
        const session = await loadSession(firebaseUser.uid);
        // No user doc yet = first sign-in; the OTP screen creates it and sets the session.
        if (session.user) setSession(session);
        else useAuthStore.getState().setLoading(false);
      } catch (e) {
        console.warn('Could not load profile — is the emulator running? (npm run emulators)', e);
        setSession({ user: null, clientProfile: null, trainerProfile: null });
      }
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: T.bg }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: T.bg } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(client)" />
          <Stack.Screen name="(trainer)" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="trainer/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="booking/[trainerId]" options={{ headerShown: false }} />
        </Stack>
        <FeedbackHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
