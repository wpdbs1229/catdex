import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AlignLeft,
  Bell,
  ChevronRight,
  CircleHelp,
  FileText,
  Flag,
  Megaphone,
  ShoppingBag,
} from 'lucide-react-native';
import type { ComponentType } from 'react';
import { useCallback, useState } from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '@/app/navigation/types';
import { useTabBarInset } from '@/app/navigation/useTabBarInset';
import { fetchMyProfile, signOut, withdrawMyAccount } from '@/shared/api/auth.api';
import { DEFAULT_PROFILE_AVATAR, DEFAULT_PROFILE_NICKNAME } from '@/shared/constants/profile.constants';
import { SUPPORT_CONTACT_URL, SUPPORT_PRIVACY_URL } from '@/shared/constants/support.constants';
import { getUserFacingErrorMessage } from '@/shared/errors/user-facing-error';
import { fetchAnnouncements } from '@/shared/api/announcements.api';
import {
  hasUnreadAnnouncement,
  loadAnnouncementsLastSeen,
} from '@/shared/announcements/announcements-storage';
import { nd, theme } from '@/shared/styles/theme';
import type { AuthUser } from '@/shared/types/auth';

type LucideIcon = ComponentType<{ color: string; size: number; strokeWidth?: number }>;

/**
 * 줄을 누르면 벌어지는 일. 아직 화면이 없는 항목은 'pending'으로 두고 한곳에서
 * 같은 안내를 띄운다. 없는 화면으로 navigate하면 조용히 아무 일도 일어나지 않아,
 * 눌리지 않는 줄과 구분되지 않는다.
 */
type MenuAction =
  | { kind: 'screen'; screen: MenuScreen }
  | { kind: 'link'; url: string }
  | { kind: 'pending' };

/** 메뉴에서 바로 열 수 있는 루트 화면. 파라미터가 필수인 화면은 여기 들어올 수 없다. */
type MenuScreen = {
  [Route in keyof RootStackParamList]: undefined extends RootStackParamList[Route] ? Route : never;
}[keyof RootStackParamList];

interface MenuRow {
  label: string;
  icon: LucideIcon;
  action: MenuAction;
}

/** 시안의 두 묶음. 카드가 갈리는 자리가 곧 이 배열의 경계다. */
const menuGroups: MenuRow[][] = [
  [
    { label: '냥냥 비품상점', icon: ShoppingBag, action: { kind: 'screen', screen: 'Shop' } },
    { label: '내 게시글', icon: AlignLeft, action: { kind: 'screen', screen: 'MyPosts' } },
    { label: '신고 목록', icon: Flag, action: { kind: 'screen', screen: 'MyReports' } },
    { label: '알림 설정', icon: Bell, action: { kind: 'screen', screen: 'NotificationSettings' } },
  ],
  [
    { label: '고객 센터', icon: CircleHelp, action: { kind: 'link', url: SUPPORT_CONTACT_URL } },
    { label: '공지사항', icon: Megaphone, action: { kind: 'screen', screen: 'Announcements' } },
    { label: '약관 및 정책', icon: FileText, action: { kind: 'link', url: SUPPORT_PRIVACY_URL } },
  ],
];

