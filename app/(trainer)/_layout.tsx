import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { useSessionAlerts } from '../../hooks/useSessionAlerts';
import { GlassTabBar } from '../../components/ui/GlassTabBar';
import { T } from '../../constants/theme';

export default function TrainerLayout() {
  const role = useAuthStore((s) => s.user?.role);
  useSessionAlerts('trainer');
  if (role && role !== 'trainer') return <Redirect href="/(client)/home" />;

  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: T.bg } }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Today',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'flash' : 'flash-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: 'Clients',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
