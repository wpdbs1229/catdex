import { Archive, FlipHorizontal2, RotateCcw } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { FurnitureId } from '@/features/support-room-v2/domain/furniture';
import { specLookup } from '@/features/support-room-v2/domain/fixtures';
import { createNdShadow, nd } from '@/shared/styles/theme';

function furnitureName(furnitureId: FurnitureId): string {
  return specLookup(furnitureId)?.name ?? '가구';
}

export interface EditToolbarProps {
  selectedFurnitureId: FurnitureId | null;
  /** 좌우 반전이 허용된 가구인지. 아닌 가구는 버튼을 잠근다. */
  canFlip: boolean;
  canUndo: boolean;
  /** 보관함으로 뺀 가구. 눌러서 다시 방에 놓는다. */
  stored: readonly FurnitureId[];
  /** 놓을 수 없을 때 그 이유. 없으면 정상이다. */
  issueText: string | null;
  onFlip: () => void;
  onStore: () => void;
  onUndo: () => void;
  onPlaceStored: (furnitureId: FurnitureId) => void;
  onCancel: () => void;
  onSave: () => void;
}

export function EditToolbar({
  selectedFurnitureId,
  canFlip,
  canUndo,
  stored,
  issueText,
  onFlip,
  onStore,
  onUndo,
  onPlaceStored,
  onCancel,
  onSave,
}: EditToolbarProps) {
  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      {issueText ? (
        <View style={styles.issue}>
          <Text style={styles.issueText}>{issueText}</Text>
        </View>
      ) : (
        <View style={styles.hint}>
          <Text style={styles.hintText}>
            {selectedFurnitureId ? '끌어서 옮기세요' : '옮길 가구를 눌러 보세요'}
          </Text>
        </View>
      )}

      {stored.length > 0 ? (
        <ScrollView
          contentContainerStyle={styles.trayContent}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tray}
        >
          {stored.map((furnitureId) => (
            <Pressable
              accessibilityLabel={`${furnitureName(furnitureId)} 다시 놓기`}
              key={furnitureId}
              onPress={() => onPlaceStored(furnitureId)}
              style={styles.trayChip}
            >
              <Text style={styles.trayChipText}>{furnitureName(furnitureId)}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.bar}>
        <View style={styles.tools}>
          <ToolButton
            disabled={!selectedFurnitureId || !canFlip}
            icon={<FlipHorizontal2 color={nd.colors.ink} size={19} />}
            label="회전"
            onPress={onFlip}
          />
          <ToolButton
            disabled={!selectedFurnitureId}
            icon={<Archive color={nd.colors.ink} size={19} />}
            label="보관"
            onPress={onStore}
          />
          <ToolButton
            disabled={!canUndo}
            icon={<RotateCcw color={nd.colors.ink} size={19} />}
            label="되돌리기"
            onPress={onUndo}
          />
        </View>

        <View style={styles.commit}>
          <Pressable accessibilityRole="button" onPress={onCancel} style={styles.cancel}>
            <Text style={styles.cancelText}>취소</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onSave} style={styles.save}>
            <Text style={styles.saveText}>저장</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function ToolButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.tool, pressed && styles.pressed, disabled && styles.dimmed]}
    >
      {icon}
      <Text style={styles.toolLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  hint: {
    alignSelf: 'center',
    borderRadius: 999,
    backgroundColor: 'rgba(58, 46, 34, 0.72)',
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  hintText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  issue: {
    alignSelf: 'center',
    borderRadius: 999,
    backgroundColor: '#D94F4F',
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  issueText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  tray: { maxHeight: 44 },
  trayContent: { gap: 8, paddingHorizontal: 4 },
  trayChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E4D6BF',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    height: 36,
    justifyContent: 'center',
  },
  trayChipText: { fontSize: 13, fontWeight: '600', color: '#5C4B39' },
  // 320~360px 기기에서 도구 3개 + 취소·저장이 한 줄에 안 들어간다.
  // 도구 줄과 확정 줄을 세로로 나누고, 각 줄 안에서만 균등 분배한다.
  bar: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    ...createNdShadow(0.12, 12),
  },
  tools: { flexDirection: 'row', gap: 4 },
  tool: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minWidth: 0,
    paddingVertical: 4,
    borderRadius: 12,
  },
  toolLabel: { fontSize: 11, fontWeight: '600', color: nd.colors.ink },
  pressed: { opacity: 0.7 },
  dimmed: { opacity: 0.35 },
  commit: { flexDirection: 'row', gap: 8 },
  cancel: {
    flex: 1,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E4D6BF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontSize: 14, fontWeight: '700', color: '#8B7A66' },
  save: {
    flex: 1.4,
    height: 40,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: nd.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
