import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getDatabase } from '@/database/db';

export default function RootLayout() {
  useEffect(() => {
    getDatabase().catch(console.error);
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#0A0E1A" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0A0E1A' },
          animation: 'fade_from_bottom',
        }}
      />
    </SafeAreaProvider>
  );
}