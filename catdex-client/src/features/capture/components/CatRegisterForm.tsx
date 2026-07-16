import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@/shared/components/Button';
import type { CaptureCatDraft, CatType, PersonalityTag } from '@/shared/types/cat';
import { Card } from '@/shared/components/Card';
import { TagChipGroup } from '@/features/capture/components/TagChipGroup';
import { theme } from '@/shared/styles/theme';

interface CatRegisterFormProps {
  coatOptions: CatType[];
  personalityOptions: PersonalityTag[];
  capturedImageUri: string | null;
  defaultRegionName: string;
  imageUrlOverride?: string;
  isSubmitting?: boolean;
  onSubmit: (draft: CaptureCatDraft) => Promise<void> | void;
  onSubmitSighting: (draft: CaptureCatDraft) => Promise<void> | void;
}

export function CatRegisterForm({
  coatOptions,
  personalityOptions,
  capturedImageUri,
  defaultRegionName,
  imageUrlOverride,
  isSubmitting = false,
  onSubmit,
  onSubmitSighting,
}: CatRegisterFormProps) {
  const [draft, setDraft] = useState<CaptureCatDraft>(() => ({
    name: '',
    type: coatOptions[0] ?? '치즈냥',
    tags: [],
    regionName: defaultRegionName,
    memo: '',
  }));
  const trimmedDraft: CaptureCatDraft = {
    ...draft,
    name: draft.name.trim(),
    regionName: draft.regionName.trim(),
    memo: draft.memo.trim(),
  };
  const submitDraft: CaptureCatDraft = imageUrlOverride
    ? { ...trimmedDraft, imageUrl: imageUrlOverride, cutoutImageUrl: imageUrlOverride }
    : capturedImageUri
      ? { ...trimmedDraft, imageUrl: capturedImageUri, cutoutImageUrl: capturedImageUri }
      : trimmedDraft;
  const hasName = trimmedDraft.name.length > 0;
  const hasRegionName = trimmedDraft.regionName.length > 0;
  const canSubmitCat = hasName && hasRegionName && !isSubmitting;
  const canSubmitSighting = hasRegionName && !isSubmitting;

  return (
    <Card style={styles.card}>
      <View style={styles.section}>
        <Text style={styles.label}>촬영 사진</Text>
        <View style={styles.photoStatus}>
          <Text style={styles.photoStatusText}>{capturedImageUri ? '사진이 등록 폼에 첨부됐어요.' : '사진을 찍으면 도감 기록에 첨부돼요.'}</Text>
        </View>
        <View style={styles.shareNotice}>
          <Text style={styles.shareNoticeText}>새 고양이 정보는 내 도감에 저장되고, 이웃이 함께 보는 동네 도감에도 동네 단위로 쌓여요.</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>이름 입력</Text>
        <TextInput
          accessibilityLabel="고양이 이름"
          maxLength={24}
          onChangeText={(name) => setDraft((current) => ({ ...current, name }))}
          placeholder="길에서 만난 이름을 적어보세요"
          placeholderTextColor="#B59680"
          style={styles.input}
          value={draft.name}
        />
        <Text style={[styles.helperText, !hasName && styles.requiredText]}>도감 등록에는 이름이 필요해요.</Text>
      </View>

      <View style={styles.section}>
        <TagChipGroup
          label="털 색상"
          onChange={(value) => setDraft((current) => ({ ...current, type: value[0] }))}
          options={coatOptions}
          selected={[draft.type]}
        />
      </View>

      <View style={styles.section}>
        <TagChipGroup
          label="성격 태그"
          multiple
          onChange={(value) => setDraft((current) => ({ ...current, tags: value }))}
          options={personalityOptions}
          selected={draft.tags}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>발견 동네</Text>
        <View accessibilityLabel={`발견 동네 ${trimmedDraft.regionName}`} style={styles.readonlyField}>
          <Text numberOfLines={1} style={styles.readonlyFieldText}>{trimmedDraft.regionName}</Text>
        </View>
        <Text style={[styles.helperText, !hasRegionName && styles.requiredText]}>정확한 좌표 대신 동네 단위 기록만 남겨요.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>메모</Text>
        <TextInput
          accessibilityLabel="고양이 관찰 메모"
          maxLength={300}
          multiline
          onChangeText={(memo) => setDraft((current) => ({ ...current, memo }))}
          placeholder="표정, 행동, 분위기 등을 적어보세요"
          placeholderTextColor="#B59680"
          style={styles.textarea}
          textAlignVertical="top"
          value={draft.memo}
        />
      </View>

      <View style={styles.actions}>
        <Button disabled={!canSubmitCat} onPress={() => onSubmit(submitDraft)}>
          {isSubmitting ? '등록 중...' : '새 고양이로 등록'}
        </Button>
        <Button disabled={!canSubmitSighting} onPress={() => onSubmitSighting(submitDraft)} variant="secondary">
          {isSubmitting ? '저장 중...' : '이웃 확인 요청으로 남기기'}
        </Button>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,253,246,0.92)',
  },
  section: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    color: '#8B6956',
  },
  input: {
    marginTop: theme.spacing.sm,
    minHeight: 48,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: '#F7EBD8',
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  helperText: {
    marginTop: 6,
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },
  readonlyField: {
    minHeight: 48,
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: 'rgba(221,232,200,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(113,138,91,0.2)',
  },
  readonlyFieldText: {
    color: theme.colors.primaryDark,
    fontSize: 14,
    fontWeight: '900',
  },
  requiredText: {
    color: theme.colors.primaryDark,
  },
  photoStatus: {
    marginTop: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: '#FFF8EC',
    borderWidth: 1,
    borderColor: '#EAD9C4',
  },
  photoStatusText: {
    color: theme.colors.mutedText,
    fontSize: 13,
    fontWeight: '600',
  },
  shareNotice: {
    marginTop: theme.spacing.sm,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(221,232,200,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(113,138,91,0.16)',
  },
  shareNoticeText: {
    color: theme.colors.inkSoft,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
  },
  textarea: {
    marginTop: theme.spacing.sm,
    minHeight: 94,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: '#F7EBD8',
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actions: {
    gap: theme.spacing.sm,
  },
});
