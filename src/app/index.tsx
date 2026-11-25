import { Image } from 'expo-image';
import { Redirect, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, type } from '@/constants/theme';
import { BigButton } from '@/presentation/components/big-button';
import { usePally } from '@/presentation/pally-context';

export default function Welcome() {
  const router = useRouter();
  const { ready, prefs, updatePrefs } = usePally();

  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.cream }} />;
  // Welcome is only shown on first launch.
  if (prefs.onboarded) return <Redirect href="/home" />;

  const start = async () => {
    await updatePrefs({ onboarded: true });
    router.replace('/home');
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.top}>
        <Image source={require('../../assets/images/pally-logo.png')} style={styles.logo} contentFit="contain" accessibilityLabel="Pally logo" />
        <Text style={styles.title} accessibilityRole="header">Hi, I'm Pally.</Text>
        <Text style={styles.body}>I help you with your phone. Just ask me out loud, or type if you prefer. I go one small step at a time.</Text>
        <Text style={styles.body}>When you tap the microphone, your phone will ask to use it. That is only so I can hear you.</Text>
        <Text style={styles.small}>No account needed.</Text>
      </View>
      <BigButton label="Get started" onPress={start} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream, padding: 24, justifyContent: 'space-between' },
  top: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  logo: { width: 260, height: 170 },
  title: { fontSize: type.hero, fontWeight: '900', color: colors.teal, textAlign: 'center' },
  body: { fontSize: type.body, lineHeight: 32, color: colors.text, textAlign: 'center' },
  small: { fontSize: 20, fontWeight: '700', color: colors.coralDark },
});
