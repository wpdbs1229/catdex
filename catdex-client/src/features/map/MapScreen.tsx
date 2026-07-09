import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  AlertCircle,
  Camera,
  ChevronLeft,
  ChevronRight,
  Footprints,
  Heart,
  MapPin,
  MessageCircle,
  PawPrint,
  Send,
  ShieldCheck,
  Users,
} from 'lucide-react-native';
import type { Cat } from '@/shared/types/cat';
import type { CommunityFilter, CommunityPost, CommunityTopic } from '@/shared/types/community';
import type { Region } from '@/shared/types/region';
import {
  createCommunityComment,
  createCommunityPost,
  fetchCommunityPosts,
  toggleCommunityPostLike,
} from '@/shared/api/community.api';
import { getUserFacingError, type UserFacingError } from '@/shared/errors/user-facing-error';
import { KakaoMapView } from '@/features/map/components/KakaoMapView';
import { formatMapRegionName } from '@/features/map/map-region-label';
import { createShadow, theme } from '@/shared/styles/theme';

interface MapScreenProps {
  regions: Region[];
  cats: Cat[];
  neighborhoodName: string;
  onGoCapture: () => void;
  onOpenCat: (catId: string) => void;
}

const communityFilterOptions: Array<{ id: CommunityFilter; label: string }> = [
  { id: 'ALL', label: '전체' },
  { id: 'SIGHTING', label: '목격담' },
  { id: 'STATUS', label: '근황' },
  { id: 'QUESTION', label: '질문' },
  { id: 'INFO', label: '정보' },
];

const communityTopicLabel: Record<CommunityTopic, string> = {
  SIGHTING: '목격담',
  QUESTION: '질문',
  STATUS: '근황',
  INFO: '정보',
};

function getRegionCats(region: Region | null, catByName: Map<string, Cat>) {
  if (!region) {
    return [];
  }

  return region.cats.map((catName) => catByName.get(catName)).filter((cat): cat is Cat => Boolean(cat));
}

function getLastSeenLabel(cats: Cat[]) {
  return cats[0]?.lastSeenAt ?? '아직 기록 없음';
}

