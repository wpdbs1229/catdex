import { StyleSheet, View } from 'react-native';
import { CatCard, type CatCardItem } from '@/features/cats/components/CatCard';
import { theme } from '@/shared/styles/theme';

interface CatGridProps {
  items: CatCardItem[];
  onOpenCat: (catId: string) => void;
  onOpenSightingLocation: (item: CatCardItem) => void;
}

export function CatGrid({ items, onOpenCat, onOpenSightingLocation }: CatGridProps) {
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <CatCard
          item={item}
          key={item.id}
          onPress={() => {
            if (item.catId) {
              onOpenCat(item.catId);
              return;
            }

            onOpenSightingLocation(item);
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
  },
});
