import { useState } from 'react';
import { Check } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { createNdShadow, nd } from '@/shared/styles/theme';
import type { CaptureCatDraft, CatType, PersonalityTag } from '@/shared/types/cat';

interface CatRegisterFormProps {
  coatOptions: CatType[];
  personalityOptions: PersonalityTag[];
  capturedImageUri: string | null;
  defaultRegionName: string;
  imageUrlOverride?: string;
  isSubmitting?: boolean;
  onSubmit: (draft: CaptureCatDraft) => Promise<void> | void;
  onSubmitSighting: (draft: CaptureCatDraft) => Promise<void> | void;
}

type CoatColorKey = '블랙' | '그레이' | '화이트' | '크림' | '초콜릿' | '브라운' | '시나몬' | '오렌지' | '라일락' | '기타';
type CoatPatternKey = '원톤' | '투톤' | '태비' | '토티';
type GenderKey = '수컷' | '암컷';

const COLOR_OPTIONS: Array<{ key: CoatColorKey; color: string; isEtc?: boolean }> = [
  { key: '블랙', color: '#111111' },
  { key: '그레이', color: '#9CA0A8' },
  { key: '화이트', color: '#FFFFFF' },
  { key: '크림', color: '#FFFDD0' },
  { key: '초콜릿', color: '#3D2314' },
  { key: '브라운', color: '#8B4513' },
  { key: '시나몬', color: '#D2691E' },
  { key: '오렌지', color: '#F5942F' },
  { key: '라일락', color: '#C8A2C8' },
  { key: '기타', color: '#F7F7FB', isEtc: true },
];

const PATTERN_OPTIONS: CoatPatternKey[] = ['원톤', '투톤', '태비', '토티'];

const DARK_SWATCHES: CoatColorKey[] = ['블랙', '초콜릿', '브라운', '시나몬'];

// 컬러 + 패턴 조합을 기존 CatType(털색 도감 분류)으로 변환한다.
function deriveCatType(color: CoatColorKey | null, pattern: CoatPatternKey | null): CatType {
  if (pattern === '토티') {
    return color === '블랙' || color === '초콜릿' ? '카오스냥' : '삼색이';
  }

  if (pattern === '태비') {
    if (color === '오렌지' || color === '크림') {
      return '치즈냥';
    }

    if (color === '그레이' || color === '블랙') {
      return '고등어냥';
    }

    return '갈색태비';
  }

  if (pattern === '투톤') {
    if (color === '블랙') {
      return '턱시도';
    }

    if (color === '화이트') {
      return '젖소냥';
    }

    return '얼룩냥';
  }

  switch (color) {
    case '블랙':
      return '검은냥';
    case '화이트':
      return '흰냥';
    case '그레이':
    case '라일락':
      return '회색냥';
    case '크림':
    case '오렌지':
      return '치즈냥';
    case '초콜릿':
    case '브라운':
    case '시나몬':
      return '갈색태비';
    default:
      return '기타냥';
  }
}

function PatternSwatch({ pattern }: { pattern: CoatPatternKey }) {
  switch (pattern) {
    case '원톤':
      return <View style={patternStyles.oneTone} />;
    case '투톤':
      return (
        <View style={patternStyles.twoTone}>
          <View style={patternStyles.twoToneDot} />
        </View>
      );
    case '태비':
      return (
        <View style={patternStyles.tabby}>
          <View style={patternStyles.tabbyStripe} />
          <View style={patternStyles.tabbyStripe} />
          <View style={patternStyles.tabbyStripe} />
        </View>
      );
    case '토티':
      return (
        <View style={patternStyles.tortie}>
          <View style={patternStyles.tortiePatchDark} />
          <View style={patternStyles.tortiePatchLight} />
        </View>
      );
  }
}

