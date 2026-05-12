import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/shared/styles/theme';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: theme.colors.mutedText,
  },
});
