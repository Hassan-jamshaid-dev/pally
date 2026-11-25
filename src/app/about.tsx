import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { colors } from '@/constants/theme';
import { AppText as Text } from '@/presentation/components/app-text';
import { BigButton } from '@/presentation/components/big-button';
import { Mascot, Screen } from '@/presentation/components/screen';
import { useTheme } from '@/presentation/use-theme';

const POINTS = [
  'Pally gives simple, step-by-step help for your phone.',
  'Pally never asks for your passwords, PINs, or codes.',
  'Pally cannot see your screen or tap anything for you.',
  'Your past help is saved only on this phone. No account needed.',
];

export default function About() {
  const router = useRouter();
  const { c } = useTheme();
  return (
    <Screen title="About Pally" back>
      <View style={styles.hero}>
        <Mascot size={160} />
        <Text style={[styles.h, { color: c.tealDark }]} accessibilityRole="header">Hi, I'm Pally!</Text>
        <Text style={styles.sub}>Your patient, friendly phone helper.</Text>
      </View>
      <View style={[styles.card, { backgroundColor: c.card }]}>
        {POINTS.map((p) => (
          <View key={p} style={styles.row}>
            <Text style={[styles.dot, { backgroundColor: c.sageDeep }]}>✓</Text>
            <Text style={styles.text}>{p}</Text>
          </View>
        ))}
      </View>
      <BigButton label="Privacy & settings" variant="secondary" onPress={() => router.push('/settings')} />
      <Text style={[styles.foot, { color: c.teal }]}>♥ You're never alone with Pally.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 6 },
  h: { fontSize: 32, fontWeight: '900' },
  sub: { fontSize: 20, color: colors.text, textAlign: 'center' },
  card: { borderRadius: 28, padding: 18, gap: 14, elevation: 3, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 6 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  dot: { color: '#FFFFFF', width: 30, height: 30, borderRadius: 15, textAlign: 'center', fontWeight: '900', overflow: 'hidden', fontSize: 18 },
  text: { flex: 1, fontSize: 19, lineHeight: 27, color: colors.text },
  foot: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 60 },
});
