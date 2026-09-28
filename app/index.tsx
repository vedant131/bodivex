import React from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../stores/authStore';

export default function EntryIndex() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Redirect href="/(auth)" />;
  }

  if (user.role === 'trainer') {
    return <Redirect href="/(trainer)/dashboard" />;
  }

  return <Redirect href="/(client)/home" />;
}
