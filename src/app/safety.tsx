import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { colors } from '@/constants/theme';
import { AppText as Text } from '@/presentation/components/app-text';
import { BigButton } from '@/presentation/components/big-button';
import { Notice } from '@/presentation/components/notice';
import { Screen } from '@/presentation/components/screen';
import { useTheme } from '@/presentation/use-theme';
import { checkSuspicious, type ScamResult } from '@/safety/scam-check';

export default function Safety() {
  const router = useRouter();
  const { c } = useTheme();
  const [mode, setMode] = useState<'message' | 'situation'>('message');
  const [text, setText] = useState('');
  const [result, setResult] = useState<ScamResult | null>(null);

  const tone = result?.level === 'likely_scam' ? 'danger' : result?.level === 'careful' ? 'warn' : 'good';

  return (
    <Screen title="Check Something Suspicious" back tabs="safety">
      <View style={styles.hero}>
        <Text style={{ fontSize: 56, color: c.teal }}>⛨</Text>
        <Text style={[styles.h, { color: c.tealDark }]} accessibilityRole="header">Does something seem unusual?</Text>
        <Text style={styles.sub}>Show Pally a message or tell us what happened. We'll help you understand whether it could be a scam.</Text>
      </View>
      <View style={styles.row}>
        {([['message', 'Paste a Message'], ['situation', 'Describe a Situation']] as const).map(([k, l]) => (
          <BigButton key={k} label={l} variant={mode === k ? 'primary' : 'secondary'} style={{ flex: 1, paddingHorizontal: 8 }} onPress={() => { setMode(k); setResult(null); }} />
        ))}
      </View>
      <TextInput
        value={text}
        onChangeText={(t) => { setText(t); setResult(null); }}
        multiline
        maxLength={2000}
        placeholder={mode === 'message' ? 'Paste the message here' : 'Tell me what happened'}
        placeholderTextColor={colors.muted}
        accessibilityLabel={mode === 'message' ? 'Paste the suspicious message' : 'Describe the situation'}
        style={[styles.input, { backgroundColor: c.card, color: c.text }]}
      />
      <BigButton label="Check This" variant="warm" disabled={!text.trim()} onPress={() => setResult(checkSuspicious(text))} />
      {result && (
        <Notice title={result.title} tone={tone}>
          {result.reasons.map((r) => <Text key={r} style={styles.line}>• {r}</Text>)}
          <Text style={[styles.line, { fontWeight: '800' }]}>{result.advice}</Text>
          <BigButton label="Ask someone I trust" variant="secondary" onPress={() => router.push('/trusted')} />
        </Notice>
      )}
      <Text style={[styles.tip, { backgroundColor: c.greenSoft }]}>ⓘ When in doubt, don't share personal information or make payments.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 6 },
  h: { fontSize: 28, fontWeight: '900', textAlign: 'center' },
  sub: { fontSize: 18, lineHeight: 26, color: colors.muted, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 10 },
  input: { minHeight: 130, borderRadius: 22, padding: 16, fontSize: 20, textAlignVertical: 'top', borderWidth: 2, borderColor: colors.sage },
  line: { fontSize: 18, lineHeight: 26, color: colors.text },
  tip: { fontSize: 16, lineHeight: 23, color: colors.text, borderRadius: 18, padding: 14, overflow: 'hidden', marginBottom: 30 },
});
