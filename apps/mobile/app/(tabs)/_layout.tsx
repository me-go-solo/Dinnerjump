import { Tabs } from 'expo-router'
import { Home, UtensilsCrossed, Navigation, Camera } from 'lucide-react-native'
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: '#0f0f1a', borderTopColor: '#1a1a2e' },
      tabBarActiveTintColor: '#e94560',
      tabBarInactiveTintColor: '#555',
    }}>
      <Tabs.Screen name="index" options={{
        title: 'Home',
        tabBarIcon: ({ color, size }) => <Home size={size} color={color} />
      }} />
      <Tabs.Screen name="course" options={{
        title: 'Gang',
        tabBarIcon: ({ color, size }) => <UtensilsCrossed size={size} color={color} />
      }} />
      <Tabs.Screen name="route" options={{
        title: 'Route',
        tabBarIcon: ({ color, size }) => <Navigation size={size} color={color} />
      }} />
      <Tabs.Screen name="photo" options={{
        title: 'Foto',
        tabBarIcon: ({ color, size }) => <Camera size={size} color={color} />
      }} />
    </Tabs>
  )
}
