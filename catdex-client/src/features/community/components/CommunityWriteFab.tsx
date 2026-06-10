import { Edit3 } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createShadow, theme } from '@/shared/styles/theme';

interface CommunityWriteFabProps {
  onPress: () => void;
}

export function CommunityWriteFab({ onPress }: CommunityWriteFabProps) {
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      accessibilityLabel="커뮤니티 글쓰기"
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        {
          bottom: Math.max(insets.bottom, theme.spacing.md) + 100,
        },
        pressed && styles.pressed,
      ]}
    >
      <Edit3 color="#FFF8F0" size={24} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: theme.spacing.lg,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryDark,
    borderWidth: 1,
    borderColor: '#765640',
    zIndex: 4,
    ...createShadow(12),
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
});
