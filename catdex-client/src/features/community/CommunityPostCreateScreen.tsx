import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChevronLeft, ShieldCheck } from 'lucide-react-native';
import { CommunityMediaPicker, type CommunityDraftMedia } from '@/features/community/components/CommunityMediaPicker';
import { COMMUNITY_MEDIA_CONFIG, type CommunityCreatePostInput, type CommunityPost } from '@/features/community/types';
import { theme } from '@/shared/styles/theme';
import type { AuthUser } from '@/shared/types/auth';

interface CommunityPostCreateScreenProps {
  currentUser: AuthUser | null;
  onBack: () => void;
  onCreatePost: (input: CommunityCreatePostInput, author: AuthUser) => Promise<CommunityPost> | CommunityPost;
}

export function CommunityPostCreateScreen({ currentUser, onBack, onCreatePost }: CommunityPostCreateScreenProps) {
  const [content, setContent] = useState('');
  const [mediaList, setMediaList] = useState<CommunityDraftMedia[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const trimmedContent = content.trim();
  const canSubmit = !isSubmitting && Boolean(trimmedContent || mediaList.length > 0);

  const handleSubmit = async () => {
    if (!currentUser) {
      Alert.alert('로그인이 필요해요', '게시글 작성은 로그인 후 이용할 수 있어요.');
      return;
    }

    if (!canSubmit) {
      Alert.alert('게시글 확인', '본문이나 사진, 영상 중 하나 이상을 추가해 주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      await onCreatePost(
        {
          content: trimmedContent,
          mediaList: mediaList.map(({ id: _id, ...media }) => media),
          linkedCatIds: [],
        },
        currentUser,
      );
      Alert.alert('등록 완료', '새 게시글이 커뮤니티에 올라갔어요.');
      onBack();
    } catch (error) {
      Alert.alert('등록 실패', error instanceof Error ? error.message : '게시글을 등록하지 못했어요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Pressable disabled={isSubmitting} onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <ChevronLeft color={theme.colors.primaryDark} size={22} />
        </Pressable>
        <Text style={styles.title}>게시글 작성</Text>
        <Pressable
          disabled={!canSubmit}
          onPress={handleSubmit}
          style={({ pressed }) => [styles.submitButton, canSubmit && styles.submitButtonActive, pressed && canSubmit && styles.pressed]}
        >
          <Text style={[styles.submitText, canSubmit && styles.submitTextActive]}>{isSubmitting ? '등록 중' : '등록'}</Text>
        </Pressable>
      </View>

      <View style={styles.composer}>
        <TextInput
          editable={!isSubmitting}
          maxLength={COMMUNITY_MEDIA_CONFIG.maxContentLength}
          multiline
          onChangeText={setContent}
          placeholder="고양이 이야기를 공유해보세요."
          placeholderTextColor="#B59680"
          style={styles.input}
          textAlignVertical="top"
          value={content}
        />
        <Text style={styles.counter}>
          {content.length} / {COMMUNITY_MEDIA_CONFIG.maxContentLength}
        </Text>
      </View>

      <View style={styles.mediaSection}>
        <CommunityMediaPicker disabled={isSubmitting} mediaList={mediaList} onChange={setMediaList} />
      </View>

      <View style={styles.noticeBox}>
        <ShieldCheck color={theme.colors.accent} size={18} />
        <Text style={styles.noticeText}>정확한 주소, 급식소, 개인 주거지처럼 민감한 위치가 드러나지 않는지 확인해 주세요.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: 148,
    gap: theme.spacing.md,
  },
  header: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,253,246,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.82)',
  },
  title: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  submitButton: {
    minWidth: 58,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.84)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.82)',
  },
  submitButtonActive: {
    backgroundColor: theme.colors.primaryDark,
    borderColor: theme.colors.primaryDark,
  },
  submitText: {
    color: theme.colors.mutedText,
    fontSize: 13,
    fontWeight: '900',
  },
  submitTextActive: {
    color: '#FFF8F0',
  },
  composer: {
    minHeight: 230,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(255,253,246,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.88)',
  },
  input: {
    flex: 1,
    minHeight: 170,
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 23,
  },
  counter: {
    alignSelf: 'flex-end',
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  mediaSection: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.76)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.72)',
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(221,232,200,0.54)',
    borderWidth: 1,
    borderColor: 'rgba(111,155,114,0.22)',
  },
  noticeText: {
    flex: 1,
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.82,
  },
});
