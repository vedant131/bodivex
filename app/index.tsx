import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { COLORS } from '../constants/colors';

export default function EntryIndex() {
  const { isLoading, user, clientProfile, trainerProfile } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (!user) return <Redirect href="/(auth)" />;

  if (user.role === 'trainer') {
    if (!trainerProfile) return <Redirect href="/onboarding/trainer/step1" />;
    return <Redirect href="/(trainer)/dashboard" />;
  }

  if (!clientProfile) return <Redirect href="/onboarding/client/step1" />;
  return <Redirect href="/(client)/home" />;
}
