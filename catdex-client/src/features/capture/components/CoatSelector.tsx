import { Check } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { captureColors } from '../capture.theme';
import { CoatPatternSwatch } from './CoatPatternSwatch';
import {
  COAT_COLORS,
  COAT_PATTERNS,
  type CoatColorId,
  type CoatPatternId,
} from '../coat/coat.types';

interface CoatSelectorProps {
  colors: CoatColorId[];
  pattern: CoatPatternId | null;
  /** 자동 추천으로 미리 선택된 값이 있으면 그 사실을 알려 준다. */
  suggested: boolean;
  onToggleColor: (color: CoatColorId) => void;
  onSelectPattern: (pattern: CoatPatternId) => void;
}

/**
 * 색은 여러 개, 무늬는 하나. 자동 판정은 미리 선택까지만 하고 확정은 사용자가 한다.
 * 야외 조명에서는 초콜릿·시나몬·라일락 구분이 신뢰하기 어려워서 고칠 수 있어야 한다.
 */
export function CoatSelector({
  colors,
  pattern,
  suggested,
  onToggleColor,
  onSelectPattern,
}: CoatSelectorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>색</Text>
        {suggested ? <Text style={styles.sectionHint}>자동으로 골라뒀어요 · 눌러서 바꾸세요</Text> : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {COAT_COLORS.map((color) => {
          const isSelected = colors.includes(color.id);

          return (
            <Pressable
              key={color.id}
              accessibilityRole="checkbox"
              accessibilityLabel={`${color.label} ${color.globalLabel}`}
              accessibilityState={{ checked: isSelected }}
              onPress={() => onToggleColor(color.id)}
              style={[styles.chip, isSelected && styles.chipSelected]}
            >
              <View
                style={[
                  styles.swatchFrame,
                  isSelected && styles.swatchFrameSelected,
                  { backgroundColor: color.swatch },
                ]}
              >
                {isSelected ? <Check color={swatchCheckColor(color.id)} size={16} strokeWidth={3} /> : null}
              </View>
              <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>{color.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>무늬</Text>
      </View>

      <View style={styles.row}>
        {COAT_PATTERNS.map((option) => {
          const isSelected = pattern === option.id;

          return (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityLabel={`${option.label} ${option.description}`}
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelectPattern(option.id)}
              style={[styles.chip, isSelected && styles.chipSelected]}
            >
              <View style={[styles.swatchFrame, isSelected && styles.swatchFrameSelected]}>
                <CoatPatternSwatch pattern={option.id} size={SWATCH_SIZE} />
              </View>
              <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** 어두운 견본 위에서는 흰 체크, 밝은 견본 위에서는 검은 체크가 보인다. */
function swatchCheckColor(color: CoatColorId) {
  return color === 'white' || color === 'cream' || color === 'lilac' || color === 'gray'
    ? captureColors.onControlActive
    : captureColors.text;
}

const SWATCH_SIZE = 40;

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  sectionTitle: {
    color: captureColors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  sectionHint: {
    color: captureColors.mutedText,
    fontSize: 11,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 14,
  },
  chipSelected: {
    backgroundColor: captureColors.control,
  },
  swatchFrame: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: SWATCH_SIZE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  swatchFrameSelected: {
    borderColor: captureColors.accent,
  },
  chipLabel: {
    color: captureColors.mutedText,
    fontSize: 11,
  },
  chipLabelSelected: {
    color: captureColors.text,
    fontWeight: '700',
  },
});
