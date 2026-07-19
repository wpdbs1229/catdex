import { BookOpen, ChevronLeft } from 'lucide-react-native';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { theme } from '@/shared/styles/theme';
import type { Cat, CatType } from '@/shared/types/cat';
import { getCatIllustrationKey, type CatIllustrationKey } from '@/shared/utils/catPresentation';

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
} satisfies Record<CatIllustrationKey, ImageSourcePropType>;

function imageForType(type: CatType, imageUrl?: string): ImageSourcePropType {
  if (imageUrl) {
    return { uri: imageUrl };
  }

  return illustrations[getCatIllustrationKey(type)];
}

// lastSeenAt은 "YYYY.MM.DD" 형식이라 new Date()로는 엔진에 따라 파싱이 실패한다.
// 부분별로 직접 파싱해 일관되게 처리한다.
function parseDotDate(value: string) {
  const match = /^(\d{4})[.\-](\d{1,2})[.\-](\d{1,2})$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: string) {
  const date = parseDotDate(value) ?? new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable accessibilityLabel="뒤로 가기" onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
        <ChevronLeft color={theme.colors.primaryDark} size={22} />
      </Pressable>
      <View style={styles.headerCopy}>
        <Text style={styles.title}>근무 기록</Text>
        <Text style={styles.subtitle}>최근 만남과 재발견 횟수를 확인해요.</Text>
      </View>
      <View style={styles.headerIcon}>
        <BookOpen color={theme.colors.primaryDark} size={20} />
      </View>
    </View>
  );
}

export function ExplorationHistoryScreen({ cats, onBack, onOpenCat }: ExplorationHistoryScreenProps) {
  const sortedCats = [...cats].sort(
    (a, b) => (parseDotDate(b.lastSeenAt)?.getTime() ?? 0) - (parseDotDate(a.lastSeenAt)?.getTime() ?? 0),
  );

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Header onBack={onBack} />
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
        <EmptyState text="촬영하거나 미확인 제보를 남기면 근무 기록이 쌓여요." title="아직 근무 기록이 없어요" />
      )}
    </ScrollView>
  );
}

function EmptyState({ text, title }: { text: string; title: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: 132,
  },
  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,253,246,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.86)',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 4,
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
  },
  headerIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: theme.colors.accentSoft,
  },
  list: {
    gap: theme.spacing.md,
  },
  historyItem: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.82)',
  },
  catThumb: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceAlt,
  },
  itemCopy: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  itemMeta: {
    marginTop: 5,
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
  },
  countPill: {
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    backgroundColor: theme.colors.accentSoft,
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  emptyState: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    backgroundColor: 'rgba(255,253,246,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.82)',
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyText: {
    color: theme.colors.mutedText,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.76,
  },
});
