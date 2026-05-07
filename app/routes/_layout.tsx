import { Stack } from 'expo-router';
import { COLORS } from '@/constants/theme';

export default function RoutesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.bg.primary },
        animation: 'slide_from_right',
      }}
    />
  );
}