/** 시안 마이페이지 */
export function MyPageScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [profile, setProfile] = useState<AuthUser | null>(null);
  // 탈퇴·로그아웃이 겹쳐 두 번 나가지 않게 잠근다.
  const [isLeaving, setIsLeaving] = useState(false);
  const [hasUnreadNotice, setHasUnreadNotice] = useState(false);
  const tabBarInset = useTabBarInset();

  // 공지함을 마지막으로 연 시각보다 새 공지가 있으면 줄에 점을 찍는다.
  // 목록을 열면 그 시각이 갱신되므로, 돌아왔을 때 점이 꺼져 있어야 한다.
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      Promise.all([fetchAnnouncements(), loadAnnouncementsLastSeen()])
        .then(([announcements, lastSeen]) => {
          if (!isActive) {
            return;
          }

          const latest = announcements.reduce<string | undefined>(
            (newest, item) => (!newest || item.publishedAt > newest ? item.publishedAt : newest),
            undefined,
          );

          setHasUnreadNotice(hasUnreadAnnouncement(latest, lastSeen));
        })
        .catch((error: unknown) => {
          console.warn('[profile] announcements check failed', error);
        });

      return () => {
        isActive = false;
      };
    }, []),
  );

  // useAuth는 세션 복원까지 함께 돌리는 훅이라 화면에서 부르지 않는다(auth.api 주석).
  // 이름·사진은 표시만 하므로 fetchMyProfile로 읽는다.
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      fetchMyProfile()
        .then((next) => {
          if (isActive) {
            setProfile(next);
          }
        })
        .catch((error: unknown) => {
          console.warn('[profile] load failed', error);
        });

      return () => {
        isActive = false;
      };
    }, []),
  );

  const runMenuAction = (row: MenuRow) => {
    if (row.action.kind === 'screen') {
      navigation.navigate(row.action.screen);
      return;
    }

    if (row.action.kind === 'link') {
      const { url } = row.action;

      Linking.openURL(url).catch((error: unknown) => {
        console.warn('[profile] open url failed', error);
        Alert.alert('페이지를 열지 못했어요', '잠시 후 다시 시도해 주세요.');
      });
      return;
    }

    Alert.alert(`${row.label}은 준비 중이에요`, '다음 단계에서 열려요.');
  };

  const handleLogout = () => {
    Alert.alert('로그아웃할까요?', '다시 로그인하면 도감은 그대로 남아 있어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: () => {
          setIsLeaving(true);

          signOut()
            .catch((error: unknown) => {
              console.warn('[profile] sign out failed', error);
              Alert.alert('로그아웃하지 못했어요', '잠시 후 다시 시도해 주세요.');
            })
            .finally(() => setIsLeaving(false));
        },
      },
    ]);
  };

  const handleWithdraw = () => {
    Alert.alert(
      '정말 회원탈퇴할까요?',
      '수집한 도감과 목격 기록이 모두 지워져요. 되돌릴 수 없어요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴하기',
          style: 'destructive',
          onPress: () => {
            setIsLeaving(true);

            withdrawMyAccount()
              .catch((error: unknown) => {
                console.warn('[profile] withdraw failed', error);
                Alert.alert('회원탈퇴 실패', getUserFacingErrorMessage(error, 'account.withdraw'));
              })
              .finally(() => setIsLeaving(false));
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>마이페이지</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarInset }]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityLabel="프로필 수정"
          accessibilityRole="button"
          onPress={() => navigation.navigate('ProfileEdit')}
          style={({ pressed }) => [styles.card, styles.profileRow, pressed && styles.pressed]}
        >
          <Image
            resizeMode="cover"
            source={profile?.profileImageUrl ? { uri: profile.profileImageUrl } : DEFAULT_PROFILE_AVATAR}
            style={styles.avatar}
          />
          <Text numberOfLines={1} style={styles.nickname}>
            {profile?.nickname ?? DEFAULT_PROFILE_NICKNAME}
          </Text>
          <ChevronRight color={nd.colors.subtle} size={20} strokeWidth={1.8} />
        </Pressable>

        {menuGroups.map((group, groupIndex) => (
          <View key={group[0].label} style={[styles.card, groupIndex > 0 && styles.cardGap]}>
            {group.map(({ label, icon: Icon, action }) => (
              <Pressable
                accessibilityLabel={label}
                accessibilityRole="button"
                key={label}
                onPress={() => runMenuAction({ label, icon: Icon, action })}
                style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
              >
                <Icon color={nd.colors.ink} size={22} strokeWidth={1.6} />
                <Text style={styles.menuLabel}>{label}</Text>
                {/* 안 읽은 공지가 있을 때만. 표시가 없으면 이 줄은 아무도 누르지 않는다. */}
                {label === '공지사항' && hasUnreadNotice ? <View style={styles.unreadDot} /> : null}
              </Pressable>
            ))}
          </View>
        ))}

        {/* 시안에서 이 두 글자만 카드 밖에 있다. 되돌릴 수 없는 동작이라 눈에 덜 띄게 둔다. */}
        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            disabled={isLeaving}
            hitSlop={8}
            onPress={handleLogout}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Text style={styles.footerText}>로그아웃</Text>
          </Pressable>
          <View style={styles.footerDivider} />
          <Pressable
            accessibilityRole="button"
            disabled={isLeaving}
            hitSlop={8}
            onPress={handleWithdraw}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Text style={styles.footerText}>회원탈퇴</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: nd.colors.bgSecondary,
  },
  header: {
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: -0.5,
    color: nd.colors.ink,
  },
  // 시안에서 로그아웃 줄은 하단바 가까이 내려가 있다. 화면이 남으면 아래로
  // 밀고(footer의 marginTop: auto), 내용이 길어지면 카드 뒤를 그대로 따라간다.
  content: {
    flexGrow: 1,
    paddingTop: 8,
  },
  card: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 20,
    backgroundColor: nd.colors.bg,
    paddingVertical: 6,
  },
  // 두 번째 묶음만 시안처럼 한 칸 더 띄운다.
  cardGap: {
    marginTop: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: nd.colors.field,
  },
  nickname: {
    flex: 1,
    minWidth: 0,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    letterSpacing: -0.45,
    color: nd.colors.ink,
  },
  pressed: {
    opacity: 0.88,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.accent,
  },
  menuLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
    letterSpacing: -0.4,
    color: nd.colors.ink,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 'auto',
    paddingTop: 28,
    paddingBottom: 8,
  },
  footerDivider: {
    width: 1,
    height: 10,
    backgroundColor: nd.colors.border,
  },
  footerText: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.325,
    color: nd.colors.sub,
  },
});
