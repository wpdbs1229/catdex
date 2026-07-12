import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/shared/components/Card';
import { Chip } from '@/shared/components/Chip';
import type { Region } from '@/shared/types/region';
import { theme } from '@/shared/styles/theme';

interface RegionCatListProps {
  regions: Region[];
  selectedRegionId: string | null;
  onSelectRegion: (region: Region) => void;
}

export function RegionCatList({ regions, selectedRegionId, onSelectRegion }: RegionCatListProps) {
  return (
    <View>
      {regions.map((region) => {
        const catCount = region.catIds.length > 0 ? region.catIds.length : region.cats.length;

        return (
          <Pressable key={region.id} onPress={() => onSelectRegion(region)} style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}>
            <Card style={selectedRegionId === region.id ? styles.selectedCard : undefined}>
              <View style={styles.header}>
                <Text style={styles.name}>{region.name}</Text>
                <Text style={styles.count}>{catCount}마리</Text>
              </View>
              <View style={styles.chips}>
                {region.cats.map((cat) => (
                  <Chip key={`${region.id}-${cat}`}>{cat}</Chip>
                ))}
              </View>
            </Card>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pressable: {
    marginBottom: theme.spacing.md,
  },
  pressed: {
    opacity: 0.9,
  },
  selectedCard: {
    backgroundColor: '#F8ECD9',
    borderColor: '#E7D2BA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  count: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.mutedText,
  },
  chips: {
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
});
