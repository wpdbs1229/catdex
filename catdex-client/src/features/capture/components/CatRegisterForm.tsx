import { useEffect, useMemo, useState } from 'react';
import { Alert, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@/shared/components/Button';
import type { CaptureCatDraft, CatType, PersonalityTag } from '@/shared/types/cat';
import { Card } from '@/shared/components/Card';
import { TagChipGroup } from '@/features/capture/components/TagChipGroup';
import { theme } from '@/shared/styles/theme';
import type { Region } from '@/shared/types/region';

interface CatRegisterFormProps {
  coatOptions: CatType[];
  personalityOptions: PersonalityTag[];
  capturedImageUri: string | null;
  locationMessage?: string;
  regions: Region[];
  isSubmitting?: boolean;
  source?: 'camera' | 'gallery';
  suggestedRegionName?: string;
  onSubmit: (draft: CaptureCatDraft) => Promise<void> | void;
  onSubmitSighting: (draft: CaptureCatDraft) => Promise<void> | void;
}

export function CatRegisterForm({
  coatOptions,
  personalityOptions,
  capturedImageUri,
  locationMessage,
  regions,
  isSubmitting = false,
  source,
  suggestedRegionName,
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
  const [localSubmitType, setLocalSubmitType] = useState<'cat' | 'sighting' | null>(null);
  const trimmedDraft: CaptureCatDraft = {
    ...draft,
    name: draft.name.trim(),
    regionName: draft.regionName.trim(),
    memo: draft.memo.trim(),
  };
  const submitDraft: CaptureCatDraft = capturedImageUri ? { ...trimmedDraft, imageUrl: capturedImageUri } : trimmedDraft;
  const hasName = trimmedDraft.name.length > 0;
  const hasRegionName = trimmedDraft.regionName.length > 0;
  const missingCatFields = [!hasName ? '이름' : null, !hasRegionName ? '발견 장소' : null].filter(Boolean).join(', ');
  const isBusy = isSubmitting || localSubmitType !== null;
  const regionOptions = useMemo(() => {
    const names = regions.map((region) => region.name);

    if (suggestedRegionName) {
      return [suggestedRegionName, ...names.filter((name) => name !== suggestedRegionName)].slice(0, 8);
    }

    return names.slice(0, 8);
  }, [regions, suggestedRegionName]);

  useEffect(() => {
    if (!suggestedRegionName) {
      return;
    }

    setDraft((current) => (current.regionName.trim().length > 0 ? current : { ...current, regionName: suggestedRegionName }));
  }, [suggestedRegionName]);

  const runSubmit = (type: 'cat' | 'sighting', submit: () => Promise<void> | void) => {
    Keyboard.dismiss();
    setLocalSubmitType(type);

    setTimeout(async () => {
      try {
        await submit();
      } finally {
        setLocalSubmitType(null);
      }
    }, 0);
  };

  const handleSubmitCat = () => {
    if (!hasName || !hasRegionName) {
      Alert.alert('등록 정보 확인', `${missingCatFields}를 입력해 주세요.`);
      return;
    }

    runSubmit('cat', () => onSubmit(submitDraft));
  };

  const handleSubmitSighting = () => {
    if (!hasRegionName) {
      Alert.alert('제보 정보 확인', '발견 장소를 입력해 주세요.');
      return;
    }

    runSubmit('sighting', () => onSubmitSighting(submitDraft));
  };

  return (
    <Card style={styles.card}>
      <View style={styles.section}>
        <Text style={styles.label}>첨부 사진</Text>
        <View style={styles.photoStatus}>
          <Text style={styles.photoStatusText}>
            {capturedImageUri
              ? source === 'gallery'
                ? '갤러리 사진이 등록 폼에 첨부됐어요.'
                : '사진이 등록 폼에 첨부됐어요.'
              : '사진을 찍거나 갤러리에서 고르면 도감 기록에 첨부돼요.'}
          </Text>
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
          label="성격/관찰 태그"
          multiple
          onChange={(value) => setDraft((current) => ({ ...current, tags: value }))}
          options={personalityOptions}
          selected={draft.tags}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>발견 장소</Text>
        {locationMessage ? (
          <View style={suggestedRegionName ? styles.locationNotice : styles.locationWarning}>
            <Text style={styles.locationNoticeText}>{locationMessage}</Text>
          </View>
        ) : null}
        <TextInput
          onChangeText={(regionName) => setDraft((current) => ({ ...current, regionName }))}
          placeholder="동네 단위로 입력해 주세요"
          placeholderTextColor="#B59680"
          style={styles.input}
          value={draft.regionName}
        />
        <Text style={[styles.helperText, !hasRegionName && styles.requiredText]}>도감 등록과 미확인 제보에는 발견 장소가 필요해요.</Text>
        {regionOptions.length > 0 ? (
          <View style={styles.regionChipWrap}>
            {regionOptions.map((regionName) => {
              const isSelected = draft.regionName === regionName;

              return (
                <Pressable
                  key={regionName}
                  onPress={() => setDraft((current) => ({ ...current, regionName }))}
                  style={({ pressed }) => [styles.regionChip, isSelected && styles.regionChipSelected, pressed && styles.pressed]}
                >
                  <Text numberOfLines={1} style={[styles.regionChipText, isSelected && styles.regionChipTextSelected]}>
                    {regionName}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
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
        <Button disabled={isBusy} onPress={handleSubmitCat}>
          {localSubmitType === 'cat' || isSubmitting ? '등록 중...' : '도감에 등록하기'}
        </Button>
        <Button disabled={isBusy} onPress={handleSubmitSighting} variant="secondary">
          {localSubmitType === 'sighting' || isSubmitting ? '저장 중...' : '미확인 제보로 남기기'}
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
  locationNotice: {
    marginTop: theme.spacing.sm,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: '#EFF8F0',
    borderWidth: 1,
    borderColor: '#BFDDBF',
  },
  locationWarning: {
    marginTop: theme.spacing.sm,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: '#FFF4E1',
    borderWidth: 1,
    borderColor: '#E9C88F',
  },
  locationNoticeText: {
    color: '#6E5746',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  regionChipWrap: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  regionChip: {
    maxWidth: '100%',
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8EC',
    borderWidth: 1,
    borderColor: '#EAD9C4',
  },
  regionChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  regionChipText: {
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '800',
  },
  regionChipTextSelected: {
    color: '#FFF8F0',
  },
  pressed: {
    opacity: 0.72,
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
