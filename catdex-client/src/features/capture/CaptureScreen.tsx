import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { CaptureCatDraft, CatType, PersonalityTag } from '@/shared/types/cat';
import { CameraPlaceholder } from '@/features/capture/components/CameraPlaceholder';
import { CatRegisterForm } from '@/features/capture/components/CatRegisterForm';
import { theme } from '@/shared/styles/theme';

interface CaptureScreenProps {
  coatOptions: CatType[];
  personalityOptions: PersonalityTag[];
  isSubmitting?: boolean;
  onSave: (draft: CaptureCatDraft) => Promise<void> | void;
}

export function CaptureScreen({
  coatOptions,
  personalityOptions,
  isSubmitting = false,
  onSave,
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
        <CatRegisterForm
          coatOptions={coatOptions}
          capturedImageUri={capturedImageUri}
          isSubmitting={isSubmitting}
          onSubmit={onSave}
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
  },
});
