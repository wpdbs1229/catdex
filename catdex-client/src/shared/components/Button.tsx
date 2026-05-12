import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { createShadow, theme } from '@/shared/styles/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  children: ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
}

export function Button({ children, onPress, variant = 'primary', disabled = false }: ButtonProps) {
  const variantStyle = variant === 'primary' ? styles.primary : variant === 'secondary' ? styles.secondary : styles.ghost;
  const labelStyle = variant === 'primary' ? styles.label : [styles.label, styles.secondaryLabel];

  return (
    <Pressable
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
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.lg,
    ...createShadow(10),
  },
  primary: {
    backgroundColor: '#4A3428',
  },
  secondary: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  label: {
    color: '#FFF8F0',
    fontSize: 16,
    fontWeight: '700',
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
