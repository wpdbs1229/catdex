import { AlignLeft, ArrowLeft, Flag, MessageCircle, PawPrint } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGoBackOrHome } from '@/app/navigation/useGoBackOrHome';
import { fetchMyReports, type MyReport } from '@/shared/api/my-reports.api';
import { createNdShadow, nd, theme } from '@/shared/styles/theme';

type LucideIcon = ComponentType<{ color: string; size: number; strokeWidth?: number }>;

const KIND_META: Record<MyReport['kind'], { label: string; icon: LucideIcon }> = {
  cat: { label: '고양이', icon: PawPrint },
  post: { label: '게시글', icon: AlignLeft },
  comment: { label: '댓글', icon: MessageCircle },
};

function formatReportDate(createdAt: string) {
  const parsed = new Date(createdAt);

  if (Number.isNaN(parsed.getTime())) {
    return createdAt;
  }

  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');

  return `${parsed.getFullYear()}.${month}.${day}`;
}

/** 마이페이지 > 신고 목록. 내가 접수한 신고들의 내역이다. */
export function MyReportsScreen() {
  const goBack = useGoBackOrHome();
  const [reports, setReports] = useState<MyReport[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      fetchMyReports()
        .then((next) => {
          if (isActive) {
            setReports(next);
            setHasLoaded(true);
          }
        })
        .catch((error: unknown) => {
          console.warn('[my-reports] load failed', error);
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
        <Text style={styles.title}>신고 목록</Text>
        <View style={styles.headerSpacer} />
      </View>

      {!hasLoaded ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : reports.length === 0 ? (
        <View style={styles.centered}>
          <Flag color={nd.colors.subtle} size={38} strokeWidth={1.6} />
          <Text style={styles.emptyTitle}>아직 신고한 내역이 없어요</Text>
          <Text style={styles.emptyText}>문제가 있는 기록을 신고하면 여기에서 확인할 수 있어요.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {reports.map((report) => {
            const { label: kindLabel, icon: KindIcon } = KIND_META[report.kind];

            return (
              <View key={report.id} style={styles.row}>
                <View style={styles.kindBadge}>
                  <KindIcon color={theme.colors.primary} size={18} strokeWidth={1.9} />
                </View>
                <View style={styles.rowTexts}>
                  <View style={styles.rowMetaLine}>
                    <Text style={styles.rowKind}>{kindLabel} 신고</Text>
                    <View style={styles.statusChip}>
                      <Text style={styles.statusChipText}>{report.statusLabel}</Text>
                    </View>
                  </View>
                  <Text numberOfLines={1} style={styles.rowTitle}>
                    {report.targetLabel}
                  </Text>
                  <Text numberOfLines={1} style={styles.rowReason}>
                    {report.reasonLabel}
                    {report.detail ? ` · ${report.detail}` : ''}
                  </Text>
                  <Text style={styles.rowDate}>{formatReportDate(report.createdAt)}</Text>
                </View>
              </View>
            );
          })}
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
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: nd.radius.input,
    backgroundColor: '#FFFFFF',
    ...createNdShadow(0.05, 6),
  },
  kindBadge: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: theme.colors.primarySoft,
  },
  rowTexts: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  rowMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowKind: {
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: theme.colors.primary,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: nd.radius.pill,
    backgroundColor: nd.colors.field,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.28,
    color: nd.colors.sub,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.38,
    lineHeight: 21,
    color: nd.colors.ink,
  },
  rowReason: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.33,
    color: nd.colors.sub,
  },
  rowDate: {
    fontSize: 12,
    letterSpacing: -0.3,
    color: nd.colors.subtle,
  },
});
