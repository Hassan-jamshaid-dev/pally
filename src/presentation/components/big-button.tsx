import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { colors, type } from '@/constants/theme';
import { AppText } from './app-text';
import { useTheme } from '../use-theme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'warm' | 'danger';
  style?: ViewStyle;
  disabled?: boolean;
};

export function BigButton({ label, onPress, variant = 'primary', style, disabled }: Props) {
  const { c, target, contrast } = useTheme();
  const bg = { primary: c.teal, secondary: c.card, warm: c.coral, danger: c.coralDark }[variant];
  const fg = variant === 'secondary' ? c.teal : variant === 'warm' ? c.tealDark : colors.white;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { minHeight: target, backgroundColor: bg },
        variant === 'secondary' && { borderWidth: contrast ? 3 : 2, borderColor: contrast ? '#000' : c.sage },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      <AppText style={[styles.text, { color: fg }]}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 36, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch', elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.45 },
  text: { fontSize: type.button - 2, fontWeight: '800', textAlign: 'center' },
});
