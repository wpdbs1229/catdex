import type { LucideIcon } from 'lucide-react-native';
import { BookOpen, Camera, House, Map, MessageCircle, UserRound } from 'lucide-react-native';
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
  { id: 'community', label: '커뮤니티', icon: MessageCircle },
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
              pressed ? styles.tabPressed : null,
            ]}
          >
            <View style={[styles.tabSurface, primary ? styles.primaryTab : styles.defaultTab, isActive ? (primary ? styles.primaryTabActive : styles.defaultTabActive) : null]}>
              <View style={[styles.iconWrap, primary ? styles.primaryIconWrap : null]}>
                <Icon color={isActive ? (primary ? '#FFF8F0' : theme.colors.text) : theme.colors.tabMuted} size={primary ? 20 : 18} />
              </View>
              <Text style={[styles.tabLabel, isActive ? styles.tabLabelActive : null, primary && isActive ? styles.tabLabelPrimary : null]}>
                {label}
              </Text>
            </View>
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
    paddingHorizontal: 6,
    paddingTop: 6,
    backgroundColor: 'rgba(255, 253, 246, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(139, 112, 83, 0.18)',
    ...createShadow(10),
  },
  tabButton: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  tabSurface: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultTab: {
    width: '66%',
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: 'transparent',
  },
  primaryTab: {
    width: '82%',
    minHeight: 72,
    borderRadius: theme.radius.lg,
    backgroundColor: '#F2DFC4',
  },
  defaultTabActive: {
    backgroundColor: theme.colors.accentSoft,
  },
  primaryTabActive: {
    backgroundColor: theme.colors.primaryDark,
  },
  tabPressed: {
    opacity: 0.84,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  tabLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.tabMuted,
  },
  tabLabelActive: {
    color: theme.colors.text,
  },
  tabLabelPrimary: {
    color: '#FFF8F0',
  },
});
