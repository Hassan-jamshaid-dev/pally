import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp, type ServerEnv } from '../server/app';
import { response, step } from './fixtures';

const body = {
  requestId: 'req_1',
  userUtterance: 'make my text bigger',
  mode: 'new_task',
  device: { platform: 'android', manufacturer: 'Google', model: 'Pixel 7', sdkInt: 34 },
};

let close: (() => void) | undefined;
afterEach(() => close?.());

async function boot(env: ServerEnv, upstream?: typeof fetch) {
  const server = createApp(env, upstream).listen(0);
  close = () => server.close();
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const post = (payload: unknown) =>
    fetch(`${base}/api/guidance`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return { base, post };
}

const openAi = (content: string, status = 200) =>
  (async () => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status })) as unknown as typeof fetch;

describe('proxy server', () => {
  it('returns 503 with a clear code when no key is configured', async () => {
    const { post } = await boot({});
    const res = await post(body);
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe('not_configured');
  });

  it('rejects bad requests', async () => {
    const { post } = await boot({ OPENAI_API_KEY: 'test' }, openAi('{}'));
    expect((await post({ nope: true })).status).toBe(400);
  });

  it('validates and returns model JSON, sending the key only upstream', async () => {
    let seenAuth = '';
    const upstream = (async (_u: string, init: RequestInit) => {
      seenAuth = String((init.headers as Record<string, string>).Authorization);
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(response([step('step_1', 'Open Settings.')])) } }] }));
    }) as unknown as typeof fetch;
    const { post } = await boot({ OPENAI_API_KEY: 'fake-test-key' }, upstream);
    const res = await post(body);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.steps).toHaveLength(1);
    expect(JSON.stringify(json)).not.toContain('fake-test-key');
    expect(seenAuth).toBe('Bearer fake-test-key');
  });

  it('returns 502 when the model output is invalid', async () => {
    const { post } = await boot({ OPENAI_API_KEY: 'test' }, openAi('this is not json'));
    expect((await post(body)).status).toBe(502);
  });

  it('rate limits per client', async () => {
    const { post } = await boot({ OPENAI_API_KEY: 'test', RATE_LIMIT_PER_MIN: '2' }, openAi('x'));
    await post(body);
    await post(body);
    expect((await post(body)).status).toBe(429);
  });
});
