import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from './app-text';
import { colors } from '@/constants/theme';

export type MicState = 'idle' | 'listening' | 'thinking' | 'speaking';

const LABEL: Record<MicState, string> = {
  idle: 'Tap to talk',
  listening: 'Listening… tap to stop',
  thinking: 'Thinking…',
  speaking: 'Pally is talking. Tap to stop',
};

type Props = {
  state: MicState;
  onPress: () => void;
  /** compact keeps the same fixed spot at the bottom of the guidance screen */
  compact?: boolean;
  /** Hide the text label under the button (e.g. when the screen shows its own status). */
  hideLabel?: boolean;
};

const BG: Record<MicState, string> = {
  idle: colors.teal,
  listening: colors.coral,
  thinking: colors.teal,
  speaking: colors.green,
};

export function MicButton({ state, onPress, compact, hideLabel }: Props) {
  const pulse = useRef(new Animated.Value(0)).current;
  const size = compact ? 112 : 200;

  useEffect(() => {
    if (state === 'idle') {
      pulse.setValue(0);
      return;
    }
    const d = state === 'listening' ? 1200 : 1800;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: d, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: d, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [state, pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.15] });
  const bg = BG[state];
  const dark = state === 'listening' || state === 'speaking';
  const glyph = dark ? colors.tealDark : colors.white;

  return (
    <View style={styles.wrap}>
      <View style={{ width: size + 40, height: size + 40, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', width: size + 36, height: size + 36, borderRadius: (size + 36) / 2, backgroundColor: colors.peach, opacity: 0.55 }} />
        <Animated.View style={[styles.ring, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg, opacity, transform: [{ scale }] }]} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={state === 'idle' ? 'Microphone. Tap to talk to Pally' : LABEL[state]}
          accessibilityState={{ busy: state === 'thinking' }}
          onPress={onPress}
          disabled={state === 'thinking'}
          style={({ pressed }) => [
            styles.mic,
            { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
            pressed && { opacity: 0.88 },
          ]}>
          {state === 'speaking' ? <SpeakerIcon color={glyph} scale={compact ? 0.55 : 1} /> : <MicIcon color={glyph} scale={compact ? 0.55 : 1} />}
        </Pressable>
      </View>
      {!hideLabel && (
        <Text style={[styles.label, compact && { fontSize: 20 }]} accessibilityLiveRegion="polite">
          {LABEL[state]}
        </Text>
      )}
    </View>
  );
}

function MicIcon({ color, scale }: { color: string; scale: number }) {
  return (
    <View style={{ alignItems: 'center', transform: [{ scale }] }}>
      <View style={{ width: 48, height: 80, borderRadius: 24, backgroundColor: color }} />
      <View style={{ width: 80, height: 40, marginTop: -26, borderWidth: 8, borderTopWidth: 0, borderColor: color, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 }} />
      <View style={{ width: 8, height: 16, backgroundColor: color }} />
      <View style={{ width: 48, height: 8, borderRadius: 4, backgroundColor: color }} />
    </View>
  );
}

/** Three sound bars: simple, high contrast, no icon font needed. */
function SpeakerIcon({ color, scale }: { color: string; scale: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, transform: [{ scale }] }}>
      {[40, 90, 60, 100, 50].map((h, i) => (
        <View key={i} style={{ width: 12, height: h, borderRadius: 6, backgroundColor: color }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8 },
  ring: { position: 'absolute' },
  mic: { alignItems: 'center', justifyContent: 'center', borderWidth: 8, borderColor: colors.peachSoft, elevation: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12 },
  label: { fontSize: 26, fontWeight: '800', color: colors.teal, textAlign: 'center' },
});

