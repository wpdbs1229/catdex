import { MessageCircle, RefreshCw } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/shared/styles/theme';

interface CommunityErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function CommunityEmptyState() {
  return (
    <View style={styles.stateBox}>
      <MessageCircle color="#D4B989" size={38} />
      <Text style={styles.stateTitle}>아직 올라온 고양이 이야기가 없어요.</Text>
      <Text style={styles.stateText}>첫 번째 이야기를 공유해보세요.</Text>
    </View>
  );
}

export function CommunityErrorState({ message, onRetry }: CommunityErrorStateProps) {
  return (
    <View style={styles.stateBox}>
      <RefreshCw color="#A84E3D" size={34} />
      <Text style={styles.stateTitle}>{message || '커뮤니티 글을 불러오지 못했어요.'}</Text>
      <Text style={styles.stateText}>잠시 후 다시 시도해주세요.</Text>
      <Pressable onPress={onRetry} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
        <Text style={styles.retryText}>다시 시도</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  stateBox: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    backgroundColor: 'rgba(255,253,246,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.78)',
  },
  stateTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateText: {
    color: theme.colors.mutedText,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 19,
  },
  retryButton: {
    marginTop: theme.spacing.md,
    minHeight: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.primaryDark,
  },
  retryText: {
    color: '#FFF8F0',
    fontSize: 13,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.84,
  },
});
