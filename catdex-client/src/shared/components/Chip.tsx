import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/shared/styles/theme';

interface ChipProps {
  children: ReactNode;
  selected?: boolean;
  onPress?: () => void;
}

export function Chip({ children, selected = false, onPress }: ChipProps) {
  const content =
    typeof children === 'string' ? (
      <Text style={[styles.label, selected ? styles.labelSelected : null]}>{children}</Text>
    ) : (
      children
    );

  if (!onPress) {
    return <View style={[styles.base, selected ? styles.selected : null]}>{content}</View>;
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.base, selected ? styles.selected : null, pressed ? styles.pressed : null]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    maxWidth: '100%',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 253, 246, 0.9)',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selected: {
    backgroundColor: theme.colors.primaryDark,
    borderColor: '#765640',
  },
  label: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    color: theme.colors.mutedText,
  },
  labelSelected: {
    color: '#FFF8F0',
  },
  pressed: {
    opacity: 0.84,
  },
});
