import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@/shared/components/Button';
import type { CaptureCatDraft, CatType, PersonalityTag } from '@/shared/types/cat';
import { Card } from '@/shared/components/Card';
import { TagChipGroup } from '@/features/capture/components/TagChipGroup';
import { theme } from '@/shared/styles/theme';

const defaultDraft: CaptureCatDraft = {
  name: '감자',
  type: '치즈냥',
  tags: ['느긋함', '애교많음'],
  regionName: '부천시 중동 근처',
  memo: '벤치 밑에서 졸다가 사람 기척에 천천히 고개를 들었어요.',
};

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
  const [draft, setDraft] = useState<CaptureCatDraft>(defaultDraft);
  const submitDraft: CaptureCatDraft = capturedImageUri ? { ...draft, imageUrl: capturedImageUri } : draft;

  return (
    <Card>
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
          style={styles.input}
          value={draft.regionName}
        />
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
        <Button disabled={isSubmitting} onPress={() => onSubmitSighting(submitDraft)} variant="secondary">
          {isSubmitting ? '저장 중...' : '미확인 제보로 남기기'}
        </Button>
        <Button disabled={isSubmitting} onPress={() => onSubmit(submitDraft)}>
          {isSubmitting ? '등록 중...' : '도감에 등록하기'}
        </Button>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B6956',
  },
  input: {
    marginTop: theme.spacing.md,
    height: 52,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: '#F7EFE3',
    color: theme.colors.text,
  },
  photoStatus: {
    marginTop: theme.spacing.md,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: '#FFF7EF',
    borderWidth: 1,
    borderColor: '#EAD9C4',
  },
  photoStatusText: {
    color: theme.colors.mutedText,
    fontSize: 13,
    fontWeight: '600',
  },
  textarea: {
    marginTop: theme.spacing.md,
    minHeight: 120,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: '#F7EFE3',
    color: theme.colors.text,
  },
  actions: {
    gap: theme.spacing.md,
  },
});
