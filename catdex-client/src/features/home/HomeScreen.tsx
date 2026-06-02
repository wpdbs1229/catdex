import { Bell, Footprints, MapPin, PawPrint, Plus, Sparkles, Sprout } from 'lucide-react-native';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { createShadow, theme } from '@/shared/styles/theme';
import type { Cat, HomeSummary } from '@/shared/types/cat';

interface HomeScreenProps {
  summary: HomeSummary;
  recentCats: Cat[];
  onOpenCat: (catId: string) => void;
  onGoCapture: () => void;
}

const illustrations = {
  hero: require('../../../assets/illustrations/home-hero-watercolor-cat.png'),
  orange: require('../../../assets/illustrations/cat-orange-clean.png'),
  dark: require('../../../assets/illustrations/cat-dark-clean.png'),
  tuxedo: require('../../../assets/illustrations/cat-tuxedo-clean.png'),
  gray: require('../../../assets/illustrations/cat-gray-clean.png'),
} satisfies Record<string, ImageSourcePropType>;

function getCatImage(cat: Cat): ImageSourcePropType {
  if (cat.imageUrl) {
    return { uri: cat.imageUrl };
  }

  if (cat.type === '턱시도') {
    return illustrations.tuxedo;
  }

  if (cat.type === '삼색이' || cat.type === '검은냥') {
    return illustrations.dark;
  }

  if (cat.type === '흰냥') {
    return illustrations.gray;
  }

  return illustrations.orange;
}

