import { useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type ImageSourcePropType } from 'react-native';
import { AlertCircle, ArrowLeft, Camera, Check, ImagePlus, RotateCcw, Scissors, SearchX, Sparkles } from 'lucide-react-native';
import { CameraPlaceholder } from '@/features/capture/components/CameraPlaceholder';
import { CatRegisterForm } from '@/features/capture/components/CatRegisterForm';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { getUserFacingError } from '@/shared/errors/user-facing-error';
import { deriveCoatHints, isCatVisionAvailable, processCatPhoto } from '@/shared/native/catVision';
import { createShadow, theme } from '@/shared/styles/theme';
import type { Cat, CatMatchCandidate, CatType, CaptureCatDraft, PersonalityTag, ProcessedCatPhoto } from '@/shared/types/cat';
import { getCatIllustrationKey, type CatIllustrationKey } from '@/shared/utils/catPresentation';

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

  const confirmExistingCandidate = (candidate: CatMatchCandidate) => {
    Alert.alert(
      `${candidate.cat.name}와 같은 고양이인가요?`,
      '같은 고양이로 확인하면 이번 사진이 기존 동네 도감 기록에 추가돼요.',
      [
        { text: '다시 볼게요', style: 'cancel' },
        {
          text: '같은 고양이 맞아요',
          onPress: () =>
            void onRecordExisting(candidate.cat.id, {
              observationId: storedResult?.observationId,
              imageUrl: currentImageUrl,
            }),
        },
      ],
    );
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
    const isOriginalOnlyPhoto =
      processedPhoto.confidence === 0 && processedPhoto.boundingBox === null && processedPhoto.featureVector.length === 0;

    return (
      <ScrollView key={step} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>동네 기록 후보</Text>
          <Text style={styles.title}>같은 고양이인지 확인해요</Text>
          <Text style={styles.subtitle}>현재 동네의 기존 사진과 최근 기록을 보고 같은 고양이인지 직접 확인해 주세요.</Text>
        </View>

        <Card style={styles.cutoutCard}>
          <View style={styles.cutoutFrame}>
            <Image resizeMode="contain" source={{ uri: processedPhoto.cutoutImageUri }} style={styles.cutoutImage} />
          </View>
          <View style={styles.cutoutMeta}>
            <View style={styles.cutoutBadge}>
              {isOriginalOnlyPhoto ? <ImagePlus color={theme.colors.accent} size={16} /> : <Sparkles color={theme.colors.accent} size={16} />}
              <Text style={styles.cutoutBadgeText}>
                {isOriginalOnlyPhoto ? '원본 사진 사용' : processedPhoto.isPreciseCutout ? '누끼 완료' : '고양이 영역 추출'}
              </Text>
            </View>
            <Text style={styles.cutoutConfidence}>
              {isOriginalOnlyPhoto ? '자동 분석 건너뜀' : `감지 신뢰도 ${Math.round(processedPhoto.confidence * 100)}%`}
            </Text>
          </View>
        </Card>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>기존 고양이 후보</Text>
          <Text style={styles.sectionCaption}>{candidates.length > 0 ? `${candidates.length}마리의 사진과 동네 기록을 비교해 보세요.` : '현재 동네에서 비교할 기존 기록을 찾지 못했어요.'}</Text>
        </View>

        {candidates.length > 0 ? (
          <View style={styles.candidateList}>
            {candidates.map((candidate) => (
              <Pressable
                accessibilityLabel={`${candidate.cat.name} 후보 확인`}
                accessibilityRole="button"
                disabled={isSubmitting}
                key={candidate.cat.id}
                onPress={() => confirmExistingCandidate(candidate)}
                style={({ pressed }) => [styles.candidateCard, pressed && styles.pressed]}
              >
                <Image resizeMode="cover" source={imageForCat(candidate.cat)} style={styles.candidateImage} />
                <View style={styles.candidateText}>
                  <Text numberOfLines={1} style={styles.candidateName}>
                    {candidate.cat.name}
                  </Text>
                  <Text numberOfLines={2} style={styles.candidateReason}>
                    {candidate.reason}
                  </Text>
                </View>
                <View style={styles.choosePill}>
                  <Check color="#FFF8F0" size={15} />
                  <Text style={styles.chooseText}>확인</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCandidateState}>
            <SearchX color={theme.colors.primary} size={28} />
            <View style={styles.emptyCandidateCopy}>
              <Text style={styles.emptyCandidateTitle}>기존 후보가 없어요</Text>
              <Text style={styles.emptyCandidateText}>새 고양이로 등록하거나 확실하지 않다면 목격 기록으로 남겨주세요.</Text>
            </View>
          </View>
        )}

        <View style={styles.actions}>
          <Button onPress={() => setStep('register')} variant="secondary">
            {candidates.length > 0 ? '후보에 없어요 · 새로 등록' : '새 고양이로 등록'}
          </Button>
          <Button
            disabled={isSubmitting}
            onPress={() =>
              onMarkUncertain({
                observationId: storedResult?.observationId,
                cutoutImageUrl: currentImageUrl,
                processedPhoto,
              })
            }
            variant="ghost"
          >
            잘 모르겠어요
          </Button>
          <Button disabled={isSubmitting} onPress={resetCapture} variant="ghost">
            다시 촬영하기
          </Button>
        </View>
      </ScrollView>
    );
  }

  if (step === 'register' && processedPhoto) {
    return (
      <ScrollView key={step} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="후보 확인으로 돌아가기"
            accessibilityRole="button"
            disabled={isSubmitting}
            hitSlop={10}
            onPress={() => setStep('match')}
            style={({ pressed }) => [styles.registerBackButton, pressed && styles.pressed]}
          >
            <ArrowLeft color={theme.colors.primaryDark} size={20} />
            <Text style={styles.registerBackText}>후보 다시 보기</Text>
          </Pressable>
          <Text style={styles.kicker}>새 고양이 등록</Text>
          <Text style={styles.title}>누끼 이미지를 대표 사진으로 써요</Text>
          <Text style={styles.subtitle}>이름과 동네만 입력하면 새 도감 카드가 만들어져요.</Text>
        </View>

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
  header: {
    gap: 5,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '900',
    color: theme.colors.primary,
  },
  title: {
    fontSize: 26,
    lineHeight: 33,
    fontWeight: '900',
    letterSpacing: 0,
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    color: theme.colors.mutedText,
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
  cutoutCard: {
    gap: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.94)',
  },
  cutoutFrame: {
    height: 300,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8E1D3',
    overflow: 'hidden',
  },
  cutoutImage: {
    width: '96%',
    height: '96%',
  },
  cutoutMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  cutoutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    backgroundColor: 'rgba(221,232,200,0.58)',
  },
  cutoutBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: theme.colors.accent,
  },
  cutoutConfidence: {
    flexShrink: 1,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.mutedText,
  },
  sectionHeader: {
    gap: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: theme.colors.text,
  },
  sectionCaption: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.mutedText,
  },
  candidateList: {
    gap: theme.spacing.sm,
  },
  candidateCard: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.sm,
    backgroundColor: 'rgba(255,253,246,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.14)',
    ...createShadow(5),
  },
  candidateImage: {
    width: 64,
    height: 64,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
  },
  candidateText: {
    flex: 1,
    minWidth: 0,
  },
  candidateName: {
    fontSize: 17,
    fontWeight: '900',
    color: theme.colors.text,
  },
  candidateReason: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    color: theme.colors.mutedText,
  },
  emptyCandidateState: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.14)',
  },
  emptyCandidateCopy: {
    flex: 1,
    minWidth: 0,
  },
  emptyCandidateTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  emptyCandidateText: {
    marginTop: 4,
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  choosePill: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 18,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.accent,
  },
  chooseText: {
    color: '#FFF8F0',
    fontSize: 12,
    fontWeight: '900',
  },
  actions: {
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
  registerBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: theme.spacing.sm,
    paddingVertical: 4,
    paddingRight: theme.spacing.sm,
  },
  registerBackText: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
  },
});
