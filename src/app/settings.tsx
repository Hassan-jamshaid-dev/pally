import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getApiBaseUrl } from '@/ai/client';
import { describeDevice, oemNote } from '@/android/deviceInfo';
import { getDeviceInfo, openSettingsScreen } from '@/android/device';
import { colors } from '@/constants/theme';
import { BigButton } from '@/presentation/components/big-button';
import { Notice } from '@/presentation/components/notice';
import { usePally } from '@/presentation/pally-context';
import { isSttSupported } from '@/voice/stt';

export default function Settings() {
  const { prefs, updatePrefs, clearHistory, history } = usePally();
  const [confirmClear, setConfirmClear] = useState(false);
  const device = getDeviceInfo();
  const note = oemNote(device);
  const sttOk = isSttSupported();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Section title="Voice">
        <Text style={styles.body}>Read steps aloud: {prefs.voiceEnabled ? 'On' : 'Off'}</Text>
        <BigButton label={prefs.voiceEnabled ? 'Turn reading aloud off' : 'Turn reading aloud on'} variant="secondary" onPress={() => updatePrefs({ voiceEnabled: !prefs.voiceEnabled })} />
        <Text style={styles.body}>Voice speed: {prefs.pace === 'slow' ? 'Slower' : 'Normal'}</Text>
        <View style={styles.row}>
          <BigButton label="Slower" variant={prefs.pace === 'slow' ? 'primary' : 'secondary'} style={styles.half} onPress={() => updatePrefs({ pace: 'slow' })} />
          <BigButton label="Normal" variant={prefs.pace === 'normal' ? 'primary' : 'secondary'} style={styles.half} onPress={() => updatePrefs({ pace: 'normal' })} />
        </View>
        <Text style={styles.small}>
          {sttOk ? 'Listening to your voice is available.' : 'Listening to your voice is not available in this version (for example Expo Go). You can always type.'}
        </Text>
        <BigButton label="Phone microphone settings" variant="secondary" onPress={() => Linking.openSettings()} />
      </Section>

      <Section title="Bigger words">
        <Text style={styles.body}>To make everything on your phone bigger, change Font size in your phone's Display settings.</Text>
        <BigButton label="Open Display settings" variant="secondary" onPress={() => openSettingsScreen('android.settings.DISPLAY_SETTINGS')} />
      </Section>

      <Section title="Your privacy">
        <Text style={styles.body}>
          Your past help is saved only on this phone. There are no accounts. When you ask, your question and your phone model are sent to Pally's helper service, which uses OpenAI to write the steps. Pally cannot see your screen and never asks for passwords or codes.
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
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading} accessibilityRole="header">{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 20, gap: 16 },
  section: { backgroundColor: colors.white, borderWidth: 3, borderColor: colors.greenSoft, borderRadius: 20, padding: 16, gap: 10 },
  heading: { fontSize: 26, fontWeight: '900', color: colors.teal },
  body: { fontSize: 20, lineHeight: 29, color: colors.text },
  small: { fontSize: 17, lineHeight: 24, color: '#3C5654' },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
});
