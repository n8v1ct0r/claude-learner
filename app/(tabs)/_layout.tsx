import { Tabs } from 'expo-router';

import { TabIcon } from '@/components/TabIcon';
import { colors } from '@/design/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.clay400,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: 'Nunito_800ExtraBold',
          fontSize: 11,
          marginTop: 3,
        },
        tabBarItemStyle: { paddingVertical: 7 },
        tabBarStyle: {
          height: 76,
          paddingBottom: 7,
          backgroundColor: colors.bgElevated,
          borderTopColor: colors.border,
          borderTopWidth: 2,
          shadowColor: '#000000',
          shadowOpacity: 0.3,
          shadowRadius: 10,
        },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Learn', tabBarIcon: ({ color }) => <TabIcon name="map.fill" material="map" color={color} /> }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          title: 'Practice',
          tabBarIcon: ({ color }) => <TabIcon name="brain.head.profile" material="psychology" color={color} />,
        }}
      />
      <Tabs.Screen
        name="exams"
        options={{
          title: 'Exams',
          tabBarIcon: ({ color }) => <TabIcon name="checkmark.seal.fill" material="verified" color={color} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Readiness',
          tabBarIcon: ({ color }) => <TabIcon name="chart.bar.fill" material="bar_chart" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabIcon name="person.crop.circle.fill" material="account_circle" color={color} />,
        }}
      />
    </Tabs>
  );
}
