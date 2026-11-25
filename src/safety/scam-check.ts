export type ScamLevel = 'likely_scam' | 'careful' | 'looks_ok';
export type ScamResult = { level: ScamLevel; title: string; reasons: string[]; advice: string };

const SIGNALS: { re: RegExp; reason: string; weight: number }[] = [
  { re: /\b(gift ?cards?|itunes|google play card|bitcoin|crypto|wire transfer|western union)\b/i, reason: 'It asks for gift cards, crypto or a wire transfer.', weight: 3 },
  { re: /\b(otp|one[- ]time (code|password)|verification code|pin\b|password|passcode|cvv|card number|ssn|social security)/i, reason: 'It asks for a code, password or private number.', weight: 3 },
  { re: /\b(urgent|immediately|right now|within 24 hours|final notice|last warning|act now|suspended|locked|expire[sd]?)\b/i, reason: 'It tries to rush you.', weight: 2 },
  { re: /(https?:\/\/|www\.|bit\.ly|tinyurl)/i, reason: 'It contains a link. Do not tap links you were not expecting.', weight: 2 },
  { re: /\b(you (have )?won|prize|lottery|inheritance|refund|free money)\b/i, reason: 'It promises money or a prize.', weight: 2 },
  { re: /\b(remote access|anydesk|teamviewer|install (this )?app|download (this )?app)\b/i, reason: 'It asks you to install an app or give remote access.', weight: 3 },
  { re: /\b(grandson|grandchild|son|daughter).*(trouble|jail|accident|hospital|new number)\b/i, reason: 'It pretends to be a family member in trouble.', weight: 2 },
  { re: /\b(bank|irs|tax|police|microsoft|amazon|paypal).*(verify|confirm|update|account|warrant|arrest)\b/i, reason: 'It claims to be from a bank or official group.', weight: 2 },
  { re: /\bdon'?t tell (anyone|anybody)|keep (this|it) (a )?secret\b/i, reason: 'It tells you to keep it secret.', weight: 3 },
];

/** Offline, rule-based first check. Never replaces common sense. */
export function checkSuspicious(text: string): ScamResult {
  const hits = SIGNALS.filter((s) => s.re.test(text));
  const score = hits.reduce((n, h) => n + h.weight, 0);
  const reasons = hits.map((h) => h.reason);
  if (score >= 5)
    return { level: 'likely_scam', title: 'This looks like a scam', reasons, advice: 'Do not reply, tap links, or share anything. Hang up or delete it. If unsure, call someone you trust.' };
  if (score >= 2)
    return { level: 'careful', title: 'Be careful with this', reasons, advice: 'Do not share personal information or make payments. Contact the real company using a number you already know.' };
  return { level: 'looks_ok', title: 'No clear warning signs', reasons: ['I did not spot common scam tricks.'], advice: 'When in doubt, do not share personal information or make payments. Ask someone you trust.' };
}
