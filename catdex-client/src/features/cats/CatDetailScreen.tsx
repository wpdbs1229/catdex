import { useState } from 'react';
import { ArrowLeft, Info, X } from 'lucide-react-native';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CatAffinityGauge } from '@/features/cats/components/CatAffinityGauge';
import { EncounterTimeline } from '@/features/cats/components/EncounterTimeline';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { Chip } from '@/shared/components/Chip';
import type { Cat, CatEncounter } from '@/shared/types/cat';
import {
  formatDisplayDate,
  getAffinityFromRelationship,
  getCatVisual,
  getRarityGuide,
  getRarityLabel,
  getRarityStars,
} from '@/shared/utils/catPresentation';
import { theme } from '@/shared/styles/theme';

interface CatDetailScreenProps {
  cat: Cat;
  encounters: CatEncounter[];
  onBack: () => void;
  onRecordEncounter: () => void;
  onReportCat: () => void;
}

export function CatDetailScreen({ cat, encounters, onBack, onRecordEncounter, onReportCat }: CatDetailScreenProps) {
  const [isRarityGuideOpen, setIsRarityGuideOpen] = useState(false);
  const visual = getCatVisual(cat.type);
  const rarityGuide = getRarityGuide(cat);

  return (
    <>
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
            <Pressable
              accessibilityLabel="희귀도 산정 기준 보기"
              onPress={() => setIsRarityGuideOpen(true)}
              style={styles.rarityButton}
            >
              <Text style={styles.stars}>{getRarityStars(cat.rarity).map((isOn) => (isOn ? '★' : '☆')).join('')}</Text>
              <Info color={theme.colors.primaryDark} size={15} />
            </Pressable>
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

        <View style={styles.buttonWrap}>
          <Button onPress={onRecordEncounter}>나도 봤어요</Button>
          <Button onPress={onReportCat} variant="secondary">
            신고하기
          </Button>
        </View>
      </ScrollView>

      <Modal animationType="fade" onRequestClose={() => setIsRarityGuideOpen(false)} transparent visible={isRarityGuideOpen}>
        <View style={styles.modalBackdrop}>
          <View style={styles.rarityModal}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleGroup}>
                <Text style={styles.modalKicker}>희귀도 산정</Text>
                <Text style={styles.modalTitle}>{getRarityLabel(cat.rarity)}</Text>
              </View>
              <Pressable accessibilityLabel="희귀도 산정 기준 닫기" onPress={() => setIsRarityGuideOpen(false)} style={styles.modalCloseButton}>
                <X color={theme.colors.primaryDark} size={20} />
              </Pressable>
            </View>

            <View style={styles.rarityScoreCard}>
              <Text style={styles.rarityScoreLabel}>현재 희귀도</Text>
              <Text style={styles.rarityScoreStars}>{getRarityStars(cat.rarity).map((isOn) => (isOn ? '★' : '☆')).join('')}</Text>
              <Text style={styles.rarityScoreText}>{cat.rarity} / 5성</Text>
            </View>

            <View style={styles.reasonList}>
              {rarityGuide.map((reason) => (
                <View key={reason} style={styles.reasonRow}>
                  <View style={styles.reasonDot} />
                  <Text style={styles.reasonText}>{reason}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.rarityNote}>
              희귀도는 처음 등록될 때 털색과 동네/전체 도감 분포로 정해져요. 다시 만난 횟수는 관계 레벨에만 반영돼요.
            </Text>
          </View>
        </View>
      </Modal>
    </>
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
  rarityButton: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 17,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: 'rgba(255,248,236,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.14)',
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
  buttonWrap: {
    marginTop: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(47,36,29,0.36)',
  },
  rarityModal: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: 34,
    backgroundColor: '#FFF8EC',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  modalTitleGroup: {
    flex: 1,
  },
  modalKicker: {
    color: theme.colors.accent,
    fontSize: 11,
    fontWeight: '900',
  },
  modalTitle: {
    marginTop: 3,
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,253,246,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.14)',
  },
  rarityScoreCard: {
    marginTop: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    backgroundColor: '#FFF0DC',
    borderWidth: 1,
    borderColor: 'rgba(201,121,73,0.22)',
  },
  rarityScoreLabel: {
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '800',
  },
  rarityScoreStars: {
    marginTop: theme.spacing.sm,
    color: theme.colors.warning,
    fontSize: 24,
    fontWeight: '900',
  },
  rarityScoreText: {
    marginTop: theme.spacing.xs,
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
  },
  reasonList: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.lg,
  },
  reasonRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  reasonDot: {
    width: 7,
    height: 7,
    marginTop: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.accent,
  },
  reasonText: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
  },
  rarityNote: {
    marginTop: theme.spacing.lg,
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
});
