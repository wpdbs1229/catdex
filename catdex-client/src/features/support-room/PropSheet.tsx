import { Check, Lock, X } from 'lucide-react-native';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PROP_IMAGES, type PropId } from '@/features/support-room/support-room.assets';
import { PROP_LABEL } from '@/features/support-room/consultation-copy';
import { ZONES, type RoomState, type ZoneId } from '@/features/support-room/support-room.domain';
import { nd } from '@/shared/styles/theme';

interface PropSheetProps {
  visible: boolean;
  room: RoomState;
  onClose: () => void;
  onSelect: (zoneId: ZoneId, propId: PropId) => void;
}

const ZONE_LABEL: Record<ZoneId, string> = {
  reception: '접수',
  work: '업무',
  records: '기록·휴게',
};

interface OptionProps {
  propId: PropId;
  isInstalled: boolean;
  lockedUntil: number | null;
  discoveredCount: number;
  onPress: () => void;
}

function PropOption({ propId, isInstalled, lockedUntil, discoveredCount, onPress }: OptionProps) {
  const isLocked = lockedUntil !== null;

  return (
    <Pressable
      accessibilityLabel={
        isLocked
          ? `${PROP_LABEL[propId]}, 잠김, 최초 기록 ${discoveredCount}/${lockedUntil}`
          : `${PROP_LABEL[propId]}${isInstalled ? ', 설치됨' : ''}`
      }
      accessibilityRole="button"
      accessibilityState={{ selected: isInstalled, disabled: isLocked }}
      disabled={isLocked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        isInstalled && styles.optionInstalled,
        isLocked && styles.optionLocked,
        pressed && !isLocked && styles.pressed,
      ]}
    >
      <View style={styles.optionImageBox}>
        <Image
          resizeMode="contain"
          source={PROP_IMAGES[propId]}
          style={[styles.optionImage, isLocked && styles.optionImageLocked]}
        />
        {isLocked ? <Lock color={nd.colors.subtle} size={16} strokeWidth={2} style={styles.lockIcon} /> : null}
      </View>
      <Text style={[styles.optionLabel, isInstalled && styles.optionLabelInstalled]}>
        {PROP_LABEL[propId]}
      </Text>
      {isLocked ? (
        <Text style={styles.lockHint}>최초 기록 {discoveredCount}/{lockedUntil}</Text>
      ) : isInstalled ? (
        <View style={styles.installedRow}>
          <Check color={nd.colors.accent} size={12} strokeWidth={3} />
          <Text style={styles.installedText}>설치됨</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * 비품 바꾸기.
 *
 * 슬롯은 구역당 하나, 후보는 둘뿐이다. 끌어 옮기거나 크기를 바꾸거나 구역을
 * 넘나들 수 없다 - 자유 배치를 넣으면 빈 바닥을 넓게 두자는 공간 원칙이 무너진다.
 * 가격도 재화도 없다.
 */
export function PropSheet({ visible, room, onClose, onSelect }: PropSheetProps) {
  const discoveredCount = room.discoveredCombinations.length;

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="닫기" onPress={onClose} style={styles.backdropTouch} />

        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.head}>
            <Text style={styles.title}>비품 바꾸기</Text>
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

          <Text style={styles.caption}>구역마다 자리는 하나다냥. 둘 중 하나를 고르면 된다냥.</Text>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {ZONES.map((zone) => {
              const installed = room.installedProps[zone.id];
              const isUnlocked = discoveredCount >= zone.unlockAt;

              return (
                <View key={zone.id} style={styles.slot}>
                  <Text style={styles.slotTitle}>{ZONE_LABEL[zone.id]}</Text>
                  <View style={styles.options}>
                    <PropOption
                      discoveredCount={discoveredCount}
                      isInstalled={installed === zone.starter}
                      lockedUntil={null}
                      onPress={() => onSelect(zone.id, zone.starter)}
                      propId={zone.starter}
                    />
                    <PropOption
                      discoveredCount={discoveredCount}
                      isInstalled={installed === zone.unlockable}
                      lockedUntil={isUnlocked ? null : zone.unlockAt}
                      onPress={() => onSelect(zone.id, zone.unlockable)}
                      propId={zone.unlockable}
                    />
                  </View>
                </View>
              );
            })}
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
    maxHeight: '70%',
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
    letterSpacing: -0.325,
    color: nd.colors.sub,
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  slot: {
    gap: 8,
  },
  slotTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.35,
    color: nd.colors.ink,
  },
  options: {
    flexDirection: 'row',
    gap: 10,
  },
  // 고정 슬롯이라는 게 보이도록 점선으로 둘러 둔다.
  option: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: nd.colors.border,
    backgroundColor: nd.colors.bgSecondary,
    paddingVertical: 12,
  },
  optionInstalled: {
    borderStyle: 'solid',
    borderColor: nd.colors.accent,
    backgroundColor: nd.colors.primarySoft,
  },
  optionLocked: {
    backgroundColor: nd.colors.field,
  },
  optionImageBox: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionImage: {
    width: 60,
    height: 60,
  },
  optionImageLocked: {
    opacity: 0.35,
  },
  lockIcon: {
    position: 'absolute',
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.325,
    color: nd.colors.ink,
  },
  optionLabelInstalled: {
    color: nd.colors.accent,
    fontWeight: '800',
  },
  lockHint: {
    fontSize: 11,
    color: nd.colors.subtle,
  },
  installedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  installedText: {
    fontSize: 11,
    fontWeight: '700',
    color: nd.colors.accent,
  },
  pressed: {
    opacity: 0.7,
  },
});
