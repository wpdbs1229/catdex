import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ChevronLeft, ImagePlus, RotateCcw, Sparkles } from 'lucide-react-native';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ImageSourcePropType } from 'react-native';
import { Button } from '@/shared/components/Button';
import { PROFILE_NICKNAME_SUGGESTIONS } from '@/shared/constants/profile.constants';
import { createShadow, theme } from '@/shared/styles/theme';
import type { AuthUser, ProfileUpdateDraft } from '@/shared/types/auth';

interface ProfileEditScreenProps {
  user: AuthUser;
  isSaving: boolean;
  onBack: () => void;
  onSave: (draft: ProfileUpdateDraft) => Promise<void> | void;
}

const illustrations = {
  profile: require('../../../assets/illustrations/default-profile-avatar.png'),
} satisfies Record<string, ImageSourcePropType>;

export function ProfileEditScreen({ user, isSaving, onBack, onSave }: ProfileEditScreenProps) {
  const [nickname, setNickname] = useState(user.nickname);
  const [profileImageUri, setProfileImageUri] = useState<string | undefined>();
  const [profileImageMimeType, setProfileImageMimeType] = useState<string | undefined>();
  const [profileImageUrl, setProfileImageUrl] = useState<string | undefined>(user.profileImageUrl);
  const [useDefaultProfileImage, setUseDefaultProfileImage] = useState(false);
  const previewImage = useDefaultProfileImage ? undefined : (profileImageUri ?? profileImageUrl);
  const isNicknameValid = nickname.trim().length >= 2 && nickname.trim().length <= 20;
  const canUseProviderProfile = Boolean(user.providerProfile?.nickname || user.providerProfile?.profileImageUrl);
  const hasUnsavedChanges =
    nickname.trim() !== user.nickname.trim() ||
    profileImageUri !== undefined ||
    previewImage !== user.profileImageUrl;

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          '사진 접근 권한 필요',
          '프로필 이미지를 선택하려면 사진 접근을 허용해 주세요.',
          permission.canAskAgain
            ? undefined
            : [
                { text: '나중에', style: 'cancel' },
                {
                  text: '설정 열기',
                  onPress: () => {
                    void Linking.openSettings().catch((error) => console.warn('[profile] open photo settings failed', error));
                  },
                },
              ],
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        mediaTypes: ['images'],
        quality: 0.82,
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      setProfileImageUri(result.assets[0].uri);
      setProfileImageMimeType(result.assets[0].mimeType);
      setProfileImageUrl(undefined);
      setUseDefaultProfileImage(false);
    } catch (error) {
      console.warn('[profile] image picker failed', error);
      Alert.alert('사진을 불러오지 못했어요', '사진 접근 상태를 확인한 뒤 다시 시도해 주세요.');
    }
  };

  const handleUseProviderProfile = () => {
    if (user.providerProfile?.nickname) {
      setNickname(user.providerProfile.nickname);
    }

    if (user.providerProfile?.profileImageUrl) {
      setProfileImageUri(undefined);
      setProfileImageMimeType(undefined);
      setProfileImageUrl(user.providerProfile.profileImageUrl);
      setUseDefaultProfileImage(false);
    }
  };

  const handleUseDefaultImage = () => {
    setProfileImageUri(undefined);
    setProfileImageMimeType(undefined);
    setProfileImageUrl(undefined);
    setUseDefaultProfileImage(true);
  };

  const handleSave = () => {
    if (!isNicknameValid) {
      Alert.alert('닉네임 확인', '닉네임은 2자 이상 20자 이하로 입력해 주세요.');
      return;
    }

    onSave({
      nickname: nickname.trim(),
      profileImageUri,
      profileImageMimeType,
      profileImageUrl,
      useDefaultProfileImage,
    });
  };

  const handleBack = () => {
    if (!hasUnsavedChanges) {
      onBack();
      return;
    }

    Alert.alert('프로필 수정을 나갈까요?', '저장하지 않은 닉네임과 이미지 변경이 사라져요.', [
      { text: '계속 수정', style: 'cancel' },
      { text: '나가기', style: 'destructive', onPress: onBack },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="마이페이지로 돌아가기" accessibilityRole="button" disabled={isSaving} onPress={handleBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <ChevronLeft color={theme.colors.primaryDark} size={22} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>프로필 수정</Text>
          <Text style={styles.subtitle}>도감에 표시되는 이름과 이미지를 바꿔요.</Text>
        </View>
      </View>

      <View style={styles.profilePanel}>
        <View style={styles.avatarWrap}>
          <Image resizeMode="cover" source={previewImage ? { uri: previewImage } : illustrations.profile} style={styles.avatar} />
          <Pressable accessibilityLabel="프로필 이미지 선택" accessibilityRole="button" disabled={isSaving} onPress={handlePickImage} style={({ pressed }) => [styles.imageButton, pressed && styles.pressed]}>
            <ImagePlus color="#FFF8F0" size={18} />
          </Pressable>
        </View>
        <Text style={styles.avatarHint}>정사각형으로 잘라서 프로필에 사용해요.</Text>

        <View style={styles.inlineActions}>
          <Pressable accessibilityLabel="계정 프로필 불러오기" accessibilityRole="button" disabled={isSaving || !canUseProviderProfile} onPress={handleUseProviderProfile} style={({ pressed }) => [styles.smallAction, !canUseProviderProfile && styles.disabledAction, pressed && styles.pressed]}>
            <Sparkles color={canUseProviderProfile ? theme.colors.primaryDark : '#BCA995'} size={15} />
            <Text style={[styles.smallActionText, !canUseProviderProfile && styles.disabledActionText]}>계정 프로필 불러오기</Text>
          </Pressable>
          <Pressable accessibilityLabel="기본 프로필 이미지 사용" accessibilityRole="button" disabled={isSaving} onPress={handleUseDefaultImage} style={({ pressed }) => [styles.smallAction, pressed && styles.pressed]}>
            <RotateCcw color={theme.colors.primaryDark} size={15} />
            <Text style={styles.smallActionText}>기본 이미지</Text>
          </Pressable>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>닉네임</Text>
          <TextInput
            accessibilityLabel="프로필 닉네임"
            editable={!isSaving}
            maxLength={20}
            onChangeText={setNickname}
            placeholder="닉네임을 입력해 주세요"
            placeholderTextColor="#B59680"
            style={[styles.input, !isNicknameValid && styles.inputError]}
            value={nickname}
          />
          <Text style={[styles.counter, !isNicknameValid && styles.counterError]}>{nickname.trim().length} / 20</Text>
        </View>

        <View style={styles.suggestionBlock}>
          <Text style={styles.suggestionLabel}>추천 닉네임</Text>
          <View style={styles.suggestionGrid}>
            {PROFILE_NICKNAME_SUGGESTIONS.map((suggestion) => {
              const isActive = nickname === suggestion;

              return (
                <Pressable
                  accessibilityLabel={`추천 닉네임 ${suggestion}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  disabled={isSaving}
                  key={suggestion}
                  onPress={() => setNickname(suggestion)}
                  style={({ pressed }) => [styles.suggestionChip, isActive && styles.suggestionChipActive, pressed && styles.pressed]}
                >
                  <Text style={[styles.suggestionText, isActive && styles.suggestionTextActive]}>{suggestion}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <Button disabled={isSaving || !isNicknameValid} onPress={handleSave}>
          {isSaving ? '저장 중...' : '저장하기'}
        </Button>
        <Button disabled={isSaving} onPress={handlePickImage} variant="secondary">
          <View style={styles.secondaryButtonContent}>
            <Camera color={theme.colors.primaryDark} size={18} />
            <Text style={styles.secondaryButtonText}>이미지 다시 선택</Text>
          </View>
        </Button>
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
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
  headerCopy: {
    flex: 1,
  },
  title: {
    fontSize: 25,
    fontWeight: '800',
    color: theme.colors.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: theme.colors.mutedText,
  },
  profilePanel: {
    marginTop: theme.spacing.lg,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    alignItems: 'center',
    backgroundColor: 'rgba(255,253,246,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.88)',
    ...createShadow(8),
  },
  avatarWrap: {
    width: 132,
    height: 132,
  },
  avatar: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: 'rgba(201,121,73,0.2)',
  },
  imageButton: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryDark,
    borderWidth: 2,
    borderColor: '#FFFDF6',
  },
  avatarHint: {
    marginTop: theme.spacing.md,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.mutedText,
    textAlign: 'center',
  },
  inlineActions: {
    width: '100%',
    marginTop: theme.spacing.lg,
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  smallAction: {
    flex: 1,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 21,
    backgroundColor: 'rgba(248,234,210,0.66)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.86)',
  },
  smallActionText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  disabledAction: {
    opacity: 0.55,
  },
  disabledActionText: {
    color: '#BCA995',
  },
  field: {
    width: '100%',
    marginTop: theme.spacing.xl,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    color: '#8B6956',
  },
  input: {
    marginTop: theme.spacing.sm,
    minHeight: 52,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: '#F7EBD8',
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputError: {
    borderColor: '#D45B4A',
  },
  counter: {
    marginTop: 6,
    fontSize: 12,
    color: theme.colors.mutedText,
    textAlign: 'right',
  },
  counterError: {
    color: '#B94635',
  },
  suggestionBlock: {
    width: '100%',
    marginTop: theme.spacing.md,
  },
  suggestionLabel: {
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '900',
  },
  suggestionGrid: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  suggestionChip: {
    minHeight: 34,
    justifyContent: 'center',
    borderRadius: 17,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255,248,236,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.86)',
  },
  suggestionChipActive: {
    backgroundColor: theme.colors.primaryDark,
    borderColor: theme.colors.primaryDark,
  },
  suggestionText: {
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '900',
  },
  suggestionTextActive: {
    color: '#FFF8F0',
  },
  actions: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  secondaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.86,
  },
});
