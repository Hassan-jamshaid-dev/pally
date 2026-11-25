import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getDeviceInfo } from '@/android/device';
import { SCREEN_CONTEXT_NONE } from '@/android/screenContext';
import { redactSecrets } from '@/safety/rules';
import { parseGuidance, type GuidanceRequest, type GuidanceResponse } from './schema';

export type AiErrorKind = 'offline' | 'timeout' | 'not_configured' | 'rate_limited' | 'bad_answer' | 'server';
export class AiError extends Error {
  constructor(public kind: AiErrorKind, message: string) {
    super(message);
  }
}

const FRIENDLY: Record<AiErrorKind, string> = {
  offline: "I can't reach the internet right now. Please check your Wi-Fi or mobile data, then try again.",
  timeout: 'That is taking longer than usual. Please try again in a moment.',
  not_configured: "Pally's helper service is not set up yet. Ask whoever installed Pally to finish setup. You can still type or speak, but I can't answer yet.",
  rate_limited: 'Lots of people are asking right now. Please wait a minute and try again.',
  bad_answer: "I couldn't put together a good answer. Please try asking in different words.",
  server: 'Something went wrong on my side. Please try again.',
};
export const friendlyAiError = (e: unknown): string =>
  e instanceof AiError ? FRIENDLY[e.kind] : FRIENDLY.server;

/**
 * The proxy URL is public config, never a secret. The OpenAI key lives only on the server.
 * In dev, we guess the computer running Expo from the Metro host address.
 */
export function getApiBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_PALLY_API_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  if (host) return `http://${host}:8787`;
  return Platform.OS === 'android' ? 'http://10.0.2.2:8787' : 'http://localhost:8787';
}

const TIMEOUT_MS = 30000;
let inFlight: Promise<GuidanceResponse> | null = null;

export type AskOptions = Pick<GuidanceRequest, 'mode' | 'activeTask' | 'clarification'>;

export function newRequestId(): string {
  return `req_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/** Ask the proxy. Duplicate in-flight calls share one request. */
export function askPally(utterance: string, opts: AskOptions = { mode: 'new_task' }): Promise<GuidanceResponse> {
  if (inFlight) return inFlight;
  inFlight = doAsk(utterance, opts).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function doAsk(utterance: string, opts: AskOptions): Promise<GuidanceResponse> {
  const requestId = newRequestId();
  const body: GuidanceRequest = {
    requestId,
    locale: 'en-US',
    userUtterance: redactSecrets(utterance).slice(0, 600),
    mode: opts.mode,
    device: getDeviceInfo(),
    screenContext: SCREEN_CONTEXT_NONE,
    activeTask: opts.activeTask ?? null,
    clarification: opts.clarification ?? null,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${getApiBaseUrl()}/api/guidance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    throw new AiError((e as Error)?.name === 'AbortError' ? 'timeout' : 'offline', 'Network request failed');
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 429) throw new AiError('rate_limited', 'Rate limited');
  if (res.status === 503) throw new AiError('not_configured', 'Server has no OpenAI key');
  if (!res.ok) throw new AiError('server', `Server returned ${res.status}`);

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new AiError('bad_answer', 'Not JSON');
  }
  const parsed = parseGuidance(json, requestId);
  if (!parsed.ok) throw new AiError('bad_answer', parsed.error);
  return parsed.value;
}
