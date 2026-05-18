import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { CatType } from '@/shared/types/cat';
import { Card } from '@/shared/components/Card';
import { Chip } from '@/shared/components/Chip';
import { getCatVisual, getRarityStars } from '@/shared/utils/catPresentation';
import { theme } from '@/shared/styles/theme';

export interface CatCardItem {
  id: string;
  catId?: string;
  number: number;
  name: string;
  type: CatType;
  rarity: 1 | 2 | 3 | 4 | 5;
  encounterCount: number;
  discovered: boolean;
  imageUrl?: string;
  regionName?: string;
  sightedAt?: string;
  reportCount?: number;
  behaviorHint?: string;
}

interface CatCardProps {
  item: CatCardItem;
  onPress: () => void;
}

export function CatCard({ item, onPress }: CatCardProps) {
  const visual = getCatVisual(item.type);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}>
      <Card style={[styles.card, !item.discovered && styles.lockedCard]}>
        <View style={styles.row}>
          <Text style={styles.number}>No.{String(item.number).padStart(3, '0')}</Text>
          <Text style={styles.stars}>{getRarityStars(item.rarity).map((isOn) => (isOn ? '★' : '☆')).join('')}</Text>
        </View>
        <View style={[styles.art, { backgroundColor: item.discovered ? visual.colors[0] : '#D8CEC1' }]}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.artImage} />
          ) : (
            <Text style={styles.artEmoji}>{item.discovered ? visual.emoji : '🐾'}</Text>
          )}
        </View>
        <Text style={styles.name}>{item.name}</Text>
        {item.discovered ? (
          <View style={styles.footer}>
            <Chip>{item.type}</Chip>
            <Text style={styles.encounter}>발견 {item.encounterCount}회</Text>
          </View>
        ) : (
          <View style={styles.footer}>
            <Chip>{item.type} 계열</Chip>
            <Text style={styles.encounter}>{item.sightedAt} 목격</Text>
            <Text style={styles.sightingMeta}>{item.behaviorHint ? item.behaviorHint : '위치를 확인해 주변에서 찾아보세요.'}</Text>
            <Text style={styles.locationCta}>위치 보기</Text>
          </View>
        )}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: '48.5%',
    marginBottom: theme.spacing.md,
  },
  pressed: {
    opacity: 0.88,
  },
  card: {
    padding: theme.spacing.md,
  },
  lockedCard: {
    backgroundColor: '#E7DED1',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  number: {
    fontSize: 11,
    color: theme.colors.mutedText,
    letterSpacing: 1.1,
  },
  stars: {
    fontSize: 12,
    color: theme.colors.primary,
  },
  art: {
    height: 112,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
    overflow: 'hidden',
  },
  artImage: {
    width: '100%',
    height: '100%',
  },
  artEmoji: {
    fontSize: 48,
  },
  name: {
    marginTop: theme.spacing.md,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  footer: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  encounter: {
    fontSize: 13,
    color: theme.colors.mutedText,
  },
  sightingMeta: {
    fontSize: 12,
    lineHeight: 17,
    color: '#8A6C58',
  },
  locationCta: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6F5444',
  },
});
