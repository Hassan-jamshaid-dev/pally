import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { colors, MIN_TARGET, type } from '@/constants/theme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'warm' | 'danger';
  style?: ViewStyle;
  disabled?: boolean;
};

export function BigButton({ label, onPress, variant = 'primary', style, disabled }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.base, styles[variant], pressed && styles.pressed, disabled && styles.disabled, style]}>
      <Text style={[styles.text, variant === 'secondary' && { color: colors.teal }, variant === 'warm' && { color: colors.tealDark }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: MIN_TARGET + 8, borderRadius: 36, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  primary: { backgroundColor: colors.teal },
  secondary: { backgroundColor: colors.white, borderWidth: 3, borderColor: colors.teal },
  warm: { backgroundColor: colors.coral },
  danger: { backgroundColor: colors.coralDark },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.45 },
  text: { fontSize: type.button, fontWeight: '800', color: colors.white },
});
