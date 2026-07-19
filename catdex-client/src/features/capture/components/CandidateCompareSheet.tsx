import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Check, X, ZoomIn } from 'lucide-react-native';
import { fetchCatEncounters } from '@/shared/api/cats.api';
import { Button } from '@/shared/components/Button';
import { createShadow, theme } from '@/shared/styles/theme';
import type { CatMatchCandidate } from '@/shared/types/cat';

interface CandidatePhoto {
  uri: string;
  label: string;
}

interface CandidateCompareSheetProps {
  candidate: CatMatchCandidate | null;
  myPhotoUri: string | null;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (candidate: CatMatchCandidate) => void;
}

// 핀치 줌으로 무늬를 확대해 볼 수 있는 이미지. iOS ScrollView의 네이티브
// 줌을 사용한다.
function ZoomablePhoto({ uri, width, height }: { uri: string; width: number; height: number }) {
  return (
    <ScrollView
      bouncesZoom
      centerContent
      contentContainerStyle={{ width, height }}
      maximumZoomScale={4}
      minimumZoomScale={1}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      style={[styles.zoomArea, { width, height }]}
    >
      <Image resizeMode="contain" source={{ uri }} style={{ width, height }} />
    </ScrollView>
  );
}

export function CandidateCompareSheet({ candidate, myPhotoUri, isSubmitting, onClose, onConfirm }: CandidateCompareSheetProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [candidatePhotos, setCandidatePhotos] = useState<CandidatePhoto[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  const photoWidth = windowWidth - theme.spacing.lg * 2;
  const photoHeight = Math.max(170, Math.min(250, (windowHeight - 430) / 2));

  useEffect(() => {
    let isMounted = true;

    setSelectedPhotoIndex(0);
    setCandidatePhotos([]);

    if (!candidate) {
      return;
    }

    const representativePhotos: CandidatePhoto[] = candidate.cat.imageUrl
      ? [{ uri: candidate.cat.imageUrl, label: '대표 사진' }]
      : [];
    setCandidatePhotos(representativePhotos);
    setIsLoadingPhotos(true);

    fetchCatEncounters(candidate.cat.id)
      .then((encounters) => {
        if (!isMounted) {
          return;
        }

        const seen = new Set(representativePhotos.map((photo) => photo.uri));
        const encounterPhotos = [...encounters]
          .reverse()
          .filter((encounter) => {
            if (!encounter.imageUrl || seen.has(encounter.imageUrl)) {
              return false;
            }

            seen.add(encounter.imageUrl);
            return true;
          })
          .map((encounter) => ({ uri: encounter.imageUrl as string, label: encounter.seenAt }));

        setCandidatePhotos([...representativePhotos, ...encounterPhotos]);
      })
      .catch((error) => {
        // 만남 사진을 못 불러와도 대표 사진만으로 비교를 계속한다.
        console.warn('[capture] candidate photos load failed', error);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingPhotos(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [candidate]);

  const selectedPhoto = candidatePhotos[selectedPhotoIndex] ?? candidatePhotos[0] ?? null;
  const hasCandidate = Boolean(candidate);
  const zoomHintText = useMemo(
    () => (selectedPhoto ? '사진을 손가락으로 벌려 무늬를 확대해 보세요.' : '이 고양이는 아직 저장된 사진이 없어요.'),
    [selectedPhoto],
  );

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible={hasCandidate}>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>같은 고양이인지 비교</Text>
            <Text numberOfLines={1} style={styles.title}>
              {candidate?.cat.name ?? ''}
            </Text>
          </View>
          <Pressable accessibilityLabel="비교 닫기" accessibilityRole="button" hitSlop={8} onPress={onClose} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
            <X color={theme.colors.primaryDark} size={20} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.photoBlock}>
            <View style={styles.photoLabelRow}>
              <Text style={styles.photoLabel}>방금 찍은 사진</Text>
              <View style={styles.zoomBadge}>
                <ZoomIn color={theme.colors.mutedText} size={12} />
                <Text style={styles.zoomBadgeText}>확대 가능</Text>
              </View>
            </View>
            {myPhotoUri ? (
              <ZoomablePhoto height={photoHeight} uri={myPhotoUri} width={photoWidth} />
            ) : (
              <View style={[styles.zoomArea, styles.emptyPhoto, { width: photoWidth, height: photoHeight }]}>
                <Text style={styles.emptyPhotoText}>사진을 불러오지 못했어요</Text>
              </View>
            )}
          </View>

          <View style={styles.photoBlock}>
            <View style={styles.photoLabelRow}>
              <Text style={styles.photoLabel}>
                {candidate?.cat.name} · {selectedPhoto?.label ?? '사진 없음'}
              </Text>
              {isLoadingPhotos ? <ActivityIndicator color={theme.colors.primaryDark} size="small" /> : null}
            </View>
            {selectedPhoto ? (
              <ZoomablePhoto height={photoHeight} uri={selectedPhoto.uri} width={photoWidth} />
            ) : (
              <View style={[styles.zoomArea, styles.emptyPhoto, { width: photoWidth, height: photoHeight }]}>
                <Text style={styles.emptyPhotoText}>{isLoadingPhotos ? '사진을 불러오는 중...' : '저장된 사진이 없어요'}</Text>
              </View>
            )}

            {candidatePhotos.length > 1 ? (
              <ScrollView contentContainerStyle={styles.thumbRow} horizontal showsHorizontalScrollIndicator={false}>
                {candidatePhotos.map((photo, index) => (
                  <Pressable
                    accessibilityLabel={`${photo.label} 사진 보기`}
                    accessibilityRole="button"
                    key={`${photo.uri}-${index}`}
                    onPress={() => setSelectedPhotoIndex(index)}
                    style={[styles.thumb, index === selectedPhotoIndex && styles.thumbActive]}
                  >
                    <Image resizeMode="cover" source={{ uri: photo.uri }} style={styles.thumbImage} />
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
          </View>

          <View style={styles.metaCard}>
            <Text style={styles.metaReason}>{candidate?.reason}</Text>
            <Text style={styles.metaHint}>{zoomHintText} 이마·꼬리·발 무늬처럼 잘 변하지 않는 부분을 비교하면 좋아요.</Text>
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <Button
            disabled={isSubmitting}
            onPress={() => {
              if (candidate) {
                onConfirm(candidate);
              }
            }}
          >
            <Check color="#FFF8F0" size={17} />
            <Text style={styles.confirmText}>{isSubmitting ? '기록 저장 중...' : '같은 고양이 맞아요'}</Text>
          </Button>
          <Button disabled={isSubmitting} onPress={onClose} variant="ghost">
            다른 고양이예요
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  headerCopy: {
    flex: 1,
  },
  kicker: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  title: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 253, 246, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(139, 112, 83, 0.16)',
    ...createShadow(3),
  },
  body: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  photoBlock: {
    gap: 6,
  },
  photoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  photoLabel: {
    flexShrink: 1,
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  zoomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(139, 112, 83, 0.1)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  zoomBadgeText: {
    color: theme.colors.mutedText,
    fontSize: 10,
    fontWeight: '700',
  },
  zoomArea: {
    borderRadius: theme.radius.lg,
    backgroundColor: '#EFE6D4',
    borderWidth: 1,
    borderColor: 'rgba(139, 112, 83, 0.14)',
    overflow: 'hidden',
  },
  emptyPhoto: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPhotoText: {
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
  },
  thumbRow: {
    gap: theme.spacing.sm,
    paddingTop: 2,
  },
  thumb: {
    width: 54,
    height: 54,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    opacity: 0.75,
  },
  thumbActive: {
    borderColor: theme.colors.primaryDark,
    opacity: 1,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  metaCard: {
    backgroundColor: 'rgba(255, 253, 246, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(139, 112, 83, 0.14)',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    gap: 6,
  },
  metaReason: {
    color: theme.colors.text,
    fontSize: 12.5,
    fontWeight: '800',
  },
  metaHint: {
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  actions: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 112, 83, 0.12)',
    backgroundColor: theme.colors.background,
  },
  confirmText: {
    color: '#FFF8F0',
    fontSize: 16,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.85,
  },
});
