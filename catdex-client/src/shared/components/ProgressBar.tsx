import { StyleSheet, View } from 'react-native';
import { theme } from '@/shared/styles/theme';

interface ProgressBarProps {
  value: number;
  trackColor?: string;
  indicatorColor?: string;
}

export function ProgressBar({
  value,
  trackColor = 'rgba(255,255,255,0.78)',
  indicatorColor = theme.colors.primary,
}: ProgressBarProps) {
  return (
    <View style={[styles.track, { backgroundColor: trackColor }]}>
      <View style={[styles.indicator, { width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: indicatorColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 10,
    overflow: 'hidden',
    borderRadius: 999,
  },
  indicator: {
    height: '100%',
    borderRadius: 999,
  },
});
