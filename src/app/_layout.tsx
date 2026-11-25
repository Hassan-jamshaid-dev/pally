import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/constants/theme';
import { PallyProvider } from '@/presentation/pally-context';

export default function RootLayout() {
  return (
    <PallyProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream }, animation: 'fade' }}>
        <Stack.Screen name="guide" options={{ gestureEnabled: false }} />
      </Stack>
    </PallyProvider>
  );
}
