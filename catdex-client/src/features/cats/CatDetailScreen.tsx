import { ArrowLeft } from 'lucide-react-native';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CatAffinityGauge } from '@/features/cats/components/CatAffinityGauge';
import { EncounterTimeline } from '@/features/cats/components/EncounterTimeline';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { Chip } from '@/shared/components/Chip';
import type { Cat, CatEncounter } from '@/shared/types/cat';
import { formatDisplayDate, getAffinityFromRelationship, getCatVisual, getRarityStars } from '@/shared/utils/catPresentation';
import { theme } from '@/shared/styles/theme';

interface CatDetailScreenProps {
  cat: Cat;
  encounters: CatEncounter[];
  onBack: () => void;
  onRecordEncounter: () => void;
}

export function CatDetailScreen({ cat, encounters, onBack, onRecordEncounter }: CatDetailScreenProps) {
  const visual = getCatVisual(cat.type);

  return (
    <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <ArrowLeft color={theme.colors.text} size={20} />
        </Pressable>
        <Text style={styles.number}>No.{String(cat.number).padStart(3, '0')}</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <Card style={styles.heroCard}>
        <View style={[styles.heroArt, { backgroundColor: visual.colors[0] }]}>
          {cat.imageUrl ? <Image source={{ uri: cat.imageUrl }} style={styles.heroImage} /> : <Text style={styles.heroEmoji}>{visual.emoji}</Text>}
        </View>
        <View style={styles.heroHeader}>
          <View style={styles.heroTitleWrap}>
            <Text style={styles.heroTitle}>{cat.name}</Text>
            <Chip>{cat.type}</Chip>
          </View>
          <Text style={styles.stars}>{getRarityStars(cat.rarity).map((isOn) => (isOn ? '★' : '☆')).join('')}</Text>
        </View>
        <Text style={styles.relationship}>{cat.relationshipLevel}</Text>
      </Card>

      <View style={styles.infoGrid}>
        <Card style={styles.infoCard}>
          <Text style={styles.infoLabel}>발견 횟수</Text>
          <Text style={styles.infoValue}>{cat.encounterCount}회</Text>
        </Card>
        <Card style={styles.infoCard}>
          <Text style={styles.infoLabel}>관계 레벨</Text>
          <Text style={styles.infoValueSmall}>{cat.relationshipLevel}</Text>
        </Card>
      </View>

      <Card style={styles.dateCard}>
        <View style={styles.dateRow}>
          <View style={styles.dateBlock}>
            <Text style={styles.infoLabel}>처음 만난 날</Text>
            <Text style={styles.dateValue}>{formatDisplayDate(cat.firstSeenAt)}</Text>
          </View>
          <View style={styles.dateBlock}>
            <Text style={styles.infoLabel}>최근 만난 날</Text>
            <Text style={styles.dateValue}>{formatDisplayDate(cat.lastSeenAt)}</Text>
          </View>
        </View>
      </Card>

      <CatAffinityGauge value={getAffinityFromRelationship(cat)} />

      <Card style={styles.tagCard}>
        <Text style={styles.infoLabel}>태그</Text>
        <View style={styles.tagWrap}>
          {cat.tags.map((tag) => (
            <Chip key={tag}>{tag}</Chip>
          ))}
        </View>
        {cat.memo ? <Text style={styles.memo}>{cat.memo}</Text> : null}
      </Card>

      <EncounterTimeline encounters={encounters} />

      <View style={styles.buttonWrap}>
        <Button onPress={onRecordEncounter}>다시 만남 기록하기</Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: 140,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  backButtonPlaceholder: {
    width: 44,
  },
  number: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.mutedText,
  },
  heroCard: {
    marginTop: theme.spacing.lg,
  },
  heroArt: {
    height: 260,
    borderRadius: theme.radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroEmoji: {
    fontSize: 84,
  },
  heroHeader: {
    marginTop: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  heroTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    flex: 1,
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: theme.colors.text,
  },
  stars: {
    fontSize: 14,
    color: theme.colors.primary,
  },
  relationship: {
    marginTop: theme.spacing.sm,
    fontSize: 14,
    color: theme.colors.mutedText,
  },
  infoGrid: {
    marginTop: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoCard: {
    width: '48.5%',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B6956',
  },
  infoValue: {
    marginTop: theme.spacing.md,
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
  },
  infoValueSmall: {
    marginTop: theme.spacing.md,
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  dateCard: {
    marginTop: theme.spacing.lg,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateBlock: {
    width: '48%',
  },
  dateValue: {
    marginTop: theme.spacing.sm,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  tagCard: {
    marginTop: theme.spacing.lg,
  },
  tagWrap: {
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  memo: {
    marginTop: theme.spacing.md,
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.mutedText,
  },
  buttonWrap: {
    marginTop: theme.spacing.xl,
  },
});
