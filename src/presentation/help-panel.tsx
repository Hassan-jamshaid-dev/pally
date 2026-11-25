import { useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { AppText as Text } from './components/app-text';
import type { GuidanceStep } from '@/ai/schema';
import { describeDevice, oemNote } from '@/android/deviceInfo';
import { getDeviceInfo, openSettingsScreen } from '@/android/device';
import { resolveIntent } from '@/android/intents';
import { colors } from '@/constants/theme';
import type { SpeechPace } from '@/data';
import { SCAM_TIP } from '@/safety/rules';
import { BigButton } from './components/big-button';
import { Notice } from './components/notice';

type Props = {
  step: GuidanceStep;
  pace: SpeechPace;
  busy: boolean;
  onTogglePace: () => void;
  onNotFound: () => void;
  onWrong: () => void;
  onClose: () => void;
};

/** Everything under "Help": opens Settings (with confirmation), re-explain, pace, scam tip. */
export function HelpPanel({ step, pace, busy, onTogglePace, onNotFound, onWrong, onClose }: Props) {
  const device = useMemo(getDeviceInfo, []);
  const intent = resolveIntent(step.androidHint.intentAction);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const note = oemNote(device);

  const open = async () => {
    if (!intent) return;
    setConfirming(false);
    const r = await openSettingsScreen(intent.action);
    setResult(r.message ?? (r.ok ? 'Opened. Come back to Pally when you are ready.' : null));
  };

  return (
    <Notice title="How can I help?" tone="info">
      {intent && !confirming && (
        <BigButton label={`Open ${intent.label} for me`} variant="primary" onPress={() => setConfirming(true)} />
      )}
      {intent && confirming && (
        <Notice tone="warn" title="Open it now?">
          <Text style={styles.text}>Pally will open your phone's {intent.label}. Nothing will be changed for you.</Text>
          <BigButton label="Yes, open it" onPress={open} />
          <BigButton label="No, not now" variant="secondary" onPress={() => setConfirming(false)} />
        </Notice>
      )}
      {result && <Text style={styles.text}>{result}</Text>}

      <BigButton label="I don't see that button" variant="secondary" disabled={busy} onPress={onNotFound} />
      <BigButton label="That doesn't look right" variant="secondary" disabled={busy} onPress={onWrong} />
      <BigButton label={pace === 'slow' ? 'Use normal voice speed' : 'Use slower voice'} variant="secondary" onPress={onTogglePace} />

      {step.androidHint.settingsPathHint ? <Text style={styles.text}>Where to look: {step.androidHint.settingsPathHint}</Text> : null}
      {note ? <Text style={styles.small}>{describeDevice(device)}. {note}</Text> : null}
      <Text style={styles.small}>{SCAM_TIP}</Text>
      <BigButton label="Close help" onPress={onClose} />
    </Notice>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 20, lineHeight: 29, color: colors.text },
  small: { fontSize: 17, lineHeight: 24, color: '#3C5654' },
});

