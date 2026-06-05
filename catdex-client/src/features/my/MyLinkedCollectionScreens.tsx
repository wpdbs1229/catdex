import { BookOpen, ChevronLeft } from 'lucide-react-native';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { theme } from '@/shared/styles/theme';
import type { Cat, CatType } from '@/shared/types/cat';

interface ExplorationHistoryScreenProps {
  cats: Cat[];
  onBack: () => void;
  onOpenCat: (catId: string) => void;
}

const illustrations = {
  orange: require('../../../assets/illustrations/cat-orange-clean.png'),
  dark: require('../../../assets/illustrations/cat-dark-clean.png'),
  tuxedo: require('../../../assets/illustrations/cat-tuxedo-clean.png'),
  gray: require('../../../assets/illustrations/cat-gray-clean.png'),
} satisfies Record<string, ImageSourcePropType>;

function imageForType(type: CatType, imageUrl?: string): ImageSourcePropType {
  if (imageUrl) {
    return { uri: imageUrl };
  }

  if (type === '턱시도') {
    return illustrations.tuxedo;
  }

  if (type === '흰냥') {
    return illustrations.gray;
  }

  if (type === '삼색이' || type === '검은냥') {
    return illustrations.dark;
  }

  return illustrations.orange;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function ExplorationHistoryScreen({ cats, onBack, onOpenCat }: ExplorationHistoryScreenProps) {
  const sortedCats = [...cats].sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime());

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="뒤로 가기" onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <ChevronLeft color={theme.colors.primaryDark} size={22} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>탐험 기록</Text>
          <Text style={styles.subtitle}>최근 만남과 재발견 횟수를 확인해요.</Text>
        </View>
        <View style={styles.headerIcon}>
          <BookOpen color={theme.colors.primaryDark} size={20} />
        </View>
      </View>

      {sortedCats.length > 0 ? (
        <View style={styles.list}>
          {sortedCats.map((cat) => (
            <Pressable key={cat.id} onPress={() => onOpenCat(cat.id)} style={({ pressed }) => [styles.historyItem, pressed && styles.pressed]}>
              <Image resizeMode="cover" source={imageForType(cat.type, cat.imageUrl)} style={styles.catThumb} />
              <View style={styles.itemCopy}>
                <Text numberOfLines={1} style={styles.itemTitle}>
                  {cat.name}
                </Text>
                <Text numberOfLines={1} style={styles.itemMeta}>
                  마지막 만남 {formatDate(cat.lastSeenAt)} · {cat.relationshipLevel}
                </Text>
              </View>
              <Text style={styles.countPill}>{cat.encounterCount}회</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>아직 탐험 기록이 없어요</Text>
          <Text style={styles.emptyText}>촬영하거나 미확인 제보를 남기면 탐험 기록이 쌓여요.</Text>
        </View>
      )}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,253,246,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.82)',
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: theme.colors.text,
    fontSize: 25,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 4,
    color: theme.colors.mutedText,
    fontSize: 13,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accentSoft,
  },
  list: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  historyItem: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.88)',
  },
  catThumb: {
    width: 50,
    height: 50,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
  },
  itemCopy: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  itemMeta: {
    marginTop: 4,
    color: theme.colors.mutedText,
    fontSize: 12,
  },
  countPill: {
    flexShrink: 0,
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
    backgroundColor: theme.colors.badge,
  },
  emptyState: {
    marginTop: theme.spacing.lg,
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(255,253,246,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.88)',
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  emptyText: {
    marginTop: 6,
    color: theme.colors.mutedText,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.82,
  },
});
