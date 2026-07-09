import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type ImageSourcePropType } from 'react-native';
import { AlertCircle, ArrowLeft, Camera, Check, RotateCcw, Scissors, Sparkles } from 'lucide-react-native';
import { CameraPlaceholder } from '@/features/capture/components/CameraPlaceholder';
import { CatRegisterForm } from '@/features/capture/components/CatRegisterForm';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { getUserFacingError } from '@/shared/errors/user-facing-error';
import { processCatPhoto } from '@/shared/native/catVision';
import { createShadow, theme } from '@/shared/styles/theme';
import type { Cat, CatMatchCandidate, CatType, CaptureCatDraft, PersonalityTag, ProcessedCatPhoto } from '@/shared/types/cat';
import { getCatIllustrationKey, type CatIllustrationKey } from '@/shared/utils/catPresentation';

type CaptureStep = 'camera' | 'processing' | 'noCat' | 'match' | 'register';

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
  const { height: windowHeight } = useWindowDimensions();
  const cameraHeight = Math.min(680, Math.max(500, windowHeight - 190));
  const candidates = storedResult?.candidates ?? [];
  const currentImageUrl = storedResult?.cutoutImageUrl ?? processedPhoto?.cutoutImageUri;

  const resetCapture = () => {
    setCapturedImageUri(null);
    setProcessedPhoto(null);
    setStoredResult(null);
    setErrorMessage(null);
    setStep('camera');
  };

  const handlePhotoCaptured = async (uri: string) => {
    setCapturedImageUri(uri);
    setProcessedPhoto(null);
    setStoredResult(null);
    setErrorMessage(null);
    setStep('processing');

    try {
      const visionResult = await processCatPhoto(uri);

      if (!visionResult.hasCat || !visionResult.cutoutImageUri) {
        setErrorMessage('사진에서 고양이를 찾지 못했어요.');
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
      };
      setProcessedPhoto(nextProcessedPhoto);
      setStoredResult(await onProcessPhoto(nextProcessedPhoto));
      setStep('match');
    } catch (error) {
      console.warn('[capture] photo process failed', error);
      setErrorMessage(getUserFacingError(error, 'capture.process').message);
      setStep('noCat');
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
          <Text style={styles.processingTitle}>고양이만 잘라내는 중</Text>
          <Text style={styles.processingText}>사진은 기기에서 먼저 분석하고, 누끼 이미지는 안전하게 저장해 후보 비교에 써요.</Text>
        </Card>
      </View>
    );
  }

  if (step === 'noCat') {
    return (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.resultCard}>
          {capturedImageUri ? <Image source={{ uri: capturedImageUri }} style={styles.resultImage} /> : null}
          <View style={styles.resultMessage}>
            <AlertCircle color={theme.colors.primary} size={24} />
            <Text style={styles.resultTitle}>고양이를 찾지 못했어요</Text>
            <Text style={styles.resultText}>{errorMessage ?? '고양이가 더 크게 보이도록 다시 찍어주세요.'}</Text>
          </View>
          <Button onPress={resetCapture}>
            <RotateCcw color="#FFF8F0" size={18} />
            <Text style={styles.primaryButtonText}>다시 촬영하기</Text>
          </Button>
        </Card>
      </ScrollView>
    );
  }

  if (step === 'match' && processedPhoto) {
    return (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>자동 누끼 저장 완료</Text>
          <Text style={styles.title}>사용자가 같은 고양이인지 골라요</Text>
          <Text style={styles.subtitle}>앱은 후보만 제안하고, 최종 연결은 직접 선택해요.</Text>
        </View>

        <Card style={styles.cutoutCard}>
          <View style={styles.cutoutFrame}>
            <Image resizeMode="contain" source={{ uri: processedPhoto.cutoutImageUri }} style={styles.cutoutImage} />
          </View>
          <View style={styles.cutoutMeta}>
            <View style={styles.cutoutBadge}>
              <Sparkles color={theme.colors.accent} size={16} />
              <Text style={styles.cutoutBadgeText}>{processedPhoto.isPreciseCutout ? '누끼 완료' : '고양이 영역 추출'}</Text>
            </View>
            <Text style={styles.cutoutConfidence}>감지 신뢰도 {Math.round(processedPhoto.confidence * 100)}%</Text>
          </View>
        </Card>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>비슷한 후보</Text>
          <Text style={styles.sectionCaption}>아니면 새 고양이로 등록하세요.</Text>
        </View>

        <View style={styles.candidateList}>
          {candidates.map((candidate) => (
            <Pressable
              disabled={isSubmitting}
              key={candidate.cat.id}
              onPress={() =>
                onRecordExisting(candidate.cat.id, {
                  observationId: storedResult?.observationId,
                  imageUrl: currentImageUrl,
                })
              }
              style={({ pressed }) => [styles.candidateCard, pressed && styles.pressed]}
            >
              <Image resizeMode="cover" source={imageForCat(candidate.cat)} style={styles.candidateImage} />
              <View style={styles.candidateText}>
                <Text numberOfLines={1} style={styles.candidateName}>
                  {candidate.cat.name}
                </Text>
                <Text numberOfLines={1} style={styles.candidateReason}>
                  {candidate.reason}
                </Text>
              </View>
              <View style={styles.choosePill}>
                <Check color="#FFF8F0" size={15} />
                <Text style={styles.chooseText}>기록</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <View style={styles.actions}>
          <Button onPress={() => setStep('register')} variant="secondary">
            새 고양이로 등록
          </Button>
          <Button
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
        </View>
      </ScrollView>
    );
  }

  if (step === 'register' && processedPhoto) {
    return (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
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
    fontWeight: '700',
    color: theme.colors.mutedText,
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
});
