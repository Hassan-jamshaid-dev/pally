import { StyleSheet, TextInput, View } from 'react-native';
import { colors } from '@/constants/theme';
import { MicButton, type MicState } from './mic-button';
import { useTheme } from '../use-theme';

type Props = {
  value: string;
  onChangeText: (t: string) => void;
  onSubmit: () => void;
  placeholder: string;
  micState: MicState;
  onMic: () => void;
  accessibilityLabel: string;
};

/** Rounded text field + big teal mic, pinned at the bottom of chat-style screens. */
export function ChatBar({ value, onChangeText, onSubmit, placeholder, micState, onMic, accessibilityLabel }: Props) {
  const { c, contrast } = useTheme();
  return (
    <View style={styles.bar}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        returnKeyType="send"
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        accessibilityLabel={accessibilityLabel}
        maxLength={600}
        style={[styles.input, { backgroundColor: c.card, color: c.text, borderColor: contrast ? '#000' : c.peach }]}
      />
      <MicButton size={68} hideLabel state={micState} onPress={onMic} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  input: { flex: 1, minHeight: 68, borderRadius: 34, paddingHorizontal: 22, fontSize: 19, borderWidth: 2 },
});
