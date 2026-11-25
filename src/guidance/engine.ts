import type { GuidanceResponse, GuidanceStep } from '@/ai/schema';
import { gateStep, gateTask, type StepGate } from '@/safety/rules';

/**
 * Guidance engine: a pure reducer. One instruction at a time, never skips ahead,
 * and the safety gate runs before any step is shown.
 */

export type GuidanceStatus =
  | 'task_warning' // task-level scam/risk warning must be acknowledged first
  | 'blocked' // task refused by safety
  | 'step' // showing a step
  | 'step_confirm' // step needs explicit confirmation before it is shown
  | 'complete'
  | 'stopped';

export type GuidanceState = {
  status: GuidanceStatus;
  task: GuidanceResponse['task'];
  safety: GuidanceResponse['safety'];
  steps: GuidanceStep[];
  index: number;
  /** Step ids the user has confirmed through the safety gate. */
  confirmedIds: string[];
  /** Bumped by Repeat so the UI knows to read the step aloud again. */
  speakNonce: number;
  gate: StepGate | null;
  warning: string | null;
  startedAt: number;
};

export type GuidanceAction =
  | { type: 'ack_warning' }
  | { type: 'next' }
  | { type: 'repeat' }
  | { type: 'confirm' }
  | { type: 'decline' }
  | { type: 'stop' }
  | { type: 'replace_remaining'; steps: GuidanceStep[] };

export function startGuidance(response: GuidanceResponse, now = Date.now()): GuidanceState {
  const verdict = gateTask(response.safety);
  const base: GuidanceState = {
    status: 'step',
    task: response.task,
    safety: response.safety,
    steps: response.steps,
    index: 0,
    confirmedIds: [],
    speakNonce: 0,
    gate: null,
    warning: verdict.message,
    startedAt: now,
  };
  if (verdict.action === 'block') return { ...base, status: 'blocked' };
  if (verdict.action === 'warn') return { ...base, status: 'task_warning' };
  return enterStep(base, 0);
}

/** Move to a step, applying the safety gate first. */
function enterStep(state: GuidanceState, index: number): GuidanceState {
  if (index >= state.steps.length) return { ...state, index: state.steps.length - 1, status: 'complete', gate: null };
  const step = state.steps[index];
  const gate = gateStep(step, state.safety);
  const needs = gate.needsConfirm && !state.confirmedIds.includes(step.id);
  return {
    ...state,
    index,
    gate: needs ? gate : null,
    status: needs ? 'step_confirm' : 'step',
    speakNonce: state.speakNonce + 1,
  };
}

export function guidanceReducer(state: GuidanceState, action: GuidanceAction): GuidanceState {
  switch (action.type) {
    case 'ack_warning':
      return state.status === 'task_warning' ? enterStep(state, 0) : state;
    case 'next':
      // Cannot advance past an unconfirmed gate.
      return state.status === 'step' ? enterStep(state, state.index + 1) : state;
    case 'repeat':
      return state.status === 'step' || state.status === 'step_confirm'
        ? { ...state, speakNonce: state.speakNonce + 1 }
        : state;
    case 'confirm': {
      if (state.status !== 'step_confirm') return state;
      const id = state.steps[state.index].id;
      return { ...state, confirmedIds: [...state.confirmedIds, id], gate: null, status: 'step', speakNonce: state.speakNonce + 1 };
    }
    case 'decline':
    case 'stop':
      return state.status === 'complete' ? state : { ...state, status: 'stopped', gate: null };
    case 'replace_remaining': {
      if (action.steps.length === 0) return state;
      const kept = state.steps.slice(0, state.index);
      const steps = [...kept, ...action.steps.map((s, i) => ({ ...s, id: uniqueId(s.id, kept, i), order: kept.length + i + 1 }))];
      return enterStep({ ...state, steps, confirmedIds: state.confirmedIds.filter((id) => kept.some((k) => k.id === id)) }, state.index);
    }
  }
}

function uniqueId(id: string, kept: GuidanceStep[], i: number): string {
  return kept.some((k) => k.id === id) ? `${id}_r${kept.length + i + 1}` : id;
}

export const currentStep = (s: GuidanceState): GuidanceStep | null => s.steps[s.index] ?? null;
export const isActive = (s: GuidanceState) => s.status === 'step' || s.status === 'step_confirm' || s.status === 'task_warning';
export const progressLabel = (s: GuidanceState) => `Step ${Math.min(s.index + 1, s.steps.length)} of ${s.steps.length}`;
