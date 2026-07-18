import { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AlertCircle, ArrowLeft, Camera, ImagePlus, PawPrint, Send, ShieldCheck, Trash2, X } from 'lucide-react-native';
import { communityComposerTopicOptions } from '@/features/community/community.constants';
import { createCommunityPost } from '@/shared/api/community.api';
import { getUserFacingError, type UserFacingError } from '@/shared/errors/user-facing-error';
import { createShadow, theme } from '@/shared/styles/theme';
import type { Cat } from '@/shared/types/cat';
import type { CommunityPostImageDraft, CommunityTopic } from '@/shared/types/community';
import { getRarityLabel } from '@/shared/utils/catPresentation';

const MAX_POST_IMAGES = 5;

interface CommunityComposerScreenProps {
  cats: Cat[];
  initialCatId?: string | null;
  neighborhoodName: string;
  onBack: () => void;
  onCreated: (postId: string) => void;
}

export function CommunityComposerScreen({ cats, initialCatId, neighborhoodName, onBack, onCreated }: CommunityComposerScreenProps) {
  const [topic, setTopic] = useState<CommunityTopic>('SIGHTING');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string | null>(initialCatId ?? null);
  const [selectedImages, setSelectedImages] = useState<CommunityPostImageDraft[]>([]);
  const [isCatPickerOpen, setIsCatPickerOpen] = useState(false);
  const [error, setError] = useState<UserFacingError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedCat = cats.find((cat) => cat.id === selectedCatId) ?? null;
  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();
  const canSubmit = trimmedBody.length >= 2 && !isSubmitting;

  useEffect(() => {
    if (!error) {
      return;
    }

    const timerId = setTimeout(() => {
      setError(null);
    }, 4500);

    return () => {
      clearTimeout(timerId);
    };
  }, [error]);

  useEffect(() => {
    setSelectedCatId(initialCatId ?? null);
  }, [initialCatId]);

  const handleSelectCat = (cat: Cat) => {
    setSelectedCatId(cat.id);
    setIsCatPickerOpen(false);

    if (!title.trim()) {
      setTitle(`${cat.name} 소식 공유해요`);
    }
  };

  const handlePickImages = async () => {
    if (selectedImages.length >= MAX_POST_IMAGES) {
      Alert.alert('사진은 5장까지', '게시글 사진은 최대 5장까지 첨부할 수 있어요.');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('사진 접근 권한 필요', '게시글에 사진을 추가하려면 사진 접근을 허용해 주세요.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ['images'],
      quality: 0.84,
      selectionLimit: MAX_POST_IMAGES - selectedImages.length,
    });

    if (result.canceled) {
      return;
    }

    const nextImages = result.assets.map((asset) => ({
      uri: asset.uri,
      mimeType: asset.mimeType,
    }));

    setError(null);
    setSelectedImages((current) => [...current, ...nextImages].slice(0, MAX_POST_IMAGES));
  };

  const handleRemoveImage = (index: number) => {
    setError(null);
    setSelectedImages((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

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
        // 화면에 연결 카드로 보이는 고양이(내 도감에 있는)만 실제로 연결한다.
        // 목록에 없는 id가 남아 있으면 사용자가 모르는 연결이 게시글에 붙는다.
        catId: selectedCat ? selectedCat.id : undefined,
        images: selectedImages,
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
    <>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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
          <Text style={styles.description}>내 도감의 고양이를 연결하면 이웃이 어떤 아이 이야기인지 바로 이해할 수 있어요.</Text>
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
          <Text style={styles.label}>발견한 도감 연결</Text>
          {selectedCat ? (
            <View style={styles.linkedCatCard}>
              <View style={styles.linkedCatMain}>
                <View style={styles.linkedCatThumb}>
                  {selectedCat.imageUrl ? <Image source={{ uri: selectedCat.imageUrl }} style={styles.linkedCatImage} /> : <PawPrint color={theme.colors.primary} size={22} />}
                </View>
                <View style={styles.linkedCatCopy}>
                  <Text style={styles.linkedCatLabel}>연결된 고양이</Text>
                  <Text numberOfLines={1} style={styles.linkedCatName}>{selectedCat.name}</Text>
                  <Text numberOfLines={1} style={styles.linkedCatMeta}>
                    {selectedCat.type} · {getRarityLabel(selectedCat.rarity)} · {selectedCat.encounterCount}회 만남
                  </Text>
                </View>
              </View>
              <View style={styles.linkedCatActions}>
                <Pressable accessibilityLabel="연결 고양이 변경" accessibilityRole="button" onPress={() => setIsCatPickerOpen(true)} style={({ pressed }) => [styles.smallActionButton, pressed && styles.pressed]}>
                  <Text style={styles.smallActionText}>변경</Text>
                </Pressable>
                <Pressable accessibilityLabel="연결 고양이 해제" accessibilityRole="button" onPress={() => setSelectedCatId(null)} style={({ pressed }) => [styles.smallActionButton, styles.smallActionButtonMuted, pressed && styles.pressed]}>
                  <Text style={styles.smallActionMutedText}>해제</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable accessibilityLabel="발견한 고양이 연결하기" accessibilityRole="button" onPress={() => setIsCatPickerOpen(true)} style={({ pressed }) => [styles.emptyLinkedCatCard, pressed && styles.pressed]}>
              <View style={styles.emptyLinkedIcon}>
                <PawPrint color={theme.colors.primary} size={20} />
              </View>
              <View style={styles.emptyLinkedCopy}>
                <Text style={styles.emptyLinkedTitle}>발견한 고양이 연결하기</Text>
                <Text style={styles.emptyLinkedText}>내 도감의 고양이를 골라 게시글에 함께 보여줄 수 있어요.</Text>
              </View>
            </Pressable>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.photoLabelRow}>
            <Text style={styles.label}>사진</Text>
            <Text style={styles.photoCount}>{selectedImages.length}/{MAX_POST_IMAGES}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
            <Pressable
              accessibilityLabel="게시글 사진 추가"
              accessibilityRole="button"
              disabled={selectedImages.length >= MAX_POST_IMAGES}
              onPress={handlePickImages}
              style={({ pressed }) => [styles.addPhotoButton, selectedImages.length >= MAX_POST_IMAGES && styles.disabledPhotoButton, pressed && styles.pressed]}
            >
              <ImagePlus color={theme.colors.primary} size={23} />
              <Text style={styles.addPhotoText}>사진 추가</Text>
            </Pressable>
            {selectedImages.map((image, index) => (
              <View key={`${image.uri}-${index}`} style={styles.photoThumb}>
                <Image source={{ uri: image.uri }} style={styles.photoImage} />
                <Pressable accessibilityLabel={`${index + 1}번째 사진 제거`} accessibilityRole="button" onPress={() => handleRemoveImage(index)} style={styles.removePhotoButton}>
                  <Trash2 color="#FFF8F0" size={14} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
          <Text style={styles.helperText}>오늘 본 상황을 보여주는 사진을 올려주세요. 정확한 은신처는 노출하지 않는 게 좋아요.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>제목</Text>
          <TextInput
            onChangeText={(text) => {
              setError(null);
              setTitle(text);
            }}
            placeholder={selectedCat ? `예: 오늘 만난 ${selectedCat.name} 소식` : '예: 오늘 저녁 놀이터 근처에서 본 아이'}
            placeholderTextColor="#A99178"
            style={styles.input}
            value={title}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>내용</Text>
          <TextInput
            multiline
            onChangeText={(text) => {
              setError(null);
              setBody(text);
            }}
            placeholder="목격한 상황, 상태, 궁금한 점을 적어주세요"
            placeholderTextColor="#A99178"
            style={styles.textarea}
            textAlignVertical="top"
            value={body}
          />
          <Text style={[styles.helperText, trimmedBody.length < 2 && styles.requiredText]}>내용은 2자 이상 필요해요.</Text>
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
          <Text style={styles.safetyText}>게시글과 연결한 고양이 기록은 동네 게시판과 동네 도감에서 보일 수 있어요. 급식소, 정확한 좌표, 은신처는 쓰지 마세요.</Text>
        </View>

        <Pressable
          accessibilityLabel="게시글 올리기"
          accessibilityRole="button"
          disabled={!canSubmit}
          onPress={handleSubmit}
          style={({ pressed }) => [styles.submitButton, !canSubmit && styles.submitButtonDisabled, pressed && styles.pressed]}
        >
          {isSubmitting ? <ActivityIndicator color="#FFF8F0" size="small" /> : selectedImages.length > 0 ? <Camera color="#FFF8F0" size={17} /> : <Send color="#FFF8F0" size={17} />}
          <Text style={styles.submitButtonText}>{isSubmitting ? '올리는 중' : '게시글 올리기'}</Text>
        </Pressable>
      </ScrollView>

      <Modal animationType="fade" onRequestClose={() => setIsCatPickerOpen(false)} transparent visible={isCatPickerOpen}>
        <View style={styles.modalBackdrop}>
          <View style={styles.catPickerSheet}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleGroup}>
                <Text style={styles.modalKicker}>도감 연결</Text>
                <Text style={styles.modalTitle}>발견한 고양이 선택</Text>
              </View>
              <Pressable accessibilityLabel="고양이 선택 닫기" accessibilityRole="button" onPress={() => setIsCatPickerOpen(false)} style={styles.modalCloseButton}>
                <X color={theme.colors.primaryDark} size={20} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.catPickerList} showsVerticalScrollIndicator={false}>
              {cats.map((cat) => {
                const isActive = selectedCatId === cat.id;

                return (
                  <Pressable
                    accessibilityLabel={`${cat.name} 연결하기`}
                    accessibilityRole="button"
                    key={cat.id}
                    onPress={() => handleSelectCat(cat)}
                    style={({ pressed }) => [styles.catOption, isActive && styles.catOptionActive, pressed && styles.pressed]}
                  >
                    <View style={styles.catOptionThumb}>
                      {cat.imageUrl ? <Image source={{ uri: cat.imageUrl }} style={styles.catOptionImage} /> : <PawPrint color={theme.colors.primary} size={20} />}
                    </View>
                    <View style={styles.catOptionCopy}>
                      <Text numberOfLines={1} style={styles.catOptionName}>{cat.name}</Text>
                      <Text numberOfLines={1} style={styles.catOptionMeta}>
                        {cat.type} · {getRarityLabel(cat.rarity)} · {cat.encounterCount}회
                      </Text>
                    </View>
                    <Text style={[styles.catOptionState, isActive && styles.catOptionStateActive]}>{isActive ? '선택됨' : '연결'}</Text>
                  </Pressable>
                );
              })}

              {cats.length === 0 ? (
                <View style={styles.emptyCatList}>
                  <PawPrint color="#CDB58F" size={28} />
                  <Text style={styles.emptyCatListTitle}>아직 연결할 도감이 없어요</Text>
                  <Text style={styles.emptyCatListText}>먼저 고양이를 발견해 도감에 등록하면 게시글에 연결할 수 있어요.</Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
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
  linkedCatCard: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.76)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.12)',
    ...createShadow(3),
  },
  linkedCatMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  linkedCatThumb: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#FFF0DC',
  },
  linkedCatImage: {
    width: '100%',
    height: '100%',
  },
  linkedCatCopy: {
    flex: 1,
    minWidth: 0,
  },
  linkedCatLabel: {
    color: theme.colors.accent,
    fontSize: 11,
    fontWeight: '900',
  },
  linkedCatName: {
    marginTop: 3,
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  linkedCatMeta: {
    marginTop: 5,
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '800',
  },
  linkedCatActions: {
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  smallActionButton: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.primaryDark,
  },
  smallActionButtonMuted: {
    backgroundColor: 'rgba(255,248,236,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.12)',
  },
  smallActionText: {
    color: '#FFF8F0',
    fontSize: 12,
    fontWeight: '900',
  },
  smallActionMutedText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  emptyLinkedCatCard: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.12)',
  },
  emptyLinkedIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#FFF0DC',
  },
  emptyLinkedCopy: {
    flex: 1,
    minWidth: 0,
  },
  emptyLinkedTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  emptyLinkedText: {
    marginTop: 4,
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  photoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photoCount: {
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '900',
  },
  photoRow: {
    gap: theme.spacing.sm,
    paddingRight: theme.spacing.lg,
  },
  addPhotoButton: {
    width: 94,
    height: 94,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: theme.radius.lg,
    backgroundColor: 'rgba(255,253,246,0.72)',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(139,112,83,0.28)',
  },
  disabledPhotoButton: {
    opacity: 0.48,
  },
  addPhotoText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  photoThumb: {
    width: 94,
    height: 94,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: '#FFF0DC',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: 'rgba(47,36,29,0.72)',
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
    lineHeight: 17,
    fontWeight: '800',
  },
  requiredText: {
    color: theme.colors.primary,
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
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(47,36,29,0.36)',
  },
  catPickerSheet: {
    maxHeight: '78%',
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
  catPickerList: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  catOption: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.sm,
    backgroundColor: 'rgba(255,253,246,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(139,112,83,0.12)',
  },
  catOptionActive: {
    borderColor: 'rgba(111,131,77,0.32)',
    backgroundColor: 'rgba(221,232,200,0.58)',
  },
  catOptionThumb: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    overflow: 'hidden',
    backgroundColor: '#FFF0DC',
  },
  catOptionImage: {
    width: '100%',
    height: '100%',
  },
  catOptionCopy: {
    flex: 1,
    minWidth: 0,
  },
  catOptionName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  catOptionMeta: {
    marginTop: 4,
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '800',
  },
  catOptionState: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  catOptionStateActive: {
    color: theme.colors.accent,
  },
  emptyCatList: {
    minHeight: 168,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.xl,
    backgroundColor: 'rgba(255,253,246,0.62)',
  },
  emptyCatListTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  emptyCatListText: {
    maxWidth: 260,
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.82,
  },
});
