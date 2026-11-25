import { Redirect, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/presentation/components/app-text';
import { HeaderButton, Mascot, Screen, mascot } from '@/presentation/components/screen';
import { useTheme } from '@/presentation/use-theme';
import { friendlyAiError } from '@/ai/client';
import { colors } from '@/constants/theme';
import { parseCommand } from '@/guidance/commands';
import { currentStep, progressLabel } from '@/guidance/engine';
import { BigButton } from '@/presentation/components/big-button';
import { ChatBar } from '@/presentation/components/chat-bar';
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
  const [followUp, setFollowUp] = useState('');
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

  const askFollowUp = () => {
    const q = followUp.trim();
    if (!q) return;
    stopSpeaking();
    endSession();
    router.replace({ pathname: '/ask', params: { q, auto: '1' } });
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

  // ---- Normal step: chat-style ----
  const total = g.steps.length;
  const total1 = Math.max(total, 1);
  const stepNo = Math.min(g.index + 1, total1);
  const footer = (
    <View style={[styles.footer, { backgroundColor: c.cream }]}>
      <View style={styles.row}>
        <BigButton label="‹ Back" variant="secondary" style={styles.half} onPress={() => dispatch({ type: 'previous' })} disabled={busy || g.index === 0} />
        <BigButton label="Next ›" style={styles.half} onPress={actions.next} disabled={busy} />
      </View>
      <ChatBar
        value={speech.listening ? speech.transcript : followUp}
        onChangeText={setFollowUp}
        onSubmit={askFollowUp}
        placeholder={speech.listening ? 'Listening…' : speaking ? 'Pally is talking…' : 'Ask a follow-up...'}
        accessibilityLabel="Ask a follow-up question, or say next, repeat, or stop"
        micState={micState}
        onMic={onMic}
      />
    </View>
  );
  return (
    <Screen
      brand
      back
      onBack={leave}
      right={<HeaderButton glyph="⋮" label="Menu" onPress={() => router.push('/menu')} />}
      waves={false}
      footer={footer}>
      <View style={[styles.userBubble, { backgroundColor: c.teal }]}>
        <Text style={styles.userText}>{session.question}</Text>
      </View>
      <View style={styles.pallyRow}>
        <Image source={mascot} style={styles.avatar} contentFit="contain" />
        <View style={[styles.pallyBubble, { backgroundColor: c.greenSoft }]}>
          <Text style={styles.pallyText}>{stepNo === 1 ? "Of course! Let's do it together." : 'Nice! Here is the next step.'}</Text>
        </View>
      </View>

      <View style={[styles.stepCard, { backgroundColor: c.card }]}>
        <View style={[styles.pill, { backgroundColor: c.greenSoft }]}>
          <Text style={[styles.pillText, { color: c.tealDark }]} accessibilityLiveRegion="polite">{progressLabel(g)}</Text>
        </View>
        <Text style={[styles.stepText, { color: c.tealDark }]} accessibilityRole="header">{step.instruction}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Read this step aloud" onPress={actions.repeat} style={styles.takeTime}>
          <Text style={{ fontSize: 22, color: c.teal }}>🔊</Text>
          <Text style={styles.small}>Take your time.</Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        <Chip glyph="↻" label="Repeat" onPress={actions.repeat} />
        <Chip glyph="💡" label="Explain differently" onPress={() => actions.explain()} disabled={busy} />
      </View>
      <View style={styles.row}>
        <Chip glyph="?" label={helpOpen ? 'Hide help' : "I don't see that"} onPress={() => setHelpOpen((o) => !o)} />
        <Chip glyph="■" label="Stop" onPress={actions.stop} />
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
    </Screen>
  );
}

function Chip({ glyph, label, onPress, disabled }: { glyph: string; label: string; onPress: () => void; disabled?: boolean }) {
  const { c, target } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.chip, { backgroundColor: c.card, minHeight: target, borderColor: c.sage }, disabled && { opacity: 0.45 }]}>
      <Text style={{ fontSize: 20, color: c.teal }}>{glyph}</Text>
      <Text style={[styles.chipText, { color: c.tealDark }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: 10 },
  big: { fontSize: 32, fontWeight: '900', textAlign: 'center' },
  body: { fontSize: 20, lineHeight: 29, color: colors.text },
  small: { fontSize: 17, lineHeight: 23, color: colors.muted },
  userBubble: { alignSelf: 'flex-end', maxWidth: '82%', borderRadius: 22, borderBottomRightRadius: 6, paddingHorizontal: 18, paddingVertical: 14 },
  userText: { color: '#FFFFFF', fontSize: 19, lineHeight: 26 },
  pallyRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  avatar: { width: 48, height: 48, borderRadius: 14 },
  pallyBubble: { flexShrink: 1, borderRadius: 22, borderBottomLeftRadius: 6, paddingHorizontal: 18, paddingVertical: 14 },
  pallyText: { fontSize: 19, lineHeight: 26, color: colors.text },
  stepCard: { borderRadius: 28, padding: 20, gap: 12, elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8 },
  pill: { alignSelf: 'flex-start', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6 },
  pillText: { fontSize: 16, fontWeight: '800' },
  stepText: { fontSize: 28, lineHeight: 38, fontWeight: '800' },
  takeTime: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  chip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 32, borderWidth: 2, paddingHorizontal: 10 },
  chipText: { fontSize: 16, fontWeight: '700', flexShrink: 1, textAlign: 'center' },
  footer: { paddingTop: 8, gap: 2 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingHorizontal: 0 },
  half: { flex: 1, paddingHorizontal: 6 },
});