export type VoiceCommand = 'next' | 'repeat' | 'explain' | 'help' | 'stop' | 'slower' | 'yes' | 'no' | null;

/**
 * Map a short spoken phrase to a control. Deliberately conservative: long phrases
 * return null so a stray sentence never advances a task.
 */
export function parseCommand(raw: string): VoiceCommand {
  const t = raw.toLowerCase().replace(/[^a-z' ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t || t.split(' ').length > 6) return null;
  const has = (...w: string[]) => w.some((x) => new RegExp(`\\b${x}\\b`).test(t));
  if (has('stop', 'cancel', 'quit', 'never mind', 'nevermind')) return 'stop';
  if (has('repeat', 'again', 'say that again', 'pardon')) return 'repeat';
  if (has('explain', 'differently', "don't understand", 'confused', "don't see", "can't find", 'different')) return 'explain';
  if (has('slower', 'slow down')) return 'slower';
  if (has('help')) return 'help';
  if (has('next', 'done', 'continue', 'finished', 'ok', 'okay', 'go on', 'ready', 'did it')) return 'next';
  if (has('yes', 'yeah', 'sure', 'proceed')) return 'yes';
  if (has('no', 'nope')) return 'no';
  return null;
}
