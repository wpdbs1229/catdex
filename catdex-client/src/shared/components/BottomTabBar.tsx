import type { LucideIcon } from 'lucide-react-native';
import { BookOpen, Camera, House, IdCard, Map } from 'lucide-react-native';
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
  { id: 'map', label: '동네', icon: Map },
  { id: 'my', label: '사원증', icon: IdCard },
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
            accessibilityLabel={`${label} 탭`}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
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
              <Icon color={isActive ? (primary ? '#FFF8F0' : theme.colors.text) : theme.colors.tabMuted} size={primary ? 20 : 18} strokeWidth={2.15} />
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
    borderRadius: 30,
    paddingHorizontal: 6,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 253, 246, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(139, 112, 83, 0.13)',
    ...createShadow(7),
  },
  tabButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    borderRadius: 24,
  },
  defaultTab: {
    backgroundColor: 'transparent',
  },
  primaryTab: {
    backgroundColor: 'rgba(242, 198, 159, 0.42)',
  },
  defaultTabActive: {
    backgroundColor: 'rgba(221, 232, 200, 0.78)',
  },
  primaryTabActive: {
    backgroundColor: theme.colors.primaryDark,
  },
  tabPressed: {
    opacity: 0.84,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  tabLabel: {
    marginTop: 1,
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.tabMuted,
  },
  tabLabelActive: {
    color: theme.colors.text,
  },
  tabLabelPrimary: {
    color: '#FFF8F0',
  },
});
