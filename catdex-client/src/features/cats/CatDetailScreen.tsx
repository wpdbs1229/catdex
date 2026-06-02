import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react-native';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CatAffinityGauge } from '@/features/cats/components/CatAffinityGauge';
import { EncounterTimeline } from '@/features/cats/components/EncounterTimeline';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { Chip } from '@/shared/components/Chip';
import type { Cat, CatEncounter, CatEncounterDraft } from '@/shared/types/cat';
import { formatDisplayDate, getAffinityFromRelationship, getCatVisual, getRarityStars } from '@/shared/utils/catPresentation';
import { theme } from '@/shared/styles/theme';

interface CatDetailScreenProps {
  cat: Cat;
  encounters: CatEncounter[];
  onBack: () => void;
  onRecordEncounter: (draft: CatEncounterDraft) => void;
  onReportCat: () => void;
}

export function CatDetailScreen({ cat, encounters, onBack, onRecordEncounter, onReportCat }: CatDetailScreenProps) {
  const visual = getCatVisual(cat.type);
  const lastEncounter = encounters[encounters.length - 1];
  const [isRecordFormOpen, setIsRecordFormOpen] = useState(false);
  const [recordRegionName, setRecordRegionName] = useState('');
  const [recordMemo, setRecordMemo] = useState('');
  const canSubmitRecord = recordRegionName.trim().length > 0;

  useEffect(() => {
    setIsRecordFormOpen(false);
    setRecordMemo('');
    setRecordRegionName(lastEncounter?.regionName ?? '');
  }, [cat.id]);

  useEffect(() => {
    if (!lastEncounter?.regionName) {
      return;
    }

    setRecordRegionName((current) => (current.trim().length > 0 ? current : lastEncounter.regionName));
  }, [lastEncounter?.regionName]);

  const handleSubmitRecord = () => {
    if (!canSubmitRecord) {
      return;
    }

    onRecordEncounter({
      regionName: recordRegionName.trim(),
      memo: recordMemo.trim() || '다시 만남 기록',
    });
    setRecordMemo('');
    setIsRecordFormOpen(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <ArrowLeft color={theme.colors.text} size={20} />
        </Pressable>
        <Text style={styles.number}>No.{String(cat.number).padStart(3, '0')}</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <Card style={styles.heroCard}>
        <View style={[styles.heroArt, { backgroundColor: visual.colors[0] }]}>
          {cat.imageUrl ? <Image source={{ uri: cat.imageUrl }} style={styles.heroImage} /> : <Text style={styles.heroEmoji}>{visual.emoji}</Text>}
        </View>
        <View style={styles.heroHeader}>
          <View style={styles.heroTitleWrap}>
            <Text style={styles.heroTitle}>{cat.name}</Text>
            <Chip>{cat.type}</Chip>
          </View>
          <Text style={styles.stars}>{getRarityStars(cat.rarity).map((isOn) => (isOn ? '★' : '☆')).join('')}</Text>
        </View>
        <Text style={styles.relationship}>{cat.relationshipLevel}</Text>
      </Card>

      <View style={styles.infoGrid}>
        <Card style={styles.infoCard}>
          <Text style={styles.infoLabel}>발견 횟수</Text>
          <Text style={styles.infoValue}>{cat.encounterCount}회</Text>
        </Card>
        <Card style={styles.infoCard}>
          <Text style={styles.infoLabel}>관계 레벨</Text>
          <Text style={styles.infoValueSmall}>{cat.relationshipLevel}</Text>
        </Card>
      </View>

      <Card style={styles.dateCard}>
        <View style={styles.dateRow}>
          <View style={styles.dateBlock}>
            <Text style={styles.infoLabel}>처음 만난 날</Text>
            <Text style={styles.dateValue}>{formatDisplayDate(cat.firstSeenAt)}</Text>
          </View>
          <View style={styles.dateBlock}>
            <Text style={styles.infoLabel}>최근 만난 날</Text>
            <Text style={styles.dateValue}>{formatDisplayDate(cat.lastSeenAt)}</Text>
          </View>
        </View>
      </Card>

      <CatAffinityGauge value={getAffinityFromRelationship(cat)} />

      <Card style={styles.tagCard}>
        <Text style={styles.infoLabel}>태그</Text>
        <View style={styles.tagWrap}>
          {cat.tags.map((tag) => (
            <Chip key={tag}>{tag}</Chip>
          ))}
        </View>
        {cat.memo ? <Text style={styles.memo}>{cat.memo}</Text> : null}
      </Card>

      <EncounterTimeline encounters={encounters} />

      {isRecordFormOpen ? (
        <Card style={styles.recordCard}>
          <Text style={styles.recordTitle}>오늘 다시 만난 기록</Text>
          <View style={styles.recordField}>
            <Text style={styles.infoLabel}>다시 만난 곳</Text>
            <TextInput
              onChangeText={setRecordRegionName}
              placeholder="동네 단위로 입력해 주세요"
              placeholderTextColor="#B59680"
              style={styles.input}
              value={recordRegionName}
            />
          </View>
          <View style={styles.recordField}>
            <Text style={styles.infoLabel}>변화 메모</Text>
            <TextInput
              multiline
              onChangeText={setRecordMemo}
              placeholder="지난번과 달라진 점을 적어보세요"
              placeholderTextColor="#B59680"
              style={styles.textarea}
              textAlignVertical="top"
              value={recordMemo}
            />
          </View>
          <View style={styles.recordActions}>
            <Button disabled={!canSubmitRecord} onPress={handleSubmitRecord}>재관찰 저장</Button>
            <Button onPress={() => setIsRecordFormOpen(false)} variant="ghost">취소</Button>
          </View>
        </Card>
      ) : null}

      <View style={styles.buttonWrap}>
        <Button onPress={() => setIsRecordFormOpen(true)}>다시 만난 기록 남기기</Button>
        <Button onPress={onReportCat} variant="secondary">
          신고하기
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: 140,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  backButtonPlaceholder: {
    width: 44,
  },
  number: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.mutedText,
  },
  heroCard: {
    marginTop: theme.spacing.lg,
  },
  heroArt: {
    height: 260,
    borderRadius: theme.radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroEmoji: {
    fontSize: 84,
  },
  heroHeader: {
    marginTop: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  heroTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    flex: 1,
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: theme.colors.text,
  },
  stars: {
    fontSize: 14,
    color: theme.colors.primary,
  },
  relationship: {
    marginTop: theme.spacing.sm,
    fontSize: 14,
    color: theme.colors.mutedText,
  },
  infoGrid: {
    marginTop: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoCard: {
    width: '48.5%',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B6956',
  },
  infoValue: {
    marginTop: theme.spacing.md,
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
  },
  infoValueSmall: {
    marginTop: theme.spacing.md,
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  dateCard: {
    marginTop: theme.spacing.lg,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateBlock: {
    width: '48%',
  },
  dateValue: {
    marginTop: theme.spacing.sm,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  tagCard: {
    marginTop: theme.spacing.lg,
  },
  tagWrap: {
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  memo: {
    marginTop: theme.spacing.md,
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.mutedText,
  },
  recordCard: {
    marginTop: theme.spacing.lg,
  },
  recordTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  recordField: {
    marginTop: theme.spacing.md,
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
  textarea: {
    marginTop: theme.spacing.sm,
    minHeight: 88,
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
  recordActions: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  buttonWrap: {
    marginTop: theme.spacing.xl,
    gap: theme.spacing.md,
  },
});
