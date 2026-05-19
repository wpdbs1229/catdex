import { ChevronLeft, Heart, PawPrint, Trophy, Users } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/shared/components/Card';
import { createShadow, theme } from '@/shared/styles/theme';
import { collectionPaletteStyle } from '@/shared/utils/collectionTheme';
import type { PublicCollection } from '@/shared/types/social';

interface NeighborhoodRankingScreenProps {
  collections: PublicCollection[];
  isLoading: boolean;
  onBack: () => void;
  onOpenCollection: (ownerId: string) => void;
}

export function NeighborhoodRankingScreen({
  collections,
  isLoading,
  onBack,
  onOpenCollection,
}: NeighborhoodRankingScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Pressable onPress={onBack} style={({ pressed }) => [styles.backButton, pressed ? styles.pressed : null]}>
        <ChevronLeft color={theme.colors.primaryDark} size={17} />
        <Text style={styles.backButtonText}>고양이 도감</Text>
      </Pressable>

      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Trophy color={theme.colors.primaryDark} size={22} />
        </View>
        <Text style={styles.title}>동네 도감 랭킹</Text>
        <Text style={styles.subtitle}>공개된 도감을 둘러보고 마음에 드는 도감을 팔로우해요.</Text>
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <PawPrint color="#D4B989" size={38} />
          <Text style={styles.centerText}>공개 도감을 모으는 중</Text>
        </View>
      ) : null}

      {!isLoading && collections.length === 0 ? (
        <View style={styles.centerState}>
          <PawPrint color="#D4B989" size={38} />
          <Text style={styles.centerText}>아직 공개된 도감이 없어요</Text>
        </View>
      ) : null}

      <View style={styles.list}>
        {collections.map((collection, index) => (
          <Pressable
            key={collection.ownerId}
            onPress={() => onOpenCollection(collection.ownerId)}
            style={({ pressed }) => [styles.rankingItem, collectionPaletteStyle(collection.theme.palette), pressed ? styles.pressed : null]}
          >
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>{index + 1}</Text>
            </View>
            <View style={styles.itemCopy}>
              <Text numberOfLines={1} style={styles.ownerText}>
                {collection.nickname}
              </Text>
              <Text numberOfLines={1} style={styles.collectionTitle}>
                {collection.profile.displayTitle}
              </Text>
              <Text numberOfLines={1} style={styles.themeText}>
                {collection.theme.name}
              </Text>
            </View>
            <View style={styles.metricColumn}>
              <View style={styles.metricRow}>
                <Heart color={theme.colors.primaryDark} size={13} />
                <Text style={styles.metricText}>{collection.stats.likeCount}</Text>
              </View>
              <View style={styles.metricRow}>
                <Users color={theme.colors.primaryDark} size={13} />
                <Text style={styles.metricText}>{collection.stats.followerCount}</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </View>

      <Card style={styles.noticeCard}>
        <Text style={styles.noticeTitle}>공개 범위</Text>
        <Text style={styles.noticeText}>랭킹은 공개 도감의 표지와 요약 정보만 사용해요. 정확한 위치는 보여주지 않아요.</Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: 132,
  },
  backButton: {
    alignSelf: 'flex-start',
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.sm,
    paddingRight: theme.spacing.md,
    backgroundColor: 'rgba(255, 253, 246, 0.78)',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  backButtonText: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  header: {
    marginTop: theme.spacing.md,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0DC',
    borderWidth: 1,
    borderColor: 'rgba(201,121,73,0.22)',
  },
  title: {
    marginTop: theme.spacing.md,
    color: theme.colors.text,
    fontSize: 27,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: theme.spacing.sm,
    color: theme.colors.mutedText,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
  },
  centerState: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  centerText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  list: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  rankingItem: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    padding: theme.spacing.md,
    ...createShadow(5),
  },
  rankBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,253,246,0.78)',
  },
  rankText: {
    color: theme.colors.primaryDark,
    fontSize: 14,
    fontWeight: '900',
  },
  itemCopy: {
    flex: 1,
    minWidth: 0,
  },
  ownerText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  collectionTitle: {
    marginTop: 4,
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  themeText: {
    marginTop: 4,
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
  },
  metricColumn: {
    gap: 7,
  },
  metricRow: {
    minWidth: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  metricText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  noticeCard: {
    marginTop: theme.spacing.lg,
    backgroundColor: 'rgba(255,253,246,0.78)',
  },
  noticeTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  noticeText: {
    marginTop: theme.spacing.sm,
    color: theme.colors.mutedText,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.82,
  },
});
