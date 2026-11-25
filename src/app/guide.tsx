import { Redirect, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/presentation/components/app-text';
import { Mascot, Screen } from '@/presentation/components/screen';
import { useTheme } from '@/presentation/use-theme';
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
  const { c } = useTheme();
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
  const Plain = ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <Screen title={title} onBack={leave} back={!!title}>{children}</Screen>
  );
  if (g.status === 'blocked') {
    return (
      <Plain>
        <Notice title="Let's not do that" tone="danger">{g.warning ?? SCAM_TIP}</Notice>
        <BigButton label="Back to home" onPress={leave} />
      </Plain>
    );
  }
  if (g.status === 'stopped') {
    return (
      <Plain>
        <Notice title="We stopped" tone="info">Okay. Nothing else was changed. You can ask me again any time.</Notice>
        <BigButton label="Ask Another Question" onPress={() => { endSession(); router.replace('/ask'); }} />
        <BigButton label="Return Home" variant="secondary" onPress={leave} />
      </Plain>
    );
  }
  if (g.status === 'complete') {
    return (
      <Plain>
        <View style={styles.center}>
          <Mascot size={160} />
          <Text style={[styles.big, { color: c.tealDark }]} accessibilityRole="header">You're all done!</Text>
          <Text style={styles.body}>{g.task.title}</Text>
          <Text style={styles.small}>Saved to “Past Help” on this phone.</Text>
        </View>
        <BigButton label="Return Home" onPress={leave} />
        <BigButton
          label="Repeat Steps"
          variant="secondary"
          onPress={() => {
            const q = session.question;
            endSession();
            router.replace({ pathname: '/ask', params: { q } });
          }}
        />
        <BigButton label="Ask Another Question" variant="secondary" onPress={() => { endSession(); router.replace('/ask'); }} />
      </Plain>
    );
  }
  if (g.status === 'task_warning') {
    return (
      <Plain>
        <Notice title="Please be careful" tone="danger">
          <Text style={styles.body}>{g.warning ?? SCAM_TIP}</Text>
          {g.safety.scamSignals.length > 0 && <Text style={styles.small}>Warning signs: {g.safety.scamSignals.map((s) => s.replace(/_/g, ' ')).join(', ')}.</Text>}
        </Notice>
        <BigButton label="Stop here" variant="danger" onPress={actions.stop} />
        <BigButton label="I understand, show me the steps" variant="secondary" onPress={() => dispatch({ type: 'ack_warning' })} />
      </Plain>
    );
  }
  if (!step) return <Redirect href="/home" />;

  if (g.status === 'step_confirm' && g.gate) {
    const hard = g.gate.strength === 'hard';
    return (
      <Plain title="Confirm Action">
        <View style={styles.center}>
          <Text style={{ fontSize: 64, color: hard ? c.coralDark : c.coral }}>⚠</Text>
          <Text style={[styles.big, { color: c.tealDark }]} accessibilityRole="header">{g.gate.headline}</Text>
        </View>
        <Notice tone={hard ? 'danger' : 'warn'}>
          <Text style={styles.body}>Next: {step.instruction}</Text>
          {g.gate.reasons.map((r) => (
            <Text key={r} style={styles.body}>• {r}</Text>
          ))}
          {hard && <Text style={styles.small}>{SCAM_TIP}</Text>}
        </Notice>
        {hard ? (
          <>
            <BigButton label="Go Back" variant="danger" onPress={actions.stop} />
            <BigButton label="Continue" variant="secondary" onPress={() => dispatch({ type: 'confirm' })} />
          </>
        ) : (
          <>
            <BigButton label="Continue" onPress={() => dispatch({ type: 'confirm' })} />
            <BigButton label="Go Back" variant="secondary" onPress={actions.stop} />
          </>
        )}
        <BigButton label="Say it again" variant="secondary" onPress={actions.repeat} />
      </Plain>
    );
  }

  // ---- Normal step ----
  const total = g.steps.length;
  const pct = total ? Math.min(1, (g.index + 1) / total) : 0;
  const footer = (
    <View style={[styles.footer, { backgroundColor: c.cream }]}>
      <View style={styles.row}>
        <BigButton label="‹ Back" variant="secondary" style={styles.half} onPress={() => dispatch({ type: 'previous' })} disabled={busy || g.index === 0} />
        <BigButton label="Next ›" style={styles.half} onPress={actions.next} disabled={busy} />
      </View>
      <View style={styles.row}>
        <BigButton label="Listen" variant="secondary" style={styles.half} onPress={actions.repeat} />
        <BigButton label={helpOpen ? 'Hide help' : "I don't see that"} variant="warm" style={styles.half} onPress={() => setHelpOpen((o) => !o)} />
      </View>
      <View style={styles.row}>
        <MicButton compact hideLabel state={micState} onPress={onMic} />
        <View style={{ flex: 1 }}>
          <Text style={styles.micLabel}>{speech.listening ? (speech.transcript || 'Listening…') : speaking ? 'Pally is talking' : 'Say “next” or tap'}</Text>
          <BigButton label="Stop" variant="danger" onPress={actions.stop} />
        </View>
      </View>
    </View>
  );
  return (
    <Screen title={g.task.title} waves={false} footer={footer}>
      <Text style={styles.progress} accessibilityLiveRegion="polite">{progressLabel(g)}</Text>
      <View style={[styles.bar, { backgroundColor: c.greenSoft }]}><View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: c.teal }]} /></View>
      <View style={[styles.stepCard, { backgroundColor: c.card }]}>
        <Text style={[styles.stepText, { color: c.tealDark }]} accessibilityRole="header">{step.instruction}</Text>
      </View>
      <BigButton label="Explain differently" variant="secondary" onPress={() => actions.explain()} disabled={busy} />
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: 10 },
  big: { fontSize: 32, fontWeight: '900', textAlign: 'center' },
  progress: { fontSize: 18, fontWeight: '800', color: colors.coralDark },
  bar: { height: 10, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5 },
  stepCard: { borderRadius: 26, padding: 22, elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8 },
  stepText: { fontSize: 30, lineHeight: 42, fontWeight: '800' },
  body: { fontSize: 20, lineHeight: 29, color: colors.text },
  small: { fontSize: 16, lineHeight: 23, color: colors.muted },
  footer: { padding: 14, paddingTop: 8, gap: 8 },
  micLabel: { fontSize: 16, fontWeight: '700', color: colors.teal, marginBottom: 4 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  half: { flex: 1, paddingHorizontal: 6 },
});

