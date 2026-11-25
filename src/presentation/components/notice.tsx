import { StyleSheet, View } from 'react-native';
import { AppText } from './app-text';
import { useTheme } from '../use-theme';

type Tone = 'info' | 'warn' | 'danger' | 'good';

/** Soft message card. Use for errors, permission states, tips. */
export function Notice({ title, children, tone = 'info' }: { title?: string; children: React.ReactNode; tone?: Tone }) {
  const { c, contrast } = useTheme();
  const tones: Record<Tone, { bg: string; border: string }> = {
    info: { bg: c.card, border: c.sage },
    warn: { bg: '#FFF1E8', border: c.coral },
    danger: { bg: '#FDE3DC', border: c.coralDark },
    good: { bg: c.greenSoft, border: c.sageDeep },
  };
  const t = tones[tone];
  return (
    <View style={[styles.box, { backgroundColor: t.bg, borderColor: contrast ? '#000' : t.border }]} accessibilityLiveRegion="polite">
      {title ? <AppText style={[styles.title, { color: c.tealDark }]} accessibilityRole="header">{title}</AppText> : null}
      {typeof children === 'string' ? <AppText style={[styles.text, { color: c.text }]}>{children}</AppText> : children}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 2, borderRadius: 24, padding: 16, gap: 8 },
  title: { fontSize: 22, fontWeight: '900' },
  text: { fontSize: 19, lineHeight: 28 },
});
