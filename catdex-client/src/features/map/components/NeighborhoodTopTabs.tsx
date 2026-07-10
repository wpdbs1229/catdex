import type { LucideIcon } from 'lucide-react-native';
import { BookOpen, Map, MessageCircle } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/shared/styles/theme';

export type NeighborhoodSectionTab = 'dex' | 'map' | 'board';

interface NeighborhoodTopTabsProps {
  activeTab: NeighborhoodSectionTab;
  onOpenBoard: () => void;
  onOpenDex: () => void;
  onOpenMap: () => void;
}

interface NeighborhoodTabRoute {
  id: NeighborhoodSectionTab;
  label: string;
  icon: LucideIcon;
}

const routes: NeighborhoodTabRoute[] = [
  { id: 'dex', label: '도감', icon: BookOpen },
  { id: 'map', label: '지도', icon: Map },
  { id: 'board', label: '게시판', icon: MessageCircle },
];

export function NeighborhoodTopTabs({ activeTab, onOpenBoard, onOpenDex, onOpenMap }: NeighborhoodTopTabsProps) {
  const handlers: Record<NeighborhoodSectionTab, () => void> = {
    dex: onOpenDex,
    map: onOpenMap,
    board: onOpenBoard,
  };

  return (
    <View accessibilityRole="tablist" style={styles.segmentWrap}>
      {routes.map(({ id, label, icon: Icon }) => {
        const isActive = activeTab === id;

        return (
          <Pressable
            accessibilityLabel={`동네 ${label} 보기`}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            key={id}
            onPress={handlers[id]}
            style={({ pressed }) => [styles.segmentButton, isActive && styles.segmentButtonActive, pressed && !isActive && styles.pressed]}
          >
            <Icon color={isActive ? '#FFF8F0' : theme.colors.primaryDark} size={15} />
            <Text numberOfLines={1} style={[styles.segmentText, isActive && styles.segmentTextActive]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  segmentWrap: {
    minHeight: 44,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    borderRadius: 22,
    padding: 4,
    backgroundColor: 'rgba(255,253,246,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
  },
  segmentButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 18,
    paddingHorizontal: theme.spacing.xs,
  },
  segmentButtonActive: {
    backgroundColor: theme.colors.primaryDark,
  },
  segmentText: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  segmentTextActive: {
    color: '#FFF8F0',
  },
  pressed: {
    opacity: 0.82,
  },
});
