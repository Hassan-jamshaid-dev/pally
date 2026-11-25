import { StyleSheet, View } from 'react-native';
import { colors } from '@/constants/theme';

/** Soft peach and sage hills along the bottom, like the design mocks. */
export function Waves() {
  return (
    <View pointerEvents="none" style={styles.wrap} importantForAccessibility="no-hide-descendants">
      <View style={[styles.hill, { backgroundColor: colors.peach, left: -160, width: 520, height: 520, bottom: -400, opacity: 0.8 }]} />
      <View style={[styles.hill, { backgroundColor: colors.sage, right: -200, width: 640, height: 600, bottom: -500, opacity: 0.75 }]} />
      <View style={[styles.hill, { backgroundColor: colors.sageDeep, left: -100, width: 560, height: 420, bottom: -370, opacity: 0.55 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 140, overflow: 'hidden' },
  hill: { position: 'absolute', borderRadius: 400 },
});
