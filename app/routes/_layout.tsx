import { Stack } from 'expo-router';

export default function RoutesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0A0E1A' },
        animation: 'slide_from_right',
      }}
    />
  );
}