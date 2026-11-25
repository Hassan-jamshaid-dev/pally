import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Switch, View } from 'react-native';
import { getApiBaseUrl } from '@/ai/client';
import { describeDevice, oemNote } from '@/android/deviceInfo';
import { getDeviceInfo, openSettingsScreen } from '@/android/device';
import { colors } from '@/constants/theme';
import { AppText as Text } from '@/presentation/components/app-text';
import { BigButton } from '@/presentation/components/big-button';
import { Notice } from '@/presentation/components/notice';
import { Screen } from '@/presentation/components/screen';
import { usePally } from '@/presentation/pally-context';
import { useTheme } from '@/presentation/use-theme';
import { isSttSupported } from '@/voice/stt';

function Seg<T extends string>({ value, options, onChange }: { value: T; options: { key: T; label: string }[]; onChange: (k: T) => void }) {
  const { c } = useTheme();
  return (
    <View style={[styles.seg, { backgroundColor: c.greenSoft }]}>
      {options.map((o) => (
        <Pressable key={o.key} accessibilityRole="radio" accessibilityState={{ selected: value === o.key }} accessibilityLabel={o.label} onPress={() => onChange(o.key)} style={[styles.segItem, value === o.key && { backgroundColor: c.teal }]}>
          <Text style={[styles.segText, { color: value === o.key ? '#FFFFFF' : c.tealDark }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function Settings() {
  const router = useRouter();
  const { c } = useTheme();
  const { prefs, updatePrefs, clearHistory, history } = usePally();
  const [confirmClear, setConfirmClear] = useState(false);
  const device = getDeviceInfo();
  const note = oemNote(device);
  const sttOk = isSttSupported();

  return (
    <Screen title="Settings" back tabs="settings">`n      <Section title="Safety and help">`n        <BigButton label="Check something suspicious" variant="secondary" onPress={() => router.push('/safety')} />`n        <BigButton label="About Pally" variant="secondary" onPress={() => router.push('/about')} />`n      </Section>`n
      <Section title="Voice">
        <View style={styles.line}>
          <Text style={styles.body}>Read steps aloud</Text>
          <Switch accessibilityLabel="Read steps aloud" value={prefs.voiceEnabled} onValueChange={(v) => updatePrefs({ voiceEnabled: v })} trackColor={{ true: c.teal, false: '#C9C3B8' }} />
        </View>
        <Text style={styles.label}>Voice speed</Text>
        <Seg value={prefs.pace} options={[{ key: 'slow', label: 'Slower' }, { key: 'normal', label: 'Normal' }]} onChange={(pace) => updatePrefs({ pace })} />
        <Text style={styles.small}>{sttOk ? 'Listening to your voice is available.' : 'Listening to your voice is not available in this version (for example Expo Go). You can always type.'}</Text>
        <BigButton label="Phone microphone settings" variant="secondary" onPress={() => Linking.openSettings()} />
      </Section>

      <Section title="Accessibility">
        <Text style={styles.label}>Text size</Text>
        <Seg value={prefs.textSize} options={[{ key: 'standard', label: 'Standard' }, { key: 'large', label: 'Large' }, { key: 'xl', label: 'Extra Large' }]} onChange={(textSize) => updatePrefs({ textSize })} />
        <View style={styles.line}>
          <Text style={styles.body}>High contrast</Text>
          <Switch accessibilityLabel="High contrast" value={prefs.highContrast} onValueChange={(highContrast) => updatePrefs({ highContrast })} trackColor={{ true: c.teal, false: '#C9C3B8' }} />
        </View>
        <Text style={styles.label}>Button size</Text>
        <Seg value={prefs.buttonSize} options={[{ key: 'standard', label: 'Standard' }, { key: 'larger', label: 'Larger' }]} onChange={(buttonSize) => updatePrefs({ buttonSize })} />
        <Text style={styles.small}>To make everything on your phone bigger, change Font size in your phone's Display settings.</Text>
        <BigButton label="Open Display settings" variant="secondary" onPress={() => openSettingsScreen('android.settings.DISPLAY_SETTINGS')} />
      </Section>

      <Section title="Language">
        <Text style={styles.body}>English</Text>
        <Text style={styles.small}>More languages are coming later.</Text>
      </Section>

      <Section title="Your trusted people">
        <Text style={styles.small}>{prefs.trusted.length} saved on this phone.</Text>
        <BigButton label="Manage trusted people" variant="secondary" onPress={() => router.push('/trusted')} />
      </Section>

      <Section title="Privacy">
        <Text style={styles.body}>
          Your past help is saved only on this phone. There are no accounts. When you ask, your question and your phone model are sent securely to Pally's helper service, which uses OpenAI to write the steps. Pally cannot see your screen and never asks for passwords or codes.
        </Text>
        {confirmClear ? (
          <Notice tone="warn" title="Clear all saved help?">
            <BigButton label="Yes, clear it" variant="danger" onPress={async () => { await clearHistory(); setConfirmClear(false); }} />
            <BigButton label="No, keep it" variant="secondary" onPress={() => setConfirmClear(false)} />
          </Notice>
        ) : (
          <BigButton label={`Clear past help (${history.length})`} variant="secondary" disabled={history.length === 0} onPress={() => setConfirmClear(true)} />
        )}
      </Section>

      <Section title="About this phone">
        <Text style={styles.body}>{describeDevice(device)}</Text>
        {note ? <Text style={styles.small}>{note}</Text> : null}
        <Text style={styles.small}>Helper service: {getApiBaseUrl()}</Text>
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={[styles.section, { backgroundColor: c.card }]}>
      <Text style={[styles.heading, { color: c.teal }]} accessibilityRole="header">{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { borderRadius: 24, padding: 16, gap: 10, elevation: 3, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 6 },
  heading: { fontSize: 24, fontWeight: '900' },
  body: { fontSize: 19, lineHeight: 27, color: colors.text, flexShrink: 1 },
  label: { fontSize: 17, fontWeight: '800', color: colors.muted },
  small: { fontSize: 16, lineHeight: 23, color: colors.muted },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56, gap: 12 },
  seg: { flexDirection: 'row', borderRadius: 30, padding: 4 },
  segItem: { flex: 1, minHeight: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  segText: { fontSize: 17, fontWeight: '800' },
});
