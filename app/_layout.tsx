import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator } from 'react-native';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';
import { getDatabase } from '@/database/db';
import { ToastProvider } from '@/components/ui/Toast';
import { COLORS } from '@/constants/theme';

const CustomTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: COLORS.bg.primary,
    card: COLORS.bg.card,
    text: COLORS.text.primary,
    border: COLORS.border.default,
  },
};

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    getDatabase()
      .then(() => setIsReady(true))
      .catch(console.error);
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg.primary, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.accent.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider value={CustomTheme}>
        <ToastProvider>
          <StatusBar style="light" backgroundColor="#0A0E1A" />
          <View style={{ flex: 1, backgroundColor: COLORS.bg.primary }}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: COLORS.bg.primary },
                animation: 'slide_from_right',
              }}
            />
          </View>
        </ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}