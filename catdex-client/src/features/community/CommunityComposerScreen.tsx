import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AlertCircle, ArrowLeft, PawPrint, Send, ShieldCheck } from 'lucide-react-native';
import { communityComposerTopicOptions } from '@/features/community/community.constants';
import { createCommunityPost } from '@/shared/api/community.api';
import { getUserFacingError, type UserFacingError } from '@/shared/errors/user-facing-error';
import { createShadow, theme } from '@/shared/styles/theme';
import type { Cat } from '@/shared/types/cat';
import type { CommunityTopic } from '@/shared/types/community';

interface CommunityComposerScreenProps {
  cats: Cat[];
  neighborhoodName: string;
  onBack: () => void;
  onCreated: (postId: string) => void;
}

export function CommunityComposerScreen({ cats, neighborhoodName, onBack, onCreated }: CommunityComposerScreenProps) {
  const [topic, setTopic] = useState<CommunityTopic>('SIGHTING');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [error, setError] = useState<UserFacingError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();
  const canSubmit = trimmedBody.length >= 2 && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const postId = await createCommunityPost({
        topic,
        title: trimmedTitle,
        body: trimmedBody,
        regionName: neighborhoodName,
        catId: selectedCatId ?? undefined,
      });
      onCreated(postId);
    } catch (nextError) {
      console.warn('[community] compose failed', nextError);
      setError(getUserFacingError(nextError, 'community.save'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topBar}>
        <Pressable accessibilityLabel="게시판으로 돌아가기" accessibilityRole="button" onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <ArrowLeft color={theme.colors.text} size={20} />
        </Pressable>
        <Text style={styles.topTitle}>글쓰기</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <View style={styles.header}>
        <Text style={styles.kicker}>동네 게시판</Text>
        <Text style={styles.title}>{neighborhoodName}에 글 쓰기</Text>
        <Text style={styles.description}>이웃이 실제로 이해할 수 있게 제목과 내용을 남겨주세요. 정확한 위치는 쓰지 않는 게 좋아요.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>주제</Text>
        <View style={styles.topicGrid}>
          {communityComposerTopicOptions.map((option) => {
            const isActive = topic === option.id;

            return (
              <Pressable
                accessibilityLabel={`주제 ${option.label}`}
                accessibilityRole="button"
                key={option.id}
                onPress={() => setTopic(option.id)}
                style={({ pressed }) => [styles.topicChip, isActive && styles.topicChipActive, pressed && styles.pressed]}
              >
                <Text style={[styles.topicLabel, isActive && styles.topicLabelActive]}>{option.label}</Text>
                <Text style={[styles.topicHelper, isActive && styles.topicHelperActive]}>{option.helper}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>제목</Text>
        <TextInput
          onChangeText={setTitle}
          placeholder="예: 오늘 저녁 놀이터 근처에서 본 아이"
          placeholderTextColor="#A99178"
          style={styles.input}
          value={title}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>내용</Text>
        <TextInput
          multiline
          onChangeText={setBody}
          placeholder="목격한 상황, 상태, 궁금한 점을 적어주세요"
          placeholderTextColor="#A99178"
          style={styles.textarea}
          textAlignVertical="top"
          value={body}
        />
        <Text style={[styles.helperText, trimmedBody.length < 2 && styles.requiredText]}>내용은 2자 이상 필요해요.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>관련 고양이</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
          <Pressable
            accessibilityLabel="관련 고양이 선택 안 함"
            accessibilityRole="button"
            onPress={() => setSelectedCatId(null)}
            style={({ pressed }) => [styles.catChip, selectedCatId === null && styles.catChipActive, pressed && styles.pressed]}
          >
            <Text style={[styles.catChipText, selectedCatId === null && styles.catChipTextActive]}>선택 안 함</Text>
          </Pressable>
          {cats.map((cat) => {
            const isActive = selectedCatId === cat.id;

            return (
              <Pressable
                accessibilityLabel={`관련 고양이 ${cat.name}`}
                accessibilityRole="button"
                key={cat.id}
                onPress={() => setSelectedCatId(cat.id)}
                style={({ pressed }) => [styles.catChip, isActive && styles.catChipActive, pressed && styles.pressed]}
              >
                <PawPrint color={isActive ? '#FFF8F0' : theme.colors.primary} size={13} />
                <Text numberOfLines={1} style={[styles.catChipText, isActive && styles.catChipTextActive]}>
                  {cat.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <AlertCircle color={theme.colors.primary} size={18} />
          <View style={styles.errorCopy}>
            <Text style={styles.errorTitle}>{error.title}</Text>
            <Text style={styles.errorText}>{error.message}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.safetyStrip}>
        <ShieldCheck color={theme.colors.accent} size={17} />
        <Text style={styles.safetyText}>급식소, 정확한 좌표, 은신처처럼 고양이 안전에 민감한 정보는 쓰지 마세요.</Text>
      </View>

      <Pressable
        accessibilityLabel="게시글 올리기"
        accessibilityRole="button"
        disabled={!canSubmit}
        onPress={handleSubmit}
        style={({ pressed }) => [styles.submitButton, !canSubmit && styles.submitButtonDisabled, pressed && styles.pressed]}
      >
        {isSubmitting ? <ActivityIndicator color="#FFF8F0" size="small" /> : <Send color="#FFF8F0" size={17} />}
        <Text style={styles.submitButtonText}>{isSubmitting ? '올리는 중' : '게시글 올리기'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: 132,
  },
  topBar: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255,253,246,0.78)',
  },
  backButtonPlaceholder: {
    width: 44,
  },
  topTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  header: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(255,253,246,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.1)',
    ...createShadow(4),
  },
  kicker: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  title: {
    marginTop: 4,
    color: theme.colors.text,
    fontSize: 25,
    lineHeight: 32,
    fontWeight: '900',
  },
  description: {
    marginTop: theme.spacing.sm,
    color: theme.colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },
  section: {
    gap: theme.spacing.sm,
  },
  label: {
    color: '#8B6956',
    fontSize: 14,
    fontWeight: '900',
  },
  topicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  topicChip: {
    width: '48.7%',
    minHeight: 86,
    justifyContent: 'center',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.11)',
  },
  topicChipActive: {
    backgroundColor: theme.colors.primaryDark,
    borderColor: theme.colors.primaryDark,
  },
  topicLabel: {
    color: theme.colors.primaryDark,
    fontSize: 14,
    fontWeight: '900',
  },
  topicLabelActive: {
    color: '#FFF8F0',
  },
  topicHelper: {
    marginTop: 5,
    color: theme.colors.mutedText,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '800',
  },
  topicHelperActive: {
    color: 'rgba(255,248,240,0.76)',
  },
  input: {
    minHeight: 50,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.76)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.12)',
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  textarea: {
    minHeight: 156,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.76)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.12)',
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
  },
  helperText: {
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '800',
  },
  requiredText: {
    color: theme.colors.primary,
  },
  catRow: {
    gap: theme.spacing.sm,
    paddingRight: theme.spacing.lg,
  },
  catChip: {
    maxWidth: 146,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 19,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.11)',
  },
  catChipActive: {
    backgroundColor: theme.colors.primaryDark,
    borderColor: theme.colors.primaryDark,
  },
  catChipText: {
    flexShrink: 1,
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  catChipTextActive: {
    color: '#FFF8F0',
  },
  errorCard: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(255,239,221,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(196,122,66,0.18)',
  },
  errorCopy: {
    flex: 1,
    minWidth: 0,
  },
  errorTitle: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  errorText: {
    marginTop: 2,
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
  },
  safetyStrip: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(221,232,200,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(111,131,77,0.12)',
  },
  safetyText: {
    flex: 1,
    color: theme.colors.primaryDark,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
  },
  submitButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderRadius: 26,
    backgroundColor: theme.colors.primaryDark,
    ...createShadow(5),
  },
  submitButtonDisabled: {
    opacity: 0.42,
  },
  submitButtonText: {
    color: '#FFF8F0',
    fontSize: 14,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.82,
  },
});
