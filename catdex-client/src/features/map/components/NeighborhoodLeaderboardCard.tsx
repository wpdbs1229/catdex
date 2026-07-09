import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertCircle, ChevronRight, ShieldCheck, Trophy } from 'lucide-react-native';
import { createShadow, theme } from '@/shared/styles/theme';
import type { NeighborhoodLeaderboardEntry } from '@/shared/types/leaderboard';

interface NeighborhoodLeaderboardCardProps {
  entries: NeighborhoodLeaderboardEntry[];
  errorMessage?: string;
  isLoading: boolean;
  onRetry: () => void;
}

const TOP_LIMIT = 5;

function getInitial(nickname: string) {
  return nickname.trim().slice(0, 1) || '냥';
}

function getRankColor(rank: number) {
  if (rank === 1) {
    return '#C97949';
  }

  if (rank === 2) {
    return '#7F8A7A';
  }

  if (rank === 3) {
    return '#9B7357';
  }

  return theme.colors.primaryDark;
}

export function NeighborhoodLeaderboardCard({ entries, errorMessage, isLoading, onRetry }: NeighborhoodLeaderboardCardProps) {
  const topEntries = entries.filter((entry) => entry.rank <= TOP_LIMIT).slice(0, TOP_LIMIT);
  const myEntry = entries.find((entry) => entry.isMe);
  const shouldShowMyEntry = Boolean(myEntry && myEntry.rank > TOP_LIMIT);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Trophy color={theme.colors.primaryDark} size={18} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>동네 기여 랭킹</Text>
          <Text style={styles.title}>동네 냥냥단 TOP 5</Text>
          <Text style={styles.description}>최근 30일 동안 동네 도감에 기록을 많이 남긴 이웃이에요.</Text>
        </View>
      </View>

      <View style={styles.ruleStrip}>
        <ShieldCheck color={theme.colors.accent} size={15} />
        <Text style={styles.ruleText}>같은 고양이의 같은 날 반복 기록은 1회만 반영해요.</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={theme.colors.primaryDark} size="small" />
          <Text style={styles.loadingText}>랭킹을 불러오는 중</Text>
        </View>
      ) : null}

      {!isLoading && errorMessage ? (
        <View style={styles.errorRow}>
          <AlertCircle color={theme.colors.primary} size={17} />
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable accessibilityLabel="랭킹 다시 불러오기" accessibilityRole="button" onPress={onRetry} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
            <Text style={styles.retryText}>다시</Text>
          </Pressable>
        </View>
      ) : null}

      {!isLoading && !errorMessage && topEntries.length === 0 ? (
        <View style={styles.emptyRow}>
          <Text style={styles.emptyTitle}>아직 이번 달 랭킹이 없어요</Text>
          <Text style={styles.emptyText}>첫 기록을 남기면 동네 기여 랭킹이 시작돼요.</Text>
        </View>
      ) : null}

      {!isLoading && !errorMessage && topEntries.length > 0 ? (
        <View style={styles.rankList}>
          {topEntries.map((entry) => (
            <LeaderboardRow entry={entry} key={entry.userId} />
          ))}
        </View>
      ) : null}

      {shouldShowMyEntry && myEntry ? (
        <View style={styles.myRankStrip}>
          <View style={styles.myRankCopy}>
            <Text style={styles.myRankLabel}>내 순위</Text>
            <Text style={styles.myRankText}>
              {myEntry.rank}위 · {myEntry.contributionScore}점
            </Text>
          </View>
          <ChevronRight color={theme.colors.primaryDark} size={16} />
        </View>
      ) : null}
    </View>
  );
}

