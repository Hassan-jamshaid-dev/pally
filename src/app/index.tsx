import { Redirect, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '@/constants/theme';
import { AppText as Text } from '@/presentation/components/app-text';
import { BigButton } from '@/presentation/components/big-button';
import { Mascot, Screen } from '@/presentation/components/screen';
import { usePally } from '@/presentation/pally-context';

const SIZES = [
  { key: 'standard', label: 'Standard', size: 20 },
  { key: 'large', label: 'Large', size: 26 },
  { key: 'xl', label: 'Extra Large', size: 32 },
] as const;

export default function Welcome() {
  const router = useRouter();
  const { ready, prefs, updatePrefs } = usePally();

  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.cream }} />;
  if (prefs.onboarded) return <Redirect href="/home" />;

  const start = async () => {
    await updatePrefs({ onboarded: true });
    router.replace('/home');
  };

  return (
    <Screen>
      <View style={styles.top}>
        <Mascot size={150} />
        <Text style={styles.title} accessibilityRole="header">Hello! I'm Pally.</Text>
        <Text style={styles.body}>I'm here to help you use your phone, one step at a time.</Text>
      </View>
      <View style={styles.card}>
        {['Ask questions by speaking', 'Get simple, step-by-step instructions', 'Ask the same question as many times as you need'].map((t) => (
          <View key={t} style={styles.row}>
            <Text style={styles.check}>✓</Text>
            <Text style={styles.rowText}>{t}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.label}>Choose your text size:</Text>
      <View style={styles.sizes}>
        {SIZES.map((s) => {
          const on = prefs.textSize === s.key;
          return (
            <Pressable key={s.key} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={s.label + ' text'} onPress={() => updatePrefs({ textSize: s.key })} style={[styles.size, on && styles.sizeOn]}>
              <Text style={[styles.aa, { fontSize: s.size, color: colors.tealDark }]}>Aa</Text>
              <Text style={styles.sizeLabel}>{s.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.small}>No account needed. When you tap the microphone, your phone will ask to use it, only so I can hear you.</Text>
      <BigButton label="Let's Get Started" onPress={start} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { alignItems: 'center', gap: 8 },
  title: { fontSize: 34, fontWeight: '900', color: colors.teal, textAlign: 'center' },
  body: { fontSize: 20, lineHeight: 28, color: colors.text, textAlign: 'center' },
  card: { backgroundColor: colors.card, borderRadius: 24, padding: 16, gap: 10 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  check: { fontSize: 20, color: colors.white, backgroundColor: colors.sageDeep, width: 30, height: 30, borderRadius: 15, textAlign: 'center', fontWeight: '900', overflow: 'hidden' },
  rowText: { flex: 1, fontSize: 18, color: colors.text },
  label: { fontSize: 20, fontWeight: '800', color: colors.tealDark },
  sizes: { flexDirection: 'row', gap: 10 },
  size: { flex: 1, minHeight: 84, backgroundColor: colors.card, borderRadius: 18, borderWidth: 3, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center', padding: 6 },
  sizeOn: { borderColor: colors.teal, backgroundColor: colors.greenSoft },
  aa: { fontWeight: '900' },
  sizeLabel: { fontSize: 14, color: colors.text, fontWeight: '700' },
  small: { fontSize: 16, color: colors.muted, textAlign: 'center' },
});
