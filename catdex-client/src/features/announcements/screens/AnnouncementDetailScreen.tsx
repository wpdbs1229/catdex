import { ArrowLeft, Pin } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '@/app/navigation/types';
import { useGoBackOrHome } from '@/app/navigation/useGoBackOrHome';
import { formatAnnouncementDate } from '@/features/announcements/screens/AnnouncementListScreen';
import { createNdShadow, nd, theme } from '@/shared/styles/theme';

/**
 * 공지 본문.
 *
 * 목록에서 이미 받아온 공지를 그대로 넘겨받는다. 열 때마다 다시 조회하면
 * 방금 본 목록과 다른 글이 뜰 수 있고, 무엇보다 기다릴 이유가 없다.
 */
export function AnnouncementDetailScreen({ route }: RootStackScreenProps<'AnnouncementDetail'>) {
  const goBack = useGoBackOrHome();
  const { announcement } = route.params;

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
        <Text style={styles.headerTitle}>공지사항</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.titleLine}>
            {announcement.pinned ? (
              <Pin color={theme.colors.primary} size={16} strokeWidth={2.2} />
            ) : null}
            <Text style={styles.title}>{announcement.title}</Text>
          </View>
          <Text style={styles.date}>{formatAnnouncementDate(announcement.publishedAt)}</Text>

          <View style={styles.divider} />

          <Text selectable style={styles.body}>
            {announcement.body}
          </Text>
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
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.43,
    color: nd.colors.ink,
  },
  pressed: {
    opacity: 0.7,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  card: {
    padding: 20,
    borderRadius: nd.radius.input,
    backgroundColor: '#FFFFFF',
    ...createNdShadow(0.05, 6),
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    flexShrink: 1,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 27,
    color: nd.colors.ink,
  },
  date: {
    marginTop: 6,
    fontSize: 13,
    letterSpacing: -0.32,
    color: nd.colors.sub,
  },
  divider: {
    marginVertical: 16,
    height: StyleSheet.hairlineWidth,
    backgroundColor: nd.colors.border,
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    letterSpacing: -0.35,
    color: nd.colors.ink,
  },
});
