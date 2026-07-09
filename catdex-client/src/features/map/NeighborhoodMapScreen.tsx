import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AlertCircle, Camera, ChevronLeft, ChevronRight, Map, MapPin, MessageCircle, PawPrint, ShieldCheck } from 'lucide-react-native';
import { CommunityPostCard } from '@/features/community/components/CommunityPostCard';
import { fetchCommunityPosts } from '@/shared/api/community.api';
import { getUserFacingError, type UserFacingError } from '@/shared/errors/user-facing-error';
import type { Cat } from '@/shared/types/cat';
import type { CommunityPost } from '@/shared/types/community';
import type { Region } from '@/shared/types/region';
import { createShadow, theme } from '@/shared/styles/theme';
import { KakaoMapView } from '@/features/map/components/KakaoMapView';
import { formatMapRegionName } from '@/features/map/map-region-label';

interface NeighborhoodMapScreenProps {
  regions: Region[];
  cats: Cat[];
  neighborhoodName: string;
  onGoCapture: () => void;
  onOpenCommunityBoard: () => void;
  onOpenCommunityPost: (postId: string) => void;
}

function getLastSeenLabel(cats: Cat[]) {
  return cats[0]?.lastSeenAt ?? '아직 기록 없음';
}

export function NeighborhoodMapScreen({
  regions,
  cats,
  neighborhoodName,
  onGoCapture,
  onOpenCommunityBoard,
  onOpenCommunityPost,
}: NeighborhoodMapScreenProps) {
  const displayRegions = useMemo(() => regions, [regions]);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(displayRegions[0] ?? null);
  const [isDistributionOpen, setIsDistributionOpen] = useState(false);
  const [previewPosts, setPreviewPosts] = useState<CommunityPost[]>([]);
  const [previewError, setPreviewError] = useState<UserFacingError | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  useEffect(() => {
    if (!selectedRegion && displayRegions[0]) {
      setSelectedRegion(displayRegions[0]);
      return;
    }

    if (selectedRegion && !displayRegions.some((region) => region.id === selectedRegion.id)) {
      setSelectedRegion(displayRegions[0] ?? null);
    }
  }, [displayRegions, selectedRegion]);

  const refreshPreviewPosts = useCallback(async () => {
    setIsPreviewLoading(true);
    setPreviewError(null);

    try {
      const nextPosts = await fetchCommunityPosts({
        regionName: neighborhoodName,
        topic: 'ALL',
        limit: 3,
      });
      setPreviewPosts(nextPosts);
    } catch (error) {
      console.warn('[community] map preview load failed', error);
      setPreviewPosts([]);
      setPreviewError(getUserFacingError(error, 'community.load'));
    } finally {
      setIsPreviewLoading(false);
    }
  }, [neighborhoodName]);

  useEffect(() => {
    void refreshPreviewPosts();
  }, [refreshPreviewPosts]);

  const totalRegionCats = useMemo(() => new Set(displayRegions.flatMap((region) => region.cats)).size, [displayRegions]);
  const activeRegions = displayRegions.filter((region) => region.cats.length > 0).length;

  if (isDistributionOpen) {
    return (
      <View style={styles.mapScreen}>
        <KakaoMapView
          onSelectRegion={setSelectedRegion}
          regions={displayRegions}
          selectedRegionId={selectedRegion?.id ?? null}
          style={styles.fullMap}
        />

        <View style={styles.mapTopBar}>
          <Pressable
            accessibilityLabel="동네 현황으로 돌아가기"
            accessibilityRole="button"
            onPress={() => setIsDistributionOpen(false)}
            style={({ pressed }) => [styles.mapBackButton, pressed && styles.pressed]}
          >
            <ChevronLeft color={theme.colors.primaryDark} size={19} />
            <Text style={styles.mapBackText}>동네 현황</Text>
          </Pressable>
        </View>

        <View style={styles.mapInfoPanel}>
          <Text style={styles.mapInfoKicker}>선택 구역</Text>
          <Text numberOfLines={1} style={styles.mapInfoTitle}>
            {selectedRegion ? formatMapRegionName(selectedRegion.name) : neighborhoodName}
          </Text>
          <Text style={styles.mapInfoText}>{selectedRegion?.cats.length ?? 0}마리 기록이 이 구역에 모였어요.</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.segmentWrap}>
        <View style={[styles.segmentButton, styles.segmentButtonActive]}>
          <Map color="#FFF8F0" size={15} />
          <Text style={[styles.segmentText, styles.segmentTextActive]}>지도</Text>
        </View>
        <Pressable accessibilityLabel="게시판 보기" accessibilityRole="button" onPress={onOpenCommunityBoard} style={({ pressed }) => [styles.segmentButton, pressed && styles.pressed]}>
          <MessageCircle color={theme.colors.primaryDark} size={15} />
          <Text style={styles.segmentText}>게시판</Text>
        </Pressable>
      </View>

      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>동네 상황실</Text>
          <Text style={styles.title}>{neighborhoodName} 길고양이 지도</Text>
          <Text style={styles.description}>이웃들이 남긴 기록을 모아 고양이 구역과 최근 활동을 보여줘요.</Text>
        </View>
        <View style={styles.locationBadge}>
          <MapPin color={theme.colors.accent} size={15} />
          <Text numberOfLines={1} style={styles.locationBadgeText}>
            {neighborhoodName}
          </Text>
        </View>
      </View>

      <View style={styles.statusGrid}>
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>활동 고양이</Text>
          <Text style={styles.statusValue}>{Math.max(totalRegionCats, cats.length)}마리</Text>
        </View>
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>냥이 구역</Text>
          <Text style={styles.statusValue}>{activeRegions}곳</Text>
        </View>
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>게시글</Text>
          <Text style={styles.statusValue}>{previewPosts.length > 0 ? `${previewPosts.length}+` : '0'}</Text>
        </View>
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>최근 기록</Text>
          <Text numberOfLines={1} style={styles.statusValueSmall}>
            {getLastSeenLabel(cats)}
          </Text>
        </View>
      </View>

      <View style={styles.mapPreviewCard}>
        <View style={styles.mapPreviewHeader}>
          <View style={styles.mapPreviewCopy}>
            <Text style={styles.sectionKicker}>냥이 구역</Text>
            <Text style={styles.sectionTitle}>동네 냥이 구역을 한눈에 봐요</Text>
            <Text style={styles.mapPreviewText}>정확한 위치 대신 자주 보이는 구역만 원으로 표시해요.</Text>
          </View>
          <Pressable accessibilityLabel="냥이 구역 보기" accessibilityRole="button" onPress={() => setIsDistributionOpen(true)} style={({ pressed }) => [styles.mapOpenButton, pressed && styles.pressed]}>
            <Text style={styles.mapOpenButtonText}>크게 보기</Text>
            <ChevronRight color={theme.colors.primaryDark} size={15} />
          </Pressable>
        </View>

        <View style={styles.mapPreviewFrame}>
          <KakaoMapView
            onSelectRegion={setSelectedRegion}
            regions={displayRegions}
            selectedRegionId={selectedRegion?.id ?? null}
            style={styles.mapPreview}
          />
          <View pointerEvents="none" style={styles.mapPreviewBadge}>
            <Text numberOfLines={1} style={styles.mapPreviewBadgeText}>
              {selectedRegion ? formatMapRegionName(selectedRegion.name) : neighborhoodName}
            </Text>
          </View>
        </View>

        <View style={styles.selectedRegionSummary}>
          <View style={styles.selectedRegionCopy}>
            <Text style={styles.selectedRegionLabel}>선택 구역</Text>
            <Text numberOfLines={1} style={styles.selectedRegionTitle}>
              {selectedRegion ? formatMapRegionName(selectedRegion.name) : '구역 없음'}
            </Text>
          </View>
          <Text style={styles.selectedRegionCount}>{selectedRegion?.cats.length ?? 0}마리</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionKicker}>동네 게시판</Text>
          <Text style={styles.sectionTitle}>최근 이야기</Text>
        </View>
        <Pressable accessibilityLabel="게시판 전체 보기" accessibilityRole="button" onPress={onOpenCommunityBoard} style={({ pressed }) => [styles.headerLink, pressed && styles.pressed]}>
          <Text style={styles.headerLinkText}>전체 보기</Text>
          <ChevronRight color={theme.colors.primaryDark} size={15} />
        </Pressable>
      </View>

      {previewError ? (
        <View style={styles.errorCard}>
          <AlertCircle color={theme.colors.primary} size={18} />
          <View style={styles.errorCopy}>
            <Text style={styles.errorTitle}>{previewError.title}</Text>
            <Text style={styles.errorText}>{previewError.message}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.postStack}>
        {previewPosts.map((post) => (
          <CommunityPostCard compact key={post.id} onPress={onOpenCommunityPost} post={post} />
        ))}
      </View>

      {isPreviewLoading ? (
        <View style={styles.loadingStrip}>
          <ActivityIndicator color={theme.colors.primaryDark} size="small" />
          <Text style={styles.loadingText}>최근 게시글을 불러오는 중</Text>
        </View>
      ) : null}

      {!isPreviewLoading && previewPosts.length === 0 ? (
        <View style={styles.emptyBoardCard}>
          <MessageCircle color="#CDB58F" size={26} />
          <Text style={styles.emptyBoardTitle}>아직 게시글이 없어요</Text>
          <Text style={styles.emptyBoardText}>게시판에서 첫 목격담이나 질문을 남겨보세요.</Text>
        </View>
      ) : null}

      <View style={styles.safetyStrip}>
        <ShieldCheck color={theme.colors.accent} size={17} />
        <Text style={styles.safetyText}>지도와 게시판 모두 정확한 좌표는 노출하지 않고 동네 단위로만 공유해요.</Text>
      </View>

      <Pressable accessibilityLabel="고양이 기록하기" accessibilityRole="button" onPress={onGoCapture} style={({ pressed }) => [styles.captureButton, pressed && styles.pressed]}>
        <Camera color="#FFF8F0" size={17} />
        <Text style={styles.captureButtonText}>고양이 기록하기</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: 132,
  },
  mapScreen: {
    flex: 1,
  },
  fullMap: {
    flex: 1,
  },
  mapTopBar: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.lg,
    left: theme.spacing.lg,
  },
  mapBackButton: {
    alignSelf: 'flex-start',
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 21,
    paddingLeft: theme.spacing.sm,
    paddingRight: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.12)',
    ...createShadow(5),
  },
  mapBackText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  mapInfoPanel: {
    position: 'absolute',
    right: theme.spacing.lg,
    bottom: 112,
    left: theme.spacing.lg,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(255,253,246,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.12)',
    ...createShadow(8),
  },
  mapInfoKicker: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  mapInfoTitle: {
    marginTop: 3,
    color: theme.colors.text,
    fontSize: 19,
    fontWeight: '900',
  },
  mapInfoText: {
    marginTop: 5,
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
  },
  segmentWrap: {
    minHeight: 44,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    borderRadius: 22,
    padding: 4,
    backgroundColor: 'rgba(255,253,246,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
  },
  segmentButton: {
    flex: 1,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 18,
  },
  segmentButtonActive: {
    backgroundColor: theme.colors.primaryDark,
  },
  segmentText: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  segmentTextActive: {
    color: '#FFF8F0',
  },
  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  title: {
    marginTop: 4,
    color: theme.colors.text,
    fontSize: 26,
    lineHeight: 33,
    fontWeight: '900',
  },
  description: {
    marginTop: theme.spacing.sm,
    color: theme.colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },
  locationBadge: {
    maxWidth: 122,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 19,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.13)',
  },
  locationBadgeText: {
    flexShrink: 1,
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  statusCard: {
    width: '48.7%',
    minHeight: 96,
    justifyContent: 'center',
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
    ...createShadow(3),
  },
  statusLabel: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  statusValue: {
    marginTop: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  statusValueSmall: {
    marginTop: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '900',
  },
  mapPreviewCard: {
    overflow: 'hidden',
    borderRadius: theme.radius.xxl,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.12)',
    ...createShadow(5),
  },
  mapPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  mapPreviewCopy: {
    flex: 1,
    minWidth: 0,
  },
  sectionKicker: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  sectionTitle: {
    marginTop: 3,
    color: theme.colors.text,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '900',
  },
  mapPreviewText: {
    marginTop: 5,
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  mapOpenButton: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: 17,
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.sm,
    backgroundColor: theme.colors.accentSoft,
  },
  mapOpenButtonText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  mapPreviewFrame: {
    height: 252,
    overflow: 'hidden',
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.mapBase,
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
  },
  mapPreview: {
    flex: 1,
  },
  mapPreviewBadge: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    maxWidth: 148,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.84)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.12)',
  },
  mapPreviewBadgeText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  selectedRegionSummary: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  selectedRegionCopy: {
    flex: 1,
    minWidth: 0,
  },
  selectedRegionLabel: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  selectedRegionTitle: {
    marginTop: 3,
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  selectedRegionCount: {
    color: theme.colors.primaryDark,
    fontSize: 15,
    fontWeight: '900',
  },
  sectionHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  headerLink: {
    minWidth: 88,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 18,
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.sm,
    backgroundColor: 'rgba(255,253,246,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.13)',
  },
  headerLinkText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  errorCard: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(255,239,221,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(196,122,66,0.18)',
  },
  errorCopy: {
    flex: 1,
    minWidth: 0,
  },
  errorTitle: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  errorText: {
    marginTop: 2,
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
  },
  postStack: {
    gap: theme.spacing.md,
  },
  loadingStrip: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: 21,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
  },
  loadingText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  emptyBoardCard: {
    minHeight: 128,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(255,253,246,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
  },
  emptyBoardTitle: {
    marginTop: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  emptyBoardText: {
    marginTop: 4,
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  safetyStrip: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(221,232,200,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(111,131,77,0.12)',
  },
  safetyText: {
    flex: 1,
    color: theme.colors.primaryDark,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
  },
  captureButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderRadius: 25,
    backgroundColor: theme.colors.primaryDark,
    ...createShadow(5),
  },
  captureButtonText: {
    color: '#FFF8F0',
    fontSize: 14,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.82,
  },
});
