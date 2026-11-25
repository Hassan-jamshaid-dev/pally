import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';

type Tone = 'info' | 'warn' | 'danger' | 'good';
const TONE: Record<Tone, { bg: string; border: string }> = {
  info: { bg: colors.white, border: colors.teal },
  warn: { bg: '#FFF1E8', border: colors.coralDark },
  danger: { bg: '#FDE3DC', border: '#9A2F1A' },
  good: { bg: colors.greenSoft, border: colors.teal },
};

/** High-contrast message card. Use for errors, permission states, tips. */
export function Notice({ title, children, tone = 'info' }: { title?: string; children: React.ReactNode; tone?: Tone }) {
  const t = TONE[tone];
  return (
    <View style={[styles.box, { backgroundColor: t.bg, borderColor: t.border }]} accessibilityLiveRegion="polite">
      {title ? <Text style={styles.title} accessibilityRole="header">{title}</Text> : null}
      {typeof children === 'string' ? <Text style={styles.text}>{children}</Text> : children}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 3, borderRadius: 20, padding: 16, gap: 8 },
  title: { fontSize: 24, fontWeight: '900', color: colors.tealDark },
  text: { fontSize: 20, lineHeight: 29, color: colors.text },
});
