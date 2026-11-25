export const step = (id: string, instruction: string, risk: Record<string, unknown> = {}) => ({
  id,
  order: Number(id.replace(/\D/g, '')) || 1,
  instruction,
  speakText: instruction,
  waitForUser: true,
  risk: { level: 'low', reasons: [], requireConfirmation: false, ...risk },
  androidHint: { intentAction: null, settingsPathHint: null },
});

export const response = (steps: unknown[], safety: Record<string, unknown> = {}) => ({
  requestId: 'req_1',
  assistantName: 'Pally',
  task: { taskId: 'task_1', title: 'Make the words bigger', summary: 'Open Display settings.' },
  steps,
  safety: { overallRisk: 'low', scamSignals: [], blockTask: false, userWarning: null, ...safety },
});
