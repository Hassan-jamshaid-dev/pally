import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from './app-text';
import { Waves } from './waves';
import { useTheme } from '../use-theme';

type Props = {
  title?: string;
  back?: boolean;
  onBack?: () => void;
  children: React.ReactNode;
  waves?: boolean;
  scroll?: boolean;
  footer?: React.ReactNode;
  tabs?: 'home' | 'history' | 'safety' | 'settings';
};

export const mascot = require('../../../assets/images/mascot.png');

const TABS: { key: NonNullable<Props['tabs']>; label: string; href: Href; glyph: string }[] = [
  { key: 'home', label: 'Home', href: '/home', glyph: '⌂' },
  { key: 'history', label: 'Past Help', href: '/history', glyph: '↺' },
  { key: 'safety', label: 'Safety', href: '/safety', glyph: '⛨' },
  { key: 'settings', label: 'Settings', href: '/settings', glyph: '⚙' },
];

export function Screen({ title, back, onBack, children, waves = true, scroll = true, footer, tabs }: Props) {
  const router = useRouter();
  const { c } = useTheme();
  const goBack = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/home')));
  const body = scroll ? (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">{children}</ScrollView>
  ) : (
    <View style={styles.content}>{children}</View>
  );
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: c.cream }]}>
      {waves && <Waves />}
      {(title || back) && (
        <View style={styles.header}>
          {back ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={goBack} style={[styles.back, { backgroundColor: c.card }]}>
              <AppText style={styles.backGlyph}>←</AppText>
            </Pressable>
          ) : <View style={styles.back} />}
          <AppText accessibilityRole="header" style={[styles.title, { color: c.teal }]}>{title}</AppText>
          <View style={styles.back} />
        </View>
      )}
      <View style={{ flex: 1 }}>{body}</View>
      {footer}
      {tabs && (
        <View style={[styles.tabs, { backgroundColor: c.card }]}>
          {TABS.map((t) => (
            <Pressable key={t.key} accessibilityRole="tab" accessibilityLabel={t.label} accessibilityState={{ selected: tabs === t.key }} onPress={() => tabs !== t.key && router.replace(t.href)} style={styles.tab}>
              <AppText style={[styles.tabGlyph, { color: tabs === t.key ? c.teal : c.muted }]}>{t.glyph}</AppText>
              <AppText style={[styles.tabLabel, { color: tabs === t.key ? c.teal : c.muted, fontWeight: tabs === t.key ? '900' : '600' }]}>{t.label}</AppText>
            </Pressable>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}

export function Mascot({ size = 120 }: { size?: number }) {
  return <Image source={mascot} style={{ width: size, height: size, borderRadius: size * 0.22 }} contentFit="contain" accessibilityLabel="Pally the friendly helper robot" />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 },
  back: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  backGlyph: { fontSize: 26, color: '#2D5A58', fontWeight: '800' },
  title: { fontSize: 26, fontWeight: '900' },
  tabs: { flexDirection: 'row', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingVertical: 6, elevation: 10, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8 },
  tab: { flex: 1, alignItems: 'center', minHeight: 64, justifyContent: 'center' },
  tabGlyph: { fontSize: 24 },
  tabLabel: { fontSize: 14 },
});
