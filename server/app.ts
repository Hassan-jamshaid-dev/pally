import express, { type Express } from 'express';
import { guidanceRequestSchema, parseGuidance } from '../src/ai/schema';
import { buildUserMessage, SYSTEM_PROMPT } from './prompt';

/** Reads OPENAI_API_KEY, OPENAI_MODEL, OPENAI_BASE_URL, RATE_LIMIT_PER_MIN. */
export type ServerEnv = Record<string, string | undefined>;

type FetchLike = typeof fetch;

/** Small in-memory per-IP limiter. Fine for one instance; use a shared store if you scale out. */
function makeLimiter(perMin: number) {
  const hits = new Map<string, number[]>();
  return (key: string, now = Date.now()): boolean => {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
    if (recent.length >= perMin) {
      hits.set(key, recent);
      return false;
    }
    recent.push(now);
    hits.set(key, recent);
    return true;
  };
}

export function createApp(env: ServerEnv, fetchImpl: FetchLike = fetch): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));
  const allow = makeLimiter(Number(env.RATE_LIMIT_PER_MIN) || 20);
  const model = env.OPENAI_MODEL || 'gpt-4o-mini';
  const base = (env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');

  app.get('/health', (_req, res) => {
    res.json({ ok: true, configured: Boolean(env.OPENAI_API_KEY), model });
  });

  app.post('/api/guidance', async (req, res) => {
    if (!allow(req.ip ?? 'unknown')) return res.status(429).json({ error: 'rate_limited' });
    if (!env.OPENAI_API_KEY) {
      return res.status(503).json({ error: 'not_configured', message: 'OPENAI_API_KEY is not set on the server.' });
    }
    const parsedReq = guidanceRequestSchema.safeParse(req.body);
    if (!parsedReq.success) return res.status(400).json({ error: 'bad_request' });

    try {
      const upstream = await fetchImpl(`${base}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENAI_API_KEY}` },
        body: JSON.stringify({
          model,
          temperature: 0.3,
          max_tokens: 1800,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildUserMessage(parsedReq.data) },
          ],
        }),
        signal: AbortSignal.timeout(25_000),
      });
      if (!upstream.ok) {
        // Log status only: never the key, never user text.
        console.error(`OpenAI returned ${upstream.status}`);
        return res.status(upstream.status === 429 ? 429 : 502).json({ error: 'upstream_error' });
      }
      const data = (await upstream.json()) as { choices?: { message?: { content?: string } }[] };
      const content = data.choices?.[0]?.message?.content ?? '';
      const checked = parseGuidance(content, parsedReq.data.requestId);
      if (!checked.ok) return res.status(502).json({ error: 'bad_model_output' });
      // Re-emit the validated, sanitized shape.
      const v = checked.value;
      return res.json({
        requestId: parsedReq.data.requestId,
        assistantName: 'Pally',
        task: v.task,
        steps: v.steps,
        safety: v.safety,
        meta: { model: 'openai-proxy', promptVersion: 'pally-v1' },
      });
    } catch (e) {
      console.error('Proxy error:', (e as Error).name);
      return res.status(502).json({ error: 'upstream_unreachable' });
    }
  });

  return app;
}
