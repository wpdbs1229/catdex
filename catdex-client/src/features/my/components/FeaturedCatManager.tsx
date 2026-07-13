import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { ArrowDown, ArrowUp, Check, PawPrint, Save, Star, Trash2, X } from 'lucide-react-native';
import { MAX_FEATURED_CATS } from '@/shared/constants/collection.constants';
import { createShadow, theme } from '@/shared/styles/theme';
import type { Cat } from '@/shared/types/cat';
import { getCatIllustrationKey, type CatIllustrationKey } from '@/shared/utils/catPresentation';

const illustrations = {
  orange: require('../../../../assets/illustrations/cat-orange-clean.png'),
  dark: require('../../../../assets/illustrations/cat-dark-clean.png'),
  tuxedo: require('../../../../assets/illustrations/cat-tuxedo-clean.png'),
  gray: require('../../../../assets/illustrations/cat-gray-clean.png'),
} satisfies Record<CatIllustrationKey, ImageSourcePropType>;

interface FeaturedCatManagerProps {
  cats: Cat[];
  selectedCatIds: string[];
  visible: boolean;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (catIds: string[]) => Promise<void> | void;
}

function catImage(cat: Cat): ImageSourcePropType {
  if (cat.imageUrl) {
    return { uri: cat.imageUrl };
  }

  return illustrations[getCatIllustrationKey(cat.type)];
}

