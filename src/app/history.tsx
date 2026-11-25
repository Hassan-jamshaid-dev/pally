import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { colors } from '@/constants/theme';
import { AppText as Text } from '@/presentation/components/app-text';
import { BigButton } from '@/presentation/components/big-button';
import { Mascot, Screen } from '@/presentation/components/screen';
import { usePally } from '@/presentation/pally-context';
import { useTheme } from '@/presentation/use-theme';

export default function History() {
  const router = useRouter();
  const { c } = useTheme();
  const { history, ready, resumable, resume } = usePally();

  return (
    <Screen title="Past Help" back tabs="history">
      {!ready ? null : history.length === 0 && !resumable ? (
        <View style={styles.empty}>
          <Mascot size={150} />
          <Text style={[styles.emptyTitle, { color: c.tealDark }]} accessibilityRole="header">Nothing here yet</Text>
          <Text style={styles.emptyBody}>When you finish or stop a task, it will be saved here on this phone.</Text>
        </View>
      ) : (
        <>
          {resumable && (
            <View style={[styles.card, { backgroundColor: c.greenSoft }]}>
              <Text style={[styles.title, { color: c.tealDark }]}>{resumable.state.task.title}</Text>
              <Text style={styles.meta}>In progress</Text>
              <BigButton label="Continue" onPress={() => { resume(); router.push('/guide'); }} />
            </View>
          )}
          {history.map((h) => (
            <View key={h.id} style={[styles.card, { backgroundColor: c.card }]}>
              <Text style={[styles.title, { color: c.tealDark }]}>{h.title}</Text>
              <Text style={styles.meta}>
                {h.outcome === 'completed' ? 'Finished' : `Stopped after ${h.stepsDone} of ${h.stepsTotal} steps`} · {new Date(h.finishedAt).toLocaleDateString()}
              </Text>
              {h.summary ? <Text style={styles.body}>{h.summary}</Text> : null}
              <BigButton label="Start again" variant="secondary" onPress={() => router.push({ pathname: '/ask', params: { q: h.question } })} />
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: 12, paddingTop: 30 },
  emptyTitle: { fontSize: 30, fontWeight: '900' },
  emptyBody: { fontSize: 20, lineHeight: 28, color: colors.text, textAlign: 'center' },
  card: { borderRadius: 24, padding: 16, gap: 8, elevation: 3, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 6 },
  title: { fontSize: 22, fontWeight: '900' },
  meta: { fontSize: 16, fontWeight: '700', color: colors.coralDark },
  body: { fontSize: 18, lineHeight: 26, color: colors.text },
});
