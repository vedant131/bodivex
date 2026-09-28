import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { getUserProfile } from '../services/auth';
import { StyleSheet } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import '../global.css';

// @ts-ignore
if (typeof StyleSheet.setFlag === 'function') {
  // @ts-ignore
  StyleSheet.setFlag('darkMode', 'class');
}

export default function RootLayout() {
  const { setUser, setLoading, isAuthenticated, isOnboardingComplete, user } = useAuthStore();

  useEffect(() => {
    if (!auth || typeof (auth as any).onAuthStateChanged !== 'function') {
      setLoading(false);
      return;
    }
    try {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          try {
            const profile = await getUserProfile(firebaseUser.uid);
            if (profile) {
              setUser(profile);
            } else {
              setLoading(false);
            }
          } catch {
            setLoading(false);
          }
        } else {
          setUser(null);
        }
      });
      return () => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    } catch {
      setLoading(false);
    }
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
