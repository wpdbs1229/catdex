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
  clue?: string;
  regionHint?: string;
  timeHint?: string;
  unlockHint?: string;
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
        <View style={[styles.art, { backgroundColor: item.discovered ? visual.colors[0] : '#D8CEC1' }, !item.discovered && styles.lockedArt]}>
          {item.imageUrl && item.discovered ? (
            <Image source={{ uri: item.imageUrl }} style={styles.artImage} />
          ) : (
            <>
              {!item.discovered ? (
                <View style={styles.lockedBadge}>
                  <Text style={styles.lockedBadgeText}>단서 포착</Text>
                </View>
              ) : null}
              <Text style={[styles.artEmoji, !item.discovered && styles.lockedEmoji]}>{item.discovered ? visual.emoji : '?'}</Text>
            </>
          )}
        </View>
        <Text style={styles.name}>{item.name}</Text>
        {item.discovered ? (
          <View style={styles.footer}>
            <Chip>{item.type}</Chip>
            <Text style={styles.encounter}>발견 {item.encounterCount}회</Text>
          </View>
        ) : (
          <View style={styles.lockedContent}>
            <Text style={styles.clue}>{item.clue}</Text>
            <View style={styles.hintList}>
              <Text style={styles.hintText}>지역 단서: {item.regionHint}</Text>
              <Text style={styles.hintText}>시간 단서: {item.timeHint}</Text>
            </View>
            <View style={styles.footer}>
              <Chip>{item.type} 계열</Chip>
              <Text style={styles.unlockHint}>{item.unlockHint}</Text>
            </View>
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
    backgroundColor: '#EFE7DA',
    borderColor: '#D8C7B4',
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
  lockedArt: {
    borderWidth: 1,
    borderColor: '#CDBBA6',
  },
  artImage: {
    width: '100%',
    height: '100%',
  },
  artEmoji: {
    fontSize: 48,
  },
  lockedEmoji: {
    fontSize: 54,
    fontWeight: '800',
    color: '#7D6B5E',
  },
  lockedBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(255, 247, 239, 0.92)',
    borderWidth: 1,
    borderColor: '#DECAB5',
  },
  lockedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#755842',
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
  lockedContent: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  clue: {
    fontSize: 13,
    lineHeight: 19,
    color: '#6F5444',
  },
  hintList: {
    gap: 4,
  },
  hintText: {
    fontSize: 12,
    lineHeight: 17,
    color: '#8A6C58',
  },
  unlockHint: {
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.mutedText,
  },
});
