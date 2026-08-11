import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  DEX_COLOR_OPTIONS,
  DEX_PATTERN_OPTIONS,
  OTHER_COAT,
  toggleDexFilterValue,
  type DexColorFilter,
  type DexFilter,
  type DexPatternFilter,
} from '@/features/cats/dex-filter';
import { nd, theme } from '@/shared/styles/theme';

interface DexFilterPanelProps {
  /** 패널을 열 때의 적용된 필터. 패널 안에서는 초안으로만 다룬다. */
  filter: DexFilter;
  /** 초안 기준으로 몇 마리가 걸리는지. 시안의 "N마리의 고양이 보기"에 쓴다. */
  countFor: (draft: DexFilter) => number;
  onApply: (next: DexFilter) => void;
}

/** 밝은 견본 위에서는 검은 체크라야 보인다. */
function checkColorFor(id: DexColorFilter) {
  return id === 'white' || id === 'cream' || id === 'lilac' || id === 'gray'
    ? nd.colors.ink
    : nd.colors.bg;
}

export function DexFilterPanel({ filter, countFor, onApply }: DexFilterPanelProps) {
  const [draft, setDraft] = useState<DexFilter>(filter);
  const matchCount = countFor(draft);

  const toggleColor = (value: DexColorFilter) => {
    setDraft((previous) => ({ ...previous, colors: toggleDexFilterValue(previous.colors, value) }));
  };

  const togglePattern = (value: DexPatternFilter) => {
    setDraft((previous) => ({
      ...previous,
      patterns: toggleDexFilterValue(previous.patterns, value),
    }));
  };

  return (
    <View style={styles.panel}>
      <ScrollView
        contentContainerStyle={styles.scrollBody}
        showsVerticalScrollIndicator
        style={styles.scroll}
      >
        <Text style={styles.sectionTitle}>컬러</Text>
        <View style={styles.optionGrid}>
          {DEX_COLOR_OPTIONS.map((option) => {
            const isSelected = draft.colors.includes(option.id);

            return (
              <Pressable
                accessibilityLabel={option.label}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                key={option.id}
                onPress={() => toggleColor(option.id)}
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
              >
                <View
                  style={[
                    styles.swatch,
                    option.swatch
                      ? { backgroundColor: option.swatch }
                      : styles.swatchOther,
                  ]}
                >
                  {isSelected ? (
                    <Check color={checkColorFor(option.id)} size={14} strokeWidth={3} />
                  ) : null}
                </View>
                <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>패턴</Text>
        <View style={styles.optionGrid}>
          {DEX_PATTERN_OPTIONS.map((option) => {
            const isSelected = draft.patterns.includes(option.id);

            return (
              <Pressable
                accessibilityLabel={option.label}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                key={option.id}
                onPress={() => togglePattern(option.id)}
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
              >
                <View style={[styles.swatch, isSelected ? styles.swatchOn : styles.swatchOff]}>
                  {isSelected ? <Check color={nd.colors.bg} size={14} strokeWidth={3} /> : null}
                </View>
                <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <Pressable
        accessibilityLabel={`${matchCount}마리의 고양이 보기`}
        accessibilityRole="button"
        onPress={() => onApply(draft)}
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
      >
        <Text style={styles.ctaLabel}>{matchCount}마리의 고양이 보기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: nd.colors.bg,
    borderWidth: 1,
    borderColor: nd.colors.border,
    paddingTop: 16,
    paddingBottom: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  scroll: {
    // 목록이 길어도 하단 CTA가 화면 밖으로 밀리지 않게 잘라 둔다. 시안의 스크롤바와 같은 의도다.
    maxHeight: 240,
  },
  scrollBody: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.33,
    color: nd.colors.sub,
    marginBottom: 12,
  },
  sectionTitleSpaced: {
    marginTop: 20,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 14,
  },
  option: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionPressed: {
    opacity: 0.6,
  },
  swatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: nd.colors.border,
  },
  swatchOther: {
    backgroundColor: nd.colors.field,
    borderStyle: 'dashed',
    borderColor: nd.colors.subtle,
  },
  swatchOn: {
    backgroundColor: nd.colors.ink,
    borderColor: nd.colors.ink,
  },
  swatchOff: {
    backgroundColor: nd.colors.bg,
  },
  optionLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    letterSpacing: -0.35,
    color: nd.colors.sub,
  },
  optionLabelSelected: {
    color: nd.colors.ink,
    fontWeight: '600',
  },
  cta: {
    marginTop: 16,
    marginHorizontal: 20,
    height: 48,
    borderRadius: nd.radius.input,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
  },
  ctaPressed: {
    opacity: 0.88,
  },
  ctaLabel: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.38,
    color: nd.colors.bg,
  },
});
