import { X } from 'lucide-react-native';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CAT_IDLE_IMAGES, PROP_IMAGES } from '@/features/support-room/support-room.assets';
import {
  CONSULTATION_COPY,
  formatVisitedAt,
  PROP_LABEL,
} from '@/features/support-room/consultation-copy';
import type { ConsultationRecord } from '@/features/support-room/support-room.domain';
import { nd } from '@/shared/styles/theme';

interface ConsultationLogSheetProps {
  visible: boolean;
  records: readonly ConsultationRecord[];
  onClose: () => void;
}

function RecordCard({ record }: { record: ConsultationRecord }) {
  const copy = CONSULTATION_COPY[record.behaviorId];

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Image
          resizeMode="contain"
          source={CAT_IDLE_IMAGES[record.characterAssetKeySnapshot]}
          style={styles.portrait}
        />
        <View style={styles.cardHeadText}>
          <View style={styles.nameRow}>
            <Text numberOfLines={1} style={styles.name}>
              {record.catNameSnapshot} 고객
            </Text>
            {record.status === 'unread' ? (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.visitedAt}>{formatVisitedAt(record.scheduledAt)}</Text>
        </View>
        <View style={styles.propChip}>
          <Image resizeMode="contain" source={PROP_IMAGES[record.propId]} style={styles.propIcon} />
          <Text style={styles.propLabel}>{PROP_LABEL[record.propId]}</Text>
        </View>
      </View>

      <View style={styles.fields}>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>방문 목적</Text>
          <Text style={styles.fieldValue}>{copy.purpose}</Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>상담 내용</Text>
          <Text style={styles.fieldValue}>{copy.detail}</Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>담당자 의견</Text>
          <Text style={styles.fieldValue}>{copy.opinion}</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * 상담기록.
 *
 * 처음 만난 고객×비품 조합만 쌓인다. 같은 조합을 다시 봐도 방에는 나타나지만
 * 여기는 늘지 않는다 - 늘어나면 목록이 같은 이야기로 채워져 새 기록을 찾는
 * 재미가 사라진다.
 *
 * 얼굴은 원본 사진이 아니라 그때 고른 캐릭터 그림을 쓴다. 사진 주소가 만료되거나
 * 고양이를 지워도 지난 기록이 깨지지 않아야 한다.
 */
export function ConsultationLogSheet({ visible, records, onClose }: ConsultationLogSheetProps) {
  // 최신이 위로 오게 뒤집는다. 도메인은 시간 순으로 쌓아 둔다.
  const newest = [...records].reverse();

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="닫기" onPress={onClose} style={styles.backdropTouch} />

        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.head}>
            <Text style={styles.title}>상담 기록</Text>
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

          {newest.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>아직 상담 기록이 없어요.</Text>
              <Text style={styles.emptyText}>고객이 비품을 쓰고 가면 여기에 남아요.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
              {newest.map((record) => (
                <RecordCard key={record.id} record={record} />
              ))}
            </ScrollView>
          )}
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
    height: '70%',
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
    paddingBottom: 8,
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
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    borderRadius: 16,
    backgroundColor: nd.colors.bgSecondary,
    padding: 14,
    gap: 10,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  portrait: {
    width: 44,
    height: 44,
  },
  cardHeadText: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.38,
    color: nd.colors.ink,
  },
  newBadge: {
    borderRadius: nd.radius.pill,
    backgroundColor: nd.colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.2,
    color: '#FFFFFF',
  },
  visitedAt: {
    marginTop: 1,
    fontSize: 12,
    letterSpacing: -0.3,
    color: nd.colors.sub,
  },
  propChip: {
    alignItems: 'center',
    gap: 2,
  },
  propIcon: {
    width: 26,
    height: 26,
  },
  propLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: nd.colors.sub,
  },
  fields: {
    gap: 5,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 8,
  },
  fieldLabel: {
    width: 62,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: nd.colors.subtle,
  },
  fieldValue: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: -0.325,
    color: nd.colors.ink,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: nd.colors.ink,
  },
  emptyText: {
    fontSize: 13,
    color: nd.colors.sub,
  },
  pressed: {
    opacity: 0.6,
  },
});
