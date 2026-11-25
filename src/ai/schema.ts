import { z } from 'zod';

/** Shared by the app and the proxy server. Pure TS (no React Native imports). */

export const RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const MAX_STEPS = 12;
export const MAX_INSTRUCTION_LENGTH = 500;
export const MAX_SPEAK_LENGTH = 300;

const riskSchema = z
  .object({
    level: z.enum(RISK_LEVELS).catch('low'),
    reasons: z.array(z.string()).catch([]),
    requireConfirmation: z.boolean().catch(false),
  })
  .catch({ level: 'low', reasons: [], requireConfirmation: false });

const androidHintSchema = z
  .object({
    intentAction: z.string().nullable().catch(null),
    settingsPathHint: z.string().nullable().catch(null),
  })
  .catch({ intentAction: null, settingsPathHint: null });

const rawStepSchema = z.object({
  id: z.string().optional(),
  order: z.number().optional(),
  instruction: z.string(),
  speakText: z.string().optional(),
  waitForUser: z.boolean().catch(true),
  risk: riskSchema,
  androidHint: androidHintSchema.optional(),
});

const rawResponseSchema = z.object({
  requestId: z.string().optional(),
  assistantName: z.string().optional(),
  task: z.object({
    taskId: z.string().optional(),
    title: z.string(),
    summary: z.string().catch(''),
    estimatedSteps: z.number().optional(),
  }),
  steps: z.array(rawStepSchema),
  safety: z
    .object({
      overallRisk: z.enum(RISK_LEVELS).catch('low'),
      scamSignals: z.array(z.string()).catch([]),
      blockTask: z.boolean().catch(false),
      userWarning: z.string().nullable().catch(null),
    })
    .catch({ overallRisk: 'low', scamSignals: [], blockTask: false, userWarning: null }),
  meta: z.object({ model: z.string().optional(), promptVersion: z.string().optional() }).optional(),
});

export type GuidanceStep = {
  id: string;
  order: number;
  instruction: string;
  speakText: string;
  waitForUser: boolean;
  risk: { level: RiskLevel; reasons: string[]; requireConfirmation: boolean };
  androidHint: { intentAction: string | null; settingsPathHint: string | null };
};

export type GuidanceSafety = {
  overallRisk: RiskLevel;
  scamSignals: string[];
  blockTask: boolean;
  userWarning: string | null;
};

export type GuidanceResponse = {
  requestId: string;
  task: { taskId: string; title: string; summary: string };
  steps: GuidanceStep[];
  safety: GuidanceSafety;
  /** How many steps were removed by client-side validation. */
  strippedSteps: number;
};

export type ParseResult = { ok: true; value: GuidanceResponse } | { ok: false; error: string };

/** Steps that ask the user to type secrets into Pally are never shown. */
const SECRET_REQUEST =
  /\b(?:tell|type|enter|paste|share|send|read(?:\s+out)?|give|say)\b[^.]{0,60}\b(?:password|passcode|pin\b|otp|one[- ]time (?:code|password)|verification code|security code|cvv|card number|social security|ssn)\b/i;

export function asksForSecret(text: string): boolean {
  return SECRET_REQUEST.test(text);
}

function clip(text: string, max: number): string {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Validate untrusted AI output. Accepts a JSON string or an already parsed object.
 * Never throws.
 */
export function parseGuidance(input: unknown, fallbackRequestId = 'local'): ParseResult {
  let data: unknown = input;
  if (typeof input === 'string') {
    try {
      data = JSON.parse(stripFence(input));
    } catch {
      return { ok: false, error: 'The answer was not valid JSON.' };
    }
  }
  const parsed = rawResponseSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: 'The answer was missing required parts.' };
  const raw = parsed.data;

  const sorted = raw.steps
    .map((s, i) => ({ s, i }))
    .sort((a, b) => (a.s.order ?? a.i + 1) - (b.s.order ?? b.i + 1) || a.i - b.i)
    .map(({ s }) => s);

  const usable = sorted.filter((s) => s.instruction.trim().length > 0 && !asksForSecret(s.instruction));
  const strippedSteps = raw.steps.length - usable.length;
  const capped = usable.slice(0, MAX_STEPS);
  if (capped.length === 0) return { ok: false, error: 'The answer had no usable steps.' };

  const steps: GuidanceStep[] = capped.map((s, i) => {
    const instruction = clip(s.instruction, MAX_INSTRUCTION_LENGTH);
    const speak = s.speakText && s.speakText.trim() && !asksForSecret(s.speakText) ? s.speakText : instruction;
    return {
      id: s.id?.trim() || `step_${i + 1}`,
      order: i + 1,
      instruction,
      speakText: clip(speak, MAX_SPEAK_LENGTH),
      waitForUser: s.waitForUser,
      risk: s.risk,
      androidHint: s.androidHint ?? { intentAction: null, settingsPathHint: null },
    };
  });

  return {
    ok: true,
    value: {
      requestId: raw.requestId ?? fallbackRequestId,
      task: {
        taskId: raw.task.taskId?.trim() || `task_${Date.now().toString(36)}`,
        title: clip(raw.task.title, 120) || 'Your task',
        summary: clip(raw.task.summary, 300),
      },
      steps,
      safety: raw.safety,
      strippedSteps,
    },
  };
}

function stripFence(text: string): string {
  const t = text.trim();
  const m = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(t);
  return m ? m[1] : t;
}

// ---------- Request (app -> proxy) ----------

export const guidanceRequestSchema = z.object({
  requestId: z.string().max(80),
  locale: z.string().max(20).default('en-US'),
  userUtterance: z.string().min(1).max(600),
  mode: z.enum(['new_task', 'clarify', 'correction']).default('new_task'),
  device: z
    .object({
      platform: z.string().max(20),
      manufacturer: z.string().max(60).nullable().optional(),
      model: z.string().max(80).nullable().optional(),
      sdkInt: z.number().nullable().optional(),
      osVersion: z.string().max(20).nullable().optional(),
      languageTag: z.string().max(20).optional(),
    })
    .optional(),
  screenContext: z
    .object({ available: z.boolean(), source: z.string().max(30), summary: z.string().max(500).nullable() })
    .optional(),
  activeTask: z
    .object({
      taskId: z.string().max(80),
      title: z.string().max(200),
      currentStepIndex: z.number(),
      currentStepId: z.string().max(80),
      currentStepText: z.string().max(600),
    })
    .nullable()
    .optional(),
  clarification: z
    .object({ reason: z.enum(['step_not_found', 'explain_differently', 'too_fast', 'wrong_answer', 'other']) })
    .nullable()
    .optional(),
});

export type GuidanceRequest = z.infer<typeof guidanceRequestSchema>;
