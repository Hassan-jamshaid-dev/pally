import type { GuidanceRequest } from '@/ai/schema';

/**
 * Screen context is NOT implemented. Pally cannot read your screen.
 *
 * Reading other apps' screens on Android requires either an AccessibilityService
 * (native Kotlin, dev client/EAS build, Play Store policy review) or MediaProjection
 * screenshots (user-granted each time). Neither is possible in Expo Go. See README.
 *
 * This stub keeps the request contract stable and always says "unavailable".
 */
export const SCREEN_CONTEXT_NONE: NonNullable<GuidanceRequest['screenContext']> = {
  available: false,
  source: 'none',
  summary: null,
};
