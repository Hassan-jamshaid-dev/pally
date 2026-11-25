import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { askPally } from '@/ai/client';
import type { GuidanceRequest } from '@/ai/schema';
import { DEFAULT_PREFS, storage, type HistoryEntry, type InProgress, type Preferences } from '@/data';
import { currentStep, guidanceReducer, startGuidance, type GuidanceAction, type GuidanceState } from '@/guidance/engine';

type Session = { question: string; guidance: GuidanceState } | null;
type SessionAction = { type: 'begin'; question: string; guidance: GuidanceState } | { type: 'guidance'; action: GuidanceAction } | { type: 'clear' };

function sessionReducer(s: Session, a: SessionAction): Session {
  switch (a.type) {
    case 'begin':
      return { question: a.question, guidance: a.guidance };
    case 'guidance':
      return s ? { ...s, guidance: guidanceReducer(s.guidance, a.action) } : s;
    case 'clear':
      return null;
  }
}

type Ctx = {
  ready: boolean;
  prefs: Preferences;
  updatePrefs: (patch: Partial<Preferences>) => Promise<void>;
  history: HistoryEntry[];
  clearHistory: () => Promise<void>;
  session: Session;
  /** A task saved when the app was closed mid-way. */
  resumable: InProgress | null;
  /** Ask the AI for a new task. Throws AiError on failure. */
  startTask: (question: string) => Promise<void>;
  dispatch: (a: GuidanceAction) => void;
  /** Re-explain the remaining steps. Throws AiError on failure. */
  clarify: (reason: NonNullable<GuidanceRequest['clarification']>['reason']) => Promise<void>;
  resume: () => void;
  discardResumable: () => Promise<void>;
  endSession: () => void;
};

const PallyContext = createContext<Ctx | null>(null);

export function PallyProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [resumable, setResumable] = useState<InProgress | null>(null);
  const [session, dispatchSession] = useReducer(sessionReducer, null as Session);
  const recorded = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([storage.getPrefs(), storage.getHistory(), storage.getInProgress()]).then(([p, h, r]) => {
      if (!alive) return;
      setPrefs(p);
      setHistory(h);
      setResumable(r);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Persist progress; record history when a task finishes.
  useEffect(() => {
    if (!session) return;
    const g = session.guidance;
    if (g.status === 'complete' || g.status === 'stopped') {
      const key = `${g.task.taskId}:${g.startedAt}:${g.status}`;
      if (recorded.current === key) return;
      recorded.current = key;
      const entry: HistoryEntry = {
        id: `${g.task.taskId}_${g.startedAt}`,
        title: g.task.title,
        question: session.question,
        summary: g.task.summary,
        outcome: g.status === 'complete' ? 'completed' : 'stopped',
        stepsDone: g.status === 'complete' ? g.steps.length : g.index,
        stepsTotal: g.steps.length,
        finishedAt: Date.now(),
      };
      storage.addHistory(entry).then(setHistory);
      storage.clearInProgress();
      setResumable(null);
    } else if (g.status === 'blocked') {
      storage.clearInProgress();
    } else {
      storage.saveInProgress({ question: session.question, state: g, savedAt: Date.now() });
    }
  }, [session]);

  const updatePrefs = useCallback(async (patch: Partial<Preferences>) => {
    setPrefs((p) => ({ ...p, ...patch }));
    setPrefs(await storage.setPrefs(patch));
  }, []);

  const startTask = useCallback(async (question: string) => {
    const response = await askPally(question, { mode: 'new_task' });
    await storage.clearInProgress();
    setResumable(null);
    dispatchSession({ type: 'begin', question, guidance: startGuidance(response) });
  }, []);

  const sessionRef = useRef(session);
  sessionRef.current = session;

  const clarify: Ctx['clarify'] = useCallback(async (reason) => {
    const s = sessionRef.current;
    if (!s) return;
    const step = currentStep(s.guidance);
    if (!step) return;
    const response = await askPally(reason === 'wrong_answer' ? `That is not right. ${s.question}` : s.question, {
      mode: reason === 'wrong_answer' ? 'correction' : 'clarify',
      activeTask: {
        taskId: s.guidance.task.taskId,
        title: s.guidance.task.title,
        currentStepIndex: s.guidance.index,
        currentStepId: step.id,
        currentStepText: step.instruction,
      },
      clarification: { reason },
    });
    // The new steps still pass through the safety gate on entry.
    dispatchSession({ type: 'guidance', action: { type: 'replace_remaining', steps: response.steps } });
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      ready,
      prefs,
      updatePrefs,
      history,
      clearHistory: async () => {
        await storage.clearHistory();
        setHistory([]);
      },
      session,
      resumable,
      startTask,
      dispatch: (action) => dispatchSession({ type: 'guidance', action }),
      clarify,
      resume: () => {
        if (!resumable) return;
        dispatchSession({ type: 'begin', question: resumable.question, guidance: resumable.state });
      },
      discardResumable: async () => {
        await storage.clearInProgress();
        setResumable(null);
      },
      endSession: () => dispatchSession({ type: 'clear' }),
    }),
    [ready, prefs, updatePrefs, history, session, resumable, startTask, clarify],
  );

  return <PallyContext.Provider value={value}>{children}</PallyContext.Provider>;
}

export function usePally(): Ctx {
  const ctx = useContext(PallyContext);
  if (!ctx) throw new Error('usePally must be used inside PallyProvider');
  return ctx;
}