function LeaderboardRow({ entry }: { entry: NeighborhoodLeaderboardEntry }) {
  const rankColor = getRankColor(entry.rank);

  return (
    <View style={[styles.rankRow, entry.isMe && styles.myRankRow]}>
      <View style={[styles.rankBadge, { backgroundColor: rankColor }]}>
        <Text style={styles.rankBadgeText}>{entry.rank}</Text>
      </View>

      <View style={styles.profileCircle}>
        {entry.profileImageUrl ? (
          <Image source={{ uri: entry.profileImageUrl }} style={styles.profileImage} />
        ) : (
          <Text style={styles.profileInitial}>{getInitial(entry.nickname)}</Text>
        )}
      </View>

      <View style={styles.memberCopy}>
        <View style={styles.nameRow}>
          <Text numberOfLines={1} style={styles.memberName}>
            {entry.nickname}
          </Text>
          {entry.isMe ? <Text style={styles.meBadge}>나</Text> : null}
        </View>
        <Text numberOfLines={1} style={styles.memberMeta}>
          고양이 {entry.collectedCatCount}마리 · 사진 기록 {entry.photoCount}개
        </Text>
        {entry.representativeCatNames.length > 0 ? (
          <View style={styles.catChipRow}>
            {entry.representativeCatNames.slice(0, 3).map((catName, index) => (
              <View key={`${entry.userId}-${catName}-${index}`} style={styles.catChip}>
                {entry.representativeCatImageUrls[index] ? (
                  <Image source={{ uri: entry.representativeCatImageUrls[index] }} style={styles.catChipImage} />
                ) : null}
                <Text numberOfLines={1} style={styles.catChipText}>
                  {catName}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.scorePill}>
        <Text style={styles.scoreValue}>{entry.contributionScore}</Text>
        <Text style={styles.scoreLabel}>점</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: theme.radius.xxl,
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(255,253,246,0.74)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.12)',
    ...createShadow(5),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  headerIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: theme.colors.accentSoft,
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
    marginTop: 3,
    color: theme.colors.text,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '900',
  },
  description: {
    marginTop: 5,
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  ruleStrip: {
    marginTop: theme.spacing.md,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: 19,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(221,232,200,0.52)',
  },
  ruleText: {
    flex: 1,
    color: theme.colors.inkSoft,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '800',
  },
  loadingRow: {
    marginTop: theme.spacing.md,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  loadingText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  errorRow: {
    marginTop: theme.spacing.md,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255,239,221,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(196,122,66,0.18)',
  },
  errorText: {
    flex: 1,
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
  },
  retryButton: {
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: 'rgba(255,253,246,0.8)',
  },
  retryText: {
    color: theme.colors.primaryDark,
    fontSize: 11,
    fontWeight: '900',
  },
  emptyRow: {
    marginTop: theme.spacing.md,
    minHeight: 84,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255,248,236,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  emptyText: {
    marginTop: 5,
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  rankList: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  rankRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.sm,
    backgroundColor: 'rgba(255,248,236,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
  },
  myRankRow: {
    backgroundColor: 'rgba(221,232,200,0.45)',
    borderColor: 'rgba(113,138,91,0.22)',
  },
  rankBadge: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  rankBadgeText: {
    color: '#FFF8F0',
    fontSize: 12,
    fontWeight: '900',
  },
  profileCircle: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 21,
    backgroundColor: '#FFF8EC',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.12)',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileInitial: {
    color: theme.colors.primaryDark,
    fontSize: 15,
    fontWeight: '900',
  },
  memberCopy: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  memberName: {
    flexShrink: 1,
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  meBadge: {
    overflow: 'hidden',
    borderRadius: 9,
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: theme.colors.primaryDark,
    color: '#FFF8F0',
    fontSize: 10,
    fontWeight: '900',
  },
  memberMeta: {
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '800',
  },
  catChipRow: {
    marginTop: 5,
    flexDirection: 'row',
    gap: 4,
  },
  catChip: {
    maxWidth: 76,
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 12,
    paddingLeft: 3,
    paddingRight: 7,
    backgroundColor: 'rgba(255,253,246,0.76)',
  },
  catChipImage: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  catChipText: {
    flexShrink: 1,
    color: theme.colors.primaryDark,
    fontSize: 10,
    fontWeight: '900',
  },
  scorePill: {
    minWidth: 48,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: theme.colors.primaryDark,
  },
  scoreValue: {
    color: '#FFF8F0',
    fontSize: 15,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  scoreLabel: {
    color: '#FFF8F0',
    fontSize: 10,
    fontWeight: '900',
  },
  myRankStrip: {
    marginTop: theme.spacing.md,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
  },
  myRankCopy: {
    flex: 1,
    minWidth: 0,
  },
  myRankLabel: {
    color: theme.colors.mutedText,
    fontSize: 10,
    fontWeight: '800',
  },
  myRankText: {
    marginTop: 2,
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.82,
  },
});
