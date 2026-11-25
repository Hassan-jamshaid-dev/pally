/** Pure helpers: device description + OEM framing hints. */

export type DeviceInfo = {
  platform: string;
  manufacturer: string | null;
  model: string | null;
  sdkInt: number | null;
  osVersion: string | null;
  languageTag: string;
};

export function oemFamily(manufacturer: string | null): 'samsung' | 'pixel' | 'xiaomi' | 'motorola' | 'other' {
  const m = (manufacturer ?? '').toLowerCase();
  if (m.includes('samsung')) return 'samsung';
  if (m.includes('google')) return 'pixel';
  if (m.includes('xiaomi') || m.includes('redmi') || m.includes('poco')) return 'xiaomi';
  if (m.includes('motorola')) return 'motorola';
  return 'other';
}

/** Short, honest note about menu differences. Used in the UI, not as a promise. */
export function oemNote(info: DeviceInfo): string | null {
  if (info.platform !== 'android') return null;
  switch (oemFamily(info.manufacturer)) {
    case 'samsung':
      return 'On Samsung phones, menus are often named "Display" and "Accessibility". Names can differ slightly.';
    case 'pixel':
      return 'On Google Pixel phones, Settings look close to standard Android.';
    case 'xiaomi':
      return 'On Xiaomi phones, some menus have different names. If you cannot find something, tell me.';
    case 'motorola':
      return 'On Motorola phones, Settings are close to standard Android.';
    default:
      return 'Menu names can differ on your phone. If something looks different, tap "Explain differently".';
  }
}

export function describeDevice(info: DeviceInfo): string {
  const parts = [info.manufacturer, info.model].filter(Boolean).join(' ');
  const ver = info.osVersion ? `Android ${info.osVersion}` : 'Android';
  return parts ? `${parts} (${ver})` : ver;
}