export function MapScreen({ regions, cats, neighborhoodName, onGoCapture, onOpenCat }: MapScreenProps) {
  const displayRegions = useMemo(() => regions, [regions]);
  const catByName = useMemo(() => new Map(cats.map((cat) => [cat.name, cat])), [cats]);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(displayRegions[0] ?? null);
  const [isDistributionOpen, setIsDistributionOpen] = useState(false);
  const [activeCommunityFilter, setActiveCommunityFilter] = useState<CommunityFilter>('ALL');
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [communityError, setCommunityError] = useState<UserFacingError | null>(null);
  const [isCommunityLoading, setIsCommunityLoading] = useState(false);
  const [isCommunitySubmitting, setIsCommunitySubmitting] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [newThreadDraft, setNewThreadDraft] = useState('');

  useEffect(() => {
    if (!selectedRegion && displayRegions[0]) {
      setSelectedRegion(displayRegions[0]);
      return;
    }

    if (selectedRegion && !displayRegions.some((region) => region.id === selectedRegion.id)) {
      setSelectedRegion(displayRegions[0] ?? null);
    }
  }, [displayRegions, selectedRegion]);

  const selectedRegionCats = useMemo(() => getRegionCats(selectedRegion, catByName), [catByName, selectedRegion]);
  const hasSelectedRegionCats = selectedRegionCats.length > 0;
  const refreshCommunityPosts = useCallback(
    async (nextFilter: CommunityFilter = activeCommunityFilter) => {
      setIsCommunityLoading(true);
      setCommunityError(null);

      try {
        const nextPosts = await fetchCommunityPosts({
          regionName: neighborhoodName,
          topic: nextFilter,
          limit: 30,
        });
        setCommunityPosts(nextPosts);
      } catch (error) {
        console.warn('[community] load failed', error);
        const friendlyError = getUserFacingError(error, 'community.load');
        setCommunityPosts([]);
        setCommunityError(friendlyError);
      } finally {
        setIsCommunityLoading(false);
      }
    },
    [activeCommunityFilter, neighborhoodName],
  );

  useEffect(() => {
    void refreshCommunityPosts();
  }, [refreshCommunityPosts]);

  const visibleCommunityPosts = useMemo(
    () =>
      activeCommunityFilter === 'ALL'
        ? communityPosts
        : communityPosts.filter((post) => post.topic === activeCommunityFilter),
    [activeCommunityFilter, communityPosts],
  );
  const totalRegionCats = useMemo(() => new Set(displayRegions.flatMap((region) => region.cats)).size, [displayRegions]);
  const verifiedCats = cats.filter((cat) => cat.encounterCount > 1).length;
  const needsCheckCount = Math.max(1, Math.min(5, cats.length - verifiedCats + displayRegions.length));
  const activeRegions = displayRegions.filter((region) => region.cats.length > 0).length;
  const focusCats = cats.slice(0, 3);
  const communityReplyCount = communityPosts.reduce((total, post) => total + post.commentCount, 0);

  const handleCreateCommunityThread = async () => {
    const body = newThreadDraft.trim();

    if (!body || isCommunitySubmitting) {
      return;
    }

    const targetCat = selectedRegionCats[0] ?? cats[0];
    setIsCommunitySubmitting(true);
    setCommunityError(null);

    try {
      const postId = await createCommunityPost({
        topic: 'SIGHTING',
        title: targetCat ? `${targetCat.name}에 대한 새 이야기` : `${neighborhoodName} 새 이야기`,
        body,
        regionName: neighborhoodName,
        catId: targetCat?.id,
      });
      setActiveCommunityFilter('ALL');
      setActiveThreadId(postId);
      setNewThreadDraft('');
      await refreshCommunityPosts('ALL');
    } catch (error) {
      console.warn('[community] post save failed', error);
      setCommunityError(getUserFacingError(error, 'community.save'));
    } finally {
      setIsCommunitySubmitting(false);
    }
  };

  const handleSubmitCommunityReply = async (threadId: string) => {
    const body = replyDrafts[threadId]?.trim();

    if (!body) {
      return;
    }

    setCommunityError(null);

    try {
      await createCommunityComment(threadId, body);
      setReplyDrafts((current) => ({
        ...current,
        [threadId]: '',
      }));
      setActiveThreadId(threadId);
      await refreshCommunityPosts();
    } catch (error) {
      console.warn('[community] comment save failed', error);
      setCommunityError(getUserFacingError(error, 'community.comment'));
    }
  };

  const handleToggleCommunityLike = async (thread: CommunityPost) => {
    setCommunityError(null);
    setCommunityPosts((current) =>
      current.map((post) =>
        post.id === thread.id
          ? {
              ...post,
              likedByMe: !post.likedByMe,
              likeCount: Math.max(0, post.likeCount + (post.likedByMe ? -1 : 1)),
            }
          : post,
      ),
    );

    try {
      await toggleCommunityPostLike(thread.id, thread.likedByMe);
    } catch (error) {
      console.warn('[community] like toggle failed', error);
      setCommunityError(getUserFacingError(error, 'community.like'));
      await refreshCommunityPosts();
    }
  };

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
          <View pointerEvents="none" style={styles.neighborhoodBadge}>
            <MapPin color={theme.colors.accent} size={15} />
            <Text numberOfLines={1} style={styles.neighborhoodBadgeText}>
              {neighborhoodName}
            </Text>
          </View>
        </View>

        <View style={styles.mapBottomSheet}>
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitleBlock}>
              <Text style={styles.sheetKicker}>냥이 활동 구역</Text>
              <Text numberOfLines={1} style={styles.sheetTitle}>
                {selectedRegion ? formatMapRegionName(selectedRegion.name) : '구역을 선택해 주세요'}
              </Text>
            </View>
            <View style={styles.sheetCountBadge}>
              <Text style={styles.sheetCountText}>{selectedRegion?.cats.length ?? 0}마리</Text>
            </View>
          </View>

          <Text style={styles.sheetBody}>
            정확한 좌표는 저장하지 않고, 동네 안에서 냥이 구역만 흐리게 보여줘요.
          </Text>

          <View style={styles.regionCatList}>
            {selectedRegionCats.length > 0 ? (
              selectedRegionCats.slice(0, 4).map((cat) => (
                <Pressable
                  accessibilityLabel={`${cat.name} 도감 보기`}
                  accessibilityRole="button"
                  key={cat.id}
                  onPress={() => onOpenCat(cat.id)}
                  style={({ pressed }) => [styles.regionCatChip, pressed && styles.pressed]}
                >
                  <PawPrint color={theme.colors.primary} size={14} />
                  <Text numberOfLines={1} style={styles.regionCatChipText}>
                    {cat.name}
                  </Text>
                </Pressable>
              ))
            ) : (
              <View style={styles.emptyRegionChip}>
                <PawPrint color="#CDB58F" size={14} />
                <Text style={styles.emptyRegionChipText}>아직 확인된 고양이가 없어요</Text>
              </View>
            )}
          </View>

          <View style={styles.sheetActions}>
            <Pressable accessibilityLabel="이 구역에서 기록" accessibilityRole="button" onPress={onGoCapture} style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}>
              <Camera color="#FFF8F0" size={17} />
              <Text style={styles.primaryActionText}>이 구역에서 기록</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={hasSelectedRegionCats ? '선택 구역 냥이 보기' : '선택 구역에 확인된 냥이 없음'}
              accessibilityRole="button"
              disabled={!hasSelectedRegionCats}
              onPress={() => {
                if (selectedRegionCats[0]) {
                  onOpenCat(selectedRegionCats[0].id);
                }
              }}
              style={({ pressed }) => [styles.secondaryAction, !hasSelectedRegionCats && styles.secondaryActionDisabled, pressed && styles.pressed]}
            >
              <Text style={[styles.secondaryActionText, !hasSelectedRegionCats && styles.secondaryActionTextDisabled]}>
                {hasSelectedRegionCats ? '냥이 보기' : '냥이 없음'}
              </Text>
              <ChevronRight color={hasSelectedRegionCats ? theme.colors.primaryDark : theme.colors.mutedText} size={15} />
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>동네 상황실</Text>
          <Text style={styles.title}>{neighborhoodName} 길고양이 현황</Text>
          <Text style={styles.description}>이웃들이 남긴 기록을 모아 오늘 확인할 고양이와 구역을 보여줘요.</Text>
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
          <Text style={styles.statusLabel}>확인 필요</Text>
          <Text style={styles.statusValue}>{needsCheckCount}건</Text>
        </View>
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>냥이 구역</Text>
          <Text style={styles.statusValue}>{activeRegions}곳</Text>
        </View>
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>최근 기록</Text>
          <Text numberOfLines={1} style={styles.statusValueSmall}>
            {getLastSeenLabel(cats)}
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionKicker}>오늘 먼저 볼 일</Text>
          <Text style={styles.sectionTitle}>확인 필요한 냥이</Text>
        </View>
        <Pressable accessibilityLabel="고양이 기록하기" accessibilityRole="button" onPress={onGoCapture} style={({ pressed }) => [styles.headerLink, pressed && styles.pressed]}>
          <Camera color={theme.colors.primaryDark} size={15} />
          <Text style={styles.headerLinkText}>기록</Text>
        </Pressable>
      </View>

      <View style={styles.checkStack}>
        {focusCats.length > 0 ? (
          focusCats.map((cat, index) => (
            <Pressable
              accessibilityLabel={`${cat.name} 확인하기`}
              accessibilityRole="button"
              key={cat.id}
              onPress={() => onOpenCat(cat.id)}
              style={({ pressed }) => [styles.checkCard, pressed && styles.pressed]}
            >
              <View style={[styles.checkIcon, index === 0 && styles.checkIconActive]}>
                {index === 0 ? (
                  <AlertCircle color="#FFF8F0" size={18} />
                ) : (
                  <Footprints color={theme.colors.primaryDark} size={18} />
                )}
              </View>
              <View style={styles.checkCopy}>
                <Text numberOfLines={1} style={styles.checkTitle}>
                  {index === 0 ? `${cat.name}인지 확인이 필요해요` : `${cat.name} 최근 기록을 확인해요`}
                </Text>
                <Text numberOfLines={2} style={styles.checkBody}>
                  {cat.relationshipLevel} · 최근 {cat.lastSeenAt}
                </Text>
              </View>
              <ChevronRight color={theme.colors.primaryDark} size={17} />
            </Pressable>
          ))
        ) : (
          <View style={styles.emptyCheckCard}>
            <PawPrint color="#CDB58F" size={26} />
            <Text style={styles.emptyCheckTitle}>아직 확인할 기록이 없어요</Text>
            <Text style={styles.emptyCheckText}>첫 촬영 기록이 올라오면 이곳에서 이웃 확인을 모아요.</Text>
          </View>
        )}
      </View>

      <View style={styles.mapPreviewCard}>
        <View style={styles.mapPreviewHeader}>
          <View style={styles.mapPreviewCopy}>
            <Text style={styles.sectionKicker}>냥이 구역</Text>
            <Text style={styles.sectionTitle}>동네 냥이 구역을 한눈에 봐요</Text>
            <Text style={styles.mapPreviewText}>정확한 위치 대신 자주 보이는 구역만 원으로 표시해요.</Text>
          </View>
          <Pressable accessibilityLabel="냥이 구역 보기" accessibilityRole="button" onPress={() => setIsDistributionOpen(true)} style={({ pressed }) => [styles.mapOpenButton, pressed && styles.pressed]}>
            <Text style={styles.mapOpenButtonText}>냥이 구역</Text>
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
          <Text style={styles.sectionKicker}>이웃 대화</Text>
          <Text style={styles.sectionTitle}>동네 냥이 커뮤니티</Text>
        </View>
        <View style={styles.peopleBadge}>
          <Users color={theme.colors.accent} size={15} />
          <Text style={styles.peopleBadgeText}>글 {communityPosts.length}개</Text>
        </View>
      </View>

      <View style={styles.communityIntroCard}>
        <View style={styles.communityIntroIcon}>
          <MessageCircle color={theme.colors.primaryDark} size={20} />
        </View>
        <View style={styles.communityIntroCopy}>
          <Text style={styles.communityIntroTitle}>발견한 고양이별로 이야기해요</Text>
          <Text style={styles.communityIntroText}>
            같은 고양이인지, 최근 상태가 어떤지, 어느 구역에서 조심히 봤는지 이웃 의견을 모아요.
          </Text>
        </View>
      </View>

      <View style={styles.communityComposer}>
        <TextInput
          accessibilityLabel="동네 커뮤니티 새 이야기"
          multiline
          onChangeText={setNewThreadDraft}
          placeholder={`${neighborhoodName}에서 본 고양이에 대해 이야기해요`}
          placeholderTextColor="#A99178"
          style={styles.communityComposerInput}
          value={newThreadDraft}
        />
        <Pressable
          accessibilityLabel="동네 이야기 올리기"
          accessibilityRole="button"
          disabled={!newThreadDraft.trim() || isCommunitySubmitting}
          onPress={handleCreateCommunityThread}
          style={({ pressed }) => [
            styles.communityComposerButton,
            (!newThreadDraft.trim() || isCommunitySubmitting) && styles.communityComposerButtonDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Send color="#FFF8F0" size={16} />
          <Text style={styles.communityComposerButtonText}>{isCommunitySubmitting ? '올리는 중' : '올리기'}</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.communityFilterRow}>
        {communityFilterOptions.map((filter) => {
          const isActive = activeCommunityFilter === filter.id;

          return (
            <Pressable
              accessibilityLabel={`커뮤니티 필터 ${filter.label}`}
              accessibilityRole="button"
              key={filter.id}
              onPress={() => setActiveCommunityFilter(filter.id)}
              style={({ pressed }) => [styles.communityFilterChip, isActive && styles.communityFilterChipActive, pressed && styles.pressed]}
            >
              <Text style={[styles.communityFilterText, isActive && styles.communityFilterTextActive]}>{filter.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.communityMetaStrip}>
        {isCommunityLoading ? <ActivityIndicator color={theme.colors.primaryDark} size="small" /> : <MessageCircle color={theme.colors.accent} size={15} />}
        <Text style={styles.communityMetaText}>
          {isCommunityLoading ? '동네 대화를 불러오는 중' : `대화 ${communityPosts.length}개 · 댓글 ${communityReplyCount}개`}
        </Text>
      </View>

      {communityError ? (
        <View style={styles.communityErrorCard}>
          <AlertCircle color={theme.colors.primary} size={18} />
          <View style={styles.communityErrorCopy}>
            <Text style={styles.communityErrorTitle}>{communityError.title}</Text>
            <Text style={styles.communityErrorText}>{communityError.message}</Text>
          </View>
          <Pressable accessibilityLabel="커뮤니티 다시 불러오기" accessibilityRole="button" onPress={() => refreshCommunityPosts()} style={({ pressed }) => [styles.communityRetryButton, pressed && styles.pressed]}>
            <Text style={styles.communityRetryText}>다시 불러오기</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.communityStack}>
        {visibleCommunityPosts.map((thread) => {
          const isOpen = activeThreadId === thread.id;
          const visibleReplies = isOpen ? thread.comments.slice(0, 3) : thread.comments.slice(0, 1);

          return (
            <View key={thread.id} style={styles.communityCard}>
              <Pressable
                accessibilityLabel={`${thread.title} 대화 ${isOpen ? '접기' : '열기'}`}
                accessibilityRole="button"
                onPress={() => setActiveThreadId((current) => (current === thread.id ? null : thread.id))}
                style={({ pressed }) => [styles.communityCardPressArea, pressed && styles.pressed]}
              >
                <View style={styles.communityTopRow}>
                  <View style={styles.communityTopicBadge}>
                    <MessageCircle color={theme.colors.accent} size={13} />
                    <Text style={styles.communityTopicText}>{communityTopicLabel[thread.topic]}</Text>
                  </View>
                  <Text numberOfLines={1} style={styles.communityTimeText}>
                    {thread.author.nickname} · {thread.createdAt}
                  </Text>
                </View>

                <Text style={styles.communityTitle}>{thread.title}</Text>
                <Text style={styles.communityBody}>{thread.body}</Text>

                <View style={styles.communityContextRow}>
                  <Pressable
                    accessibilityLabel={thread.catName ? `${thread.catName} 도감 보기` : '고양이 미지정'}
                    accessibilityRole="button"
                    disabled={!thread.catId}
                    onPress={() => {
                      if (thread.catId) {
                        onOpenCat(thread.catId);
                      }
                    }}
                    style={({ pressed }) => [styles.communityCatPill, pressed && styles.pressed]}
                  >
                    <PawPrint color={theme.colors.primary} size={13} />
                    <Text numberOfLines={1} style={styles.communityCatPillText}>
                      {thread.catName ?? '고양이 미지정'}
                    </Text>
                  </Pressable>
                  <Text numberOfLines={1} style={styles.communityRegionText}>
                    {thread.regionName ?? neighborhoodName}
                  </Text>
                </View>

                <View style={styles.communityStatsRow}>
                  <Pressable accessibilityLabel={`${thread.title} 공감`} accessibilityRole="button" onPress={() => handleToggleCommunityLike(thread)} style={({ pressed }) => [styles.communityStat, pressed && styles.pressed]}>
                    <Heart color={theme.colors.primary} fill={thread.likedByMe ? theme.colors.primary : 'transparent'} size={14} />
                    <Text style={styles.communityStatText}>공감 {thread.likeCount}</Text>
                  </Pressable>
                  <View style={styles.communityStat}>
                    <MessageCircle color={theme.colors.accent} size={14} />
                    <Text style={styles.communityStatText}>댓글 {thread.commentCount}</Text>
                  </View>
                  <Text style={styles.communityOpenText}>{isOpen ? '접기' : '대화 열기'}</Text>
                </View>
              </Pressable>

              {visibleReplies.length > 0 ? (
                <View style={styles.replyStack}>
                  {visibleReplies.map((reply) => (
                    <View key={reply.id} style={styles.replyBubble}>
                      <View style={styles.replyHeader}>
                        <Text numberOfLines={1} style={styles.replyAuthor}>
                          {reply.author.nickname}
                        </Text>
                        <Text style={styles.replyTime}>{reply.createdAt}</Text>
                      </View>
                      <Text style={styles.replyBody}>{reply.body}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={styles.replyComposer}>
                <TextInput
                  accessibilityLabel={`${thread.title} 댓글 입력`}
                  onChangeText={(text) =>
                    setReplyDrafts((current) => ({
                      ...current,
                      [thread.id]: text,
                    }))
                  }
                  placeholder={`${thread.catName ?? '이 고양이'}에 대해 댓글 남기기`}
                  placeholderTextColor="#A99178"
                  style={styles.replyInput}
                  value={replyDrafts[thread.id] ?? ''}
                />
                <Pressable
                  accessibilityLabel={`${thread.title} 댓글 보내기`}
                  accessibilityRole="button"
                  disabled={!replyDrafts[thread.id]?.trim()}
                  onPress={() => handleSubmitCommunityReply(thread.id)}
                  style={({ pressed }) => [
                    styles.replySendButton,
                    !replyDrafts[thread.id]?.trim() && styles.replySendButtonDisabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <Send color="#FFF8F0" size={15} />
                </Pressable>
              </View>
            </View>
          );
        })}

        {!isCommunityLoading && visibleCommunityPosts.length === 0 ? (
          <View style={styles.emptyCommunityCard}>
            <MessageCircle color="#CDB58F" size={26} />
            <Text style={styles.emptyCommunityTitle}>아직 이 주제의 대화가 없어요</Text>
            <Text style={styles.emptyCommunityText}>첫 이야기를 남기면 동네 사람들이 이어서 확인할 수 있어요.</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.safetyStrip}>
        <ShieldCheck color={theme.colors.accent} size={17} />
        <Text style={styles.safetyText}>급식소나 정확한 좌표는 노출하지 않고, 동네와 구역 단위로만 공유해요.</Text>
      </View>
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
    letterSpacing: 0,
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
  sectionHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
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
    letterSpacing: 0,
  },
  headerLink: {
    minWidth: 68,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 18,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.13)',
  },
  headerLinkText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  checkStack: {
    gap: theme.spacing.sm,
  },
  checkCard: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.12)',
    ...createShadow(4),
  },
  checkIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: 'rgba(248,234,210,0.78)',
  },
  checkIconActive: {
    backgroundColor: theme.colors.primary,
  },
  checkCopy: {
    flex: 1,
    minWidth: 0,
  },
  checkTitle: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
  },
  checkBody: {
    marginTop: 3,
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  emptyCheckCard: {
    minHeight: 118,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(255,253,246,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
  },
  emptyCheckTitle: {
    marginTop: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  emptyCheckText: {
    marginTop: 4,
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    textAlign: 'center',
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
  peopleBadge: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 17,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(221,232,200,0.72)',
  },
  peopleBadgeText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  communityIntroCard: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(221,232,200,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(111,131,77,0.14)',
  },
  communityIntroIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    backgroundColor: 'rgba(255,253,246,0.78)',
  },
  communityIntroCopy: {
    flex: 1,
    minWidth: 0,
  },
  communityIntroTitle: {
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
  },
  communityIntroText: {
    marginTop: 5,
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  communityComposer: {
    gap: theme.spacing.sm,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.12)',
    ...createShadow(4),
  },
  communityComposerInput: {
    minHeight: 76,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    backgroundColor: 'rgba(248,234,210,0.48)',
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    textAlignVertical: 'top',
  },
  communityComposerButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primaryDark,
  },
  communityComposerButtonDisabled: {
    opacity: 0.42,
  },
  communityComposerButtonText: {
    color: '#FFF8F0',
    fontSize: 13,
    fontWeight: '900',
  },
  communityFilterRow: {
    gap: theme.spacing.sm,
    paddingRight: theme.spacing.lg,
  },
  communityFilterChip: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.11)',
  },
  communityFilterChipActive: {
    backgroundColor: theme.colors.primaryDark,
    borderColor: theme.colors.primaryDark,
  },
  communityFilterText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  communityFilterTextActive: {
    color: '#FFF8F0',
  },
  communityMetaStrip: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: 19,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.56)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
  },
  communityMetaText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  communityErrorCard: {
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
  communityErrorCopy: {
    flex: 1,
    minWidth: 0,
  },
  communityErrorTitle: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  communityErrorText: {
    marginTop: 2,
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
  },
  communityRetryButton: {
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: 'rgba(255,253,246,0.78)',
  },
  communityRetryText: {
    color: theme.colors.primaryDark,
    fontSize: 11,
    fontWeight: '900',
  },
  communityStack: {
    gap: theme.spacing.md,
  },
  communityCard: {
    overflow: 'hidden',
    borderRadius: theme.radius.xl,
    backgroundColor: 'rgba(255,253,246,0.74)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.12)',
    ...createShadow(4),
  },
  communityCardPressArea: {
    padding: theme.spacing.md,
  },
  communityTopRow: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  communityTopicBadge: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 14,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: 'rgba(221,232,200,0.72)',
  },
  communityTopicText: {
    color: theme.colors.primaryDark,
    fontSize: 11,
    fontWeight: '900',
  },
  communityTimeText: {
    flexShrink: 1,
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'right',
  },
  communityTitle: {
    marginTop: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '900',
  },
  communityBody: {
    marginTop: 5,
    color: theme.colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },
  communityContextRow: {
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  communityCatPill: {
    maxWidth: '58%',
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 16,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: 'rgba(248,234,210,0.66)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
  },
  communityCatPillText: {
    flexShrink: 1,
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  communityRegionText: {
    flex: 1,
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '800',
  },
  communityStatsRow: {
    marginTop: theme.spacing.md,
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  communityStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  communityStatText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  communityOpenText: {
    marginLeft: 'auto',
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  replyStack: {
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  replyBubble: {
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(248,234,210,0.5)',
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  replyAuthor: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  replyTime: {
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '800',
  },
  replyBody: {
    marginTop: 5,
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  replyComposer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139,112,83,0.08)',
  },
  replyInput: {
    flex: 1,
    minHeight: 42,
    borderRadius: 21,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(248,234,210,0.48)',
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  replySendButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: theme.colors.primaryDark,
  },
  replySendButtonDisabled: {
    opacity: 0.36,
  },
  emptyCommunityCard: {
    minHeight: 124,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(255,253,246,0.66)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
  },
  emptyCommunityTitle: {
    marginTop: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  emptyCommunityText: {
    marginTop: 4,
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  feedStack: {
    gap: theme.spacing.sm,
  },
  feedCard: {
    minHeight: 126,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.12)',
    ...createShadow(4),
  },
  feedTopRow: {
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  feedTypeBadge: {
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 13,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: 'rgba(221,232,200,0.72)',
  },
  feedTypeText: {
    color: theme.colors.primaryDark,
    fontSize: 11,
    fontWeight: '900',
  },
  feedMeta: {
    flexShrink: 1,
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'right',
  },
  feedTitle: {
    marginTop: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '900',
  },
  feedBody: {
    marginTop: 5,
    color: theme.colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },
  safetyStrip: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(221,232,200,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(111,131,77,0.14)',
  },
  safetyText: {
    flex: 1,
    color: theme.colors.primaryDark,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
  },
  mapScreen: {
    flex: 1,
    backgroundColor: theme.colors.mapBase,
  },
  fullMap: {
    ...StyleSheet.absoluteFillObject,
  },
  mapTopBar: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    left: theme.spacing.md,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  mapBackButton: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    paddingLeft: theme.spacing.sm,
    paddingRight: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.13)',
    ...createShadow(4),
  },
  mapBackText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  neighborhoodBadge: {
    maxWidth: 156,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.13)',
    ...createShadow(4),
  },
  neighborhoodBadgeText: {
    flexShrink: 1,
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  mapBottomSheet: {
    position: 'absolute',
    right: theme.spacing.lg,
    bottom: 112,
    left: theme.spacing.lg,
    gap: theme.spacing.md,
    borderRadius: theme.radius.xxl,
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(255,253,246,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.13)',
    ...createShadow(8),
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  sheetTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  sheetKicker: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  sheetTitle: {
    marginTop: 3,
    color: theme.colors.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
  },
  sheetCountBadge: {
    minWidth: 66,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: theme.colors.surfaceAlt,
  },
  sheetCountText: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  sheetBody: {
    color: theme.colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },
  regionCatList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  regionCatChip: {
    maxWidth: '48%',
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 17,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(248,234,210,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
  },
  regionCatChipText: {
    flexShrink: 1,
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  emptyRegionChip: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 17,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(248,234,210,0.5)',
  },
  emptyRegionChipText: {
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '800',
  },
  sheetActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  primaryAction: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.primaryDark,
  },
  primaryActionText: {
    flexShrink: 1,
    color: '#FFF8F0',
    fontSize: 14,
    fontWeight: '900',
  },
  secondaryAction: {
    minWidth: 104,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.accentSoft,
  },
  secondaryActionDisabled: {
    backgroundColor: 'rgba(232,211,183,0.48)',
  },
  secondaryActionText: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  secondaryActionTextDisabled: {
    color: theme.colors.mutedText,
  },
  pressed: {
    opacity: 0.82,
  },
});
