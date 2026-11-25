import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '@/constants/theme';
import { AppText as Text } from '@/presentation/components/app-text';
import { BigButton } from '@/presentation/components/big-button';
import { Notice } from '@/presentation/components/notice';
import { HeaderButton, Mascot, Screen } from '@/presentation/components/screen';
import { usePally } from '@/presentation/pally-context';
import { useTheme } from '@/presentation/use-theme';

function when(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const yest = new Date(now.getTime() - 86400000);
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const day = d.toDateString() === now.toDateString() ? 'Today' : d.toDateString() === yest.toDateString() ? 'Yesterday' : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `${day} • ${time}`;
}

export default function History() {
  const router = useRouter();
  const { c } = useTheme();
  const { history, ready, resumable, resume, clearHistory } = usePally();
  const [confirm, setConfirm] = useState(false);

  return (
    <Screen
      title="Conversation History"
      back
      tabs="history"
      right={<HeaderButton glyph="🗑" label="Clear conversation history" onPress={() => history.length > 0 && setConfirm(true)} />}>
      {confirm && (
        <Notice tone="warn" title="Clear all conversations?">
          <BigButton label="Yes, clear them" variant="danger" onPress={async () => { await clearHistory(); setConfirm(false); }} />
          <BigButton label="No, keep them" variant="secondary" onPress={() => setConfirm(false)} />
        </Notice>
      )}
      {!ready ? null : history.length === 0 && !resumable ? (
        <View style={styles.empty}>
          <Mascot size={150} />
          <Text style={[styles.emptyTitle, { color: c.tealDark }]} accessibilityRole="header">Nothing here yet</Text>
          <Text style={styles.emptyBody}>When you finish or stop a task, it will be saved here on this phone.</Text>
        </View>
      ) : (
        <>
          {resumable && (
            <Item
              title={resumable.state.task.title}
              meta="In progress • tap to continue"
              onPress={() => { resume(); router.push('/guide'); }}
              tint={c.greenSoft}
            />
          )}
          {history.map((h) => (
            <Item
              key={h.id}
              title={h.question || h.title}
              meta={`${when(h.finishedAt)}${h.outcome === 'completed' ? '' : ` • Stopped at ${h.stepsDone} of ${h.stepsTotal}`}`}
              onPress={() => router.push({ pathname: '/ask', params: { q: h.question, auto: '1' } })}
            />
          ))}
        </>
      )}
    </Screen>
  );
}

function Item({ title, meta, onPress, tint }: { title: string; meta: string; onPress: () => void; tint?: string }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${meta}. Tap to ask again`} onPress={onPress} style={({ pressed }) => [styles.card, { backgroundColor: tint ?? c.card }, pressed && { opacity: 0.8 }]}>
      <View style={[styles.bubble, { backgroundColor: c.greenSoft }]}><Text style={{ fontSize: 22, color: c.teal }}>💬</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: c.tealDark }]}>{title}</Text>
        <Text style={styles.meta}>{meta}</Text>
      </View>
      <Text style={[styles.chev, { color: c.teal }]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: 12, paddingTop: 30 },
  emptyTitle: { fontSize: 30, fontWeight: '900' },
  emptyBody: { fontSize: 20, lineHeight: 28, color: colors.text, textAlign: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 80, borderRadius: 26, padding: 14, elevation: 3, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 6 },
  bubble: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  meta: { fontSize: 15, color: colors.muted, marginTop: 2 },
  chev: { fontSize: 32, fontWeight: '600' },
});
