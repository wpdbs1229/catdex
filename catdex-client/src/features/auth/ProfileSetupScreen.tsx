import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { IdCard, ImagePlus, RotateCcw, Sparkles } from 'lucide-react-native';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ImageSourcePropType } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/shared/components/Button';
import { DEFAULT_PROFILE_NICKNAME, PROFILE_NICKNAME_SUGGESTIONS } from '@/shared/constants/profile.constants';
import { createShadow, theme } from '@/shared/styles/theme';
import type { AuthUser, ProfileUpdateDraft } from '@/shared/types/auth';

interface ProfileSetupScreenProps {
  user: AuthUser;
  isSaving: boolean;
  onComplete: (draft: ProfileUpdateDraft) => Promise<void> | void;
}

const illustrations = {
  profile: require('../../../assets/illustrations/default-profile-avatar.png'),
} satisfies Record<string, ImageSourcePropType>;

export function ProfileSetupScreen({ user, isSaving, onComplete }: ProfileSetupScreenProps) {
  const [nickname, setNickname] = useState(DEFAULT_PROFILE_NICKNAME);
  const [profileImageUri, setProfileImageUri] = useState<string | undefined>();
  const [profileImageMimeType, setProfileImageMimeType] = useState<string | undefined>();
  const [profileImageUrl, setProfileImageUrl] = useState<string | undefined>();
  const previewImage = profileImageUri ?? profileImageUrl;
  const isNicknameValid = nickname.trim().length >= 2 && nickname.trim().length <= 20;
  const canUseProviderProfile = Boolean(user.providerProfile?.nickname || user.providerProfile?.profileImageUrl);

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          '사진 접근 권한 필요',
          '사원증 이미지를 선택하려면 사진 접근을 허용해 주세요.',
          permission.canAskAgain
            ? undefined
            : [
                { text: '나중에', style: 'cancel' },
                {
                  text: '설정 열기',
                  onPress: () => {
                    void Linking.openSettings().catch((error) => console.warn('[profile] open setup photo settings failed', error));
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
    } catch (error) {
      console.warn('[profile] setup image picker failed', error);
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
    }
  };

  const handleUseDefaultImage = () => {
    setProfileImageUri(undefined);
    setProfileImageMimeType(undefined);
    setProfileImageUrl(undefined);
  };

  const submit = (useDefaultValues = false) => {
    const nextNickname = useDefaultValues ? DEFAULT_PROFILE_NICKNAME : nickname.trim();

    if (nextNickname.length < 2 || nextNickname.length > 20) {
      Alert.alert('닉네임 확인', '닉네임은 2자 이상 20자 이하로 입력해 주세요.');
      return;
    }

    onComplete({
      nickname: nextNickname,
      profileImageUri: useDefaultValues ? undefined : profileImageUri,
      profileImageMimeType: useDefaultValues ? undefined : profileImageMimeType,
      profileImageUrl: useDefaultValues ? undefined : profileImageUrl,
      useDefaultProfileImage: useDefaultValues || !previewImage,
    });
  };

  return (
    <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <IdCard color={theme.colors.primaryDark} size={22} />
          </View>
          <Text style={styles.kicker}>NYANGNYANGDAN ID</Text>
          <Text style={styles.title}>냥냥단 사원증 만들기</Text>
          <Text style={styles.subtitle}>계정 정보는 자동으로 공개하지 않아요. 냥도감에서 쓸 이름과 사진만 골라 주세요.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.avatarWrap}>
            <Image resizeMode="cover" source={previewImage ? { uri: previewImage } : illustrations.profile} style={styles.avatar} />
            <Pressable accessibilityLabel="사원증 이미지 선택" accessibilityRole="button" disabled={isSaving} onPress={handlePickImage} style={({ pressed }) => [styles.imageButton, pressed && styles.pressed]}>
              <ImagePlus color="#FFF8F0" size={18} />
            </Pressable>
          </View>
          <Text style={styles.avatarHint}>선택하지 않으면 기본 사원증 이미지로 시작해요.</Text>

          <View style={styles.inlineActions}>
            <Pressable accessibilityLabel="계정 프로필 불러오기" accessibilityRole="button" disabled={isSaving || !canUseProviderProfile} onPress={handleUseProviderProfile} style={({ pressed }) => [styles.smallAction, !canUseProviderProfile && styles.disabledAction, pressed && styles.pressed]}>
              <Sparkles color={canUseProviderProfile ? theme.colors.primaryDark : '#BCA995'} size={15} />
              <Text style={[styles.smallActionText, !canUseProviderProfile && styles.disabledActionText]}>계정 프로필 불러오기</Text>
            </Pressable>
            <Pressable accessibilityLabel="기본 사원증 이미지 사용" accessibilityRole="button" disabled={isSaving} onPress={handleUseDefaultImage} style={({ pressed }) => [styles.smallAction, pressed && styles.pressed]}>
              <RotateCcw color={theme.colors.primaryDark} size={15} />
              <Text style={styles.smallActionText}>기본 이미지</Text>
            </Pressable>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>닉네임</Text>
            <TextInput
              accessibilityLabel="사원증 닉네임"
              editable={!isSaving}
              maxLength={20}
              onChangeText={setNickname}
              placeholder="냥도감에서 쓸 이름"
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
          <Button disabled={isSaving || !isNicknameValid} onPress={() => submit(false)}>
            {isSaving ? '저장 중...' : '사원증 저장하기'}
          </Button>
          <Button disabled={isSaving} onPress={() => submit(true)} variant="secondary">
            그냥 시작하기
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  headerIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: 'rgba(255,253,246,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.88)',
  },
  kicker: {
    marginTop: theme.spacing.md,
    color: theme.colors.accent,
    fontSize: 11,
    fontWeight: '900',
  },
  title: {
    marginTop: 4,
    color: theme.colors.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: theme.spacing.sm,
    color: theme.colors.mutedText,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    textAlign: 'center',
  },
  card: {
    marginTop: theme.spacing.xl,
    alignItems: 'center',
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    backgroundColor: 'rgba(255,253,246,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.88)',
    ...createShadow(9),
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
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: theme.colors.primaryDark,
    borderWidth: 2,
    borderColor: '#FFFDF6',
  },
  avatarHint: {
    marginTop: theme.spacing.md,
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
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
    color: '#8B6956',
    fontSize: 14,
    fontWeight: '900',
  },
  input: {
    marginTop: theme.spacing.sm,
    minHeight: 52,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: '#F7EBD8',
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputError: {
    borderColor: '#D45B4A',
  },
  counter: {
    marginTop: 6,
    color: theme.colors.mutedText,
    fontSize: 12,
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
  pressed: {
    opacity: 0.86,
  },
});
