import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ImagePlus, PawPrint } from 'lucide-react-native';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { CameraPlaceholder } from '@/features/capture/components/CameraPlaceholder';
import { CatRegisterForm } from '@/features/capture/components/CatRegisterForm';
import { RediscoveryPanel } from '@/features/capture/components/RediscoveryPanel';
import { extractCoordinatesFromExif, suggestRegionFromCoordinates } from '@/features/capture/utils/exifLocation';
import { sanitizeCaptureImage } from '@/features/capture/utils/sanitizeCaptureImage';
import { Button } from '@/shared/components/Button';
import { createShadow, theme } from '@/shared/styles/theme';
import type { CaptureCatDraft, Cat, CatEncounterDraft, CatType, PersonalityTag } from '@/shared/types/cat';
import type { Region } from '@/shared/types/region';

interface CaptureScreenProps {
  coatOptions: CatType[];
  existingCats: Cat[];
  personalityOptions: PersonalityTag[];
  regions: Region[];
  isSubmitting?: boolean;
  onRecordExisting: (catId: string, draft: CatEncounterDraft) => Promise<void> | void;
  onSave: (draft: CaptureCatDraft) => Promise<void> | void;
  onSaveSighting: (draft: CaptureCatDraft) => Promise<void> | void;
}

interface CaptureImageState {
  uri: string;
  source: 'camera' | 'gallery';
  suggestedRegionName?: string;
  locationMessage?: string;
}

export function CaptureScreen({
  coatOptions,
  existingCats,
  personalityOptions,
  regions,
  isSubmitting = false,
  onRecordExisting,
  onSave,
  onSaveSighting,
}: CaptureScreenProps) {
  const [capturedImage, setCapturedImage] = useState<CaptureImageState | null>(null);
  const [step, setStep] = useState<'capture' | 'details'>('capture');
  const [isPreparingImage, setIsPreparingImage] = useState(false);
  const { height: windowHeight } = useWindowDimensions();
  const cameraHeight = Math.min(620, Math.max(430, windowHeight - 250));

  const handlePhotoCaptured = async (uri: string) => {
    setIsPreparingImage(true);

    try {
      setCapturedImage({
        uri: await sanitizeCaptureImage(uri),
        source: 'camera',
      });
    } catch {
      Alert.alert('사진 처리 실패', '사진을 안전하게 저장할 준비를 하지 못했어요. 다시 시도해주세요.');
    } finally {
      setIsPreparingImage(false);
    }
  };

  const handlePickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('사진 접근 권한 필요', '갤러리 사진으로 고양이를 기록하려면 사진 접근을 허용해 주세요.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      exif: true,
      mediaTypes: ['images'],
      quality: 1,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    setIsPreparingImage(true);

    try {
      const asset = result.assets[0];
      const coordinates = extractCoordinatesFromExif(asset.exif);
      const suggestion = suggestRegionFromCoordinates(coordinates, regions);
      const canUseSuggestion = suggestion?.isWithinRegion === true;

      setCapturedImage({
        uri: await sanitizeCaptureImage(asset.uri),
        source: 'gallery',
        suggestedRegionName: canUseSuggestion ? suggestion.regionName : undefined,
        locationMessage: canUseSuggestion
          ? '사진 위치로 동네를 추정했어요. 필요하면 직접 바꿀 수 있어요.'
          : coordinates
            ? '사진 위치가 등록된 동네 범위와 맞지 않아요. 발견 장소를 직접 선택해 주세요.'
            : '사진에서 위치정보를 찾지 못했어요. 발견 장소를 직접 선택해 주세요.',
      });
      setStep('details');
    } catch {
      Alert.alert('사진 처리 실패', '갤러리 사진을 안전하게 불러오지 못했어요. 다른 사진으로 다시 시도해주세요.');
    } finally {
      setIsPreparingImage(false);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setStep('capture');
  };

  if (step === 'details') {
    return (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.detailHeader}>
          <Pressable onPress={() => setStep('capture')} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Text style={styles.backButtonText}>촬영</Text>
          </Pressable>
          <View style={styles.detailTitleWrap}>
            <Text style={styles.title}>만남 기록 설정</Text>
            <Text style={styles.subtitle}>촬영한 사진을 새 고양이, 재관찰, 미확인 제보 중 하나로 남겨요.</Text>
          </View>
        </View>

        <RediscoveryPanel
          capturedImageUri={capturedImage?.uri ?? null}
          coatOptions={coatOptions}
          existingCats={existingCats}
          isSubmitting={isSubmitting}
          onRecordExisting={onRecordExisting}
          regions={regions}
          suggestedRegionName={capturedImage?.suggestedRegionName}
        />

        <View style={styles.formHeader}>
          <Camera color={theme.colors.primaryDark} size={18} />
          <Text style={styles.formTitle}>새 고양이 또는 미확인 제보</Text>
        </View>

        <CatRegisterForm
          capturedImageUri={capturedImage?.uri ?? null}
          coatOptions={coatOptions}
          isSubmitting={isSubmitting}
          locationMessage={capturedImage?.locationMessage}
          onSubmit={onSave}
          onSubmitSighting={onSaveSighting}
          personalityOptions={personalityOptions}
          regions={regions}
          source={capturedImage?.source}
          suggestedRegionName={capturedImage?.suggestedRegionName}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>고양이 만남 기록</Text>
          <PawPrint color={theme.colors.primary} size={18} />
        </View>
        <Text style={styles.subtitle}>카메라로 고양이를 촬영하고 오늘의 만남을 도감에 이어 붙여요.</Text>
      </View>

      <View style={styles.cameraFrame}>
        <CameraPlaceholder
          capturedImageUri={capturedImage?.uri ?? null}
          height={cameraHeight}
          onPhotoCaptured={handlePhotoCaptured}
          onRetake={handleRetake}
        />
      </View>

      <View style={styles.captureActions}>
        {capturedImage ? (
          <Button onPress={() => setStep('details')}>다음</Button>
        ) : (
          <>
            <Button disabled={isPreparingImage} onPress={handlePickFromGallery} variant="secondary">
              <View style={styles.galleryButtonContent}>
                <ImagePlus color={theme.colors.primaryDark} size={18} />
                <Text style={styles.galleryButtonText}>{isPreparingImage ? '사진 준비 중...' : '갤러리에서 불러오기'}</Text>
              </View>
            </Button>
            <Text style={styles.captureHint}>고양이가 프레임에 들어오면 셔터를 누르거나 갤러리 사진을 선택해 주세요.</Text>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: 132,
  },
  header: {
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: 26,
    fontWeight: theme.typography.titleWeight,
    letterSpacing: theme.typography.letterSpacing,
    color: theme.colors.text,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: theme.colors.mutedText,
  },
  detailHeader: {
    marginBottom: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  detailTitleWrap: {
    flex: 1,
  },
  backButton: {
    minHeight: 38,
    borderRadius: 19,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,253,246,0.82)',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  cameraFrame: {
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
    ...createShadow(10),
  },
  captureActions: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  captureHint: {
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    overflow: 'hidden',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.mutedText,
    backgroundColor: 'rgba(255,253,246,0.82)',
  },
  galleryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  galleryButtonText: {
    color: theme.colors.primaryDark,
    fontSize: 14,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.82,
  },
  formHeader: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
});
