import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { captureColors } from '../capture.theme';

interface ShutterButtonProps {
  disabled: boolean;
  isBusy: boolean;
  onPress: () => void;
}

export function ShutterButton({ disabled, isBusy, onPress }: ShutterButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="사진 촬영"
      accessibilityState={{ disabled: disabled || isBusy }}
      disabled={disabled || isBusy}
      onPress={onPress}
      style={({ pressed }) => [styles.ring, pressed && styles.ringPressed, disabled && styles.ringDisabled]}
    >
      {isBusy ? (
        <ActivityIndicator color={captureColors.onControlActive} />
      ) : (
        <View style={styles.core} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: captureColors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPressed: {
    borderColor: captureColors.accent,
  },
  ringDisabled: {
    opacity: 0.4,
  },
  core: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: captureColors.controlActive,
  },
});