export function FeaturedCatManager({ cats, selectedCatIds, visible, isSaving = false, onClose, onSave }: FeaturedCatManagerProps) {
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const selectedCats = draftIds.map((catId) => cats.find((cat) => cat.id === catId)).filter((cat): cat is Cat => Boolean(cat));
  const initialIds = selectedCatIds.slice(0, MAX_FEATURED_CATS);
  const hasUnsavedChanges =
    draftIds.length !== initialIds.length || draftIds.some((catId, index) => catId !== initialIds[index]);

  useEffect(() => {
    if (visible) {
      setDraftIds(selectedCatIds.slice(0, MAX_FEATURED_CATS));
    }
  }, [selectedCatIds, visible]);

  const handleToggleCat = (catId: string) => {
    setDraftIds((current) => {
      if (current.includes(catId)) {
        return current.filter((id) => id !== catId);
      }

      if (current.length >= MAX_FEATURED_CATS) {
        Alert.alert(
          `대표 고양이는 ${MAX_FEATURED_CATS}마리까지`,
          '순서를 바꾸거나 기존 대표 고양이를 해제한 뒤 다시 선택해 주세요.',
        );
        return current;
      }

      return [...current, catId];
    });
  };

  const handleMove = (catId: string, direction: -1 | 1) => {
    setDraftIds((current) => {
      const currentIndex = current.indexOf(catId);
      const nextIndex = currentIndex + direction;

      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const next = [...current];
      [next[currentIndex], next[nextIndex]] = [next[nextIndex], next[currentIndex]];
      return next;
    });
  };

  const handleClose = () => {
    if (isSaving) {
      return;
    }

    if (!hasUnsavedChanges) {
      onClose();
      return;
    }

    Alert.alert('대표 고양이 변경을 취소할까요?', '저장하지 않은 선택과 순서 변경이 사라져요.', [
      { text: '계속 설정', style: 'cancel' },
      { text: '변경 취소', style: 'destructive', onPress: onClose },
    ]);
  };

  return (
    <Modal animationType="fade" onRequestClose={handleClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.kicker}>우리 도감 주인공</Text>
              <Text style={styles.title}>대표 고양이 관리</Text>
              <Text style={styles.description}>마이페이지와 홈에 먼저 보여줄 고양이를 순서대로 골라요.</Text>
            </View>
            <Pressable accessibilityLabel="대표 고양이 관리 닫기" accessibilityRole="button" disabled={isSaving} onPress={handleClose} style={styles.closeButton}>
              <X color={theme.colors.primaryDark} size={20} />
            </Pressable>
          </View>

          <View style={styles.selectedPanel}>
            <View style={styles.selectedHeader}>
              <View style={styles.selectedTitleRow}>
                <Star color={theme.colors.accent} size={16} />
                <Text style={styles.selectedTitle}>선택한 순서</Text>
              </View>
              <Text style={styles.selectedCount}>{draftIds.length}/{MAX_FEATURED_CATS}</Text>
            </View>

            {selectedCats.length > 0 ? (
              <View style={styles.selectedStack}>
                {selectedCats.map((cat, index) => (
                  <View key={cat.id} style={styles.selectedRow}>
                    <Text style={styles.slotNumber}>{index + 1}</Text>
                    <Image resizeMode="cover" source={catImage(cat)} style={styles.selectedImage} />
                    <View style={styles.selectedCopy}>
                      <Text numberOfLines={1} style={styles.selectedName}>{cat.name}</Text>
                      <Text numberOfLines={1} style={styles.selectedMeta}>{cat.type} · {cat.encounterCount}회 만남</Text>
                    </View>
                    <View style={styles.orderButtons}>
                      <Pressable accessibilityLabel={`${cat.name} 앞으로 이동`} accessibilityRole="button" disabled={index === 0 || isSaving} onPress={() => handleMove(cat.id, -1)} style={[styles.orderButton, index === 0 && styles.orderButtonDisabled]}>
                        <ArrowUp color={index === 0 ? '#CDB58F' : theme.colors.primaryDark} size={14} />
                      </Pressable>
                      <Pressable accessibilityLabel={`${cat.name} 뒤로 이동`} accessibilityRole="button" disabled={index === selectedCats.length - 1 || isSaving} onPress={() => handleMove(cat.id, 1)} style={[styles.orderButton, index === selectedCats.length - 1 && styles.orderButtonDisabled]}>
                        <ArrowDown color={index === selectedCats.length - 1 ? '#CDB58F' : theme.colors.primaryDark} size={14} />
                      </Pressable>
                      <Pressable accessibilityLabel={`${cat.name} 대표 해제`} accessibilityRole="button" disabled={isSaving} onPress={() => handleToggleCat(cat.id)} style={styles.removeButton}>
                        <Trash2 color={theme.colors.primary} size={14} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptySelected}>
                <PawPrint color="#CDB58F" size={26} />
                <Text style={styles.emptySelectedText}>아직 대표 고양이를 고르지 않았어요.</Text>
              </View>
            )}
          </View>

          <ScrollView contentContainerStyle={styles.catList} showsVerticalScrollIndicator={false}>
            {cats.map((cat) => {
              const isSelected = draftIds.includes(cat.id);

              return (
                <Pressable
                  accessibilityLabel={`${cat.name} 대표 고양이 ${isSelected ? '해제' : '선택'}`}
                  accessibilityRole="button"
                  disabled={isSaving}
                  key={cat.id}
                  onPress={() => handleToggleCat(cat.id)}
                  style={({ pressed }) => [styles.catOption, isSelected && styles.catOptionSelected, pressed && styles.pressed]}
                >
                  <Image resizeMode="cover" source={catImage(cat)} style={styles.catImage} />
                  <View style={styles.catCopy}>
                    <Text numberOfLines={1} style={styles.catName}>{cat.name}</Text>
                    <Text numberOfLines={1} style={styles.catMeta}>{cat.type} · {cat.encounterCount}회 만남</Text>
                  </View>
                  <View style={[styles.selectBadge, isSelected && styles.selectBadgeActive]}>
                    {isSelected ? <Check color="#FFF8F0" size={15} /> : <PawPrint color={theme.colors.primaryDark} size={15} />}
                  </View>
                </Pressable>
              );
            })}

            {cats.length === 0 ? (
              <View style={styles.emptyCatList}>
                <PawPrint color="#CDB58F" size={30} />
                <Text style={styles.emptyCatTitle}>대표로 고를 고양이가 없어요</Text>
                <Text style={styles.emptyCatText}>먼저 촬영 화면에서 고양이를 등록하면 여기에서 주인공으로 고를 수 있어요.</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable accessibilityLabel="대표 고양이 저장 취소" accessibilityRole="button" disabled={isSaving} onPress={handleClose} style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}>
              <Text style={styles.cancelText}>취소</Text>
            </Pressable>
            <Pressable accessibilityLabel="대표 고양이 저장" accessibilityRole="button" disabled={isSaving} onPress={() => onSave(draftIds)} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed, isSaving && styles.saveButtonDisabled]}>
              {isSaving ? <ActivityIndicator color="#FFF8F0" size="small" /> : <Save color="#FFF8F0" size={16} />}
              <Text style={styles.saveText}>{isSaving ? '저장 중' : '저장'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(47,36,29,0.36)',
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: 32,
    backgroundColor: '#FFF8EC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    color: theme.colors.accent,
    fontSize: 11,
    fontWeight: '900',
  },
  title: {
    marginTop: 4,
    color: theme.colors.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
  },
  description: {
    marginTop: 6,
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  closeButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: 'rgba(255,253,246,0.72)',
  },
  selectedPanel: {
    marginTop: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.88)',
    ...createShadow(4),
  },
  selectedHeader: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  selectedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectedTitle: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  selectedCount: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '900',
  },
  selectedStack: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  selectedRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    backgroundColor: 'rgba(255,248,236,0.78)',
  },
  slotNumber: {
    width: 22,
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  selectedImage: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFF0DC',
  },
  selectedCopy: {
    flex: 1,
    minWidth: 0,
  },
  selectedName: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  selectedMeta: {
    marginTop: 4,
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '800',
  },
  orderButtons: {
    flexDirection: 'row',
    gap: 5,
  },
  orderButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: '#FFF8EC',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.12)',
  },
  orderButtonDisabled: {
    opacity: 0.55,
  },
  removeButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: 'rgba(255,239,221,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(196,122,66,0.18)',
  },
  emptySelected: {
    minHeight: 94,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  emptySelectedText: {
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '800',
  },
  catList: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  catOption: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
  },
  catOptionSelected: {
    backgroundColor: 'rgba(221,232,200,0.72)',
    borderColor: 'rgba(113,138,91,0.22)',
  },
  catImage: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFF0DC',
  },
  catCopy: {
    flex: 1,
    minWidth: 0,
  },
  catName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  catMeta: {
    marginTop: 5,
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '800',
  },
  selectBadge: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#FFF8EC',
  },
  selectBadgeActive: {
    backgroundColor: theme.colors.primaryDark,
  },
  emptyCatList: {
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(255,253,246,0.64)',
  },
  emptyCatTitle: {
    marginTop: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  emptyCatText: {
    marginTop: 6,
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  cancelButton: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    backgroundColor: 'rgba(255,253,246,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.12)',
  },
  cancelText: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  saveButton: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 23,
    backgroundColor: theme.colors.primaryDark,
  },
  saveButtonDisabled: {
    opacity: 0.62,
  },
  saveText: {
    color: '#FFF8F0',
    fontSize: 13,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.82,
  },
});
