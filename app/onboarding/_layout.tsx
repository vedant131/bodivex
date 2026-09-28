import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="client/step1" />
      <Stack.Screen name="client/step2" />
      <Stack.Screen name="client/step3" />
      <Stack.Screen name="client/blueprint" />
      <Stack.Screen name="trainer/step1" />
      <Stack.Screen name="trainer/step2" />
      <Stack.Screen name="trainer/step3" />
      <Stack.Screen name="trainer/step4" />
      <Stack.Screen name="trainer/pending" />
    </Stack>
  );
}
