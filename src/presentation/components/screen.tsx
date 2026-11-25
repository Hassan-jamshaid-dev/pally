import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from './app-text';
import { Waves } from './waves';
import { useTheme } from '../use-theme';

type Props = {
  title?: string;
  /** Show the mascot + "Pally" wordmark in the header instead of a plain title. */
  brand?: boolean;
  back?: boolean;
  onBack?: () => void;
  /** Optional right-hand header action (gear, menu, trash...). */
  right?: React.ReactNode;
  children: React.ReactNode;
  waves?: boolean;
  scroll?: boolean;
  footer?: React.ReactNode;
  tabs?: 'home' | 'history' | 'settings';
};

export const mascot = require('../../../assets/images/mascot.png');

const TABS: { key: NonNullable<Props['tabs']>; label: string; href: Href; glyph: string }[] = [
  { key: 'home', label: 'Home', href: '/home', glyph: '⌂' },
  { key: 'history', label: 'History', href: '/history', glyph: '◷' },
  { key: 'settings', label: 'Settings', href: '/settings', glyph: '⚙' },
];

/** Round header button used for back / gear / menu / trash. */
export function HeaderButton({ glyph, label, onPress }: { glyph: string; label: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.hbtn, { backgroundColor: c.card }]}>
      <AppText style={[styles.hglyph, { color: c.teal }]}>{glyph}</AppText>
    </Pressable>
  );
}

export function Screen({ title, brand, back, onBack, right, children, waves = true, scroll = true, footer, tabs }: Props) {
  const router = useRouter();
  const { c } = useTheme();
  const goBack = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/home')));
  const body = scroll ? (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">{children}</ScrollView>
  ) : (
    <View style={styles.content}>{children}</View>
  );
  const showHeader = !!(title || back || brand || right);
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: c.cream }]}>
      {waves && <Waves />}
      {showHeader && (
        <View style={styles.header}>
          {back ? <HeaderButton glyph="←" label="Go back" onPress={goBack} /> : <View style={styles.hbtn} />}
          {brand ? (
            <View style={styles.brand} accessibilityRole="header" accessibilityLabel="Pally">
              <Image source={mascot} style={styles.logo} contentFit="contain" />
              <AppText style={[styles.brandName, { color: c.teal }]}>Pally</AppText>
            </View>
          ) : (
            <AppText accessibilityRole="header" numberOfLines={1} style={[styles.title, { color: c.tealDark }]}>{title}</AppText>
          )}
          {right ?? <View style={styles.hbtn} />}
        </View>
      )}
      <View style={{ flex: 1 }}>{body}</View>
      {footer}
      {tabs && (
        <View style={[styles.tabs, { backgroundColor: c.card }]}>
          {TABS.map((t) => {
            const on = tabs === t.key;
            return (
              <Pressable key={t.key} accessibilityRole="tab" accessibilityLabel={t.label} accessibilityState={{ selected: on }} onPress={() => !on && router.replace(t.href)} style={styles.tab}>
                <AppText style={[styles.tabGlyph, { color: on ? c.teal : c.muted }]}>{t.glyph}</AppText>
                <AppText style={[styles.tabLabel, { color: on ? c.teal : c.muted, fontWeight: on ? '900' : '600' }]}>{t.label}</AppText>
                {on && <View style={[styles.tabBar, { backgroundColor: c.teal }]} />}
              </Pressable>
            );
          })}
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
  hbtn: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  hglyph: { fontSize: 26, fontWeight: '800' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 48, height: 48, borderRadius: 12 },
  brandName: { fontSize: 30, fontWeight: '900' },
  title: { fontSize: 24, fontWeight: '800', flexShrink: 1, textAlign: 'center' },
  tabs: { flexDirection: 'row', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingVertical: 6, elevation: 10, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8 },
  tab: { flex: 1, alignItems: 'center', minHeight: 64, justifyContent: 'center' },
  tabGlyph: { fontSize: 24 },
  tabLabel: { fontSize: 14 },
  tabBar: { position: 'absolute', bottom: 0, width: 56, height: 4, borderRadius: 2 },
});