export function HomeScreen({ summary, recentCats, onOpenCat, onGoCapture }: HomeScreenProps) {
  const stats = [
    { label: '오늘 발견', value: `${summary.sharedTodayDiscovered}마리`, icon: PawPrint },
    { label: '내 도감 수집', value: `${summary.myTotalCollected}마리`, icon: Sprout },
    { label: '공유 도감 전체', value: `${summary.sharedTotalCats}마리`, icon: Sparkles },
    { label: '내 최고 재발견', value: summary.recentMyRediscovered, icon: Footprints },
  ];
  const catsToShow = recentCats.slice(0, 3);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.logoWrap}>
          <Text style={styles.logo}>냥도감</Text>
          <Text style={styles.logoPaw}>••</Text>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.locationPill}>
            <MapPin color={theme.colors.accent} size={15} />
            <Text style={styles.locationText}>동네 단위 기록</Text>
          </View>
          <Pressable style={styles.bellButton}>
            <Bell color={theme.colors.primaryDark} size={18} />
            <View style={styles.noticeDot} />
          </Pressable>
        </View>
      </View>

      <Card style={styles.summaryCard}>
        <View pointerEvents="none" style={styles.leafWashOne} />
        <View pointerEvents="none" style={styles.leafWashTwo} />
        <View style={styles.summaryTop}>
          <View style={styles.summaryCopy}>
            <Text style={styles.kicker}>오늘의 발견 요약</Text>
            <View style={styles.summaryTitleBlock}>
              <Text style={styles.summaryTitle}>내 수집과 공유 도감을</Text>
              <Text style={styles.summaryTitle}>한눈에 확인해요</Text>
            </View>
            <Text style={styles.summaryCaption}>동네에서 만난 고양이를 이름과 다시 만난 기록으로 이어가세요.</Text>
          </View>
          <View pointerEvents="none" style={styles.heroArt}>
            <View style={styles.heroHalo} />
            <Image resizeMode="contain" source={illustrations.hero} style={styles.heroCat} />
          </View>
        </View>

        <View style={styles.statGrid}>
          {stats.map(({ label, value, icon: Icon }) => (
            <View key={label} style={styles.statCard}>
              <Icon color="#B88145" size={18} />
              <Text style={styles.statLabel}>{label}</Text>
              <Text style={styles.statValue}>{value}</Text>
            </View>
          ))}
        </View>

        <Button onPress={onGoCapture}>
          <Plus color="#FFF8F0" size={18} />
          <Text style={styles.buttonLabel}>고양이 만남 기록하기</Text>
        </Button>
      </Card>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>최근 발견한 고양이</Text>
        <Text style={styles.sectionMore}>더보기 〉</Text>
      </View>

      <View style={styles.recentRow}>
        {catsToShow.length > 0 ? (
          catsToShow.map((cat) => (
            <Pressable key={cat.id} onPress={() => onOpenCat(cat.id)} style={({ pressed }) => [styles.catTile, pressed && styles.pressed]}>
              <Image resizeMode="cover" source={getCatImage(cat)} style={styles.catImage} />
              <Text numberOfLines={1} style={styles.catName}>
                {cat.name}
              </Text>
              <Text numberOfLines={1} style={styles.catMeta}>
                {cat.relationshipLevel}
              </Text>
            </Pressable>
          ))
        ) : (
          <View style={styles.emptyRecent}>
            <PawPrint color="#D4B989" size={30} />
            <Text style={styles.emptyRecentTitle}>최근 발견 기록이 없어요</Text>
            <Text style={styles.emptyRecentText}>고양이를 등록하면 최근 카드가 여기에 표시돼요.</Text>
          </View>
        )}
      </View>

      <View style={styles.noteCard}>
        <PawPrint color={theme.colors.accent} size={17} />
        <Text style={styles.noteText}>정확한 좌표 대신 동네 단위로만 기록해요.</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  logoWrap: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logo: {
    fontSize: 24,
    fontWeight: theme.typography.titleWeight,
    letterSpacing: theme.typography.letterSpacing,
    color: theme.colors.text,
  },
  logoPaw: {
    marginTop: 7,
    color: '#9B734D',
    fontSize: 18,
    fontWeight: '900',
    transform: [{ rotate: '22deg' }],
  },
  headerActions: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  locationPill: {
    maxWidth: 158,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 18,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.78)',
  },
  locationText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  bellButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeDot: {
    position: 'absolute',
    top: 8,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#D96D45',
  },
  summaryCard: {
    overflow: 'hidden',
    backgroundColor: 'rgba(255,253,246,0.94)',
  },
  leafWashOne: {
    position: 'absolute',
    top: -34,
    right: 18,
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(156, 175, 120, 0.18)',
  },
  leafWashTwo: {
    position: 'absolute',
    right: -34,
    bottom: 92,
    width: 138,
    height: 74,
    borderRadius: 50,
    backgroundColor: 'rgba(242, 198, 159, 0.2)',
    transform: [{ rotate: '-16deg' }],
  },
  summaryTop: {
    minHeight: 164,
    justifyContent: 'center',
  },
  summaryCopy: {
    flex: 1,
    paddingRight: 106,
    zIndex: 1,
  },
  kicker: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  summaryTitle: {
    fontSize: 21,
    lineHeight: 29,
    fontWeight: theme.typography.titleWeight,
    color: theme.colors.text,
  },
  summaryTitleBlock: {
    marginTop: theme.spacing.sm,
  },
  summaryCaption: {
    marginTop: theme.spacing.sm,
    maxWidth: 210,
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  heroArt: {
    position: 'absolute',
    right: -4,
    top: 2,
    width: 132,
    height: 142,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'visible',
    zIndex: 0,
  },
  heroHalo: {
    position: 'absolute',
    top: 14,
    right: 17,
    width: 96,
    height: 102,
    borderRadius: 54,
    backgroundColor: 'rgba(221, 232, 200, 0.38)',
    transform: [{ rotate: '-12deg' }],
  },
  heroCat: {
    width: 126,
    height: 126,
    opacity: 0.98,
    transform: [{ translateY: 5 }, { rotate: '-1deg' }],
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  statCard: {
    flexBasis: '47.5%',
    flexGrow: 1,
    minHeight: 82,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255,248,236,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.86)',
  },
  statLabel: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.mutedText,
  },
  statValue: {
    marginTop: 2,
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.text,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF8F0',
  },
  sectionHeader: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  sectionMore: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.mutedText,
  },
  recentRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  emptyRecent: {
    minHeight: 150,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(255,253,246,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.88)',
  },
  emptyRecentTitle: {
    marginTop: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  emptyRecentText: {
    marginTop: 4,
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  catTile: {
    flex: 1,
    minWidth: 0,
    borderRadius: theme.radius.md,
    padding: 6,
    backgroundColor: 'rgba(255,253,246,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.86)',
    ...createShadow(5),
  },
  pressed: {
    opacity: 0.86,
  },
  catImage: {
    width: '100%',
    aspectRatio: 0.86,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceAlt,
  },
  catName: {
    marginTop: theme.spacing.sm,
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.text,
  },
  catMeta: {
    marginTop: 4,
    fontSize: 11,
    color: theme.colors.mutedText,
  },
  noteCard: {
    marginTop: theme.spacing.lg,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(221, 232, 200, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(97, 122, 67, 0.16)',
  },
  noteText: {
    flex: 1,
    color: theme.colors.inkSoft,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
});
