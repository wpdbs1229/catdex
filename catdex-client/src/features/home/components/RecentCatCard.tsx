import { Eye } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/shared/components/Card';
import { Chip } from '@/shared/components/Chip';
import type { Cat } from '@/shared/types/cat';
import { getCatVisual, getRarityStars } from '@/shared/utils/catPresentation';
import { theme } from '@/shared/styles/theme';

interface RecentCatCardProps {
  cat: Cat;
  onPress: () => void;
}

export function RecentCatCard({ cat, onPress }: RecentCatCardProps) {
  const visual = getCatVisual(cat.type);

  return (
    <Pressable accessibilityLabel={`${cat.name} 도감 보기`} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}>
      <Card style={styles.card}>
        <View style={[styles.art, { backgroundColor: visual.colors[0] }]}>
          {cat.imageUrl ? <Image source={{ uri: cat.imageUrl }} style={styles.artImage} /> : <Text style={styles.artEmoji}>{visual.emoji}</Text>}
        </View>
        <View style={styles.body}>
          <View style={styles.row}>
            <View>
              <Text style={styles.number}>No.{String(cat.number).padStart(3, '0')}</Text>
              <Text style={styles.name}>{cat.name}</Text>
            </View>
            <Text style={styles.stars}>{getRarityStars(cat.rarity).map((isOn) => (isOn ? '★' : '☆')).join('')}</Text>
          </View>
          <View style={styles.metaRow}>
            <Chip>{cat.type}</Chip>
            <View style={styles.encounterRow}>
              <Eye color={theme.colors.mutedText} size={14} />
              <Text style={styles.encounterText}>공유 발견 {cat.encounterCount}회</Text>
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    marginBottom: theme.spacing.md,
  },
  pressed: {
    opacity: 0.9,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  art: {
    width: 84,
    height: 84,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(91, 62, 48, 0.12)',
  },
  artImage: {
    width: '100%',
    height: '100%',
  },
  artEmoji: {
    fontSize: 40,
  },
  body: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  number: {
    fontSize: 11,
    letterSpacing: 1.4,
    color: theme.colors.mutedText,
  },
  name: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  stars: {
    fontSize: 12,
    color: theme.colors.warning,
  },
  metaRow: {
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  encounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  encounterText: {
    fontSize: 13,
    color: theme.colors.mutedText,
  },
});
