import { PawPrint, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchCrewRankDirectory, type CrewRankDirectory, type CrewStatus } from '@/shared/api/crew.api';
import { CREW_COMPANY_NAME } from '@/shared/constants/crew.constants';
import { nd } from '@/shared/styles/theme';

interface RankGuideModalProps {
  visible: boolean;
  status: CrewStatus;
  onClose: () => void;
}

/** "부천시" -> "부천지부". 시·도를 아직 못 올렸으면 회사 이름으로 둔다. */
function formatBranch(city?: string) {
  const trimmed = city?.trim();

  if (!trimmed) {
    return CREW_COMPANY_NAME;
  }

  const base = trimmed.replace(/(특별자치시|특별자치도|특별시|광역시|시|군|도)$/, '');

  return `${base || trimmed}지부`;
}

function RankRow({
  rank,
  threshold,
  memberCount,
  isMine,
  hasBranch,
}: {
  rank: string;
  threshold: number;
  memberCount: number;
  isMine: boolean;
  /** 지부를 모르면 인원수가 세어진 값이 아니다 */
  hasBranch: boolean;
}) {
  return (
    <View style={[styles.row, isMine && styles.rowMine]}>
      <Text style={[styles.rowRank, isMine && styles.rowRankMine]}>{rank}</Text>
      <Text style={styles.rowThreshold}>{threshold === 0 ? '0마리' : `${threshold}마리~`}</Text>
      <View style={styles.rowRight}>
        {/* 지부를 모르면 아무도 세지 못한 상태라 '공석'이라 말하면 거짓이 된다.
            0명을 '공석'이라 부르는 건 지부를 아는 경우에만 맞다. */}
        <Text style={[styles.rowCount, (!hasBranch || memberCount === 0) && styles.rowCountEmpty]}>
          {!hasBranch ? '—' : memberCount === 0 ? '공석' : `${memberCount}명`}
        </Text>
        {isMine ? (
          <View style={styles.mineChip}>
            <PawPrint color={nd.colors.accent} size={10} strokeWidth={2.6} />
            <Text style={styles.mineChipText}>나</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/**
 * 승진 안내.
 *
 * 홈의 '승진 진행' 줄을 누르면 열린다. 규칙이 화면 어디에도 없어서 사용자가
 * 무엇을 하면 올라가는지 알 방법이 없었다.
 *
 * 여기서 꼭 알려야 하는 것은 직책이 **최고 기록**으로 정해진다는 점이다. 중복
 * 개체를 병합해 마릿수가 줄어도 강등되지 않는데, 그걸 모르면 병합을 손해로 여겨
 * 피하게 된다.
 */
export function RankGuideModal({ visible, status, onClose }: RankGuideModalProps) {
  const [directory, setDirectory] = useState<CrewRankDirectory | null>(null);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }

    let isActive = true;

    setHasFailed(false);

    fetchCrewRankDirectory()
      .then((next) => {
        if (isActive) {
          setDirectory(next);
        }
      })
      .catch((error: unknown) => {
        console.warn('[crew] rank directory load failed', error);

        if (isActive) {
          setHasFailed(true);
        }
      });

    return () => {
      isActive = false;
    };
  }, [visible]);

  const remaining = status.nextThreshold ? Math.max(0, status.nextThreshold - status.peak) : 0;

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="닫기" onPress={onClose} style={styles.backdropTouch} />

        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.head}>
            <Text style={styles.title}>승진 규칙</Text>
            <Pressable
              accessibilityLabel="닫기"
              accessibilityRole="button"
              hitSlop={10}
              onPress={onClose}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
            >
              <X color={nd.colors.sub} size={20} strokeWidth={2} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <View style={styles.summary}>
              <Text style={styles.summaryText}>
                지금은 <Text style={styles.summaryStrong}>{status.rank}</Text>,
                최고 기록 <Text style={styles.summaryStrong}>{status.peak}마리</Text>다냥.
              </Text>
              <Text style={styles.summaryText}>
                {status.nextRank
                  ? `${status.nextRank}까지 ${remaining}마리 남았다냥.`
                  : '더 오를 곳이 없다냥. 축하한다냥, 대표님.'}
              </Text>
            </View>

            {/* 이 화면의 존재 이유. 규칙을 한 줄로 못 박아 둔다. */}
            <View style={styles.note}>
              <PawPrint color={nd.colors.accent} size={14} strokeWidth={2.4} />
              <Text style={styles.noteText}>
                직책은 <Text style={styles.noteStrong}>지금까지의 최고 기록</Text>으로 정해진다냥. 같은 고객을
                하나로 합쳐 마릿수가 줄어도 <Text style={styles.noteStrong}>강등되지 않는다냥.</Text>
              </Text>
            </View>

            <Text style={styles.sectionTitle}>
              {directory ? `${formatBranch(directory.branchCity)} 정원 현황` : '정원 현황'}
            </Text>

            {directory ? (
              <View style={styles.table}>
                <View style={styles.tableHead}>
                  <Text style={styles.headRank}>직책</Text>
                  <Text style={styles.headThreshold}>승진 기준</Text>
                  <Text style={styles.headCount}>인원</Text>
                </View>
                {directory.steps.map((step) => (
                  <RankRow
                    hasBranch={Boolean(directory.branchCity)}
                    isMine={step.isMine}
                    key={step.rank}
                    memberCount={step.memberCount}
                    rank={step.rank}
                    threshold={step.threshold}
                  />
                ))}
              </View>
            ) : hasFailed ? (
              <Text style={styles.stateText}>정원 현황을 불러오지 못했다냥.</Text>
            ) : (
              <View style={styles.loading}>
                <ActivityIndicator color={nd.colors.accent} />
              </View>
            )}

            {directory && !directory.branchCity ? (
              <Text style={styles.stateText}>
                아직 지부가 정해지지 않았다냥. 홈에서 동네를 확인하면 같은 지부 사원이 보인다냥.
              </Text>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(17, 17, 17, 0.4)',
  },
  backdropTouch: {
    flex: 1,
  },
  sheet: {
    maxHeight: '86%',
    borderTopLeftRadius: nd.radius.sheet,
    borderTopRightRadius: nd.radius.sheet,
    backgroundColor: nd.colors.bg,
  },
  handle: {
    width: 40,
    height: 4,
    alignSelf: 'center',
    marginTop: 10,
    borderRadius: 2,
    backgroundColor: nd.colors.border,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.48,
    color: nd.colors.ink,
  },
  close: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  summary: {
    gap: 3,
    paddingVertical: 8,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: -0.35,
    color: nd.colors.sub,
  },
  summaryStrong: {
    fontWeight: '700',
    color: nd.colors.ink,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: nd.colors.primarySoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  noteText: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: -0.325,
    color: '#8A5324',
  },
  noteStrong: {
    fontWeight: '800',
  },
  sectionTitle: {
    marginTop: 22,
    marginBottom: 8,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.38,
    color: nd.colors.ink,
  },
  table: {
    borderRadius: 16,
    backgroundColor: nd.colors.bgSecondary,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
  },
  headRank: {
    width: 56,
    fontSize: 12,
    fontWeight: '600',
    color: nd.colors.subtle,
  },
  headThreshold: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: nd.colors.subtle,
  },
  headCount: {
    fontSize: 12,
    fontWeight: '600',
    color: nd.colors.subtle,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderTopWidth: 1,
    borderTopColor: nd.colors.border,
  },
  rowMine: {
    marginHorizontal: -14,
    paddingHorizontal: 14,
    backgroundColor: nd.colors.primarySoft,
  },
  rowRank: {
    width: 56,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.35,
    color: nd.colors.ink,
  },
  rowRankMine: {
    color: nd.colors.accent,
    fontWeight: '800',
  },
  rowThreshold: {
    flex: 1,
    fontSize: 13,
    letterSpacing: -0.325,
    color: nd.colors.sub,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowCount: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.325,
    color: nd.colors.ink,
  },
  rowCountEmpty: {
    fontWeight: '500',
    color: nd.colors.subtle,
  },
  mineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: nd.radius.pill,
    backgroundColor: nd.colors.bg,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  mineChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: nd.colors.accent,
  },
  loading: {
    paddingVertical: 28,
  },
  stateText: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: -0.325,
    color: nd.colors.sub,
  },
  pressed: {
    opacity: 0.6,
  },
});
