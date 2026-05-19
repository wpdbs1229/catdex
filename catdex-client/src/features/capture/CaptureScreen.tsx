import { useState } from 'react';
import { Camera, PawPrint, RotateCcw, Sparkles } from 'lucide-react-native';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { CameraPlaceholder } from '@/features/capture/components/CameraPlaceholder';
import { CatRegisterForm } from '@/features/capture/components/CatRegisterForm';
import { Card } from '@/shared/components/Card';
import { createShadow, theme } from '@/shared/styles/theme';
import type { CaptureCatDraft, Cat, CatType, PersonalityTag } from '@/shared/types/cat';

interface CaptureScreenProps {
  coatOptions: CatType[];
  existingCats: Cat[];
  personalityOptions: PersonalityTag[];
  isSubmitting?: boolean;
  onRecordExisting: (catId: string) => Promise<void> | void;
  onSave: (draft: CaptureCatDraft) => Promise<void> | void;
  onSaveSighting: (draft: CaptureCatDraft) => Promise<void> | void;
}

const catImages = {
  orange: require('../../../assets/illustrations/cat-orange-clean.png'),
  dark: require('../../../assets/illustrations/cat-dark-clean.png'),
  tuxedo: require('../../../assets/illustrations/cat-tuxedo-clean.png'),
  gray: require('../../../assets/illustrations/cat-gray-clean.png'),
} satisfies Record<string, ImageSourcePropType>;

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
  const candidateCats = existingCats.slice(0, 3);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>새 고양이 등록</Text>
          <PawPrint color={theme.colors.primary} size={18} />
        </View>
        <Text style={styles.subtitle}>카메라로 고양이를 촬영하고 도감에 기록해요.</Text>
      </View>

      <View style={styles.cameraFrame}>
        <CameraPlaceholder
          capturedImageUri={capturedImageUri}
          onPhotoCaptured={setCapturedImageUri}
          onRetake={() => setCapturedImageUri(null)}
        />
      </View>

      <Card style={styles.rediscoveryCard}>
        <View style={styles.rediscoveryHeader}>
          <View style={styles.rediscoveryIcon}>
            <RotateCcw color={theme.colors.primaryDark} size={18} />
          </View>
          <View style={styles.rediscoveryText}>
            <Text style={styles.rediscoveryTitle}>기존 고양이 재발견</Text>
            <Text style={styles.rediscoverySubtitle}>이미 도감에 있는 고양이라면 재발견으로 기록해요.</Text>
          </View>
        </View>

        {candidateCats.length > 0 ? (
          <View style={styles.candidateRow}>
            {candidateCats.map((cat) => (
              <Pressable
                disabled={isSubmitting}
                key={cat.id}
                onPress={() => onRecordExisting(cat.id)}
                style={({ pressed }) => [styles.candidate, pressed && styles.pressed]}
              >
                <Image resizeMode="cover" source={imageForCat(cat)} style={styles.candidateImage} />
                <Text numberOfLines={1} style={styles.candidateName}>
                  {cat.name}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCandidate}>
            <Sparkles color={theme.colors.accent} size={18} />
            <Text style={styles.emptyCandidateText}>아직 재발견할 내 도감 고양이가 없어요.</Text>
          </View>
        )}
      </Card>

      <View style={styles.formHeader}>
        <Camera color={theme.colors.primaryDark} size={18} />
        <Text style={styles.formTitle}>촬영 기록 작성</Text>
      </View>

      <CatRegisterForm
        capturedImageUri={capturedImageUri}
        coatOptions={coatOptions}
        isSubmitting={isSubmitting}
        onSubmit={onSave}
        onSubmitSighting={onSaveSighting}
        personalityOptions={personalityOptions}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: 132,
  },
  header: {
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: 26,
    fontWeight: theme.typography.titleWeight,
    letterSpacing: theme.typography.letterSpacing,
    color: theme.colors.text,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: theme.colors.mutedText,
  },
  cameraFrame: {
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
    ...createShadow(10),
  },
  rediscoveryCard: {
    marginTop: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.92)',
    overflow: 'hidden',
  },
  rediscoveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  rediscoveryIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceAlt,
  },
  rediscoveryText: {
    flex: 1,
  },
  rediscoveryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
  },
  rediscoverySubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.mutedText,
  },
  candidateRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  candidate: {
    flex: 1,
    minWidth: 0,
    borderRadius: theme.radius.md,
    padding: 6,
    backgroundColor: 'rgba(248,234,210,0.76)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.88)',
  },
  pressed: {
    opacity: 0.82,
  },
  candidateImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: theme.radius.sm,
  },
  candidateName: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.text,
  },
  emptyCandidate: {
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(221,229,200,0.52)',
  },
  emptyCandidateText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.mutedText,
  },
  formHeader: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
});
