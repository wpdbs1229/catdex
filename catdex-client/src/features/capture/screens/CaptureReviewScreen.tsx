import { AlertCircle, Check, ChevronLeft, Scissors } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { processCatPhoto, type CatVisionResult } from '../../../shared/native/catVision';
import { analyzeCoat } from '../coat/coat-analysis';
import type { CoatColorId, CoatPatternId, CoatPatternMetrics } from '../coat/coat.types';
import { CoatSelector } from '../components/CoatSelector';
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
  const [colors, setColors] = useState<CoatColorId[]>([]);
  const [pattern, setPattern] = useState<CoatPatternId | null>(null);
  const [autoSuggested, setAutoSuggested] = useState(false);
  const [metrics, setMetrics] = useState<CoatPatternMetrics | null>(null);

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

        // 자동 판정은 사전 선택까지만. 확신이 없으면 비워 두고 사용자가 고르게 한다.
        const coat = analyzeCoat(next.subjectSamples, next.sceneSamples);
        setColors(coat.colors);
        setPattern(coat.pattern);
        setAutoSuggested(coat.colors.length > 0 || coat.pattern !== null);
        setMetrics(coat.metrics ?? null);
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

  const isProcessing = !result && !failure;
  const cutoutAspectRatio =
    result?.cutoutWidth && result.cutoutHeight ? result.cutoutWidth / result.cutoutHeight : undefined;

  const handleToggleColor = useCallback((color: CoatColorId) => {
    setColors((current) =>
      current.includes(color) ? current.filter((item) => item !== color) : [...current, color],
    );
  }, []);

  // "다시 찍기"는 카메라로 돌아가고, 이 버튼은 촬영 흐름 자체를 빠져나간다.
  const handleClose = useCallback(() => {
    navigation.getParent()?.goBack();
  }, [navigation]);

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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="촬영 그만두고 나가기"
          hitSlop={8}
          onPress={handleClose}
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
        >
          <ChevronLeft color={captureColors.text} size={22} />
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>이 사진으로 할까요?</Text>
          <StatusLine isProcessing={isProcessing} failure={failure} result={result} />
        </View>
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
            aspectRatio={mode === 'cutout' ? cutoutAspectRatio : undefined}
            showTransparencyPattern={mode === 'cutout' && Boolean(result?.isPreciseCutout)}
          />
        )}
      </View>

      {__DEV__ && metrics ? (
        <Text style={styles.debugLine}>
          {`edge ${metrics.edgeEnergy.toFixed(3)} · 2nd ${metrics.secondaryRatio.toFixed(2)}`}
          {` · trans ${metrics.transitionDensity.toFixed(3)} · blob ${metrics.largestBlobShare.toFixed(2)}`}
        </Text>
      ) : null}

      {isProcessing ? null : (
        <View style={styles.coatSection}>
          <CoatSelector
            colors={colors}
            pattern={pattern}
            suggested={autoSuggested}
            onToggleColor={handleToggleColor}
            onSelectPattern={setPattern}
          />
        </View>
      )}

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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: captureColors.control,
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  headerTitle: {
    color: captureColors.text,
    fontSize: 22,
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
  debugLine: {
    paddingTop: 8,
    color: captureColors.mutedText,
    fontSize: 10,
  },
  coatSection: {
    paddingTop: 14,
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
    // 선택된 칩은 배경이 거의 흰색이라 글자를 어둡게 해야 읽힌다.
    color: captureColors.onControlActive,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    height: 54,
    borderRadius: 999,
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
