import { Check, MapPin, Plus, Trash2, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getSavedNeighborhoods,
  removeSavedNeighborhood,
  selectSavedNeighborhood,
} from '@/shared/neighborhood/active-neighborhood';
import { nd } from '@/shared/styles/theme';
import { MAX_SAVED_NEIGHBORHOODS, type SavedNeighborhood } from '@/shared/types/neighborhood';

interface NeighborhoodSheetProps {
  visible: boolean;
  activeId?: string;
  isDetecting: boolean;
  onClose: () => void;
  /** 현재 위치를 새 동네로 추가한다(= 기존 재감지) */
  onAddCurrent: () => void;
  /** 목록이 바뀌면 헤더가 다시 읽도록 알린다 */
  onChanged: () => void;
}

/**
 * 내 동네 목록.
 *
 * 지금까지 동네가 늘어나는 길은 GPS 자동 감지 하나뿐이었고 목록을 볼 방법조차
 * 없었다. 5칸을 만들어 두고 채울 수단이 없었던 셈이다. 근거지가 무엇인지에
 * 따라 만남이 출장으로 갈리므로, 사용자가 직접 손댈 수 있어야 한다.
 */
export function NeighborhoodSheet({
  visible,
  activeId,
  isDetecting,
  onClose,
  onAddCurrent,
  onChanged,
}: NeighborhoodSheetProps) {
  const [saved, setSaved] = useState<SavedNeighborhood[]>([]);
  const [isBusy, setIsBusy] = useState(false);

  const reload = useCallback(() => {
    getSavedNeighborhoods()
      .then(setSaved)
      .catch((error: unknown) => {
        console.warn('[neighborhood] list load failed', error);
      });
  }, []);

  useEffect(() => {
    if (visible) {
      reload();
    }
  }, [visible, reload, isDetecting]);

  const handleSelect = async (neighborhood: SavedNeighborhood) => {
    if (neighborhood.id === activeId || isBusy) {
      return;
    }

    setIsBusy(true);

    try {
      await selectSavedNeighborhood(neighborhood.id);
      onChanged();
      onClose();
    } catch (error) {
      console.warn('[neighborhood] select failed', error);
    } finally {
      setIsBusy(false);
    }
  };

  const handleRemove = (neighborhood: SavedNeighborhood) => {
    if (saved.length <= 1) {
      Alert.alert('지울 수 없어요', '동네가 하나는 있어야 기록을 남길 수 있어요.');
      return;
    }

    // 이름 뒤에 조사를 붙이면 받침에 따라 을/를을 골라야 한다. 줄을 나눠 비켜 간다.
    Alert.alert('동네 삭제', `${neighborhood.name}\n내 동네에서 뺄까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          removeSavedNeighborhood(neighborhood.id)
            .then((remaining) => {
              setSaved(remaining);
              onChanged();
            })
            .catch((error: unknown) => {
              console.warn('[neighborhood] remove failed', error);
            });
        },
      },
    ]);
  };

  const isFull = saved.length >= MAX_SAVED_NEIGHBORHOODS;

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="닫기" onPress={onClose} style={styles.backdropTouch} />

        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.head}>
            <Text style={styles.title}>내 동네</Text>
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

          <Text style={styles.caption}>
            여기 담긴 동네가 내 근거지다냥. 그 밖에서 만난 고객은 출장으로 남는다냥.
          </Text>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {saved.map((neighborhood) => {
              const isActive = neighborhood.id === activeId;

              return (
                <View key={neighborhood.id} style={[styles.row, isActive && styles.rowActive]}>
                  <Pressable
                    accessibilityLabel={`${neighborhood.name} 선택`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    onPress={() => handleSelect(neighborhood)}
                    style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}
                  >
                    <MapPin
                      color={isActive ? nd.colors.accent : nd.colors.subtle}
                      size={18}
                      strokeWidth={isActive ? 2.4 : 1.8}
                    />
                    <View style={styles.rowText}>
                      <Text style={[styles.rowName, isActive && styles.rowNameActive]}>{neighborhood.name}</Text>
                      {neighborhood.city ? <Text style={styles.rowCity}>{neighborhood.city}</Text> : null}
                    </View>
                    {isActive ? <Check color={nd.colors.accent} size={18} strokeWidth={2.6} /> : null}
                  </Pressable>

                  <Pressable
                    accessibilityLabel={`${neighborhood.name} 삭제`}
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => handleRemove(neighborhood)}
                    style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
                  >
                    <Trash2 color={nd.colors.subtle} size={16} strokeWidth={1.9} />
                  </Pressable>
                </View>
              );
            })}

            {saved.length === 0 ? (
              <Text style={styles.emptyText}>아직 저장된 동네가 없다냥.</Text>
            ) : null}

            <Pressable
              accessibilityLabel="현재 위치로 동네 추가"
              accessibilityRole="button"
              disabled={isDetecting || isFull}
              onPress={onAddCurrent}
              style={({ pressed }) => [styles.addRow, pressed && styles.pressed, isFull && styles.addRowDisabled]}
            >
              {isDetecting ? (
                <ActivityIndicator color={nd.colors.accent} size="small" />
              ) : (
                <Plus color={isFull ? nd.colors.subtle : nd.colors.accent} size={18} strokeWidth={2.4} />
              )}
              <Text style={[styles.addText, isFull && styles.addTextDisabled]}>
                {isFull ? `동네는 ${MAX_SAVED_NEIGHBORHOODS}개까지다냥` : '현재 위치로 추가'}
              </Text>
            </Pressable>
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
    maxHeight: '80%',
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
  caption: {
    paddingHorizontal: 20,
    paddingTop: 2,
    paddingBottom: 10,
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: -0.325,
    color: nd.colors.sub,
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: nd.colors.bgSecondary,
    paddingRight: 10,
  },
  rowActive: {
    backgroundColor: nd.colors.primarySoft,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  rowText: {
    flex: 1,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.38,
    color: nd.colors.ink,
  },
  rowNameActive: {
    color: nd.colors.accent,
    fontWeight: '800',
  },
  rowCity: {
    marginTop: 1,
    fontSize: 12,
    letterSpacing: -0.3,
    color: nd.colors.sub,
  },
  remove: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    paddingVertical: 12,
    fontSize: 13,
    letterSpacing: -0.325,
    color: nd.colors.sub,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: nd.colors.border,
    borderStyle: 'dashed',
    paddingVertical: 14,
  },
  addRowDisabled: {
    borderStyle: 'solid',
  },
  addText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.35,
    color: nd.colors.accent,
  },
  addTextDisabled: {
    fontWeight: '500',
    color: nd.colors.subtle,
  },
  pressed: {
    opacity: 0.7,
  },
});
