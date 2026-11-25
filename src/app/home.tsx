import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { colors } from '@/constants/theme';
import { AppText as Text } from '@/presentation/components/app-text';
import { BigButton } from '@/presentation/components/big-button';
import { ChatBar } from '@/presentation/components/chat-bar';
import { Notice } from '@/presentation/components/notice';
import { HeaderButton, Mascot, Screen } from '@/presentation/components/screen';
import { usePally } from '@/presentation/pally-context';
import { useTheme } from '@/presentation/use-theme';
import { useSpeechInput } from '@/voice/useSpeechInput';

/** Suggested questions go straight into the normal ask → safety check → guidance flow. */
const SUGGESTIONS = [
  { glyph: '📷', question: 'How do I send a photo?' },
  { glyph: 'Aa', question: 'How do I make text bigger?' },
  { glyph: '📶', question: 'How do I connect to Wi-Fi?' },
] as const;

export default function Home() {
  const router = useRouter();
  const { c } = useTheme();
  const { resumable, resume, discardResumable, ready } = usePally();
  const [text, setText] = useState('');
  const ask = (q: string) => router.push({ pathname: '/ask', params: { q, auto: '1' } });
  const speech = useSpeechInput((heard) => ask(heard));
  const send = () => text.trim() && ask(text.trim());

  const footer = (
    <ChatBar
      value={speech.listening && speech.transcript ? speech.transcript : text}
      onChangeText={setText}
      onSubmit={send}
      placeholder="Type or speak to Pally..."
      accessibilityLabel="Type your question for Pally"
      micState={speech.listening ? 'listening' : 'idle'}
      onMic={speech.toggle}
    />
  );

  return (
    <Screen brand right={<HeaderButton glyph="⚙" label="Settings" onPress={() => router.push('/settings')} />} tabs="home" footer={footer}>
      <View style={styles.hero}>
        <Text style={[styles.hello, { color: c.tealDark }]} accessibilityRole="header">Hello!{'\n'}How can I help?</Text>
        <Text style={styles.sub}>Ask me anything about using your phone.</Text>
        <Mascot size={190} />
      </View>

      {speech.notice && (
        <Notice title="Voice isn't working yet" tone="warn">
          <Text style={styles.noticeText}>{speech.notice}</Text>
          {speech.permission === 'blocked' || speech.permission === 'denied' ? (
            <BigButton label="Open phone settings" variant="secondary" onPress={() => Linking.openSettings()} />
          ) : null}
        </Notice>
      )}

      {ready && resumable && (
        <Notice title="You have a task in progress" tone="good">
          <Text style={styles.noticeText}>{resumable.state.task.title}</Text>
          <BigButton label="Continue where I left off" onPress={() => { resume(); router.push('/guide'); }} />
          <BigButton label="Not now, start fresh" variant="secondary" onPress={discardResumable} />
        </Notice>
      )}

      <View style={[styles.card, { backgroundColor: c.card }]}>
        <Text style={[styles.cardTitle, { color: c.tealDark }]} accessibilityRole="header">✦ Suggested Questions</Text>
        {SUGGESTIONS.map((s) => (
          <Row key={s.question} glyph={s.glyph} label={s.question} onPress={() => ask(s.question)} />
        ))}
        <Row glyph="⛨" label="Is this message a scam?" onPress={() => router.push('/safety')} />
      </View>
    </Screen>
  );
}

function Row({ glyph, label, onPress }: { glyph: string; label: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.row, { borderTopColor: c.greenSoft }, pressed && { opacity: 0.7 }]}>
      <Text style={[styles.glyph, { color: c.teal }]}>{glyph}</Text>
      <Text style={[styles.rowText, { color: c.text }]}>{label}</Text>
      <Text style={[styles.chev, { color: c.teal }]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 6 },
  hello: { fontSize: 36, fontWeight: '900', textAlign: 'center', lineHeight: 42 },
  sub: { fontSize: 19, lineHeight: 26, color: colors.text, textAlign: 'center' },
  noticeText: { fontSize: 19, lineHeight: 28, color: colors.text },
  card: { borderRadius: 28, padding: 8, elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8 },
  cardTitle: { fontSize: 18, fontWeight: '800', paddingHorizontal: 14, paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64, paddingHorizontal: 14, borderTopWidth: 1 },
  glyph: { fontSize: 22, width: 34, textAlign: 'center', fontWeight: '800' },
  rowText: { flex: 1, fontSize: 19, fontWeight: '600' },
  chev: { fontSize: 30, fontWeight: '600' },
});
