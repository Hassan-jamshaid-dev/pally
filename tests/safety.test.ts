import { describe, expect, it } from 'vitest';
import { parseCommand } from '@/guidance/commands';
import { checkRequest, redactSecrets } from '@/safety/rules';
import { resolveIntent } from '@/android/intents';
import { oemFamily } from '@/android/deviceInfo';

describe('checkRequest', () => {
  it('allows ordinary requests', () => {
    expect(checkRequest('How do I make my text bigger?').kind).toBe('ok');
  });
  it('warns on scam patterns', () => {
    expect(checkRequest('A man wants me to install AnyDesk so he can fix my computer').kind).toBe('warn');
    expect(checkRequest('They want me to buy gift cards').kind).toBe('warn');
  });
  it('blocks sharing secrets with someone else', () => {
    expect(checkRequest('How do I read my verification code to the caller?').kind).toBe('block');
  });
});

describe('redactSecrets', () => {
  it('removes card numbers and stated passwords', () => {
    expect(redactSecrets('my card is 4111 1111 1111 1111 ok')).not.toMatch(/4111/);
    expect(redactSecrets('my password is hunter22')).not.toMatch(/hunter22/);
    expect(redactSecrets('make text bigger')).toBe('make text bigger');
  });
});

describe('parseCommand', () => {
  it('maps short phrases to controls', () => {
    expect(parseCommand('Next')).toBe('next');
    expect(parseCommand("okay I'm done")).toBe('next');
    expect(parseCommand('say that again')).toBe('repeat');
    expect(parseCommand("I don't understand")).toBe('explain');
    expect(parseCommand('Stop')).toBe('stop');
  });
  it('ignores long sentences and noise', () => {
    expect(parseCommand('my grandson told me yesterday to press next on the thing')).toBeNull();
    expect(parseCommand('banana')).toBeNull();
  });
});

describe('android helpers', () => {
  it('only resolves allowlisted intents', () => {
    expect(resolveIntent('android.settings.DISPLAY_SETTINGS')?.label).toBe('Display settings');
    expect(resolveIntent('android.intent.action.DELETE')).toBeNull();
    expect(resolveIntent(null)).toBeNull();
  });
  it('detects OEM families', () => {
    expect(oemFamily('samsung')).toBe('samsung');
    expect(oemFamily('Google')).toBe('pixel');
    expect(oemFamily(null)).toBe('other');
  });
});
