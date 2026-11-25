import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
  const { q } = useLocalSearchParams<{ q?: string }>();
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

  const edit = (t: string) => {
    setText(t);
    setVerdict({ kind: 'ok' });
    setError(null);
  };

  const shown = speech.listening && speech.transcript ? speech.transcript : text;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.label} accessibilityRole="header">What would you like help with?</Text>
        <TextInput
          value={shown}
          onChangeText={edit}
          editable={!loading}
          placeholder="For example: make my text bigger"
          placeholderTextColor="#5E7573"
          multiline
          maxLength={600}
          accessibilityLabel="Type your question. You can fix the words if I heard them wrong."
          style={styles.input}
        />

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
            <ActivityIndicator size="large" color={colors.teal} />
            <Text style={styles.loadingText}>Pally is thinking about the best first step…</Text>
          </View>
        )}

        <Text style={styles.privacy}>When you ask, your question and your phone model are sent securely to Pally's helper service. Nothing else leaves your phone.</Text>
      </ScrollView>

      <View style={styles.actions}>
        <BigButton label={error ? 'Try again' : 'Ask Pally'} variant="warm" disabled={!text.trim() || loading} onPress={submit} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  body: { padding: 24, gap: 14 },
  label: { fontSize: 24, fontWeight: '800', color: colors.teal },
  input: { minHeight: 130, borderWidth: 3, borderColor: colors.teal, borderRadius: 20, backgroundColor: colors.white, padding: 16, fontSize: 24, color: colors.text, textAlignVertical: 'top' },
  micRow: { alignItems: 'center' },
  noticeText: { fontSize: 20, lineHeight: 29, color: colors.text },
  loading: { alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 22, color: colors.teal, fontWeight: '700', textAlign: 'center' },
  privacy: { fontSize: 17, color: '#3C5654', lineHeight: 24 },
  actions: { padding: 24, paddingTop: 8 },
});
