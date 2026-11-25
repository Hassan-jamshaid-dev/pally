/** Allowlist of system Settings screens Pally may open, always after user confirmation. */

export const SETTINGS_INTENTS: Record<string, { label: string; action: string }> = {
  'android.settings.SETTINGS': { label: 'Settings', action: 'android.settings.SETTINGS' },
  'android.settings.DISPLAY_SETTINGS': { label: 'Display settings', action: 'android.settings.DISPLAY_SETTINGS' },
  'android.settings.SOUND_SETTINGS': { label: 'Sound settings', action: 'android.settings.SOUND_SETTINGS' },
  'android.settings.WIFI_SETTINGS': { label: 'Wi-Fi settings', action: 'android.settings.WIFI_SETTINGS' },
  'android.settings.BLUETOOTH_SETTINGS': { label: 'Bluetooth settings', action: 'android.settings.BLUETOOTH_SETTINGS' },
  'android.settings.ACCESSIBILITY_SETTINGS': { label: 'Accessibility settings', action: 'android.settings.ACCESSIBILITY_SETTINGS' },
  'android.settings.BATTERY_SAVER_SETTINGS': { label: 'Battery settings', action: 'android.settings.BATTERY_SAVER_SETTINGS' },
  'android.settings.LOCATION_SOURCE_SETTINGS': { label: 'Location settings', action: 'android.settings.LOCATION_SOURCE_SETTINGS' },
  'android.settings.APPLICATION_SETTINGS': { label: 'App settings', action: 'android.settings.APPLICATION_SETTINGS' },
  'android.settings.DATE_SETTINGS': { label: 'Date and time settings', action: 'android.settings.DATE_SETTINGS' },
  'android.settings.LOCALE_SETTINGS': { label: 'Language settings', action: 'android.settings.LOCALE_SETTINGS' },
  'android.settings.NOTIFICATION_SETTINGS': { label: 'Notification settings', action: 'android.settings.NOTIFICATION_SETTINGS' },
};

/** AI output is untrusted: only allowlisted actions are ever launched. */
export function resolveIntent(action: string | null | undefined): { label: string; action: string } | null {
  if (!action) return null;
  return SETTINGS_INTENTS[action.trim()] ?? null;
}