export function CatRegisterForm({
  capturedImageUri,
  defaultRegionName,
  imageUrlOverride,
  isSubmitting = false,
  onSubmit,
}: CatRegisterFormProps) {
  const [selectedColor, setSelectedColor] = useState<CoatColorKey | null>(null);
  const [selectedPattern, setSelectedPattern] = useState<CoatPatternKey | null>(null);
  const [selectedGender, setSelectedGender] = useState<GenderKey | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [breed, setBreed] = useState('');
  const canSubmit = name.trim().length > 0 && selectedColor !== null && selectedPattern !== null && !isSubmitting;

  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }

    const tags: string[] = [];

    if (selectedGender) {
      tags.push(selectedGender);
    }

    if (breed.trim()) {
      tags.push(`품종:${breed.trim()}`);
    }

    const imageUrl = imageUrlOverride ?? capturedImageUri ?? undefined;
    const draft: CaptureCatDraft = {
      name: name.trim(),
      type: deriveCatType(selectedColor, selectedPattern),
      tags,
      regionName: defaultRegionName.trim() || '동네 미지정',
      memo: description.trim(),
      imageUrl,
      cutoutImageUrl: imageUrl,
    };

    void onSubmit(draft);
  };

  return (
    <View style={styles.sheet}>
      <View style={styles.grabber} />
      <Text style={styles.sheetTitle}>도감 추가하기</Text>

      <View style={styles.optionSection}>
        <Text style={styles.optionLabel}>컬러</Text>
        <ScrollView contentContainerStyle={styles.swatchRow} horizontal showsHorizontalScrollIndicator={false}>
          {COLOR_OPTIONS.map(({ key, color, isEtc }) => {
            const isSelected = selectedColor === key;
            const checkColor = DARK_SWATCHES.includes(key) ? '#FFFFFF' : nd.colors.ink;

            return (
              <Pressable key={key} onPress={() => setSelectedColor(key)} style={styles.swatchItem}>
                <View style={[styles.swatch, { backgroundColor: color }, isSelected && styles.swatchSelected]}>
                  {isEtc && !isSelected ? <Text style={styles.swatchEtcText}>?</Text> : null}
                  {isSelected ? <Check color={checkColor} size={18} strokeWidth={2.4} /> : null}
                </View>
                <Text style={styles.swatchLabel}>{key}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.optionSection}>
        <Text style={styles.optionLabel}>패턴</Text>
        <View style={styles.swatchRow}>
          {PATTERN_OPTIONS.map((pattern) => {
            const isSelected = selectedPattern === pattern;

            return (
              <Pressable key={pattern} onPress={() => setSelectedPattern(pattern)} style={styles.swatchItem}>
                <View style={[styles.patternSwatchWrap, isSelected && styles.swatchSelected]}>
                  <PatternSwatch pattern={pattern} />
                  {isSelected ? (
                    <View style={styles.patternCheckOverlay}>
                      <Check color={nd.colors.ink} size={18} strokeWidth={2.4} />
                    </View>
                  ) : null}
                </View>
                <Text style={styles.swatchLabel}>{pattern}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.fieldStack}>
        <TextInput
          editable={!isSubmitting}
          maxLength={3}
          onChangeText={setName}
          placeholder="3글자 이내로 이름을 지어주세요"
          placeholderTextColor={nd.colors.sub}
          style={styles.input}
          value={name}
        />
        <TextInput
          editable={!isSubmitting}
          maxLength={50}
          onChangeText={setDescription}
          placeholder="생김새나 성격적인 특징을 적어주세요. (50자 이내)"
          placeholderTextColor={nd.colors.sub}
          style={styles.input}
          value={description}
        />
        <TextInput
          editable={!isSubmitting}
          maxLength={20}
          onChangeText={setBreed}
          placeholder="품종을 적어주세요"
          placeholderTextColor={nd.colors.sub}
          style={styles.input}
          value={breed}
        />
        <View style={styles.genderRow}>
          {(['수컷', '암컷'] as GenderKey[]).map((gender) => {
            const isSelected = selectedGender === gender;

            return (
              <Pressable
                accessibilityLabel={gender}
                disabled={isSubmitting}
                key={gender}
                onPress={() => setSelectedGender((prev) => (prev === gender ? null : gender))}
                style={[styles.genderButton, isSelected && styles.genderButtonSelected]}
              >
                <Text style={[styles.genderSymbol, isSelected && styles.genderSymbolSelected]}>{gender === '수컷' ? '♂' : '♀'}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable
        accessibilityLabel="등록하기"
        accessibilityRole="button"
        disabled={!canSubmit}
        onPress={handleSubmit}
        style={({ pressed }) => [styles.submitButton, !canSubmit && styles.submitButtonDisabled, pressed && styles.pressed]}
      >
        <Text style={styles.submitButtonText}>{isSubmitting ? '등록 중...' : '등록하기'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    marginTop: 20,
    borderTopLeftRadius: 46,
    borderTopRightRadius: 46,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    ...createNdShadow(0.16, 32),
  },
  grabber: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 100,
    backgroundColor: '#D9D9D9',
    marginBottom: 20,
  },
  sheetTitle: {
    paddingHorizontal: 8,
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '500',
    letterSpacing: -0.45,
    color: nd.colors.ink,
    marginBottom: 20,
  },
  optionSection: {
    gap: 8,
    marginBottom: 16,
  },
  optionLabel: {
    paddingHorizontal: 8,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: -0.35,
    color: nd.colors.ink,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 4,
  },
  swatchItem: {
    alignItems: 'center',
    gap: 6,
  },
  swatch: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(17, 17, 17, 0.1)',
  },
  swatchSelected: {
    borderWidth: 2,
    borderColor: nd.colors.ink,
  },
  swatchEtcText: {
    fontSize: 15,
    fontWeight: '600',
    color: nd.colors.ink,
  },
  swatchLabel: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    letterSpacing: -0.3,
    color: '#000000',
  },
  patternSwatchWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(17, 17, 17, 0.1)',
  },
  patternCheckOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  fieldStack: {
    gap: 8,
    marginTop: 4,
  },
  input: {
    minHeight: 54,
    borderRadius: nd.radius.input,
    borderWidth: 1,
    borderColor: nd.colors.border,
    backgroundColor: '#FFFFFF',
    padding: 16,
    fontSize: 14,
    letterSpacing: -0.35,
    color: nd.colors.ink,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    borderRadius: nd.radius.input,
    borderWidth: 1,
    borderColor: nd.colors.border,
    backgroundColor: '#FFFFFF',
  },
  genderButtonSelected: {
    borderColor: nd.colors.primary,
    backgroundColor: nd.colors.primarySoft,
  },
  genderSymbol: {
    fontSize: 18,
    lineHeight: 22,
    color: nd.colors.ink,
  },
  genderSymbolSelected: {
    color: nd.colors.primary,
  },
  submitButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: nd.radius.input,
    backgroundColor: nd.colors.primary,
    padding: 16,
    marginTop: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#A5ADB8',
  },
  submitButtonText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: -0.4,
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.88,
  },
});

const patternStyles = StyleSheet.create({
  oneTone: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  twoTone: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1E2D0',
  },
  twoToneDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4A3428',
  },
  tabby: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    backgroundColor: '#C9CDD4',
  },
  tabbyStripe: {
    width: 5,
    height: '120%',
    backgroundColor: '#5A5F68',
    transform: [{ rotate: '18deg' }],
  },
  tortie: {
    flex: 1,
    backgroundColor: '#C97B3D',
  },
  tortiePatchDark: {
    position: 'absolute',
    top: 4,
    left: 6,
    width: 18,
    height: 16,
    borderRadius: 9,
    backgroundColor: '#3D2314',
  },
  tortiePatchLight: {
    position: 'absolute',
    right: 3,
    bottom: 5,
    width: 16,
    height: 14,
    borderRadius: 8,
    backgroundColor: '#F1E2D0',
  },
});
