import { StyleSheet, Text, type TextProps } from 'react-native';
import { useTheme } from '../use-theme';

/** Text that follows the user's text-size and high-contrast preferences. */
export function AppText({ style, ...rest }: TextProps) {
  const { scale, contrast } = useTheme();
  const flat = StyleSheet.flatten(style) ?? {};
  const fontSize = (flat.fontSize ?? 20) * scale;
  const lineHeight = flat.lineHeight ? flat.lineHeight * scale : undefined;
  const color = contrast && flat.color !== '#FFFFFF' ? '#000000' : flat.color;
  return <Text {...rest} maxFontSizeMultiplier={1.4} style={[style, { fontSize, lineHeight, color }]} />;
}
