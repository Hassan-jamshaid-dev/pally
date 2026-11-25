import { Redirect, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { friendlyAiError } from '@/ai/client';
import { colors } from '@/constants/theme';
import { parseCommand } from '@/guidance/commands';
import { currentStep, progressLabel } from '@/guidance/engine';
import { BigButton } from '@/presentation/components/big-button';
import { MicButton } from '@/presentation/components/mic-button';
import { Notice } from '@/presentation/components/notice';
import { HelpPanel } from '@/presentation/help-panel';
import { usePally } from '@/presentation/pally-context';
import { SCAM_TIP } from '@/safety/rules';
import { speak, stopSpeaking } from '@/voice/tts';
import { useSpeechInput } from '@/voice/useSpeechInput';

export default function Guide() {
  const router = useRouter();
  const { session, dispatch, clarify, prefs, updatePrefs, endSession } = usePally();
  const [speaking, setSpeaking] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [heardNote, setHeardNote] = useState<string | null>(null);

  const g = session?.guidance;
  const step = g ? currentStep(g) : null;

  // Latest values for voice-command callbacks.
  const latest = useRef({ g, busy });
  latest.current = { g, busy };

  const actions = {
    next: () => {
      setHelpOpen(false);
      setError(null);
      dispatch({ type: 'next' });
    },
    repeat: () => dispatch({ type: 'repeat' }),
    stop: () => {
      stopSpeaking();
      dispatch({ type: 'stop' });
    },
    explain: async (reason: 'explain_differently' | 'step_not_found' | 'wrong_answer' = 'explain_differently') => {
      if (latest.current.busy) return;
      setBusy(true);
      setError(null);
      stopSpeaking();
      try {
        await clarify(reason);
        setHelpOpen(false);
      } catch (e) {
        setError(friendlyAiError(e));
      } finally {
        setBusy(false);
      }
    },
  };

  const speech = useSpeechInput((text) => {
    const status = latest.current.g?.status;
    const cmd = parseCommand(text);
    setHeardNote(cmd ? null : `I heard “${text}”. Tap a button, or say Next, Repeat, or Stop.`);
    if (!cmd) return;
    if (cmd === 'stop' || (cmd === 'no' && status === 'step_confirm')) actions.stop();
    else if (cmd === 'yes' && status === 'step_confirm') dispatch({ type: 'confirm' });
    else if (cmd === 'yes' && status === 'task_warning') dispatch({ type: 'ack_warning' });
    else if (cmd === 'next' && status === 'step') actions.next();
    else if (cmd === 'repeat') actions.repeat();
    else if (cmd === 'explain') actions.explain();
    else if (cmd === 'help') setHelpOpen(true);
    else if (cmd === 'slower') updatePrefs({ pace: 'slow' }).then(actions.repeat);
  });

  // Read the current screen aloud whenever it changes or Repeat is pressed.
  const spoken = !g
    ? null
    : g.status === 'task_warning' || g.status === 'blocked'
      ? (g.warning ?? SCAM_TIP)
      : g.status === 'step_confirm' && g.gate
        ? `${g.gate.headline}. ${g.gate.reasons.join(' ')} Do you want to go on?`
        : g.status === 'step' && step
          ? step.speakText
          : g.status === 'complete'
            ? "All done. Well done! You did that."
            : null;

  useEffect(() => {
    if (!spoken || !prefs.voiceEnabled) return;
    speak(spoken, prefs.pace, { onStart: () => setSpeaking(true), onDone: () => setSpeaking(false) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g?.speakNonce, g?.status, spoken]);

  useEffect(
    () => () => {
      stopSpeaking();
    },
    [],
  );

  if (!session || !g) return <Redirect href="/home" />;

  const micState = busy ? 'thinking' : speech.listening ? 'listening' : speaking ? 'speaking' : 'idle';
  const onMic = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    return speech.toggle();
  };

  const leave = () => {
    endSession();
    router.replace('/home');
  };

  // ---- Terminal / interrupt screens ----
  if (g.status === 'blocked') {
    return (
      <Screen>
        <Notice title="Let's not do that" tone="danger">{g.warning ?? SCAM_TIP}</Notice>
        <BigButton label="Back to home" onPress={leave} />
      </Screen>
    );
  }
  if (g.status === 'stopped') {
    return (
      <Screen>
        <Notice title="We stopped" tone="info">Okay. Nothing else was changed. You can ask me again any time.</Notice>
        <BigButton label="Ask something else" onPress={() => { endSession(); router.replace('/ask'); }} />
        <BigButton label="Back to home" variant="secondary" onPress={leave} />
      </Screen>
    );
  }
  if (g.status === 'complete') {
    return (
      <Screen>
        <Notice title="All done. Well done!" tone="good">
          <Text style={styles.body}>{g.task.title}</Text>
          <Text style={styles.small}>Saved to “Past help” on this phone.</Text>
        </Notice>
        <BigButton label="Ask something else" variant="warm" onPress={() => { endSession(); router.replace('/ask'); }} />
        <BigButton label="Back to home" variant="secondary" onPress={leave} />
      </Screen>
    );
  }
  if (g.status === 'task_warning') {
    return (
      <Screen>
        <Notice title="Please be careful" tone="danger">
          <Text style={styles.body}>{g.warning ?? SCAM_TIP}</Text>
          {g.safety.scamSignals.length > 0 && <Text style={styles.small}>Warning signs: {g.safety.scamSignals.map((s) => s.replace(/_/g, ' ')).join(', ')}.</Text>}
        </Notice>
        <BigButton label="Stop here" variant="danger" onPress={actions.stop} />
        <BigButton label="I understand, show me the steps" variant="secondary" onPress={() => dispatch({ type: 'ack_warning' })} />
      </Screen>
    );
  }
  if (!step) return <Redirect href="/home" />;

  if (g.status === 'step_confirm' && g.gate) {
    const hard = g.gate.strength === 'hard';
    return (
      <Screen>
        <Notice title={g.gate.headline} tone={hard ? 'danger' : 'warn'}>
          <Text style={styles.body}>Next: {step.instruction}</Text>
          {g.gate.reasons.map((r) => (
            <Text key={r} style={styles.body}>• {r}</Text>
          ))}
          {hard && <Text style={styles.small}>{SCAM_TIP}</Text>}
        </Notice>
        {hard ? (
          <>
            <BigButton label="No, stop" variant="danger" onPress={actions.stop} />
            <BigButton label="Yes, I want to do this" variant="secondary" onPress={() => dispatch({ type: 'confirm' })} />
          </>
        ) : (
          <>
            <BigButton label="Yes, go on" onPress={() => dispatch({ type: 'confirm' })} />
            <BigButton label="No, stop" variant="secondary" onPress={actions.stop} />
          </>
        )}
        <BigButton label="Say it again" variant="secondary" onPress={actions.repeat} />
      </Screen>
    );
  }

  // ---- Normal step ----
  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.progress} accessibilityLiveRegion="polite">{progressLabel(g)} · {g.task.title}</Text>
        <View style={styles.stepCard}>
          <Text style={styles.stepText} accessibilityRole="header">{step.instruction}</Text>
        </View>
        {busy && <Notice tone="info">Pally is finding a simpler way to say it…</Notice>}
        {error && <Notice title="Couldn't do that" tone="warn">{error}</Notice>}
        {heardNote && <Text style={styles.small}>{heardNote}</Text>}
        {speech.notice && <Notice tone="warn">{speech.notice}</Notice>}
        {helpOpen && (
          <HelpPanel
            step={step}
            pace={prefs.pace}
            busy={busy}
            onTogglePace={() => updatePrefs({ pace: prefs.pace === 'slow' ? 'normal' : 'slow' }).then(actions.repeat)}
            onNotFound={() => actions.explain('step_not_found')}
            onWrong={() => actions.explain('wrong_answer')}
            onClose={() => setHelpOpen(false)}
          />
        )}
      </ScrollView>

      {/* Fixed footer: mic is always in the same place. */}
      <View style={styles.footer}>
        <View style={styles.topRow}>
          <MicButton compact hideLabel state={micState} onPress={onMic} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.micLabel}>{speech.listening ? (speech.transcript || 'Listening…') : speaking ? 'Pally is talking' : 'Say “next” or tap'}</Text>
            <BigButton label="Next ›" onPress={actions.next} disabled={busy} />
          </View>
        </View>
        <View style={styles.row}>
          <BigButton label="Repeat" variant="secondary" style={styles.half} onPress={actions.repeat} />
          <BigButton label="Explain differently" variant="secondary" style={styles.half} onPress={() => actions.explain()} disabled={busy} />
        </View>
        <View style={styles.row}>
          <BigButton label={helpOpen ? 'Hide help' : 'Help'} variant="warm" style={styles.half} onPress={() => setHelpOpen((o) => !o)} />
          <BigButton label="Stop" variant="danger" style={styles.half} onPress={actions.stop} />
        </View>
      </View>
    </SafeAreaView>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={[styles.content, { gap: 14 }]}>{children}</ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 20, gap: 14 },
  progress: { fontSize: 20, fontWeight: '800', color: colors.coralDark },
  stepCard: { backgroundColor: colors.white, borderWidth: 3, borderColor: colors.teal, borderRadius: 24, padding: 22 },
  stepText: { fontSize: 32, lineHeight: 44, fontWeight: '800', color: colors.tealDark },
  body: { fontSize: 22, lineHeight: 31, color: colors.text },
  small: { fontSize: 17, lineHeight: 24, color: '#3C5654' },
  footer: { padding: 16, paddingTop: 8, gap: 10, backgroundColor: colors.cream, borderTopWidth: 2, borderTopColor: colors.greenSoft },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  micLabel: { fontSize: 18, fontWeight: '700', color: colors.teal },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1, paddingHorizontal: 6 },
});
