import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, ChevronRight, Megaphone, Pin } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '@/app/navigation/types';
import { useGoBackOrHome } from '@/app/navigation/useGoBackOrHome';
import { fetchAnnouncements } from '@/shared/api/announcements.api';
import { markAnnouncementsSeen } from '@/shared/announcements/announcements-storage';
import { createNdShadow, nd, theme } from '@/shared/styles/theme';
import type { Announcement } from '@/shared/types/announcement';

/** 공개 시각을 "2026.08.14" 로. */
export function formatAnnouncementDate(publishedAt: string) {
  const parsed = new Date(publishedAt);

  if (Number.isNaN(parsed.getTime())) {
    return publishedAt;
  }

  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');

  return `${parsed.getFullYear()}.${month}.${day}`;
}

export function AnnouncementListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const goBack = useGoBackOrHome();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      fetchAnnouncements()
        .then((next) => {
          if (!isActive) {
            return;
          }

          setAnnouncements(next);
          setHasLoaded(true);

          // 목록을 열었으면 다 훑은 것으로 본다. 가장 최근 공지 시각을 남겨
          // 마이페이지의 빨간 점을 끈다.
          const latest = next.reduce<string | null>(
            (newest, item) => (!newest || item.publishedAt > newest ? item.publishedAt : newest),
            null,
          );

          if (latest) {
            markAnnouncementsSeen(latest).catch((error: unknown) => {
              console.warn('[announcements] mark seen failed', error);
            });
          }
        })
        .catch((error: unknown) => {
          console.warn('[announcements] load failed', error);
          if (isActive) {
            setHasLoaded(true);
          }
        });

      return () => {
        isActive = false;
      };
    }, []),
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="뒤로 가기"
          accessibilityRole="button"
          onPress={goBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <ArrowLeft color={nd.colors.ink} size={20} strokeWidth={1.8} />
        </Pressable>
        <Text style={styles.title}>공지사항</Text>
        <View style={styles.headerSpacer} />
      </View>

      {!hasLoaded ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : announcements.length === 0 ? (
        <View style={styles.centered}>
          <Megaphone color={nd.colors.subtle} size={38} strokeWidth={1.6} />
          <Text style={styles.emptyTitle}>아직 공지가 없어요</Text>
          <Text style={styles.emptyText}>새 소식이 생기면 여기에 올라와요.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {announcements.map((announcement) => (
            <Pressable
              accessibilityLabel={`${announcement.title} 공지 열기`}
              accessibilityRole="button"
              key={announcement.id}
              onPress={() => navigation.navigate('AnnouncementDetail', { announcement })}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={styles.rowTexts}>
                <View style={styles.rowTitleLine}>
                  {announcement.pinned ? (
                    <Pin color={theme.colors.primary} size={14} strokeWidth={2.2} />
                  ) : null}
                  <Text numberOfLines={2} style={styles.rowTitle}>
                    {announcement.title}
                  </Text>
                </View>
                <Text style={styles.rowDate}>{formatAnnouncementDate(announcement.publishedAt)}</Text>
              </View>
              <ChevronRight color={nd.colors.sub} size={18} strokeWidth={2} />
            </Pressable>
          ))}
        </ScrollView>
      )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  headerSpacer: {
    width: 44,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.43,
    color: nd.colors.ink,
  },
  pressed: {
    opacity: 0.7,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  emptyTitle: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '600',
    color: nd.colors.ink,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    color: nd.colors.sub,
  },
  list: {
    padding: 16,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: nd.radius.input,
    backgroundColor: '#FFFFFF',
    ...createNdShadow(0.05, 6),
  },
  rowTexts: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  rowTitle: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.38,
    lineHeight: 21,
    color: nd.colors.ink,
  },
  rowDate: {
    fontSize: 12.5,
    letterSpacing: -0.3,
    color: nd.colors.sub,
  },
});
