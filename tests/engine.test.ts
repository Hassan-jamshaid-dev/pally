import { describe, expect, it } from 'vitest';
import { parseGuidance, type GuidanceResponse } from '@/ai/schema';
import { currentStep, guidanceReducer, startGuidance } from '@/guidance/engine';
import { response, step } from './fixtures';

function make(steps: unknown[], safety: Record<string, unknown> = {}): GuidanceResponse {
  const r = parseGuidance(response(steps, safety));
  if (!r.ok) throw new Error('fixture invalid');
  return r.value;
}

describe('guidance engine', () => {
  const simple = () => make([step('step_1', 'Open Settings.'), step('step_2', 'Look at the screen.')]);

  it('shows step 1 only and advances one step at a time to completion', () => {
    let s = startGuidance(simple());
    expect(s.status).toBe('step');
    expect(currentStep(s)?.id).toBe('step_1');
    s = guidanceReducer(s, { type: 'next' });
    expect(currentStep(s)?.id).toBe('step_2');
    s = guidanceReducer(s, { type: 'next' });
    expect(s.status).toBe('complete');
  });

  it('repeat keeps the step and bumps the speak nonce', () => {
    const s = startGuidance(simple());
    const r = guidanceReducer(s, { type: 'repeat' });
    expect(r.index).toBe(0);
    expect(r.speakNonce).toBe(s.speakNonce + 1);
  });

  it('stop ends the task and cannot be undone by next', () => {
    let s = startGuidance(simple());
    s = guidanceReducer(s, { type: 'stop' });
    expect(s.status).toBe('stopped');
    expect(guidanceReducer(s, { type: 'next' }).status).toBe('stopped');
  });

  it('pauses on a risky step and will not advance until confirmed', () => {
    let s = startGuidance(make([step('step_1', 'Open Settings.'), step('step_2', 'Tap Delete account.', { level: 'high', requireConfirmation: true })]));
    s = guidanceReducer(s, { type: 'next' });
    expect(s.status).toBe('step_confirm');
    expect(s.gate?.strength).toBe('hard');
    expect(guidanceReducer(s, { type: 'next' }).status).toBe('step_confirm'); // cannot skip the gate
    expect(guidanceReducer(s, { type: 'confirm' }).status).toBe('step');
    expect(guidanceReducer(s, { type: 'decline' }).status).toBe('stopped');
  });

  it('gates a risky first step too', () => {
    const s = startGuidance(make([step('step_1', 'Pay the bill with your card.')]));
    expect(s.status).toBe('step_confirm');
  });

  it('shows a task warning for scam signals and blocks blocked tasks', () => {
    const warn = startGuidance(make([step('step_1', 'Hang up.')], { scamSignals: ['urgency'], userWarning: 'Someone may be rushing you.' }));
    expect(warn.status).toBe('task_warning');
    expect(guidanceReducer(warn, { type: 'next' }).status).toBe('task_warning'); // must acknowledge
    expect(guidanceReducer(warn, { type: 'ack_warning' }).status).toMatch(/step/);

    const blocked = startGuidance(make([step('step_1', 'Stop.')], { blockTask: true }));
    expect(blocked.status).toBe('blocked');
    expect(guidanceReducer(blocked, { type: 'ack_warning' }).status).toBe('blocked');
  });

  it('replace_remaining swaps current and later steps, keeps earlier ones, and re-gates', () => {
    let s = startGuidance(make([step('step_1', 'Open Settings.'), step('step_2', 'Tap Display.'), step('step_3', 'Tap Font size.')]));
    s = guidanceReducer(s, { type: 'next' });
    const fresh = make([step('step_2', 'Look for the word Display, then tap it.')]).steps;
    s = guidanceReducer(s, { type: 'replace_remaining', steps: fresh });
    expect(s.steps).toHaveLength(2);
    expect(s.steps[0].instruction).toBe('Open Settings.');
    expect(currentStep(s)?.instruction).toMatch(/Look for the word/);
    expect(new Set(s.steps.map((x) => x.id)).size).toBe(2);
  });
});
