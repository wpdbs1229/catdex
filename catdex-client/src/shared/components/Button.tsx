import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { createShadow, theme } from '@/shared/styles/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  children: ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function Button({ children, onPress, variant = 'primary', disabled = false, accessibilityLabel }: ButtonProps) {
  const variantStyle = variant === 'primary' ? styles.primary : variant === 'secondary' ? styles.secondary : styles.ghost;
  const labelStyle = variant === 'primary' ? styles.label : [styles.label, styles.secondaryLabel];

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? (typeof children === 'string' ? children : undefined)}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variantStyle,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <View style={styles.row}>
        {typeof children === 'string' ? (
          <Text style={labelStyle}>{children}</Text>
        ) : (
          children
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    maxWidth: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 27,
    paddingHorizontal: theme.spacing.lg,
    borderWidth: 1,
    ...createShadow(5),
  },
  primary: {
    backgroundColor: theme.colors.primaryDark,
    borderColor: 'rgba(78, 52, 37, 0.26)',
  },
  secondary: {
    backgroundColor: 'rgba(255, 253, 246, 0.78)',
    borderColor: 'rgba(139, 112, 83, 0.16)',
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  row: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  label: {
    flexShrink: 1,
    color: '#FFF8F0',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
    textAlign: 'center',
  },
  secondaryLabel: {
    color: theme.colors.text,
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.55,
  },
});
