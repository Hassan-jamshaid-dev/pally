import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText as Text } from '@/presentation/components/app-text';
import { HeaderButton, Mascot, Screen } from '@/presentation/components/screen';
import { useTheme } from '@/presentation/use-theme';
import { friendlyAiError } from '@/ai/client';
import { colors } from '@/constants/theme';
import { BigButton } from '@/presentation/components/big-button';
import { MicButton } from '@/presentation/components/mic-button';
import { Notice } from '@/presentation/components/notice';
import { usePally } from '@/presentation/pally-context';
import { checkRequest, type RequestVerdict } from '@/safety/rules';
import { useSpeechInput } from '@/voice/useSpeechInput';

export default function Ask() {
  const router = useRouter();
  const { c } = useTheme();
  const { q, auto } = useLocalSearchParams<{ q?: string; auto?: string }>();
  const { startTask } = usePally();
  const [text, setText] = useState(typeof q === 'string' ? q : '');
  const [verdict, setVerdict] = useState<RequestVerdict>({ kind: 'ok' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const speech = useSpeechInput((heard) => setText(heard));

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      await startTask(text.trim());
      router.replace('/guide');
    } catch (e) {
      setError(friendlyAiError(e));
      setLoading(false);
    }
  };

  const submit = () => {
    const v = checkRequest(text);
    setVerdict(v);
    if (v.kind === 'ok') run();
  };

  // Suggested questions / home bar arrive with auto=1: run the same safety check + AI flow immediately.
    const autoRan = useRef(false);
    useEffect(() => {
      if (autoRan.current || auto !== '1' || typeof q !== 'string' || !q.trim()) return;
      autoRan.current = true;
      const v = checkRequest(q);
      setVerdict(v);
      if (v.kind === 'ok') run();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
  
    const edit = (t: string) => {
    setText(t);
    setVerdict({ kind: 'ok' });
    setError(null);
  };

  const shown = speech.listening && speech.transcript ? speech.transcript : text;

  return (
    <Screen brand back right={<HeaderButton glyph="⋮" label="Menu" onPress={() => router.push('/menu')} />}>
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Mascot size={150} />
        <Text style={[styles.label, { color: c.tealDark }]} accessibilityRole="header">What would you like help with?</Text>
      </View>
      <View style={styles.inputRow}>
        <TextInput
          value={shown}
          onChangeText={edit}
          editable={!loading}
          placeholder="For example: make my text bigger"
          placeholderTextColor={colors.muted}
          multiline
          maxLength={600}
          accessibilityLabel="Type your question. You can fix the words if I heard them wrong."
          style={[styles.input, { backgroundColor: c.card, color: c.text }]}
        />
        <Pressable accessibilityRole="button" accessibilityLabel={error ? 'Try again' : 'Ask Pally'} disabled={!text.trim() || loading} onPress={submit} style={[styles.go, { backgroundColor: c.teal }, (!text.trim() || loading) && { opacity: 0.4 }]}>
          <Text style={{ fontSize: 28, color: '#FFFFFF', fontWeight: '900' }}>→</Text>
        </Pressable>
      </View>

      <View style={styles.micRow}>
        <MicButton compact state={loading ? 'thinking' : speech.listening ? 'listening' : 'idle'} onPress={speech.toggle} />
      </View>

      {speech.notice && <Notice title="Voice is off" tone="warn">{speech.notice}</Notice>}
      {error && <Notice title="Pally can't answer yet" tone="warn">{error}</Notice>}

      {verdict.kind !== 'ok' && (
        <Notice title={verdict.title} tone={verdict.kind === 'block' ? 'danger' : 'warn'}>
          <Text style={styles.noticeText}>{verdict.message}</Text>
          {verdict.kind === 'warn' && (
            <>
              <BigButton label="I understand, keep going" variant="secondary" onPress={run} />
              <BigButton label="Stop" variant="danger" onPress={() => router.back()} />
            </>
          )}
          {verdict.kind === 'block' && <BigButton label="OK, I will stop" variant="danger" onPress={() => router.back()} />}
        </Notice>
      )}

      {loading && (
        <View style={styles.loading} accessibilityLiveRegion="polite">
          <ActivityIndicator size="large" color={c.teal} />
          <Text style={[styles.loadingText, { color: c.teal }]}>Pally is thinking about the best first step…</Text>
        </View>
      )}

      <View style={[styles.privacy, { backgroundColor: c.peachSoft }]}>
        <Text style={styles.privacyText}>💡 When you ask, your question and your phone model are sent securely to Pally's helper service. Nothing else leaves your phone. ♡</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 28, fontWeight: '900', textAlign: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, minHeight: 72, maxHeight: 160, borderWidth: 2, borderColor: colors.sage, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 14, fontSize: 21, textAlignVertical: 'center' },
  go: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  micRow: { alignItems: 'center' },
  noticeText: { fontSize: 19, lineHeight: 28, color: colors.text },
  loading: { alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 21, fontWeight: '700', textAlign: 'center' },
  privacy: { borderRadius: 20, padding: 14, marginBottom: 30 },
  privacyText: { fontSize: 16, color: colors.text, lineHeight: 23 },
});

