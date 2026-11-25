import { useCallback, useEffect, useRef, useState } from 'react';
import { checkMicPermission, isSttSupported, requestMicPermission, startListening, stopListening, type MicPermission } from './stt';
import { stopSpeaking } from './tts';

export type SpeechInput = {
  listening: boolean;
  /** Live transcript while listening, last transcript afterwards. */
  transcript: string;
  permission: MicPermission;
  /** Plain-language message to show (denied, unsupported, error). null if all is well. */
  notice: string | null;
  toggle: () => Promise<void>;
  clearTranscript: () => void;
  clearNotice: () => void;
};

export const UNSUPPORTED_NOTICE =
  'Voice listening is not available in this version of Pally (for example Expo Go). You can type your question instead.';
export const DENIED_NOTICE =
  'Pally cannot hear you because microphone permission is off. You can type instead, or turn the microphone on in Settings.';

/** Speech-to-text with permission handling. Calls onFinal once with the recognised text. */
export function useSpeechInput(onFinal: (text: string) => void): SpeechInput {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [permission, setPermission] = useState<MicPermission>('unknown');
  const [notice, setNotice] = useState<string | null>(null);
  const cancel = useRef<(() => void) | null>(null);
  const finalRef = useRef(onFinal);
  finalRef.current = onFinal;
  const delivered = useRef(false);

  useEffect(() => {
    checkMicPermission().then(setPermission);
    return () => {
      cancel.current?.();
    };
  }, []);

  const toggle = useCallback(async () => {
    if (listening) {
      stopListening();
      return;
    }
    stopSpeaking(); // never talk over the user
    setNotice(null);
    if (!isSttSupported()) {
      setPermission('unsupported');
      setNotice(UNSUPPORTED_NOTICE);
      return;
    }
    let perm = permission;
    if (perm !== 'granted') {
      perm = await requestMicPermission();
      setPermission(perm);
    }
    if (perm !== 'granted') {
      setNotice(perm === 'unsupported' ? UNSUPPORTED_NOTICE : DENIED_NOTICE);
      return;
    }
    delivered.current = false;
    setTranscript('');
    cancel.current?.();
    cancel.current = startListening({
      onStart: () => setListening(true),
      onPartial: setTranscript,
      onFinal: (text) => {
        setTranscript(text);
        if (!delivered.current) {
          delivered.current = true;
          finalRef.current(text);
        }
      },
      onError: (message) => {
        if (message) setNotice(message);
      },
      onEnd: () => setListening(false),
    });
  }, [listening, permission]);

  return {
    listening,
    transcript,
    permission,
    notice,
    toggle,
    clearTranscript: () => setTranscript(''),
    clearNotice: () => setNotice(null),
  };
}
