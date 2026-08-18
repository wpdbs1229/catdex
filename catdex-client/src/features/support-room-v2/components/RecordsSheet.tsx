import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { formatVisitedAt } from '@/features/support-room/consultation-copy';
import { fetchVisitRecords, type VisitRecord } from '@/shared/api/support-room-v2.api';
import { nd } from '@/shared/styles/theme';
import { FURNITURE_CATALOG } from '../domain/catalog.generated';
import { catActionImage } from '../support-room-v2.cat-assets';
import { consultationCopyFor } from '../support-room-v2.copy';

interface RecordsSheetProps {
  visible: boolean;
  onClose: () => void;
}

function furnitureName(id: string): string {
  return FURNITURE_CATALOG.find((f) => f.id === id)?.name ?? '비품';
}

/** 상담일지. 서버 visit_events가 정본이고, 열람해도 기록은 그대로 남는다. */
export function RecordsSheet({ visible, onClose }: RecordsSheetProps) {
  const [records, setRecords] = useState<VisitRecord[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    setRecords(null);
    setFailed(false);
    fetchVisitRecords()
      .then((rows) => active && setRecords(rows))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [visible]);

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>상담일지</Text>
            <Pressable accessibilityLabel="상담일지 닫기" accessibilityRole="button" onPress={onClose} style={styles.close}>
              <Text style={styles.closeText}>닫기</Text>
            </Pressable>
          </View>

          {failed ? (
            <Text style={styles.stateText}>상담일지를 불러오지 못했어요. 다시 열어주세요.</Text>
          ) : records === null ? (
            <ActivityIndicator color={nd.colors.accent} style={styles.stateBox} />
          ) : records.length === 0 ? (
            <Text style={styles.stateText}>아직 기록이 없어요. 고객이 다녀가면 여기에 남아요.</Text>
          ) : (
            <FlatList
              data={records}
              keyExtractor={(item) => item.eventId}
              renderItem={({ item }) => {
                const copy = consultationCopyFor(item.behaviorId);
                return (
                  <View style={styles.card}>
                    <Image
                      resizeMode="contain"
                      source={catActionImage(item.characterAssetKey, 'idle')}
                      style={styles.avatar}
                    />
                    <View style={styles.cardBody}>
                      <View style={styles.cardTitleRow}>
                        <Text style={styles.cardTitle}>{item.catName} 고객</Text>
                        {item.isFirstDiscovery ? (
                          <Text style={styles.firstBadge}>최초 발견</Text>
                        ) : null}
                      </View>
                      <Text style={styles.cardMeta}>
                        {formatVisitedAt(item.scheduledAt)} · {furnitureName(item.furnitureId)}
                      </Text>
                      <Text style={styles.cardLine}>용무: {copy.purpose}</Text>
                      <Text style={styles.cardLine}>{copy.detail}</Text>
                      <Text style={styles.cardOpinion}>{copy.opinion}</Text>
                    </View>
                  </View>
                );
              }}
              style={styles.list}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 17, 17, 0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: nd.colors.bg,
    borderTopLeftRadius: nd.radius.sheet,
    borderTopRightRadius: nd.radius.sheet,
    paddingBottom: 24,
    maxHeight: '80%',
    minHeight: '45%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: nd.colors.ink,
  },
  close: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  closeText: {
    fontSize: 14,
    color: nd.colors.sub,
  },
  stateBox: {
    marginVertical: 40,
  },
  stateText: {
    textAlign: 'center',
    marginVertical: 40,
    fontSize: 14,
    color: nd.colors.sub,
  },
  list: {
    paddingHorizontal: 16,
  },
  card: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: nd.colors.card,
    marginBottom: 10,
  },
  avatar: {
    width: 56,
    height: 56,
  },
  cardBody: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: nd.colors.ink,
  },
  firstBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    backgroundColor: nd.colors.accent,
    borderRadius: nd.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  cardMeta: {
    fontSize: 12,
    color: nd.colors.sub,
    marginBottom: 4,
  },
  cardLine: {
    fontSize: 13,
    color: nd.colors.ink,
  },
  cardOpinion: {
    fontSize: 13,
    color: nd.colors.sub,
    marginTop: 2,
  },
});
