import type { LucideIcon } from 'lucide-react-native';
import { BookOpen, Camera, House, Map, UserRound } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TabScreen } from '@/shared/types/navigation';
import { createShadow, theme } from '@/shared/styles/theme';

interface TabRoute {
  id: TabScreen;
  label: string;
  icon: LucideIcon;
  primary?: boolean;
}

const tabRoutes: TabRoute[] = [
  { id: 'home', label: '홈', icon: House },
  { id: 'dex', label: '도감', icon: BookOpen },
  { id: 'capture', label: '촬영', icon: Camera, primary: true },
  { id: 'map', label: '지도', icon: Map },
  { id: 'my', label: 'MY', icon: UserRound },
];

interface BottomTabBarProps {
  activeTab: TabScreen;
  onChange: (tab: TabScreen) => void;
}

export function BottomTabBar({ activeTab, onChange }: BottomTabBarProps) {
  return (
    <View style={styles.container}>
      {tabRoutes.map(({ id, label, icon: Icon, primary }) => {
        const isActive = activeTab === id;

        return (
          <Pressable
            key={id}
            onPress={() => onChange(id)}
            style={({ pressed }) => [
              styles.tabButton,
              primary ? styles.primaryTab : styles.defaultTab,
              isActive ? (primary ? styles.primaryTabActive : styles.defaultTabActive) : null,
              pressed ? styles.tabPressed : null,
            ]}
          >
            <View style={[styles.iconWrap, primary ? styles.primaryIconWrap : null]}>
              <Icon color={isActive ? (primary ? '#FFF8F0' : theme.colors.text) : theme.colors.tabMuted} size={primary ? 20 : 18} />
            </View>
            <Text style={[styles.tabLabel, isActive ? styles.tabLabelActive : null, primary && isActive ? styles.tabLabelPrimary : null]}>
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
    justifyContent: 'space-between',
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    backgroundColor: 'rgba(255, 249, 241, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    ...createShadow(14),
  },
  tabButton: {
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.lg,
  },
  defaultTab: {
    backgroundColor: 'transparent',
  },
  primaryTab: {
    backgroundColor: '#F4E4D1',
  },
  defaultTabActive: {
    backgroundColor: '#F4E3CF',
  },
  primaryTabActive: {
    backgroundColor: '#4A3428',
  },
  tabPressed: {
    opacity: 0.84,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  tabLabel: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.tabMuted,
  },
  tabLabelActive: {
    color: theme.colors.text,
  },
  tabLabelPrimary: {
    color: '#FFF8F0',
  },
});
