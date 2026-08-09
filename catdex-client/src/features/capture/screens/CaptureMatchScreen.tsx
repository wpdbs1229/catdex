import { ArrowLeft, Heart } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CaptureStackScreenProps } from '@/app/navigation/types';
import { uploadCatObservationImage } from '@/shared/api/app.api';
import {
  createCatObservation,
  fetchCatMatchCandidates,
  recordCatEncounter,
  resolveCatObservation,
} from '@/shared/api/cats.api';
import { PolaroidCatCard } from '@/shared/components/PolaroidCatCard';
import { getUserFacingError } from '@/shared/errors/user-facing-error';
import {
  detectAndSaveNeighborhood,
  getActiveNeighborhood,
  UNSET_REGION_NAME,
} from '@/shared/neighborhood/active-neighborhood';
import { createNdShadow, nd } from '@/shared/styles/theme';
import type { CatMatchCandidate } from '@/shared/types/cat';
import { imageForCatType } from '@/shared/utils/catImage';
import { formatNyanTagLabel } from '@/shared/utils/catPresentation';

interface StoredObservation {
  observationId: string;
  cutoutImageUrl: string;
  regionName: string;
}

export function CaptureMatchScreen({ navigation, route }: CaptureStackScreenProps<'CaptureMatch'>) {
  const insets = useSafeAreaInsets();
  const { photoUri, cutoutUri, confidence, isPreciseCutout, boundingBox, colors, pattern } = route.params;
  const [candidates, setCandidates] = useState<CatMatchCandidate[]>([]);
  const [observation, setObservation] = useState<StoredObservation | null>(null);
  const [phase, setPhase] = useState<'preparing' | 'ready' | 'error'>('preparing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPromptVisible, setIsPromptVisible] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    (async () => {
      try {
        // 저장된 동네가 없으면 여기서 현재 위치로 한 번 확인한다.
        // (동네가 비어 있으면 관찰 기록이 전부 '동네 미지정'으로 쌓인다.)
        const activeNeighborhood = (await getActiveNeighborhood()) ?? (await detectAndSaveNeighborhood());
        const regionName = activeNeighborhood?.name ?? UNSET_REGION_NAME;

        const [originalUpload, cutoutUpload] = await Promise.all([
          uploadCatObservationImage(photoUri, 'original'),
          uploadCatObservationImage(cutoutUri ?? photoUri, 'cutout'),
        ]);
        const nextObservation = await createCatObservation({
          originalImageUrl: originalUpload.imageUrl,
          cutoutImageUrl: cutoutUpload.imageUrl,
          regionName,
          detectionConfidence: confidence,
          boundingBox: boundingBox ? { ...boundingBox } : null,
          featureVector: [],
          isPreciseCutout,
          coatHints: colors,
        });
        const nextCandidates = await fetchCatMatchCandidates({
          observationId: nextObservation.id,
          regionNames: [regionName],
          coatHints: colors,
        });

        if (!isMountedRef.current) {
          return;
        }

        setObservation({
          observationId: nextObservation.id,
          cutoutImageUrl: nextObservation.cutoutImageUrl,
          regionName,
        });
        setCandidates(nextCandidates);
        setPhase('ready');
      } catch (error) {
        if (isMountedRef.current) {
          setErrorMessage(getUserFacingError(error, 'capture.process').message);
          setPhase('error');
        }
      }
    })();

    return () => {
      isMountedRef.current = false;
    };
    // 촬영 1회당 1번만 실행한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exitFlow = () => {
    navigation.getParent()?.goBack();
  };

  const openRegister = () => {
    if (!observation) {
      return;
    }

    navigation.navigate('CaptureRegister', {
      cutoutUri: cutoutUri ?? photoUri,
      imageStoragePath: observation.cutoutImageUrl,
      observationId: observation.observationId,
      regionName: observation.regionName,
      colors,
      pattern,
    });
  };

  const handleLater = async () => {
    if (!observation || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      await resolveCatObservation(observation.observationId, null, 'uncertain');
      exitFlow();
    } catch (error) {
      Alert.alert('저장 실패', getUserFacingError(error, 'capture.process').message);
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  const handleSelectCandidate = (candidate: CatMatchCandidate) => {
    if (!observation || isSubmitting) {
      return;
    }

    Alert.alert(`${candidate.cat.name} 맞나요?`, '이 고양이의 만남 기록으로 남길게요.', [
      { text: '아니에요', style: 'cancel' },
      {
        text: '맞아요',
        onPress: async () => {
          setIsSubmitting(true);

          try {
            await recordCatEncounter(candidate.cat.id, {
              regionName: observation.regionName,
              memo: '다시 만남 기록',
              imageUrl: observation.cutoutImageUrl,
            });
            await resolveCatObservation(observation.observationId, candidate.cat.id, 'linked');
            exitFlow();
          } catch (error) {
            Alert.alert('기록 실패', getUserFacingError(error, 'generic').message);
          } finally {
            if (isMountedRef.current) {
              setIsSubmitting(false);
            }
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <View pointerEvents="none" style={styles.wash}>
        <View style={styles.washPink} />
        <View style={styles.washYellow} />
        <View style={styles.washPeach} />
      </View>

      <View style={[styles.header, { marginTop: insets.top }]}>
        <Pressable accessibilityLabel="뒤로 가기" onPress={() => navigation.goBack()} style={({ pressed }) => [styles.circleButton, pressed && styles.pressed]}>
          <ArrowLeft color={nd.colors.ink} size={20} strokeWidth={1.8} />
        </Pressable>
        <Text style={styles.headerTitle}>도감</Text>
        <View style={styles.circleButton}>
          <Heart color={nd.colors.ink} size={20} strokeWidth={1.8} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: isPromptVisible && phase === 'ready' ? 280 : 80 }]}
        showsVerticalScrollIndicator={false}
      >
        <Image resizeMode="contain" source={{ uri: cutoutUri ?? photoUri }} style={styles.cutout} />

        {phase === 'preparing' ? (
          <View style={styles.stateBlock}>
            <ActivityIndicator color={nd.colors.primary} />
            <Text style={styles.stateText}>동네 기록과 비교하는 중이에요</Text>
          </View>
        ) : null}

        {phase === 'error' ? (
          <View style={styles.stateBlock}>
            <Text style={styles.stateTitle}>기록을 준비하지 못했어요</Text>
            <Text style={styles.stateText}>{errorMessage}</Text>
            <Pressable onPress={exitFlow} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
              <Text style={styles.secondaryButtonText}>촬영 화면으로 나가기</Text>
            </Pressable>
          </View>
        ) : null}

        {phase === 'ready' ? (
          <View style={styles.candidateSection}>
            <Text style={styles.candidateTitle}>
              {candidates.length > 0 ? 'AI가 판별했어요! 이 고양이가 아닌가요?' : '아직 이 동네에 기록된 고양이가 없어요.'}
            </Text>
            {candidates.length > 0 ? (
              <ScrollView contentContainerStyle={styles.candidateRow} horizontal showsHorizontalScrollIndicator={false}>
                {candidates.map((candidate) => (
                  <View key={candidate.cat.id} style={styles.candidateCard}>
                    <PolaroidCatCard
                      imageSource={imageForCatType(candidate.cat.type, candidate.cat.imageUrl)}
                      onPress={isSubmitting ? undefined : () => handleSelectCandidate(candidate)}
                      tagLabel={formatNyanTagLabel(candidate.cat.name, candidate.cat.firstSeenAt)}
                    />
                  </View>
                ))}
              </ScrollView>
            ) : null}

            {!isPromptVisible ? (
              <View style={styles.actions}>
                <Pressable disabled={isSubmitting} onPress={openRegister} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                  <Text style={styles.primaryButtonText}>새 고양이로 등록</Text>
                </Pressable>
                <Pressable disabled={isSubmitting} onPress={handleLater} style={({ pressed }) => (pressed ? styles.pressed : null)}>
                  <Text style={styles.ghostText}>잘 모르겠어요</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {phase === 'ready' && isPromptVisible ? (
        <View style={[styles.discoverSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Text style={styles.discoverTitle}>첫 번째 발견자가 되어주세요.</Text>
          <Text style={styles.discoverSubtitle}>일상을 나누고 고양이를 케어하며{'\n'}마음의 거리를 줄여보세요.</Text>
          <View style={styles.discoverActions}>
            <Pressable
              disabled={isSubmitting}
              onPress={() => setIsPromptVisible(false)}
              style={({ pressed }) => [styles.secondaryButton, styles.discoverSecondary, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryButtonText}>나중에 할게요</Text>
            </Pressable>
            <Pressable disabled={isSubmitting} onPress={openRegister} style={({ pressed }) => [styles.primaryButton, styles.discoverPrimary, pressed && styles.pressed]}>
              <Text style={styles.primaryButtonText}>시작하기</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: nd.colors.bg,
  },
  wash: {
    ...StyleSheet.absoluteFillObject,
  },
  washPink: {
    position: 'absolute',
    top: -120,
    left: -80,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(255, 90, 205, 0.13)',
  },
  washYellow: {
    position: 'absolute',
    top: 200,
    right: -120,
    width: 430,
    height: 430,
    borderRadius: 215,
    backgroundColor: 'rgba(250, 218, 97, 0.14)',
  },
  washPeach: {
    position: 'absolute',
    bottom: -100,
    left: -60,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(255, 145, 136, 0.14)',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.5,
    color: nd.colors.ink,
  },
  circleButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    ...createNdShadow(0.08, 6),
  },
  content: {
    paddingTop: 20,
  },
  cutout: {
    alignSelf: 'center',
    width: 220,
    height: 220,
  },
  stateBlock: {
    marginTop: 32,
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.45,
    color: nd.colors.ink,
  },
  stateText: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.35,
    color: nd.colors.sub,
    textAlign: 'center',
  },
  candidateSection: {
    marginTop: 20,
    gap: 12,
  },
  candidateTitle: {
    paddingHorizontal: 20,
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '600',
    letterSpacing: -0.45,
    color: '#000000',
  },
  candidateRow: {
    gap: 8,
    paddingHorizontal: 20,
  },
  candidateCard: {
    width: 165,
    height: 178,
  },
  actions: {
    marginTop: 28,
    paddingHorizontal: 20,
    gap: 16,
    alignItems: 'center',
  },
  primaryButton: {
    minHeight: 48,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: nd.radius.input,
    backgroundColor: nd.colors.primary,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.4,
    color: '#FFFFFF',
  },
  ghostText: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.35,
    color: nd.colors.sub,
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: nd.radius.input,
    borderWidth: 1,
    borderColor: nd.colors.border,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.4,
    color: nd.colors.ink,
  },
  discoverSheet: {
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
  discoverTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: -0.5,
    color: nd.colors.ink,
    textAlign: 'center',
  },
  discoverSubtitle: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.35,
    color: nd.colors.sub,
    textAlign: 'center',
  },
  discoverActions: {
    marginTop: 32,
    marginBottom: 16,
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'stretch',
  },
  discoverSecondary: {
    flex: 1,
  },
  discoverPrimary: {
    flex: 1,
    alignSelf: 'auto',
  },
  pressed: {
    opacity: 0.86,
  },
});
