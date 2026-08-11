import type { LucideIcon } from 'lucide-react-native';
import { House } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { createNdShadow, nd } from '@/shared/styles/theme';

export interface SectionTabItem<Id extends string> {
  id: Id;
  label: string;
  icon: LucideIcon;
  onPress: () => void;
}

interface SectionTabBarProps<Id extends string> {
  items: Array<SectionTabItem<Id>>;
  active: Id;
  onHome: () => void;
}

/**
 * 섹션 전용 하단바. 왼쪽 홈 버튼과 오른쪽 알약이 한 줄에 놓인다.
 * 동네(지도·동네 도감·커뮤니티)와 고객(명부·지도·상담)이 같은 모양을 쓴다.
 */
export function SectionTabBar<Id extends string>({ items, active, onHome }: SectionTabBarProps<Id>) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityLabel="홈으로"
        accessibilityRole="button"
        onPress={onHome}
        style={({ pressed }) => [styles.homeButton, pressed && styles.pressed]}
      >
        <House color={nd.colors.ink} size={24} strokeWidth={1.8} />
      </Pressable>
      <View style={styles.pill}>
        {items.map(({ id, label, icon: Icon, onPress }) => {
          const isActive = active === id;

          return (
            <Pressable
              accessibilityLabel={`${label} 탭`}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              key={id}
              onPress={onPress}
              style={({ pressed }) => [
                styles.tabButton,
                isActive && styles.tabButtonActive,
                pressed && styles.pressed,
              ]}
            >
              <Icon
                color={isActive ? nd.colors.primary : nd.colors.ink}
                size={24}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              <Text numberOfLines={1} style={styles.tabLabel}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  homeButton: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    backgroundColor: nd.colors.barBg,
    ...createNdShadow(0.12, 12),
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: nd.radius.pill,
    backgroundColor: nd.colors.barBg,
    paddingHorizontal: 4,
    paddingVertical: 4,
    ...createNdShadow(0.12, 12),
  },
  tabButton: {
    width: 76,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: nd.radius.pill,
  },
  tabButtonActive: {
    backgroundColor: nd.colors.scrim,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: -0.25,
    color: nd.colors.ink,
  },
  pressed: {
    opacity: 0.84,
  },
});
