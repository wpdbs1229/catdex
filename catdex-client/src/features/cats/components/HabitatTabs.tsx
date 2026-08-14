import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HabitatIcon } from '@/shared/cats/HabitatIcon';
import { CAT_HABITAT_LABELS, CAT_HABITATS, type CatHabitat } from '@/shared/cats/habitat';
import { nd, theme } from '@/shared/styles/theme';

interface HabitatTabsProps {
  value: CatHabitat;
  onChange: (habitat: CatHabitat) => void;
}

/**
 * 바인더 위에 얹힌 인덱스 탭.
 *
 * 고른 탭만 색이 차고 아래쪽 라운드를 지워, 탭이 바인더에 붙어 이어지는 것처럼
 * 보이게 한다.
 */
export function HabitatTabs({ value, onChange }: HabitatTabsProps) {
  return (
    <View style={styles.row}>
      {CAT_HABITATS.map((habitat) => {
        const isActive = habitat === value;

        return (
          <Pressable
            accessibilityLabel={CAT_HABITAT_LABELS[habitat]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            key={habitat}
            onPress={() => onChange(habitat)}
            style={[styles.tab, isActive && styles.tabActive]}
          >
            <HabitatIcon
              color={isActive ? '#FFFFFF' : nd.colors.sub}
              habitat={habitat}
              size={17}
              strokeWidth={2}
            />
            <Text numberOfLines={1} style={[styles.label, isActive && styles.labelActive]}>
              {CAT_HABITAT_LABELS[habitat]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    paddingHorizontal: 14,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 42,
    paddingHorizontal: 6,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: '#F6EFE4',
  },
  tabActive: {
    // 고른 탭은 조금 더 솟아 앞으로 나온 것처럼 보인다.
    height: 48,
    backgroundColor: theme.colors.primary,
  },
  label: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: nd.colors.sub,
  },
  labelActive: {
    color: '#FFFFFF',
  },
});
