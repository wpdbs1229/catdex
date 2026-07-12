import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ImageSourcePropType } from 'react-native';
import { Camera, ChevronLeft, ImagePlus, RotateCcw, ShieldCheck } from 'lucide-react-native';
import { TagChipGroup } from '@/features/capture/components/TagChipGroup';
import { Button } from '@/shared/components/Button';
import { createShadow, theme } from '@/shared/styles/theme';
import type { Cat, CatProfileUpdateDraft, PersonalityTag } from '@/shared/types/cat';
import { getCatIllustrationKey, type CatIllustrationKey } from '@/shared/utils/catPresentation';

interface CatEditScreenProps {
  cat: Cat;
  isSaving: boolean;
  personalityOptions: PersonalityTag[];
  onBack: () => void;
  onSave: (draft: CatProfileUpdateDraft) => Promise<void> | void;
}

const illustrations = {
  orange: require('../../../assets/illustrations/cat-orange-clean.png'),
  dark: require('../../../assets/illustrations/cat-dark-clean.png'),
  tuxedo: require('../../../assets/illustrations/cat-tuxedo-clean.png'),
  gray: require('../../../assets/illustrations/cat-gray-clean.png'),
} satisfies Record<CatIllustrationKey, ImageSourcePropType>;

function fallbackImage(cat: Cat): ImageSourcePropType {
  return illustrations[getCatIllustrationKey(cat.type)];
}

export function CatEditScreen({ cat, isSaving, personalityOptions, onBack, onSave }: CatEditScreenProps) {
  const [name, setName] = useState(cat.name);
  const [tags, setTags] = useState<PersonalityTag[]>(cat.tags as PersonalityTag[]);
  const [memo, setMemo] = useState(cat.memo ?? '');
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [clearImage, setClearImage] = useState(false);
  const previewImageUri = clearImage ? undefined : (imageUri ?? cat.imageUrl);
  const trimmedName = name.trim();
  const canSave = trimmedName.length > 0 && !isSaving;

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('사진 접근 권한 필요', '대표 사진을 선택하려면 사진 접근을 허용해 주세요.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ['images'],
      quality: 0.84,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    setImageUri(result.assets[0].uri);
    setClearImage(false);
  };

  const handleClearImage = () => {
    setImageUri(undefined);
    setClearImage(true);
  };

  const handleSave = () => {
    if (!trimmedName) {
      Alert.alert('이름 확인', '고양이 이름을 입력해 주세요.');
      return;
    }

    onSave({
      name: trimmedName,
      tags,
      memo: memo.trim(),
      imageUri,
      clearImage,
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="고양이 상세로 돌아가기" accessibilityRole="button" disabled={isSaving} onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <ChevronLeft color={theme.colors.primaryDark} size={22} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>고양이 정보 수정</Text>
          <Text style={styles.subtitle}>이름, 태그, 메모, 대표 사진만 바꿀 수 있어요.</Text>
        </View>
      </View>

      <View style={styles.previewPanel}>
        <View style={styles.photoFrame}>
          <Image resizeMode="cover" source={previewImageUri ? { uri: previewImageUri } : fallbackImage(cat)} style={styles.photo} />
          <Pressable accessibilityLabel="대표 사진 선택" accessibilityRole="button" disabled={isSaving} onPress={handlePickImage} style={({ pressed }) => [styles.photoButton, pressed && styles.pressed]}>
            <ImagePlus color="#FFF8F0" size={18} />
          </Pressable>
        </View>
        <Text style={styles.photoHint}>정사각형으로 잘라 대표 사진에 사용해요.</Text>
        <View style={styles.inlineActions}>
          <Pressable disabled={isSaving} onPress={handlePickImage} style={({ pressed }) => [styles.smallAction, pressed && styles.pressed]}>
            <Camera color={theme.colors.primaryDark} size={15} />
            <Text style={styles.smallActionText}>사진 선택</Text>
          </Pressable>
          <Pressable disabled={isSaving} onPress={handleClearImage} style={({ pressed }) => [styles.smallAction, pressed && styles.pressed]}>
            <RotateCcw color={theme.colors.primaryDark} size={15} />
            <Text style={styles.smallActionText}>기본 그림</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.formPanel}>
        <View style={styles.field}>
          <Text style={styles.label}>이름</Text>
          <TextInput
            editable={!isSaving}
            maxLength={24}
            onChangeText={setName}
            placeholder="고양이 이름"
            placeholderTextColor="#B59680"
            style={[styles.input, !trimmedName && styles.inputError]}
            value={name}
          />
          <Text style={[styles.helperText, !trimmedName && styles.requiredText]}>도감에 표시될 이름이에요.</Text>
        </View>

        <View style={styles.field}>
          <TagChipGroup
            label="성격 태그"
            multiple
            onChange={(value) => setTags(value as PersonalityTag[])}
            options={personalityOptions}
            selected={tags}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>메모</Text>
          <TextInput
            editable={!isSaving}
            multiline
            onChangeText={setMemo}
            placeholder="표정, 행동, 분위기 등을 적어보세요"
            placeholderTextColor="#B59680"
            style={styles.textarea}
            textAlignVertical="top"
            value={memo}
          />
        </View>

        <View style={styles.lockedInfo}>
          <ShieldCheck color={theme.colors.accent} size={17} />
          <Text style={styles.lockedInfoText}>
            털색, 희귀도, 만남 횟수는 기록 신뢰도를 위해 직접 수정하지 않아요. 틀린 정보는 상세 화면의 신고로 검토 요청할 수 있어요.
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Button disabled={!canSave} onPress={handleSave}>
          {isSaving ? '저장 중...' : '저장하기'}
        </Button>
        <Button disabled={isSaving} onPress={onBack} variant="secondary">
          취소
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: 132,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  backButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: 'rgba(255,253,246,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.82)',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: theme.colors.text,
    fontSize: 25,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 4,
    color: theme.colors.mutedText,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  previewPanel: {
    alignItems: 'center',
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    backgroundColor: 'rgba(255,253,246,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.88)',
    ...createShadow(8),
  },
  photoFrame: {
    width: 148,
    height: 148,
    borderRadius: 36,
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },
  photoButton: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: theme.colors.primaryDark,
    borderWidth: 3,
    borderColor: '#FFFDF6',
  },
  photoHint: {
    marginTop: theme.spacing.md,
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '800',
  },
  inlineActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  smallAction: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 18,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(248,234,210,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
  },
  smallActionText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  formPanel: {
    gap: theme.spacing.lg,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(255,253,246,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.12)',
  },
  field: {
    gap: theme.spacing.sm,
  },
  label: {
    color: '#8B6956',
    fontSize: 14,
    fontWeight: '900',
  },
  input: {
    minHeight: 48,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: '#F7EBD8',
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputError: {
    borderColor: theme.colors.primary,
  },
  helperText: {
    color: theme.colors.mutedText,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '800',
  },
  requiredText: {
    color: theme.colors.primary,
  },
  textarea: {
    minHeight: 118,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: '#F7EBD8',
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  lockedInfo: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(221,232,200,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(111,131,77,0.12)',
  },
  lockedInfoText: {
    flex: 1,
    color: theme.colors.primaryDark,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
  },
  actions: {
    gap: theme.spacing.sm,
  },
  pressed: {
    opacity: 0.82,
  },
});
