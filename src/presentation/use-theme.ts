import { colors, contrastColors, MIN_TARGET, TEXT_SCALE } from '@/constants/theme';
import { usePally } from './pally-context';

export function useTheme() {
  const { prefs } = usePally();
  return {
    c: prefs.highContrast ? contrastColors : colors,
    scale: TEXT_SCALE[prefs.textSize] ?? 1,
    target: MIN_TARGET + (prefs.buttonSize === 'larger' ? 20 : 8),
    contrast: prefs.highContrast,
  };
}
