import { useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type ImageSourcePropType } from 'react-native';
import { AlertCircle, ArrowLeft, Camera, Heart, ImagePlus, RotateCcw, Scissors } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraPlaceholder } from '@/features/capture/components/CameraPlaceholder';
import { CandidateCompareSheet } from '@/features/capture/components/CandidateCompareSheet';
import { CatRegisterForm } from '@/features/capture/components/CatRegisterForm';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { PolaroidCatCard } from '@/shared/components/PolaroidCatCard';
import { getUserFacingError } from '@/shared/errors/user-facing-error';
import { deriveCoatHints, isCatVisionAvailable, processCatPhoto } from '@/shared/native/catVision';
import { createNdShadow, createShadow, nd, theme } from '@/shared/styles/theme';
import type { Cat, CatMatchCandidate, CatType, CaptureCatDraft, PersonalityTag, ProcessedCatPhoto } from '@/shared/types/cat';
import { formatNyanTagLabel, getCatIllustrationKey, type CatIllustrationKey } from '@/shared/utils/catPresentation';

type CaptureStep = 'camera' | 'processing' | 'noCat' | 'match' | 'register';
type CaptureFailureKind = 'noCat' | 'visionUnavailable' | 'processError';

interface StoredCaptureResult {
  observationId?: string;
  cutoutImageUrl?: string;
  candidates: CatMatchCandidate[];
}

interface CaptureScreenProps {
  coatOptions: CatType[];
  personalityOptions: PersonalityTag[];
  neighborhoodName: string;
  isSubmitting?: boolean;
  onMarkUncertain: (payload: { observationId?: string; cutoutImageUrl?: string; processedPhoto: ProcessedCatPhoto }) => Promise<void> | void;
  onBack: () => void;
  onProcessPhoto: (processedPhoto: ProcessedCatPhoto) => Promise<StoredCaptureResult>;
  onRecordExisting: (catId: string, payload?: { observationId?: string; imageUrl?: string }) => Promise<void> | void;
  onSave: (draft: CaptureCatDraft) => Promise<void> | void;
  onSaveSighting: (draft: CaptureCatDraft) => Promise<void> | void;
}

const catImages = {
  orange: require('../../../assets/illustrations/cat-orange-clean.png'),
  dark: require('../../../assets/illustrations/cat-dark-clean.png'),
  tuxedo: require('../../../assets/illustrations/cat-tuxedo-clean.png'),
  gray: require('../../../assets/illustrations/cat-gray-clean.png'),
} satisfies Record<CatIllustrationKey, ImageSourcePropType>;

function imageForCat(cat: Cat): ImageSourcePropType {
  if (cat.imageUrl) {
    return { uri: cat.imageUrl };
  }

  return catImages[getCatIllustrationKey(cat.type)];
}

