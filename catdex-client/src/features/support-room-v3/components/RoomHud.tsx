import { Pencil } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SUPPORT_ROOM_ICONS } from '@/features/support-room/support-room.assets';
import { createNdShadow, nd } from '@/shared/styles/theme';

/**
 * 방 우측에 뜨는 원형 HUD 버튼 3종 (상담기록 / 비품 / 꾸미기).
 * 아이콘은 기존 V1 에셋(클립보드·비품 상자)을 그대로 쓰고 연필만 벡터로 그린다.
 * 숫자 배지는 안 읽은 상담기록 수, 점 배지는 확인하지 않은 새 비품을 뜻한다.
 */

interface RoomHudProps {
  unreadRecords: number;
  hasNewSupply: boolean;
  onOpenRecords: () => void;
  onOpenSupplies: () => void;
  onEdit: () => void;
}

export function RoomHud({
  unreadRecords,
  hasNewSupply,
  onOpenRecords,
  onOpenSupplies,
  onEdit,
}: RoomHudProps) {
  return (
    <View pointerEvents="box-none" style={styles.column}>
      <Pressable
        accessibilityLabel={`상담일지 열기, 새 기록 ${unreadRecords}개`}
        accessibilityRole="button"
        onPress={onOpenRecords}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Image
          resizeMode="contain"
          source={SUPPORT_ROOM_ICONS.icon_consultation_log}
          style={styles.icon}
        />
        {unreadRecords > 0 ? (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{unreadRecords > 99 ? '99+' : unreadRecords}</Text>
          </View>
        ) : null}
      </Pressable>

      <Pressable
        accessibilityLabel={`비품 보관함 열기${hasNewSupply ? ', 새 비품 있음' : ''}`}
        accessibilityRole="button"
        onPress={onOpenSupplies}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Image
          resizeMode="contain"
          source={SUPPORT_ROOM_ICONS.icon_supply_box}
          style={styles.icon}
        />
        {hasNewSupply ? <View style={styles.dotBadge} /> : null}
      </Pressable>

      <Pressable
        accessibilityLabel="꾸미기 시작"
        accessibilityRole="button"
        onPress={onEdit}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Pencil color={nd.colors.accent} size={24} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}

const SIZE = 56;

const styles = StyleSheet.create({
  column: {
    position: 'absolute',
    right: 16,
    top: 8,
    gap: 12,
  },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...createNdShadow(0.14, 10),
  },
  pressed: {
    opacity: 0.75,
  },
  icon: {
    width: 30,
    height: 30,
  },
  countBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 5,
    backgroundColor: nd.colors.accent,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  dotBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: nd.colors.accent,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
