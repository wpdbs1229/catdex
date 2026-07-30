import type { LucideIcon } from 'lucide-react-native';
import { Compass, Globe, House, MessageCircle } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { createNdShadow, nd } from '@/shared/styles/theme';

export type NeighborhoodTab = 'map' | 'dex' | 'board';

interface NeighborhoodTabBarProps {
  active: NeighborhoodTab;
  onHome: () => void;
  onOpenMap: () => void;
  onOpenDex: () => void;
  onOpenBoard: () => void;
}

const tabRoutes: Array<{ id: NeighborhoodTab; label: string; icon: LucideIcon }> = [
  { id: 'map', label: '지도', icon: Compass },
  { id: 'dex', label: '동네 도감', icon: Globe },
  { id: 'board', label: '커뮤니티', icon: MessageCircle },
];

export function NeighborhoodTabBar({ active, onHome, onOpenMap, onOpenDex, onOpenBoard }: NeighborhoodTabBarProps) {
  const handlers: Record<NeighborhoodTab, () => void> = {
    map: onOpenMap,
    dex: onOpenDex,
    board: onOpenBoard,
  };

  return (
    <View style={styles.row}>
      <Pressable accessibilityLabel="홈으로" accessibilityRole="button" onPress={onHome} style={({ pressed }) => [styles.homeButton, pressed && styles.pressed]}>
        <House color={nd.colors.ink} size={24} strokeWidth={1.8} />
      </Pressable>
      <View style={styles.pill}>
        {tabRoutes.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;

          return (
            <Pressable
              accessibilityLabel={`${label} 탭`}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              key={id}
              onPress={handlers[id]}
              style={({ pressed }) => [styles.tabButton, isActive && styles.tabButtonActive, pressed && styles.pressed]}
            >
              <Icon color={isActive ? nd.colors.primary : nd.colors.ink} size={24} strokeWidth={isActive ? 2.2 : 1.8} />
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
