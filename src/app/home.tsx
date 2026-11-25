import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { BigButton } from '@/presentation/components/big-button';
import { MicButton } from '@/presentation/components/mic-button';
import { Notice } from '@/presentation/components/notice';
import { usePally } from '@/presentation/pally-context';
import { useSpeechInput } from '@/voice/useSpeechInput';

export default function Home() {
  const router = useRouter();
  const { resumable, resume, discardResumable, history, ready } = usePally();
  const speech = useSpeechInput((text) => router.push({ pathname: '/ask', params: { q: text } }));

  const openAsk = () => router.push('/ask');
  const recent = history.slice(0, 1)[0];

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Image source={require('../../assets/images/pally-logo.png')} style={styles.logo} contentFit="contain" accessibilityLabel="Pally" />
          <Text style={styles.prompt} accessibilityRole="header">What do you need help with?</Text>
        </View>

        {/* Fixed mic zone: same place on every visit. */}
        <View style={styles.micZone}>
          <MicButton state={speech.listening ? 'listening' : 'idle'} onPress={speech.toggle} />
          {speech.listening && speech.transcript ? <Text style={styles.heard} accessibilityLiveRegion="polite">“{speech.transcript}”</Text> : null}
        </View>

        <View style={styles.footer}>
          {speech.notice && (
            <Notice title="Voice isn't working yet" tone="warn">
              <Text style={styles.noticeText}>{speech.notice}</Text>
              {speech.permission === 'blocked' || speech.permission === 'denied' ? (
                <BigButton label="Open phone settings" variant="secondary" onPress={() => Linking.openSettings()} />
              ) : null}
            </Notice>
          )}
          <BigButton label="Type instead" variant="secondary" onPress={openAsk} />

          {ready && resumable && (
            <Notice title="You have a task in progress" tone="good">
              <Text style={styles.noticeText}>{resumable.state.task.title}</Text>
              <BigButton
                label="Continue where I left off"
                onPress={() => {
                  resume();
                  router.push('/guide');
                }}
              />
              <BigButton label="Not now, start fresh" variant="secondary" onPress={discardResumable} />
            </Notice>
          )}

          {recent && !resumable && (
            <Text style={styles.recent}>Last time: {recent.title}</Text>
          )}

          <View style={styles.row}>
            <BigButton label="Past help" variant="secondary" style={styles.half} onPress={() => router.push('/history')} />
            <BigButton label="Settings" variant="secondary" style={styles.half} onPress={() => router.push('/settings')} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  scroll: { padding: 24, gap: 16, flexGrow: 1 },
  header: { alignItems: 'center', gap: 8 },
  logo: { width: 160, height: 100 },
  prompt: { fontSize: 30, fontWeight: '900', color: colors.teal, textAlign: 'center' },
  micZone: { minHeight: 330, alignItems: 'center', justifyContent: 'flex-start', gap: 8 },
  heard: { fontSize: 22, fontStyle: 'italic', color: colors.text, textAlign: 'center' },
  footer: { gap: 14 },
  noticeText: { fontSize: 20, lineHeight: 29, color: colors.text },
  recent: { fontSize: 20, color: colors.text, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1, paddingHorizontal: 8 },
});
