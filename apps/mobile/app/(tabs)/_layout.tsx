import { Tabs } from 'expo-router'
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: '#0f0f1a', borderTopColor: '#1a1a2e' },
      tabBarActiveTintColor: '#e94560',
      tabBarInactiveTintColor: '#555',
    }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="course" options={{ title: 'Gang' }} />
      <Tabs.Screen name="route" options={{ title: 'Route' }} />
    </Tabs>
  )
}
