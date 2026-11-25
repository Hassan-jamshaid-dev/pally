import { describe, expect, it } from 'vitest';
import { asksForSecret, MAX_STEPS, parseGuidance } from '@/ai/schema';
import { response, step } from './fixtures';

describe('parseGuidance', () => {
  it('accepts a valid object and a JSON string, including fenced JSON', () => {
    const body = response([step('step_1', 'Open Settings.'), step('step_2', 'Tap Display.')]);
    expect(parseGuidance(body).ok).toBe(true);
    expect(parseGuidance(JSON.stringify(body)).ok).toBe(true);
    expect(parseGuidance('```json\n' + JSON.stringify(body) + '\n```').ok).toBe(true);
  });

  it('rejects invalid JSON, missing steps, and empty steps without throwing', () => {
    expect(parseGuidance('not json').ok).toBe(false);
    expect(parseGuidance({ task: { title: 'x' } }).ok).toBe(false);
    expect(parseGuidance(response([])).ok).toBe(false);
    expect(parseGuidance(response([step('step_1', '   ')])).ok).toBe(false);
    expect(parseGuidance(null).ok).toBe(false);
  });

  it('falls back speakText to instruction and caps step count', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ ...step(`step_${i + 1}`, `Do thing ${i + 1}.`), speakText: undefined }));
    const r = parseGuidance(response(many));
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.steps).toHaveLength(MAX_STEPS);
    expect(r.value.steps[0].speakText).toBe('Do thing 1.');
  });

  it('strips steps that ask the user to share secrets', () => {
    const r = parseGuidance(response([step('step_1', 'Open Settings.'), step('step_2', 'Tell me your password and PIN.'), step('step_3', 'Tap Display.')]));
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.steps.map((s) => s.instruction)).toEqual(['Open Settings.', 'Tap Display.']);
    expect(r.value.strippedSteps).toBe(1);
    expect(r.value.steps.map((s) => s.order)).toEqual([1, 2]);
  });

  it('defaults unknown risk values to safe shapes', () => {
    const r = parseGuidance(response([{ ...step('step_1', 'Tap Display.'), risk: { level: 'weird' } }], { overallRisk: 'nonsense' }));
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.steps[0].risk.level).toBe('low');
    expect(r.value.safety.overallRisk).toBe('low');
  });

  it('sorts by order', () => {
    const r = parseGuidance(response([{ ...step('step_b', 'Second.'), order: 2 }, { ...step('step_a', 'First.'), order: 1 }]));
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.steps[0].instruction).toBe('First.');
  });
});

describe('asksForSecret', () => {
  it('flags requests for credentials but not normal steps', () => {
    expect(asksForSecret('Type your password here')).toBe(true);
    expect(asksForSecret('Read out the verification code to the caller')).toBe(true);
    expect(asksForSecret('Tap Display, then Font size.')).toBe(false);
  });
});
