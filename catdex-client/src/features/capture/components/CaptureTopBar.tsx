import { Grid3x3, X, Zap, ZapOff } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { FlashMode } from 'expo-camera';

import { captureColors, captureSpacing } from '../capture.theme';

interface CaptureTopBarProps {
  flash: FlashMode;
  showGrid: boolean;
  onClose: () => void;
  onToggleFlash: () => void;
  onToggleGrid: () => void;
}

export function CaptureTopBar({
  flash,
  showGrid,
  onClose,
  onToggleFlash,
  onToggleGrid,
}: CaptureTopBarProps) {
  const isFlashOn = flash !== 'off';

  return (
    <View style={styles.container}>
      <IconButton accessibilityLabel="촬영 닫기" onPress={onClose}>
        <X color={captureColors.text} size={22} />
      </IconButton>

      <View style={styles.rightGroup}>
        {isFlashOn ? <Text style={styles.flashHint}>동물에게는 눈부실 수 있어요</Text> : null}

        <IconButton
          accessibilityLabel={isFlashOn ? '플래시 끄기' : '플래시 켜기'}
          isActive={isFlashOn}
          onPress={onToggleFlash}
        >
          {isFlashOn ? (
            <Zap color={captureColors.onControlActive} size={20} />
          ) : (
            <ZapOff color={captureColors.text} size={20} />
          )}
        </IconButton>

        <IconButton accessibilityLabel="안내선 전환" isActive={showGrid} onPress={onToggleGrid}>
          <Grid3x3 color={showGrid ? captureColors.onControlActive : captureColors.text} size={20} />
        </IconButton>
      </View>
    </View>
  );
}

interface IconButtonProps {
  accessibilityLabel: string;
  isActive?: boolean;
  onPress: () => void;
  children: ReactNode;
}

function IconButton({ accessibilityLabel, isActive = false, onPress, children }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: isActive }}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        isActive && styles.iconButtonActive,
        pressed && styles.iconButtonPressed,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    height: captureSpacing.chromeHeight,
    paddingHorizontal: captureSpacing.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  flashHint: {
    color: captureColors.mutedText,
    fontSize: 11,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: captureColors.control,
  },
  iconButtonActive: {
    backgroundColor: captureColors.controlActive,
  },
  iconButtonPressed: {
    opacity: 0.7,
  },
});
