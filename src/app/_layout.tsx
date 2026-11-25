import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/constants/theme';
import { PallyProvider } from '@/presentation/pally-context';

export default function RootLayout() {
  return (
    <PallyProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.cream },
          headerTintColor: colors.teal,
          headerTitleStyle: { fontSize: 24, fontWeight: '800' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.cream },
        }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="home" options={{ headerShown: false }} />
        <Stack.Screen name="ask" options={{ title: 'Ask Pally' }} />
        <Stack.Screen name="guide" options={{ title: 'Pally', headerBackVisible: false, gestureEnabled: false }} />
        <Stack.Screen name="history" options={{ title: 'Past help' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
    </PallyProvider>
  );
}
