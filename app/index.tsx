import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { homeRouteFor } from '../services/routing';
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
  return <Redirect href={homeRouteFor({ user, clientProfile, trainerProfile })} />;
}
