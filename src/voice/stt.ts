/**
 * Speech-to-text wrapper around `expo-speech-recognition`.
 *
 * That package ships native code, so it does NOT run in Expo Go. We load it lazily:
 * in Expo Go `isSttSupported()` is false and the app falls back to typing, with an
 * explanation. In a development build (`npx expo run:android` or EAS dev client) it works.
 */
import type { ExpoSpeechRecognitionModuleType } from 'expo-speech-recognition/build/ExpoSpeechRecognitionModule.types';

export type MicPermission = 'unknown' | 'granted' | 'denied' | 'blocked' | 'unsupported';

let mod: ExpoSpeechRecognitionModuleType | null | undefined;

function getModule(): ExpoSpeechRecognitionModuleType | null {
  if (mod !== undefined) return mod;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('expo-speech-recognition').ExpoSpeechRecognitionModule as ExpoSpeechRecognitionModuleType;
  } catch {
    mod = null; // Expo Go / web: native module missing
  }
  return mod;
}

export function isSttSupported(): boolean {
  const m = getModule();
  if (!m) return false;
  try {
    return m.isRecognitionAvailable();
  } catch {
    return false;
  }
}

function toPermission(r: { granted: boolean; canAskAgain: boolean }): MicPermission {
  if (r.granted) return 'granted';
  return r.canAskAgain ? 'denied' : 'blocked';
}

export async function checkMicPermission(): Promise<MicPermission> {
  const m = getModule();
  if (!m || !isSttSupported()) return 'unsupported';
  try {
    const r = await m.getPermissionsAsync();
    return r.granted ? 'granted' : r.status === 'undetermined' ? 'unknown' : toPermission(r);
  } catch {
    return 'unsupported';
  }
}

export async function requestMicPermission(): Promise<MicPermission> {
  const m = getModule();
  if (!m || !isSttSupported()) return 'unsupported';
  try {
    return toPermission(await m.requestPermissionsAsync());
  } catch {
    return 'unsupported';
  }
}

export type SttHandlers = {
  onStart: () => void;
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (message: string, code: string) => void;
  onEnd: () => void;
};

/** Starts one recognition session. Returns a function that cancels it and detaches listeners. */
export function startListening(h: SttHandlers): () => void {
  const m = getModule();
  if (!m) {
    h.onError('Voice is not available in this version of the app.', 'unsupported');
    h.onEnd();
    return () => undefined;
  }
  const subs = [
    m.addListener('start', () => h.onStart()),
    m.addListener('result', (e) => {
      const text = e.results?.[0]?.transcript?.trim() ?? '';
      if (!text) return;
      if (e.isFinal) h.onFinal(text);
      else h.onPartial(text);
    }),
    m.addListener('error', (e) => {
      const quiet = e.error === 'aborted' || e.error === 'no-speech';
      h.onError(
        e.error === 'no-speech' ? "I didn't hear anything. Tap the microphone and try again, or type instead." : quiet ? '' : friendlyError(e.error),
        e.error,
      );
    }),
    m.addListener('end', () => h.onEnd()),
  ];
  const detach = () => subs.forEach((s) => s.remove());
  try {
    m.start({ lang: 'en-US', interimResults: true, continuous: false, maxAlternatives: 1 });
  } catch {
    detach();
    h.onError('Could not start listening. Please type instead.', 'start_failed');
    h.onEnd();
    return () => undefined;
  }
  return () => {
    try {
      m.abort();
    } catch {
      /* ignore */
    }
    detach();
  };
}

export function stopListening(): void {
  try {
    getModule()?.stop();
  } catch {
    /* ignore */
  }
}

function friendlyError(code: string): string {
  switch (code) {
    case 'not-allowed':
      return 'Pally needs microphone permission to hear you. You can type instead.';
    case 'network':
    case 'service-not-allowed':
      return 'Voice recognition needs a connection or the Google voice service. You can type instead.';
    case 'language-not-supported':
      return 'This phone cannot recognise English speech right now. You can type instead.';
    default:
      return "I couldn't hear that clearly. Please try again, or type instead.";
  }
}