export function CaptureScreen({
  coatOptions,
  personalityOptions,
  neighborhoodName,
  isSubmitting = false,
  onMarkUncertain,
  onBack,
  onProcessPhoto,
  onRecordExisting,
  onSave,
  onSaveSighting,
}: CaptureScreenProps) {
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [processedPhoto, setProcessedPhoto] = useState<ProcessedCatPhoto | null>(null);
  const [storedResult, setStoredResult] = useState<StoredCaptureResult | null>(null);
  const [step, setStep] = useState<CaptureStep>('camera');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [failureKind, setFailureKind] = useState<CaptureFailureKind | null>(null);
  const [isUsingOriginalFallback, setIsUsingOriginalFallback] = useState(false);
  const { height: windowHeight } = useWindowDimensions();
  const cameraHeight = Math.min(680, Math.max(500, windowHeight - 190));
  const candidates = storedResult?.candidates ?? [];
  const currentImageUrl = storedResult?.cutoutImageUrl ?? processedPhoto?.cutoutImageUri;
  const canUseCatVision = isCatVisionAvailable();

  // 후보 카드를 탭하면 바로 확정하는 대신, 사진을 크게 비교하는 시트를 연다.
  const [compareCandidate, setCompareCandidate] = useState<CatMatchCandidate | null>(null);
  // '첫 번째 발견자가 되어주세요' 프롬프트 시트 표시 여부
  const [isDiscoverPromptVisible, setIsDiscoverPromptVisible] = useState(true);
  const insets = useSafeAreaInsets();

  const handleConfirmCandidate = (candidate: CatMatchCandidate) => {
    void onRecordExisting(candidate.cat.id, {
      observationId: storedResult?.observationId,
      imageUrl: currentImageUrl,
    });
  };

  // 처리 중 취소(다시 촬영)하면 세션 번호가 올라가고, 진행 중이던 비동기
  // 결과는 세션이 달라진 시점에 폐기된다. (취소했는데 뒤늦게 match 화면으로
  // 튀는 문제 방지)
  const captureSessionRef = useRef(0);

  const resetCapture = () => {
    captureSessionRef.current += 1;
    setCapturedImageUri(null);
    setProcessedPhoto(null);
    setStoredResult(null);
    setErrorMessage(null);
    setFailureKind(null);
    setIsUsingOriginalFallback(false);
    setIsDiscoverPromptVisible(true);
    setStep('camera');
  };

  const handlePhotoCaptured = async (uri: string) => {
    const session = ++captureSessionRef.current;
    setCapturedImageUri(uri);
    setProcessedPhoto(null);
    setStoredResult(null);
    setErrorMessage(null);
    setFailureKind(null);
    setIsUsingOriginalFallback(false);

    if (!canUseCatVision) {
      setErrorMessage('이 환경에서는 자동 누끼 분석을 사용할 수 없어요. 실제 기기 개발 빌드에서 자동 분석을 확인하거나, 원본 사진으로 계속 등록할 수 있어요.');
      setFailureKind('visionUnavailable');
      setStep('noCat');
      return;
    }

    setStep('processing');

    try {
      const visionResult = await processCatPhoto(uri);

      if (session !== captureSessionRef.current) {
        return;
      }

      if (!visionResult.hasCat || !visionResult.cutoutImageUri) {
        setErrorMessage('사진에서 고양이를 찾지 못했어요.');
        setFailureKind('noCat');
        setStep('noCat');
        return;
      }

      const nextProcessedPhoto: ProcessedCatPhoto = {
        originalImageUri: uri,
        cutoutImageUri: visionResult.cutoutImageUri,
        confidence: visionResult.confidence,
        isPreciseCutout: visionResult.isPreciseCutout,
        boundingBox: visionResult.boundingBox,
        featureVector: visionResult.featureVector,
        coatHints: deriveCoatHints(visionResult.colorProfile),
        embedding: visionResult.embedding && visionResult.embedding.length > 0 ? visionResult.embedding : undefined,
        embeddingVersion: visionResult.embeddingVersion ?? undefined,
      };
      setProcessedPhoto(nextProcessedPhoto);
      const nextStoredResult = await onProcessPhoto(nextProcessedPhoto);

      if (session !== captureSessionRef.current) {
        return;
      }

      setStoredResult(nextStoredResult);
      setStep('match');
    } catch (error) {
      if (session !== captureSessionRef.current) {
        return;
      }

      console.warn('[capture] photo process failed', error);
      setErrorMessage(getUserFacingError(error, 'capture.process').message);
      setFailureKind('processError');
      setStep('noCat');
    }
  };

  const handlePickTestPhoto = async () => {
    try {
      // iOS(PHPicker)와 최신 Android는 시스템 사진 선택기라 별도 권한이
      // 필요 없다. 권한 요청은 시도하되, 거부돼도 선택기는 열어본다.
      await ImagePicker.requestMediaLibraryPermissionsAsync().catch(() => null);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.84,
      });

      if (result.canceled || !result.assets[0]?.uri) {
        return;
      }

      await handlePhotoCaptured(result.assets[0].uri);
    } catch (error) {
      console.warn('[capture] album pick failed', error);
      setErrorMessage('앨범에서 사진을 불러오지 못했어요. 설정에서 사진 접근 권한을 확인해 주세요.');
      setFailureKind('processError');
      setStep('noCat');
    }
  };

  const handleContinueWithOriginalPhoto = async () => {
    if (!capturedImageUri) {
      return;
    }

    const session = ++captureSessionRef.current;
    const fallbackPhoto: ProcessedCatPhoto = {
      originalImageUri: capturedImageUri,
      cutoutImageUri: capturedImageUri,
      confidence: 0,
      isPreciseCutout: false,
      boundingBox: null,
      featureVector: [],
    };

    setIsUsingOriginalFallback(true);
    setErrorMessage(null);
    setFailureKind(null);
    setStep('processing');

    try {
      setProcessedPhoto(fallbackPhoto);
      const nextStoredResult = await onProcessPhoto(fallbackPhoto);

      if (session !== captureSessionRef.current) {
        return;
      }

      setStoredResult(nextStoredResult);
      setStep('match');
    } catch (error) {
      if (session !== captureSessionRef.current) {
        return;
      }

      console.warn('[capture] original fallback failed', error);
      setErrorMessage(getUserFacingError(error, 'capture.process').message);
      setFailureKind('processError');
      setStep('noCat');
    } finally {
      setIsUsingOriginalFallback(false);
    }
  };

  if (step === 'processing') {
    return (
      <View style={styles.centerScreen}>
        <Card style={styles.processingCard}>
          <View style={styles.processingIcon}>
            <Scissors color={theme.colors.primaryDark} size={26} />
          </View>
          <ActivityIndicator color={theme.colors.primaryDark} size="large" />
          <Text style={styles.processingTitle}>{isUsingOriginalFallback ? '원본 사진 저장 준비 중' : '고양이만 잘라내는 중'}</Text>
          <Text style={styles.processingText}>
            {isUsingOriginalFallback ? '자동 누끼 없이 원본 사진을 대표 사진으로 등록할 수 있게 저장해요.' : '사진은 기기에서 먼저 분석하고, 누끼 이미지는 안전하게 저장해 후보 비교에 써요.'}
          </Text>
          <Button onPress={resetCapture} variant="ghost">
            취소하고 다시 촬영
          </Button>
        </Card>
      </View>
    );
  }

  if (step === 'noCat') {
    const resultTitle =
      failureKind === 'visionUnavailable'
        ? '자동 분석을 사용할 수 없어요'
        : failureKind === 'processError'
          ? '사진을 처리하지 못했어요'
          : '고양이를 찾지 못했어요';

    return (
      <ScrollView key={step} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.resultCard}>
          {capturedImageUri ? <Image source={{ uri: capturedImageUri }} style={styles.resultImage} /> : null}
          <View style={styles.resultMessage}>
            <AlertCircle color={theme.colors.primary} size={24} />
            <Text style={styles.resultTitle}>{resultTitle}</Text>
            <Text style={styles.resultText}>{errorMessage ?? '고양이가 더 크게 보이도록 다시 찍어주세요.'}</Text>
          </View>
          <View style={styles.resultActions}>
            <Button onPress={resetCapture}>
              <RotateCcw color="#FFF8F0" size={18} />
              <Text style={styles.primaryButtonText}>다시 촬영하기</Text>
            </Button>
            {capturedImageUri ? (
              <Button onPress={handleContinueWithOriginalPhoto} variant="secondary">
                원본 사진으로 계속
              </Button>
            ) : null}
            <Button onPress={handlePickTestPhoto} variant="ghost">
              앨범에서 테스트 사진 선택
            </Button>
          </View>
        </Card>
      </ScrollView>
    );
  }

  if (step === 'match' && processedPhoto) {
    return (
      <View key={step} style={styles.ndScreen}>
        <View pointerEvents="none" style={styles.ndWash}>
          <View style={styles.ndWashPink} />
          <View style={styles.ndWashYellow} />
          <View style={styles.ndWashPeach} />
        </View>

        <View style={styles.ndHeader}>
          <Pressable
            accessibilityLabel="다시 촬영하기"
            disabled={isSubmitting}
            onPress={resetCapture}
            style={({ pressed }) => [styles.ndCircleButton, pressed && styles.pressed]}
          >
            <ArrowLeft color={nd.colors.ink} size={20} strokeWidth={1.8} />
          </Pressable>
          <Text style={styles.ndHeaderTitle}>도감</Text>
          <View style={styles.ndCircleButton}>
            <Heart color={nd.colors.ink} size={20} strokeWidth={1.8} />
          </View>
        </View>

        <ScrollView contentContainerStyle={[styles.ndMatchContent, { paddingBottom: isDiscoverPromptVisible ? 280 : 60 }]} showsVerticalScrollIndicator={false}>
          <Image resizeMode="contain" source={{ uri: processedPhoto.cutoutImageUri }} style={styles.ndCutoutImage} />

          {candidates.length > 0 ? (
            <View style={styles.ndCandidateSection}>
              <Text style={styles.ndCandidateTitle}>AI가 판별했어요! 이 고양이가 아닌가요?</Text>
              <ScrollView contentContainerStyle={styles.ndCandidateRow} horizontal showsHorizontalScrollIndicator={false}>
                {candidates.map((candidate) => (
                  <View key={candidate.cat.id} style={styles.ndCandidateCard}>
                    <PolaroidCatCard
                      imageSource={imageForCat(candidate.cat)}
                      onPress={isSubmitting ? undefined : () => setCompareCandidate(candidate)}
                      tagLabel={formatNyanTagLabel(candidate.cat.name, candidate.cat.firstSeenAt)}
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : (
            <View style={styles.ndCandidateSection}>
              <Text style={styles.ndCandidateTitle}>아직 이 동네에 기록된 고양이가 없어요.</Text>
            </View>
          )}

          {!isDiscoverPromptVisible ? (
            <View style={styles.ndMatchActions}>
              <Pressable disabled={isSubmitting} onPress={() => setStep('register')} style={({ pressed }) => [styles.ndPrimaryButton, pressed && styles.pressed]}>
                <Text style={styles.ndPrimaryButtonText}>새 고양이로 등록</Text>
              </Pressable>
              <Pressable
                disabled={isSubmitting}
                onPress={() =>
                  onMarkUncertain({
                    observationId: storedResult?.observationId,
                    cutoutImageUrl: currentImageUrl,
                    processedPhoto,
                  })
                }
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Text style={styles.ndGhostText}>잘 모르겠어요</Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>

        {isDiscoverPromptVisible ? (
          <View style={[styles.ndDiscoverSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <Text style={styles.ndDiscoverTitle}>첫 번째 발견자가 되어주세요.</Text>
            <Text style={styles.ndDiscoverSubtitle}>일상을 나누고 고양이를 케어하며{'\n'}마음의 거리를 줄여보세요.</Text>
            <View style={styles.ndDiscoverActions}>
              <Pressable
                disabled={isSubmitting}
                onPress={() => setIsDiscoverPromptVisible(false)}
                style={({ pressed }) => [styles.ndSecondaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.ndSecondaryButtonText}>나중에 할게요</Text>
              </Pressable>
              <Pressable
                disabled={isSubmitting}
                onPress={() => setStep('register')}
                style={({ pressed }) => [styles.ndPrimaryButton, styles.ndDiscoverStart, pressed && styles.pressed]}
              >
                <Text style={styles.ndPrimaryButtonText}>시작하기</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <CandidateCompareSheet
          candidate={compareCandidate}
          isSubmitting={isSubmitting}
          myPhotoUri={processedPhoto.cutoutImageUri}
          onClose={() => setCompareCandidate(null)}
          onConfirm={handleConfirmCandidate}
        />
      </View>
    );
  }

  if (step === 'register' && processedPhoto) {
    return (
      <View key={step} style={styles.ndScreen}>
        <View pointerEvents="none" style={styles.ndWash}>
          <View style={styles.ndWashPink} />
          <View style={styles.ndWashYellow} />
          <View style={styles.ndWashPeach} />
        </View>

        <View style={styles.ndHeader}>
          <Pressable
            accessibilityLabel="후보 확인으로 돌아가기"
            disabled={isSubmitting}
            onPress={() => setStep('match')}
            style={({ pressed }) => [styles.ndCircleButton, pressed && styles.pressed]}
          >
            <ArrowLeft color={nd.colors.ink} size={20} strokeWidth={1.8} />
          </Pressable>
          <Text style={styles.ndHeaderTitle}>도감</Text>
          <View style={styles.ndCircleButton}>
            <Heart color={nd.colors.ink} size={20} strokeWidth={1.8} />
          </View>
        </View>

        <ScrollView contentContainerStyle={[styles.ndRegisterContent, { paddingBottom: Math.max(insets.bottom, 16) }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Image resizeMode="contain" source={{ uri: processedPhoto.cutoutImageUri }} style={styles.ndCutoutImage} />

          <CatRegisterForm
            capturedImageUri={processedPhoto.cutoutImageUri}
            coatOptions={coatOptions}
            defaultRegionName={neighborhoodName}
            imageUrlOverride={storedResult?.cutoutImageUrl}
            isSubmitting={isSubmitting}
            onSubmit={(draft) =>
              onSave({
                ...draft,
                observationId: storedResult?.observationId,
                cutoutImageUrl: storedResult?.cutoutImageUrl ?? processedPhoto.cutoutImageUri,
              })
            }
            onSubmitSighting={(draft) =>
              onSaveSighting({
                ...draft,
                observationId: storedResult?.observationId,
                cutoutImageUrl: storedResult?.cutoutImageUrl ?? processedPhoto.cutoutImageUri,
              })
            }
            personalityOptions={personalityOptions}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.cameraScreen}>
      <View style={styles.cameraHeader}>
        <View style={styles.cameraHeaderMain}>
          <Pressable
            accessibilityLabel="촬영 화면 닫기"
            accessibilityRole="button"
            hitSlop={10}
            onPress={onBack}
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          >
            <ArrowLeft color="#FFF8F0" size={22} />
          </Pressable>
          <View style={styles.cameraTitleBlock}>
            <Text style={styles.cameraKicker}>{neighborhoodName}</Text>
            <Text style={styles.cameraTitle}>고양이를 촬영하세요</Text>
          </View>
        </View>
        <View style={styles.cameraBadge}>
          <Camera color="#FFF8F0" size={17} />
          <Text style={styles.cameraBadgeText}>자동 누끼</Text>
        </View>
      </View>

      <View style={styles.cameraFrame}>
        <CameraPlaceholder
          capturedImageUri={null}
          height={cameraHeight}
          onPhotoCaptured={handlePhotoCaptured}
          onRetake={resetCapture}
        />
      </View>

      <View style={styles.fallbackStrip}>
        <View style={styles.fallbackCopy}>
          <Text style={styles.fallbackTitle}>{canUseCatVision ? '앨범 사진 테스트' : '자동 분석 대체 모드'}</Text>
          <Text style={styles.fallbackText}>
            {canUseCatVision ? '기기 사진첩의 샘플 사진으로도 분석 흐름을 확인할 수 있어요.' : '이 환경에서는 원본 사진으로 등록할 수 있고, 자동 누끼는 실제 기기 개발 빌드에서 확인해요.'}
          </Text>
        </View>
        <Pressable accessibilityLabel="앨범에서 테스트 사진 선택" accessibilityRole="button" onPress={handlePickTestPhoto} style={({ pressed }) => [styles.pickPhotoButton, pressed && styles.pressed]}>
          <ImagePlus color="#FFF8F0" size={17} />
          <Text style={styles.pickPhotoText}>앨범</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cameraScreen: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    backgroundColor: '#1F1A16',
  },
  cameraHeader: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  cameraHeaderMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,248,240,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,248,240,0.14)',
  },
  backButtonPressed: {
    opacity: 0.72,
  },
  cameraTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  cameraKicker: {
    color: '#D9C7AC',
    fontSize: 12,
    fontWeight: '900',
  },
  cameraTitle: {
    marginTop: 4,
    color: '#FFF8F0',
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: 0,
  },
  cameraBadge: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 19,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(97,122,67,0.85)',
  },
  cameraBadgeText: {
    color: '#FFF8F0',
    fontSize: 12,
    fontWeight: '900',
  },
  cameraFrame: {
    flex: 1,
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
    ...createShadow(10),
  },
  fallbackStrip: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(255,248,240,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,248,240,0.14)',
  },
  fallbackCopy: {
    flex: 1,
    minWidth: 0,
  },
  fallbackTitle: {
    color: '#FFF8F0',
    fontSize: 13,
    fontWeight: '900',
  },
  fallbackText: {
    marginTop: 4,
    color: '#D9C7AC',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
  },
  pickPhotoButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(97,122,67,0.88)',
  },
  pickPhotoText: {
    color: '#FFF8F0',
    fontSize: 12,
    fontWeight: '900',
  },
  centerScreen: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  processingCard: {
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.lg,
    backgroundColor: 'rgba(255,253,246,0.95)',
  },
  processingIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceAlt,
  },
  processingTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.colors.text,
  },
  processingText: {
    maxWidth: 260,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    color: theme.colors.mutedText,
  },
  content: {
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  resultCard: {
    gap: theme.spacing.lg,
    backgroundColor: 'rgba(255,253,246,0.94)',
  },
  resultImage: {
    width: '100%',
    aspectRatio: 0.86,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceAlt,
  },
  resultMessage: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  resultTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: theme.colors.text,
  },
  resultText: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    color: theme.colors.mutedText,
  },
  resultActions: {
    gap: theme.spacing.sm,
  },
  primaryButtonText: {
    color: '#FFF8F0',
    fontSize: 16,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.84,
  },
  ndScreen: {
    flex: 1,
    backgroundColor: nd.colors.bg,
  },
  ndWash: {
    ...StyleSheet.absoluteFillObject,
  },
  ndWashPink: {
    position: 'absolute',
    top: -120,
    left: -80,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(255, 90, 205, 0.13)',
  },
  ndWashYellow: {
    position: 'absolute',
    top: 200,
    right: -120,
    width: 430,
    height: 430,
    borderRadius: 215,
    backgroundColor: 'rgba(250, 218, 97, 0.14)',
  },
  ndWashPeach: {
    position: 'absolute',
    bottom: -100,
    left: -60,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(255, 145, 136, 0.14)',
  },
  ndHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  ndHeaderTitle: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.5,
    color: nd.colors.ink,
  },
  ndCircleButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    ...createNdShadow(0.08, 6),
  },
  ndMatchContent: {
    paddingTop: 20,
  },
  ndRegisterContent: {
    paddingTop: 20,
  },
  ndCutoutImage: {
    alignSelf: 'center',
    width: 220,
    height: 220,
  },
  ndCandidateSection: {
    marginTop: 20,
    gap: 12,
  },
  ndCandidateTitle: {
    paddingHorizontal: 20,
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '600',
    letterSpacing: -0.45,
    color: '#000000',
  },
  ndCandidateRow: {
    gap: 8,
    paddingHorizontal: 20,
  },
  ndCandidateCard: {
    width: 165,
    height: 178,
  },
  ndMatchActions: {
    marginTop: 28,
    paddingHorizontal: 20,
    gap: 16,
    alignItems: 'center',
  },
  ndPrimaryButton: {
    minHeight: 48,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: nd.radius.input,
    backgroundColor: nd.colors.primary,
    paddingHorizontal: 16,
  },
  ndPrimaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.4,
    color: '#FFFFFF',
  },
  ndGhostText: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.35,
    color: nd.colors.sub,
  },
  ndSecondaryButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: nd.radius.input,
    borderWidth: 1,
    borderColor: nd.colors.border,
    backgroundColor: '#FFFFFF',
  },
  ndSecondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.4,
    color: nd.colors.ink,
  },
  ndDiscoverSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    paddingHorizontal: 26,
    paddingTop: 44,
    ...createNdShadow(0.16, 24),
  },
  ndDiscoverTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: -0.5,
    color: nd.colors.ink,
    textAlign: 'center',
  },
  ndDiscoverSubtitle: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.35,
    color: nd.colors.sub,
    textAlign: 'center',
  },
  ndDiscoverActions: {
    marginTop: 32,
    marginBottom: 16,
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'stretch',
  },
  ndDiscoverStart: {
    flex: 1,
    alignSelf: 'auto',
  },
});
