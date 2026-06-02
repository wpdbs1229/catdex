import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ImageSourcePropType } from 'react-native';
import { MapPin, RotateCcw, Search, Sparkles } from 'lucide-react-native';
import { Card } from '@/shared/components/Card';
import { Chip } from '@/shared/components/Chip';
import { theme } from '@/shared/styles/theme';
import type { Cat, CatEncounterDraft, CatType } from '@/shared/types/cat';
import type { Region } from '@/shared/types/region';

interface RediscoveryPanelProps {
  capturedImageUri: string | null;
  coatOptions: CatType[];
  existingCats: Cat[];
  isSubmitting?: boolean;
  onRecordExisting: (catId: string, draft: CatEncounterDraft) => Promise<void> | void;
  regions: Region[];
  suggestedRegionName?: string;
}

type CoatFilter = '전체' | CatType;

interface ScoredCandidate {
  cat: Cat;
  reasons: string[];
  score: number;
}

const catImages = {
  orange: require('../../../../assets/illustrations/cat-orange-clean.png'),
  dark: require('../../../../assets/illustrations/cat-dark-clean.png'),
  tuxedo: require('../../../../assets/illustrations/cat-tuxedo-clean.png'),
  gray: require('../../../../assets/illustrations/cat-gray-clean.png'),
} satisfies Record<string, ImageSourcePropType>;

const observationTagOptions = ['상처 나아짐', '살이 빠짐', '같이 있었음', '자주 보임'] as const;

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}

function imageForCat(cat: Cat): ImageSourcePropType {
  if (cat.imageUrl) {
    return { uri: cat.imageUrl };
  }

  if (cat.type === '턱시도') {
    return catImages.tuxedo;
  }

  if (cat.type === '흰냥') {
    return catImages.gray;
  }

  if (cat.type === '삼색이' || cat.type === '검은냥') {
    return catImages.dark;
  }

  return catImages.orange;
}

function getCandidateSearchText(cat: Cat) {
  return [
    cat.name,
    cat.type,
    cat.relationshipLevel,
    cat.memo ?? '',
    ...cat.tags,
    ...(cat.regionNames ?? []),
  ]
    .join(' ')
    .toLowerCase();
}

function scoreCandidate(cat: Cat, query: string, regionName: string, coatFilter: CoatFilter): ScoredCandidate {
  const reasons: string[] = [];
  let score = 0;
  const normalizedRegion = normalizeSearchText(regionName);
  const matchesSearch = query.length > 0 && getCandidateSearchText(cat).includes(query);
  const matchesRegion =
    normalizedRegion.length > 0 &&
    (cat.regionNames ?? []).some((candidateRegion) => {
      const normalizedCandidateRegion = normalizeSearchText(candidateRegion);

      return normalizedCandidateRegion.includes(normalizedRegion) || normalizedRegion.includes(normalizedCandidateRegion);
    });
  const matchesCoat = coatFilter !== '전체' && cat.type === coatFilter;

  if (matchesSearch) {
    score += 4;
    reasons.push('검색 일치');
  }

  if (matchesRegion) {
    score += 4;
    reasons.push('같은 동네');
  }

  if (matchesCoat) {
    score += 3;
    reasons.push('같은 털색');
  }

  if (cat.encounterCount > 1) {
    score += 1;
    reasons.push(`${cat.encounterCount}회 기록`);
  }

  return { cat, reasons, score };
}

function buildEncounterMemo(memo: string, selectedTags: readonly string[]) {
  const trimmedMemo = memo.trim();
  const parts = [trimmedMemo.length > 0 ? trimmedMemo : '다시 만남 기록'];

  if (selectedTags.length > 0) {
    parts.push(`관찰 태그: ${selectedTags.join(', ')}`);
  }

  return parts.join('\n');
}

