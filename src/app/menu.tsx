import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors } from '@/constants/theme';
import { AppText as Text } from '@/presentation/components/app-text';
import { HeaderButton, Mascot, Screen } from '@/presentation/components/screen';
import { useTheme } from '@/presentation/use-theme';

const ITEMS: { glyph: string; label: string; href: Href }[] = [
  { glyph: '💬', label: 'New Chat', href: '/ask' },
  { glyph: '◷', label: 'Conversation History', href: '/history' },
  { glyph: '⚙', label: 'Settings', href: '/settings' },
  { glyph: '⛨', label: 'Check something suspicious', href: '/safety' },
  { glyph: '♡', label: 'Trusted People', href: '/trusted' },
  { glyph: 'ⓘ', label: 'About Pally', href: '/about' },
];

/** The "What would you like help with?" menu. */
export default function Menu() {
  const router = useRouter();
  const { c } = useTheme();
  const [text, setText] = useState('');
  const go = () => text.trim() && router.replace({ pathname: '/ask', params: { q: text.trim(), auto: '1' } });

  return (
    <Screen back right={<HeaderButton glyph="⌂" label="Home" onPress={() => router.replace('/home')} />} brand>
      <View style={styles.hero}>
        <Mascot size={150} />
        <Text style={[styles.h, { color: c.tealDark }]} accessibilityRole="header">What would you like{'\n'}help with?</Text>
      </View>
      <View style={[styles.field, { backgroundColor: c.card }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={go}
          returnKeyType="send"
          placeholder="For example: make my text bigger"
          placeholderTextColor={colors.muted}
          accessibilityLabel="Type what you need help with"
          style={[styles.input, { color: c.text }]}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Ask Pally" disabled={!text.trim()} onPress={go} style={[styles.go, { backgroundColor: c.teal }, !text.trim() && { opacity: 0.5 }]}>
          <Text style={{ fontSize: 28, color: '#FFFFFF', fontWeight: '900' }}>→</Text>
        </Pressable>
      </View>
      {ITEMS.map((i) => (
        <Pressable key={i.label} accessibilityRole="button" accessibilityLabel={i.label} onPress={() => router.push(i.href)} style={({ pressed }) => [styles.item, { backgroundColor: c.card }, pressed && { opacity: 0.75 }]}>
          <Text style={[styles.glyph, { color: c.teal }]}>{i.glyph}</Text>
          <Text style={[styles.itemText, { color: c.tealDark }]}>{i.label}</Text>
        </Pressable>
      ))}
      <Text style={[styles.foot, { color: c.teal }]}>♥{'\n'}You're never alone{'\n'}with Pally.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 6 },
  h: { fontSize: 30, fontWeight: '900', textAlign: 'center', lineHeight: 38 },
  field: { flexDirection: 'row', alignItems: 'center', borderRadius: 36, paddingLeft: 20, paddingRight: 8, paddingVertical: 8, gap: 8, elevation: 3, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 6 },
  input: { flex: 1, minHeight: 56, fontSize: 18 },
  go: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 68, borderRadius: 34, paddingHorizontal: 22, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 5 },
  glyph: { fontSize: 24, width: 34, textAlign: 'center', fontWeight: '800' },
  itemText: { fontSize: 20, fontWeight: '700', flex: 1 },
  foot: { fontSize: 17, fontWeight: '700', textAlign: 'center', lineHeight: 24, marginTop: 8, marginBottom: 60 },
});
