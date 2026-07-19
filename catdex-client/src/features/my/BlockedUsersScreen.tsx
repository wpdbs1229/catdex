import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { ChevronLeft, UserX } from 'lucide-react-native';
import { fetchBlockedUsers, unblockCommunityUser, type BlockedUser } from '@/shared/api/community.api';
import { getUserFacingError } from '@/shared/errors/user-facing-error';
import { createShadow, theme } from '@/shared/styles/theme';

interface BlockedUsersScreenProps {
  onBack: () => void;
}

const defaultAvatar = require('../../../assets/illustrations/default-profile-avatar.png') as ImageSourcePropType;

export function BlockedUsersScreen({ onBack }: BlockedUsersScreenProps) {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unblockingUserId, setUnblockingUserId] = useState<string | null>(null);

  const refreshBlockedUsers = useCallback(async () => {
    try {
      setBlockedUsers(await fetchBlockedUsers());
    } catch (error) {
      console.warn('[my] blocked users load failed', error);
      const friendlyError = getUserFacingError(error, 'generic');
      Alert.alert(friendlyError.title, friendlyError.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshBlockedUsers();
  }, [refreshBlockedUsers]);

  const handleUnblock = (user: BlockedUser) => {
    Alert.alert(`${user.nickname}님 차단을 해제할까요?`, '해제하면 이 사용자의 게시글과 댓글이 다시 보여요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '차단 해제',
        onPress: () => {
          setUnblockingUserId(user.id);
          unblockCommunityUser(user.id)
            .then(() => refreshBlockedUsers())
            .catch((error) => {
              const friendlyError = getUserFacingError(error, 'generic');
              Alert.alert(friendlyError.title, friendlyError.message);
            })
            .finally(() => setUnblockingUserId(null));
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="뒤로 가기" accessibilityRole="button" onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <ChevronLeft color={theme.colors.primaryDark} size={22} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>차단한 사용자</Text>
          <Text style={styles.subtitle}>차단한 사용자의 게시글과 댓글은 보이지 않아요.</Text>
        </View>
        <View style={styles.headerIcon}>
          <UserX color={theme.colors.primaryDark} size={20} />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator color={theme.colors.primaryDark} />
        </View>
      ) : blockedUsers.length > 0 ? (
        <View style={styles.list}>
          {blockedUsers.map((user) => (
            <View key={user.id} style={styles.row}>
              <Image
                source={user.profileImageUrl ? { uri: user.profileImageUrl } : defaultAvatar}
                style={styles.avatar}
              />
              <View style={styles.rowCopy}>
                <Text numberOfLines={1} style={styles.nickname}>
                  {user.nickname}
                </Text>
                <Text style={styles.meta}>{user.blockedAt} 차단</Text>
              </View>
              <Pressable
                accessibilityLabel={`${user.nickname} 차단 해제`}
                accessibilityRole="button"
                disabled={unblockingUserId === user.id}
                onPress={() => handleUnblock(user)}
                style={({ pressed }) => [styles.unblockButton, unblockingUserId === user.id && styles.disabled, pressed && styles.pressed]}
              >
                <Text style={styles.unblockText}>{unblockingUserId === user.id ? '해제 중' : '차단 해제'}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <UserX color="#D4B989" size={30} />
          <Text style={styles.emptyTitle}>차단한 사용자가 없어요</Text>
          <Text style={styles.emptyText}>게시글이나 댓글의 신고·차단 메뉴에서 사용자를 차단할 수 있어요.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: 132,
    gap: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 253, 246, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(139, 112, 83, 0.16)',
    ...createShadow(4),
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 2,
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.badge,
  },
  list: {
    gap: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: 'rgba(255, 253, 246, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(139, 112, 83, 0.14)',
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    ...createShadow(3),
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceAlt,
  },
  rowCopy: {
    flex: 1,
  },
  nickname: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  meta: {
    marginTop: 2,
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '600',
  },
  unblockButton: {
    borderRadius: 999,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    backgroundColor: theme.colors.primaryDark,
  },
  unblockText: {
    color: '#FFF8F0',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 56,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  emptyText: {
    color: theme.colors.mutedText,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 260,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.55,
  },
});
