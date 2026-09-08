import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/theme';

/**
 * Bottom tabs. Screens join one per MVP piece (Discover now; Requests, Chat,
 * Profile later) — never placeholder tabs.
 */
export default function TabsLayout(): React.JSX.Element {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: COLORS.ink, borderTopColor: COLORS.border },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.muted,
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Découverte',
          tabBarIcon: ({ color, size }) => <Ionicons name="compass" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Demandes',
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
