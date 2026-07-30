import type { LucideIcon } from 'lucide-react-native';
import { BookOpen, Camera, Compass, House, User } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TabScreen } from '@/shared/types/navigation';
import { createNdShadow, nd } from '@/shared/styles/theme';

interface TabRoute {
  id: TabScreen;
  label: string;
  icon: LucideIcon;
}

const tabRoutes: TabRoute[] = [
  { id: 'home', label: '홈', icon: House },
  { id: 'dex', label: '내 도감', icon: BookOpen },
  { id: 'capture', label: '촬영', icon: Camera },
  { id: 'map', label: '동네', icon: Compass },
  { id: 'my', label: '마이페이지', icon: User },
];

interface BottomTabBarProps {
  activeTab: TabScreen;
  onChange: (tab: TabScreen) => void;
}

export function BottomTabBar({ activeTab, onChange }: BottomTabBarProps) {
  return (
    <View style={styles.container}>
      {tabRoutes.map(({ id, label, icon: Icon }) => {
        const isActive = activeTab === id;

        return (
          <Pressable
            accessibilityLabel={`${label} 탭`}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            key={id}
            onPress={() => onChange(id)}
            style={({ pressed }) => [
              styles.tabButton,
              isActive ? styles.tabButtonActive : null,
              pressed ? styles.tabPressed : null,
            ]}
          >
            <Icon color={isActive ? nd.colors.primary : nd.colors.ink} size={24} strokeWidth={isActive ? 2.4 : 1.8} />
            <Text numberOfLines={1} style={styles.tabLabel}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: nd.radius.pill,
    backgroundColor: nd.colors.barBg,
    borderWidth: 1,
    borderColor: 'rgba(17, 17, 17, 0.04)',
    ...createNdShadow(0.12, 12),
  },
  tabButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: nd.radius.pill,
    paddingHorizontal: 4,
  },
  tabButtonActive: {
    backgroundColor: nd.colors.scrim,
  },
  tabPressed: {
    opacity: 0.84,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: -0.25,
    color: nd.colors.ink,
  },
});
