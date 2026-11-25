import type { GuidanceResponse, GuidanceStep, RiskLevel } from '@/ai/schema';

/** Pure safety logic (no React Native imports) so it is easy to unit test. */

const ORDER: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };
export const maxRisk = (a: RiskLevel, b: RiskLevel): RiskLevel => (ORDER[a] >= ORDER[b] ? a : b);

export const SCAM_TIP =
  'Pally, your bank, and the government will never ask for your passwords or codes by phone or text. If someone is rushing you, hang up and call a family member.';

// ---------- Redaction before anything leaves the phone or is stored ----------

export function redactSecrets(text: string): string {
  return text
    .replace(/\b(?:\d[ -]?){13,19}\b/g, '[card number removed]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[number removed]')
    .replace(/\b(?:password|passcode|pin|otp|code)\s*(?:is|:|=)?\s*\S{3,}/gi, '$1 [removed]');
}

// ---------- What the user says (before asking AI) ----------

export type RequestVerdict =
  | { kind: 'ok' }
  | { kind: 'warn'; title: string; message: string; signals: string[] }
  | { kind: 'block'; title: string; message: string; signals: string[] };

const SCAM_PATTERNS: { signal: string; re: RegExp }[] = [
  { signal: 'remote_access', re: /\b(any ?desk|team ?viewer|remote (?:access|control|support)|quick ?support|let (?:him|her|them) (?:in|control))\b/i },
  { signal: 'gift_cards', re: /\bgift ?cards?\b/i },
  { signal: 'urgency', re: /\b(caller|someone|they|he|she) (?:said|told|is saying|keeps saying)[^.]{0,60}\b(urgent|immediately|right now|arrest|suspend|locked|virus|hacked)\b/i },
  { signal: 'payment_pressure', re: /\b(wire|send|transfer)\b[^.]{0,40}\b(money|funds|bitcoin|crypto)\b[^.]{0,40}\b(stranger|caller|someone|prize|lottery|irs)\b/i },
];

const SECRET_SHARING = /\b(?:share|send|tell|give|read)\b[^.]{0,50}\b(?:password|passcode|pin|otp|verification code|security code|card number|cvv)\b[^.]{0,40}\b(?:someone|caller|stranger|them|him|her|text|phone)\b/i;

export function checkRequest(text: string): RequestVerdict {
  if (SECRET_SHARING.test(text)) {
    return {
      kind: 'block',
      title: 'Please stop for a moment',
      message: `Sharing a password, PIN, or code with someone else is how scams work. ${SCAM_TIP}`,
      signals: ['credential_request'],
    };
  }
  const signals = SCAM_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.signal);
  if (signals.length > 0) {
    return {
      kind: 'warn',
      title: 'This could be a scam',
      message: `Some of what you described is common in scams. ${SCAM_TIP}`,
      signals,
    };
  }
  return { kind: 'ok' };
}

// ---------- A guidance step (after AI) ----------

const SENSITIVE_STEP: { re: RegExp; level: RiskLevel; reason: string }[] = [
  { re: /\b(factory reset|erase all|wipe)\b/i, level: 'critical', reason: 'This can erase everything on your phone.' },
  { re: /\b(delete|uninstall|remove)\b/i, level: 'high', reason: 'This may remove something you cannot get back.' },
  { re: /\b(pay|payment|purchase|buy|subscribe|transfer|send money|bank|card)\b/i, level: 'high', reason: 'This involves money.' },
  { re: /\b(remote|screen sharing|share your screen|accessibility service|device admin)/i, level: 'high', reason: 'This could give someone else control of your phone.' },
  { re: /\b(install|download)\b/i, level: 'medium', reason: 'Only install apps you chose yourself from the Play Store.' },
  { re: /\b(allow|grant|permission|location|contacts|camera|microphone)\b/i, level: 'medium', reason: 'This changes what an app is allowed to see or do.' },
  { re: /\b(password|passcode|pin|verification code|otp|sign in|log in)\b/i, level: 'medium', reason: 'This involves a password or code. Never share it with anyone else.' },
];

export type StepGate = {
  needsConfirm: boolean;
  level: RiskLevel;
  /** 'soft' = simple continue/cancel. 'hard' = warning screen with Stop as the default. */
  strength: 'none' | 'soft' | 'hard';
  reasons: string[];
  headline: string;
};

export function gateStep(step: GuidanceStep, safety: GuidanceResponse['safety']): StepGate {
  let level = step.risk.level;
  const reasons = [...step.risk.reasons.map(humanizeReason)];
  for (const rule of SENSITIVE_STEP) {
    if (rule.re.test(step.instruction)) {
      level = maxRisk(level, rule.level);
      if (!reasons.includes(rule.reason)) reasons.push(rule.reason);
    }
  }
  // Task-level high risk raises the floor for every step.
  if (ORDER[safety.overallRisk] >= ORDER.high) level = maxRisk(level, 'high');

  const needsConfirm = step.risk.requireConfirmation || ORDER[level] >= ORDER.medium;
  const strength = !needsConfirm ? 'none' : ORDER[level] >= ORDER.high ? 'hard' : 'soft';
  const headline =
    level === 'critical' ? 'Stop and think' : level === 'high' ? 'Careful: this one matters' : 'Quick check before we go on';
  return { needsConfirm, level, strength, reasons: dedupe(reasons), headline };
}

function humanizeReason(reason: string): string {
  if (reason === 'possible_scam_pressure') return 'This may be a scam. Do not rush.';
  return reason.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) + (/[.!?]$/.test(reason) ? '' : '.');
}

const dedupe = (xs: string[]) => [...new Set(xs)];

/** Task-level gate: blocked tasks never show steps; high risk shows a warning first. */
export function gateTask(safety: GuidanceResponse['safety']): { action: 'proceed' | 'warn' | 'block'; message: string | null } {
  const msg = safety.userWarning ?? (safety.scamSignals.length ? SCAM_TIP : null);
  if (safety.blockTask) return { action: 'block', message: msg ?? SCAM_TIP };
  if (ORDER[safety.overallRisk] >= ORDER.high || safety.scamSignals.length > 0) return { action: 'warn', message: msg ?? SCAM_TIP };
  return { action: 'proceed', message: null };
}
