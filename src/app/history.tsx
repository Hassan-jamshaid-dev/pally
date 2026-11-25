import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { BigButton } from '@/presentation/components/big-button';
import { Notice } from '@/presentation/components/notice';
import { usePally } from '@/presentation/pally-context';

export default function History() {
  const router = useRouter();
  const { history, ready } = usePally();

  if (!ready) return <View style={styles.screen} />;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {history.length === 0 ? (
        <Notice title="Nothing here yet" tone="info">When you finish or stop a task, it will be saved here on this phone.</Notice>
      ) : (
        history.map((h) => (
          <View key={h.id} style={styles.card}>
            <Text style={styles.title}>{h.title}</Text>
            <Text style={styles.meta}>
              {h.outcome === 'completed' ? 'Finished' : `Stopped after ${h.stepsDone} of ${h.stepsTotal} steps`} · {new Date(h.finishedAt).toLocaleDateString()}
            </Text>
            {h.summary ? <Text style={styles.body}>{h.summary}</Text> : null}
            <BigButton label="Do this again" variant="secondary" onPress={() => router.push({ pathname: '/ask', params: { q: h.question } })} />
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 20, gap: 14 },
  card: { backgroundColor: colors.white, borderWidth: 3, borderColor: colors.greenSoft, borderRadius: 20, padding: 16, gap: 8 },
  title: { fontSize: 24, fontWeight: '900', color: colors.tealDark },
  meta: { fontSize: 18, fontWeight: '700', color: colors.coralDark },
  body: { fontSize: 20, lineHeight: 28, color: colors.text },
});
