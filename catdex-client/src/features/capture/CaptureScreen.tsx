import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import type { CaptureCatDraft, Cat, CatType, PersonalityTag } from '@/shared/types/cat';
import { CameraPlaceholder } from '@/features/capture/components/CameraPlaceholder';
import { CatRegisterForm } from '@/features/capture/components/CatRegisterForm';
import { theme } from '@/shared/styles/theme';

interface CaptureScreenProps {
  coatOptions: CatType[];
  existingCats: Cat[];
  personalityOptions: PersonalityTag[];
  isSubmitting?: boolean;
  onRecordExisting: (catId: string) => Promise<void> | void;
  onSave: (draft: CaptureCatDraft) => Promise<void> | void;
  onSaveSighting: (draft: CaptureCatDraft) => Promise<void> | void;
}

export function CaptureScreen({
  coatOptions,
  existingCats,
  personalityOptions,
  isSubmitting = false,
  onRecordExisting,
  onSave,
  onSaveSighting,
}: CaptureScreenProps) {
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);

  return (
    <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>촬영 / 등록</Text>
          </View>
          <Text style={styles.title}>새 고양이 등록</Text>
          <Text style={styles.subtitle}>카메라로 고양이를 촬영하고 도감에 기록해보세요.</Text>
        </View>
        <View style={styles.mockPill}>
          <Text style={styles.mockPillText}>camera</Text>
        </View>
      </View>

      <CameraPlaceholder capturedImageUri={capturedImageUri} onPhotoCaptured={setCapturedImageUri} onRetake={() => setCapturedImageUri(null)} />

      <View style={styles.formWrap}>
        <Card style={styles.existingCard}>
          <Text style={styles.sectionTitle}>기존 고양이 재발견</Text>
          <Text style={styles.sectionSubtitle}>이미 공유 도감에 있는 고양이라면 새로 만들지 않고 발견 기록만 추가하세요.</Text>
          <View style={styles.existingList}>
            {existingCats.slice(0, 3).map((cat) => (
              <View key={cat.id} style={styles.existingRow}>
                <View style={styles.existingMeta}>
                  <Text style={styles.existingName}>{cat.name}</Text>
                  <Text style={styles.existingSub}>
                    No.{String(cat.number).padStart(3, '0')} · {cat.type}
                  </Text>
                </View>
                <Button disabled={isSubmitting} onPress={() => onRecordExisting(cat.id)} variant="secondary">
                  봤어요
                </Button>
              </View>
            ))}
            {existingCats.length === 0 ? <Text style={styles.emptyText}>아직 공유 고양이가 없어요.</Text> : null}
          </View>
        </Card>

        <CatRegisterForm
          coatOptions={coatOptions}
          capturedImageUri={capturedImageUri}
          isSubmitting={isSubmitting}
          onSubmit={onSave}
          onSubmitSighting={onSaveSighting}
          personalityOptions={personalityOptions}
        />
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
  header: {
    marginBottom: theme.spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#916B53',
  },
  title: {
    marginTop: theme.spacing.md,
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.text,
  },
  subtitle: {
    marginTop: theme.spacing.sm,
    maxWidth: 240,
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.mutedText,
  },
  mockPill: {
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  mockPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#966F56',
  },
  formWrap: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  existingCard: {
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  sectionSubtitle: {
    marginTop: theme.spacing.sm,
    color: theme.colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
  existingList: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  existingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  existingMeta: {
    flex: 1,
  },
  existingName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  existingSub: {
    marginTop: 4,
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    color: theme.colors.mutedText,
    fontSize: 14,
    fontWeight: '600',
  },
});
