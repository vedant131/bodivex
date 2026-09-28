import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { subscribeToAuthState, loadSession } from '../services/auth';
import { StyleSheet } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import '../global.css';

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
        setSession(await loadSession(firebaseUser.uid));
      } catch (e) {
        console.warn('Could not load profile — is the emulator running? (npm run emulators)', e);
        setSession({ user: null, clientProfile: null, trainerProfile: null });
      }
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(client)" />
          <Stack.Screen name="(trainer)" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="trainer/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="booking/[trainerId]" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
