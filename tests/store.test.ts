import { describe, expect, it } from 'vitest';
import { createStorage, DEFAULT_PREFS, MAX_HISTORY, type HistoryEntry, type KeyValueStore } from '@/data/store';
import { parseGuidance } from '@/ai/schema';
import { startGuidance } from '@/guidance/engine';
import { response, step } from './fixtures';

function memory(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => void data.set(k, v),
    removeItem: async (k) => void data.delete(k),
  };
}

const entry = (i: number, over: Partial<HistoryEntry> = {}): HistoryEntry => ({
  id: `h${i}`, title: `Task ${i}`, question: 'q', summary: 's', outcome: 'completed', stepsDone: 1, stepsTotal: 1, finishedAt: i, ...over,
});

describe('local storage', () => {
  it('defaults and persists preferences (first launch flag)', async () => {
    const s = createStorage(memory());
    expect((await s.getPrefs()).onboarded).toBe(false);
    await s.setPrefs({ onboarded: true });
    expect(await s.getPrefs()).toEqual({ ...DEFAULT_PREFS, onboarded: true });
  });

  it('keeps newest history first, caps it, and redacts secrets', async () => {
    const s = createStorage(memory());
    for (let i = 0; i < MAX_HISTORY + 5; i++) await s.addHistory(entry(i));
    const h = await s.getHistory();
    expect(h).toHaveLength(MAX_HISTORY);
    expect(h[0].id).toBe(`h${MAX_HISTORY + 4}`);
    await s.addHistory(entry(999, { question: 'my password is hunter22' }));
    expect((await s.getHistory())[0].question).not.toMatch(/hunter22/);
    await s.clearHistory();
    expect(await s.getHistory()).toEqual([]);
  });

  it('restores an in-progress task but ignores finished or corrupt data', async () => {
    const kv = memory();
    const s = createStorage(kv);
    const parsed = parseGuidance(response([step('step_1', 'Open Settings.')]));
    if (!parsed.ok) throw new Error('fixture');
    const state = startGuidance(parsed.value);
    await s.saveInProgress({ question: 'q', state, savedAt: 1 });
    expect((await s.getInProgress())?.state.task.taskId).toBe('task_1');
    await s.saveInProgress({ question: 'q', state: { ...state, status: 'complete' }, savedAt: 2 });
    expect(await s.getInProgress()).toBeNull();
    kv.data.set('pally.task.v1', '{not json');
    expect(await s.getInProgress()).toBeNull();
  });

  it('survives a failing store', async () => {
    const broken: KeyValueStore = { getItem: async () => { throw new Error('x'); }, setItem: async () => { throw new Error('x'); }, removeItem: async () => { throw new Error('x'); } };
    const s = createStorage(broken);
    expect(await s.getPrefs()).toEqual(DEFAULT_PREFS);
    expect(await s.getHistory()).toEqual([]);
    await expect(s.clearHistory()).resolves.toBeUndefined();
  });
});
