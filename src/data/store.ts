import type { GuidanceState } from '@/guidance/engine';
import { redactSecrets } from '@/safety/rules';

/** Local-only persistence. No accounts. Never stores passwords/codes. */

export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export type SpeechPace = 'slow' | 'normal';
export type Preferences = {
  onboarded: boolean;
  voiceEnabled: boolean; // read steps aloud
  pace: SpeechPace;
  textSize: 'standard' | 'large' | 'xl';
  highContrast: boolean;
  buttonSize: 'standard' | 'larger';
  trusted: { id: string; name: string; phone: string; relation: string }[];
};
export const DEFAULT_PREFS: Preferences = { onboarded: false, voiceEnabled: true, pace: 'slow', textSize: 'standard', highContrast: false, buttonSize: 'standard', trusted: [] };

export type HistoryEntry = {
  id: string;
  title: string;
  question: string;
  summary: string;
  outcome: 'completed' | 'stopped';
  stepsDone: number;
  stepsTotal: number;
  finishedAt: number;
};

export const MAX_HISTORY = 50;
const K = { prefs: 'pally.prefs.v1', history: 'pally.history.v1', task: 'pally.task.v1' };

export type InProgress = { question: string; state: GuidanceState; savedAt: number };

export function createStorage(kv: KeyValueStore) {
  async function readJson<T>(key: string): Promise<T | null> {
    try {
      const raw = await kv.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null; // corrupt or unavailable storage must never crash the app
    }
  }
  async function writeJson(key: string, value: unknown): Promise<boolean> {
    try {
      await kv.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  return {
    async getPrefs(): Promise<Preferences> {
      const p = await readJson<Partial<Preferences>>(K.prefs);
      return { ...DEFAULT_PREFS, ...(p ?? {}) };
    },
    async setPrefs(patch: Partial<Preferences>): Promise<Preferences> {
      const next = { ...(await this.getPrefs()), ...patch };
      await writeJson(K.prefs, next);
      return next;
    },

    async getHistory(): Promise<HistoryEntry[]> {
      const h = await readJson<HistoryEntry[]>(K.history);
      return Array.isArray(h) ? h : [];
    },
    async addHistory(entry: HistoryEntry): Promise<HistoryEntry[]> {
      const safe: HistoryEntry = {
        ...entry,
        question: redactSecrets(entry.question),
        title: redactSecrets(entry.title),
        summary: redactSecrets(entry.summary),
      };
      const next = [safe, ...(await this.getHistory()).filter((e) => e.id !== entry.id)].slice(0, MAX_HISTORY);
      await writeJson(K.history, next);
      return next;
    },
    async clearHistory(): Promise<void> {
      await kv.removeItem(K.history).catch(() => undefined);
    },

    async getInProgress(): Promise<InProgress | null> {
      const t = await readJson<InProgress>(K.task);
      if (!t || !t.state || !Array.isArray(t.state.steps) || t.state.steps.length === 0) return null;
      if (t.state.status === 'complete' || t.state.status === 'stopped' || t.state.status === 'blocked') return null;
      return t;
    },
    async saveInProgress(value: InProgress): Promise<void> {
      await writeJson(K.task, value);
    },
    async clearInProgress(): Promise<void> {
      await kv.removeItem(K.task).catch(() => undefined);
    },

    async clearAll(): Promise<void> {
      await Promise.all(Object.values(K).map((k) => kv.removeItem(k).catch(() => undefined)));
    },
  };
}

