import * as Device from 'expo-device';
import * as IntentLauncher from 'expo-intent-launcher';
import { Linking, Platform } from 'react-native';
import { type DeviceInfo } from './deviceInfo';
import { resolveIntent } from './intents';

export function getDeviceInfo(): DeviceInfo {
  const sdk = Platform.OS === 'android' ? Number(Platform.Version) : null;
  return {
    platform: Platform.OS,
    manufacturer: Device.manufacturer,
    model: Device.modelName,
    sdkInt: Number.isFinite(sdk) ? sdk : null,
    osVersion: Device.osVersion,
    languageTag: Intl.DateTimeFormat().resolvedOptions().locale || 'en-US',
  };
}

/**
 * Open an allowlisted Settings screen. Caller must have shown a confirmation first.
 * Falls back to the app's general settings page if the specific screen is unavailable.
 */
export async function openSettingsScreen(action: string): Promise<{ ok: boolean; message?: string }> {
  const intent = resolveIntent(action);
  if (!intent) return { ok: false, message: 'That screen is not something Pally can open.' };
  if (Platform.OS !== 'android') return { ok: false, message: 'Opening Settings screens works on Android phones only.' };
  try {
    await IntentLauncher.startActivityAsync(intent.action);
    return { ok: true };
  } catch {
    try {
      await Linking.openSettings();
      return { ok: true, message: 'Opened general settings instead.' };
    } catch {
      return { ok: false, message: 'Could not open Settings. Please open it from your home screen.' };
    }
  }
}
