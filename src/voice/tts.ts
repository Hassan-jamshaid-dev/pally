import * as Speech from 'expo-speech';
import type { SpeechPace } from '@/data/store';

const RATE: Record<SpeechPace, number> = { slow: 0.8, normal: 1.0 };

/** Read text aloud. Interrupts anything already being spoken. Never throws. */
export function speak(text: string, pace: SpeechPace, handlers: { onStart?: () => void; onDone?: () => void } = {}): void {
  try {
    Speech.stop();
    Speech.speak(text, {
      language: 'en-US',
      rate: RATE[pace],
      pitch: 1.0,
      onStart: handlers.onStart,
      onDone: handlers.onDone,
      onStopped: handlers.onDone,
      onError: handlers.onDone,
    });
  } catch {
    handlers.onDone?.();
  }
}

export function stopSpeaking(): void {
  try {
    Speech.stop();
  } catch {
    /* ignore */
  }
}
