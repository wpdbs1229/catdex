import { Pressable, StyleSheet, Text, View } from 'react-native';

import { captureColors } from '../capture.theme';
import { formatZoomFactor, type ZoomStop } from '../camera-zoom';

interface ZoomLevelSelectorProps {
  stops: ZoomStop[];
  factor: number;
  isAdjusting: boolean;
  onSelect: (factor: number) => void;
}

/** 선택 중인 배율만 x1 형태로 보여 준다. 핀치 중에는 실제 배율을 따로 띄운다. */
export function ZoomLevelSelector({ stops, factor, isAdjusting, onSelect }: ZoomLevelSelectorProps) {
  if (stops.length < 2) {
    return null;
  }

  const activeFactor = nearestStopFactor(stops, factor);

  return (
    <View style={styles.container}>
      {isAdjusting ? (
        <View style={styles.liveBadge}>
          <Text style={styles.liveBadgeText}>{formatZoomFactor(factor)}</Text>
        </View>
      ) : null}

      <View style={styles.track}>
        {stops.map((stop) => {
          const isActive = !isAdjusting && stop.factor === activeFactor;

          return (
            <Pressable
              key={stop.factor}
              accessibilityRole="button"
              accessibilityLabel={`${stop.factor}배 확대`}
              accessibilityState={{ selected: isActive }}
              hitSlop={6}
              onPress={() => onSelect(stop.factor)}
              style={[styles.chip, isActive && styles.chipActive]}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {isActive ? formatZoomFactor(stop.factor) : stop.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** 핀치로 어중간한 배율에 머물러도 가장 가까운 칩을 켜 둔다. */
function nearestStopFactor(stops: ZoomStop[], factor: number) {
  return stops.reduce((closest, stop) =>
    Math.abs(stop.factor - factor) < Math.abs(closest.factor - factor) ? stop : closest,
  ).factor;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 10,
  },
  liveBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: captureColors.overlay,
  },
  liveBadgeText: {
    color: captureColors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: 999,
    backgroundColor: captureColors.control,
  },
  chip: {
    minWidth: 40,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: captureColors.controlActive,
  },
  chipText: {
    color: captureColors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: captureColors.onControlActive,
    fontSize: 13,
    fontWeight: '800',
  },
});
