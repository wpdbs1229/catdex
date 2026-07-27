import { AlertCircle, Check, Scissors } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  deriveCoatHints,
  processCatPhoto,
  type CatVisionResult,
} from '../../../shared/native/catVision';
import { CutoutCanvas } from '../components/CutoutCanvas';
import { captureColors, captureSpacing } from '../capture.theme';
import type { CaptureStackScreenProps } from '../../../app/navigation/types';

type ReviewMode = 'cutout' | 'original';

export function CaptureReviewScreen({ navigation, route }: CaptureStackScreenProps<'CaptureReview'>) {
  const insets = useSafeAreaInsets();
  const { photoUri } = route.params;

  const [result, setResult] = useState<CatVisionResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [mode, setMode] = useState<ReviewMode>('cutout');

  useEffect(() => {
    let isActive = true;

    processCatPhoto(photoUri)
      .then((next) => {
        if (!isActive) {
          return;
        }

        setResult(next);
        // 잘라낼 것을 못 찾았으면 원본을 보여 주는 편이 덜 당황스럽다.
        setMode(next.cutoutImageUri ? 'cutout' : 'original');
      })
      .catch((error: unknown) => {
        if (isActive) {
          setFailure(error instanceof Error ? error.message : '사진을 처리하지 못했어요.');
        }
      });

    return () => {
      isActive = false;
    };
  }, [photoUri]);

  const coatHints = useMemo(() => deriveCoatHints(result?.colorProfile), [result]);
  const isProcessing = !result && !failure;

  const handleRetake = useCallback(() => {
    navigation.navigate('Camera', { lastCutoutUri: result?.cutoutImageUri ?? undefined });
  }, [navigation, result]);

  const handleRegister = useCallback(() => {
    Alert.alert(
      '도감 등록은 준비 중이에요',
      '지금은 촬영과 누끼까지만 동작합니다. 등록·매칭 흐름은 다음 단계에서 붙일 예정이에요.',
    );
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>이 사진으로 할까요?</Text>
        <StatusLine isProcessing={isProcessing} failure={failure} result={result} />
      </View>

      <View style={styles.stage}>
        {isProcessing ? (
          <View style={styles.processing}>
            <ActivityIndicator color={captureColors.accent} />
            <Text style={styles.processingText}>배경을 지우는 중이에요</Text>
          </View>
        ) : (
          <CutoutCanvas
            uri={mode === 'cutout' ? result?.cutoutImageUri ?? photoUri : photoUri}
            showTransparencyPattern={mode === 'cutout' && Boolean(result?.isPreciseCutout)}
          />
        )}
      </View>

      {coatHints.length > 0 ? (
        <View style={styles.hintRow}>
          {coatHints.map((hint) => (
            <View key={hint} style={styles.hintChip}>
              <Text style={styles.hintChipText}>{hint}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.footer}>
        {result?.cutoutImageUri ? (
          <View style={styles.modeSwitch}>
            <ModeButton
              label="누끼"
              isActive={mode === 'cutout'}
              onPress={() => setMode('cutout')}
            />
            <ModeButton
              label="원본"
              isActive={mode === 'original'}
              onPress={() => setMode('original')}
            />
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            onPress={handleRetake}
            style={[styles.actionButton, styles.secondaryButton]}
          >
            <Text style={styles.secondaryButtonText}>다시 찍기</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={isProcessing}
            onPress={handleRegister}
            style={[styles.actionButton, styles.primaryButton, isProcessing && styles.buttonDisabled]}
          >
            <Check color={captureColors.onControlActive} size={18} />
            <Text style={styles.primaryButtonText}>도감에 등록</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

interface StatusLineProps {
  isProcessing: boolean;
  failure: string | null;
  result: CatVisionResult | null;
}

function StatusLine({ isProcessing, failure, result }: StatusLineProps) {
  if (isProcessing) {
    return <Text style={styles.headerBody}>기기 안에서 고양이를 찾고 있어요</Text>;
  }

  if (failure) {
    return (
      <View style={styles.statusRow}>
        <AlertCircle color={captureColors.danger} size={14} />
        <Text style={[styles.headerBody, styles.dangerText]}>{failure}</Text>
      </View>
    );
  }

  if (!result?.hasCat) {
    return (
      <View style={styles.statusRow}>
        <AlertCircle color={captureColors.danger} size={14} />
        <Text style={[styles.headerBody, styles.dangerText]}>
          고양이를 확실히 찾지 못했어요. 조금 더 가까이서 다시 찍어볼까요?
        </Text>
      </View>
    );
  }

  if (!result.isPreciseCutout) {
    return (
      <View style={styles.statusRow}>
        <Scissors color={captureColors.mutedText} size={14} />
        <Text style={styles.headerBody}>배경을 완전히 지우지 못해 네모로 잘랐어요</Text>
      </View>
    );
  }

  return (
    <View style={styles.statusRow}>
      <Scissors color={captureColors.accent} size={14} />
      <Text style={styles.headerBody}>
        고양이를 찾았어요 · 확신도 {Math.round(result.confidence * 100)}%
      </Text>
    </View>
  );
}

interface ModeButtonProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

function ModeButton({ label, isActive, onPress }: ModeButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      onPress={onPress}
      style={[styles.modeButton, isActive && styles.modeButtonActive]}
    >
      <Text style={[styles.modeButtonText, isActive && styles.modeButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: captureColors.background,
    paddingHorizontal: captureSpacing.gutter,
  },
  header: {
    paddingVertical: 16,
    gap: 6,
  },
  headerTitle: {
    color: captureColors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  headerBody: {
    color: captureColors.mutedText,
    fontSize: 13,
    flexShrink: 1,
  },
  dangerText: {
    color: captureColors.danger,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stage: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  processing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  processingText: {
    color: captureColors.mutedText,
    fontSize: 13,
  },
  hintRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 12,
  },
  hintChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: captureColors.control,
  },
  hintChipText: {
    color: captureColors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    paddingVertical: 16,
    gap: 14,
  },
  modeSwitch: {
    alignSelf: 'center',
    flexDirection: 'row',
    padding: 4,
    borderRadius: 999,
    backgroundColor: captureColors.control,
  },
  modeButton: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 999,
  },
  modeButtonActive: {
    backgroundColor: captureColors.controlActive,
  },
  modeButtonText: {
    color: captureColors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: captureColors.onControlActive,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryButton: {
    backgroundColor: captureColors.control,
  },
  secondaryButtonText: {
    color: captureColors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: captureColors.accent,
  },
  primaryButtonText: {
    color: captureColors.onControlActive,
    fontSize: 15,
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
