import { Tabs } from 'expo-router';
import { View } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#0a0a0a' },
        headerTintColor: '#ffffff',
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: '#1a1a1a', borderTopColor: '#3a3a3a' },
        tabBarActiveTintColor: '#8B5CF6',
        tabBarInactiveTintColor: '#888888',
        sceneStyle: { backgroundColor: '#0a0a0a' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color }) => (
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: color === '#8B5CF6' ? '#8B5CF6' : '#888' }} />
          ),
        }}
      />
      <Tabs.Screen
        name="models"
        options={{
          title: 'Models',
          tabBarIcon: ({ color }) => (
            <View style={{ width: 24, height: 24, borderRadius: 4, backgroundColor: color === '#8B5CF6' ? '#8B5CF6' : '#888' }} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => (
            <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: color === '#8B5CF6' ? '#8B5CF6' : '#888' }} />
          ),
        }}
      />
    </Tabs>
  );
}