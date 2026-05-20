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
  isSubmitting?: boolean;
  onSubmit: (draft: CaptureCatDraft) => Promise<void> | void;
  onSubmitSighting: (draft: CaptureCatDraft) => Promise<void> | void;
}

export function CatRegisterForm({
  coatOptions,
  personalityOptions,
  capturedImageUri,
  isSubmitting = false,
  onSubmit,
  onSubmitSighting,
}: CatRegisterFormProps) {
  const [draft, setDraft] = useState<CaptureCatDraft>(() => ({
    name: '',
    type: coatOptions[0] ?? '치즈냥',
    tags: [],
    regionName: '',
    memo: '',
  }));
  const trimmedDraft: CaptureCatDraft = {
    ...draft,
    name: draft.name.trim(),
    regionName: draft.regionName.trim(),
    memo: draft.memo.trim(),
  };
  const submitDraft: CaptureCatDraft = capturedImageUri ? { ...trimmedDraft, imageUrl: capturedImageUri } : trimmedDraft;
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
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>이름 입력</Text>
        <TextInput
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
        <Text style={styles.label}>발견 장소</Text>
        <TextInput
          onChangeText={(regionName) => setDraft((current) => ({ ...current, regionName }))}
          placeholder="동네 단위로 입력해 주세요"
          placeholderTextColor="#B59680"
          style={styles.input}
          value={draft.regionName}
        />
        <Text style={[styles.helperText, !hasRegionName && styles.requiredText]}>도감 등록과 미확인 제보에는 발견 장소가 필요해요.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>메모</Text>
        <TextInput
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
          {isSubmitting ? '등록 중...' : '도감에 등록하기'}
        </Button>
        <Button disabled={!canSubmitSighting} onPress={() => onSubmitSighting(submitDraft)} variant="secondary">
          {isSubmitting ? '저장 중...' : '미확인 제보로 남기기'}
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