export function RediscoveryPanel({
  capturedImageUri,
  coatOptions,
  existingCats,
  isSubmitting = false,
  onRecordExisting,
  regions,
  suggestedRegionName,
}: RediscoveryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [coatFilter, setCoatFilter] = useState<CoatFilter>('전체');
  const [regionName, setRegionName] = useState('');
  const [memo, setMemo] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const normalizedSearchQuery = normalizeSearchText(searchQuery);
  const trimmedRegionName = regionName.trim();
  const canSubmit = trimmedRegionName.length > 0 && !isSubmitting;
  const regionOptions = useMemo(() => {
    const names = regions.map((region) => region.name);

    if (suggestedRegionName) {
      return [suggestedRegionName, ...names.filter((name) => name !== suggestedRegionName)].slice(0, 6);
    }

    return names.slice(0, 6);
  }, [regions, suggestedRegionName]);
  const hasCandidateFilter = normalizedSearchQuery.length > 0 || trimmedRegionName.length > 0 || coatFilter !== '전체';
  const scoredCandidates = useMemo(
    () =>
      existingCats
        .map((cat) => scoreCandidate(cat, normalizedSearchQuery, trimmedRegionName, coatFilter))
        .sort((a, b) => b.score - a.score || b.cat.encounterCount - a.cat.encounterCount),
    [coatFilter, existingCats, normalizedSearchQuery, trimmedRegionName],
  );
  const matchedCandidates = hasCandidateFilter ? scoredCandidates.filter((candidate) => candidate.score > 0) : scoredCandidates;
  const shouldShowFallbackCandidates = hasCandidateFilter && matchedCandidates.length === 0;
  const visibleCandidates = (matchedCandidates.length > 0 ? matchedCandidates : scoredCandidates).slice(0, 6);

  useEffect(() => {
    if (!suggestedRegionName) {
      return;
    }

    setRegionName((current) => (current.trim().length > 0 ? current : suggestedRegionName));
  }, [suggestedRegionName]);

  const handleToggleTag = (tag: string) => {
    setSelectedTags((current) => (current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag]));
  };

  const handleRecordCandidate = (catId: string) => {
    if (!canSubmit) {
      return;
    }

    onRecordExisting(catId, {
      regionName: trimmedRegionName,
      memo: buildEncounterMemo(memo, selectedTags),
      imageUrl: capturedImageUri ?? undefined,
    });
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.icon}>
          <RotateCcw color={theme.colors.primaryDark} size={18} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>다시 만난 고양이 기록</Text>
          <Text style={styles.subtitle}>이전에 본 고양이와 비슷하면 새로 만들지 않고 오늘의 만남으로 이어 붙여요.</Text>
        </View>
      </View>

      <View style={styles.searchBar}>
        <Search color={theme.colors.mutedText} size={17} />
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setSearchQuery}
          placeholder="이름, 특징, 동네로 후보 찾기"
          placeholderTextColor="#B59680"
          returnKeyType="search"
          style={styles.searchInput}
          value={searchQuery}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>오늘 다시 만난 곳</Text>
        <View style={styles.regionInputWrap}>
          <MapPin color={theme.colors.accent} size={16} />
          <TextInput
            onChangeText={setRegionName}
            placeholder="동네 단위로 입력해 주세요"
            placeholderTextColor="#B59680"
            style={styles.regionInput}
            value={regionName}
          />
        </View>
        {regionOptions.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.regionChips}>
              {regionOptions.map((option) => (
                <Chip key={option} onPress={() => setRegionName(option)} selected={option === trimmedRegionName}>
                  {option}
                </Chip>
              ))}
            </View>
          </ScrollView>
        ) : null}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>비슷한 털색</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {(['전체', ...coatOptions] as CoatFilter[]).map((option) => (
              <Chip key={option} onPress={() => setCoatFilter(option)} selected={option === coatFilter}>
                {option}
              </Chip>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>오늘의 변화</Text>
        <View style={styles.tagRow}>
          {observationTagOptions.map((tag) => (
            <Chip key={tag} onPress={() => handleToggleTag(tag)} selected={selectedTags.includes(tag)}>
              {tag}
            </Chip>
          ))}
        </View>
        <TextInput
          multiline
          onChangeText={setMemo}
          placeholder="지난번과 달라진 점이나 같이 있던 고양이를 적어보세요"
          placeholderTextColor="#B59680"
          style={styles.memoInput}
          textAlignVertical="top"
          value={memo}
        />
      </View>

      <View style={styles.candidateHeader}>
        <Text style={styles.label}>같은 고양이 후보</Text>
        <Text style={styles.candidateHint}>{canSubmit ? '후보를 누르면 저장돼요' : '장소를 입력해 주세요'}</Text>
      </View>
      {shouldShowFallbackCandidates ? <Text style={styles.fallbackText}>조건에 맞는 후보가 없어 최근 고양이를 보여줘요.</Text> : null}

      {visibleCandidates.length > 0 ? (
        <View style={styles.candidateGrid}>
          {visibleCandidates.map(({ cat, reasons }) => (
            <Pressable
              disabled={!canSubmit}
              key={cat.id}
              onPress={() => handleRecordCandidate(cat.id)}
              style={({ pressed }) => [styles.candidate, pressed && styles.pressed, !canSubmit && styles.disabled]}
            >
              <Image resizeMode="cover" source={imageForCat(cat)} style={styles.candidateImage} />
              <View style={styles.candidateCopy}>
                <Text numberOfLines={1} style={styles.candidateName}>
                  {cat.name}
                </Text>
                <Text numberOfLines={1} style={styles.candidateMeta}>
                  {reasons.length > 0 ? reasons.join(' · ') : `${cat.relationshipLevel} · 최근 기록`}
                </Text>
                <Text style={styles.candidateAction}>{canSubmit ? '재관찰 저장' : '장소 필요'}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.emptyCandidate}>
          <Sparkles color={theme.colors.accent} size={18} />
          <Text style={styles.emptyCandidateText}>아직 재관찰할 도감 고양이가 없어요.</Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.92)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceAlt,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.mutedText,
  },
  searchBar: {
    minHeight: 44,
    marginTop: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: '#FFF8EC',
    borderWidth: 1,
    borderColor: '#EAD9C4',
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  fieldGroup: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    color: '#8B6956',
  },
  regionInputWrap: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: '#F7EBD8',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  regionInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  regionChips: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  memoInput: {
    minHeight: 82,
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
  candidateHeader: {
    marginTop: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  candidateHint: {
    flexShrink: 0,
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '700',
  },
  fallbackText: {
    marginTop: theme.spacing.sm,
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  candidateGrid: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  candidate: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.sm,
    backgroundColor: '#FFF8EC',
    borderWidth: 1,
    borderColor: '#EAD9C4',
  },
  candidateImage: {
    width: 58,
    height: 58,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
  },
  candidateCopy: {
    flex: 1,
    minWidth: 0,
  },
  candidateName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  candidateMeta: {
    marginTop: 3,
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
  },
  candidateAction: {
    marginTop: 6,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    overflow: 'hidden',
    backgroundColor: theme.colors.accentSoft,
    color: '#536845',
    fontSize: 11,
    fontWeight: '900',
  },
  emptyCandidate: {
    minHeight: 70,
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    backgroundColor: '#FFF8EC',
    borderWidth: 1,
    borderColor: '#EAD9C4',
  },
  emptyCandidateText: {
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.84,
  },
  disabled: {
    opacity: 0.56,
  },
});
