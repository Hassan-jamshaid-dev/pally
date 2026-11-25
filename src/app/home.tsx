import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { colors } from '@/constants/theme';
import { AppText as Text } from '@/presentation/components/app-text';
import { BigButton } from '@/presentation/components/big-button';
import { MicButton } from '@/presentation/components/mic-button';
import { Notice } from '@/presentation/components/notice';
import { Mascot, Screen, mascot } from '@/presentation/components/screen';
import { usePally } from '@/presentation/pally-context';
import { useTheme } from '@/presentation/use-theme';
import { useSpeechInput } from '@/voice/useSpeechInput';

export default function Home() {
  const router = useRouter();
  const { c } = useTheme();
  const { resumable, resume, discardResumable, history, ready } = usePally();
  const speech = useSpeechInput((text) => router.push({ pathname: '/ask', params: { q: text } }));
  const recent = history[0];

  const cards = [
    { label: 'Past Help', glyph: '↺', go: () => router.push('/history') },
    { label: 'Settings', glyph: '⚙', go: () => router.push('/settings') },
    { label: 'Type Instead', glyph: '⌨', go: () => router.push('/ask') },
  ];

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.brand}>
          <Image source={mascot} style={styles.logo} contentFit="contain" accessibilityLabel="Pally" />
          <Text style={[styles.brandName, { color: c.teal }]}>Pally</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push('/settings')} style={[styles.gear, { backgroundColor: c.card }]}>
          <Text style={{ fontSize: 24, color: c.teal }}>⚙</Text>
        </Pressable>
      </View>

      <Text style={[styles.prompt, { color: c.tealDark }]} accessibilityRole="header">What do you need help with?</Text>

      <View style={styles.micZone}>
        <MicButton state={speech.listening ? 'listening' : 'idle'} onPress={speech.toggle} />
        {speech.listening && speech.transcript ? <Text style={styles.heard} accessibilityLiveRegion="polite">“{speech.transcript}”</Text> : null}
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
      {recent && !resumable && <Text style={styles.recent}>Last time: {recent.title}</Text>}

      <View style={styles.cards}>
        {cards.map((k) => (
          <Pressable key={k.label} accessibilityRole="button" accessibilityLabel={k.label} onPress={k.go} style={({ pressed }) => [styles.card, { backgroundColor: c.card }, pressed && { opacity: 0.8 }]}>
            <Text style={{ fontSize: 28, color: c.teal }}>{k.glyph}</Text>
            <Text style={[styles.cardLabel, { color: c.tealDark }]}>{k.label}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Check something suspicious" onPress={() => router.push('/safety')} style={[styles.safety, { backgroundColor: c.card }]}>
        <Text style={{ fontSize: 22, color: c.teal }}>⛨</Text>
        <Text style={[styles.cardLabel, { color: c.tealDark }]}>Check something suspicious</Text>
      </Pressable>
      <Text style={[styles.footer, { color: c.teal }]}>♡ Always here to help</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 52, height: 52, borderRadius: 12 },
  brandName: { fontSize: 30, fontWeight: '900' },
  gear: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  prompt: { fontSize: 32, fontWeight: '900', textAlign: 'center', lineHeight: 40 },
  micZone: { alignItems: 'center', minHeight: 290, justifyContent: 'center' },
  heard: { fontSize: 22, fontStyle: 'italic', color: colors.text, textAlign: 'center' },
  noticeText: { fontSize: 19, lineHeight: 28, color: colors.text },
  recent: { fontSize: 18, color: colors.muted, textAlign: 'center' },
  cards: { flexDirection: 'row', gap: 10 },
  card: { flex: 1, minHeight: 92, borderRadius: 22, alignItems: 'center', justifyContent: 'center', gap: 4, padding: 6, elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6 },
  cardLabel: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  safety: { minHeight: 64, borderRadius: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, elevation: 2 },
  footer: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginTop: 4, marginBottom: 40 },
});
