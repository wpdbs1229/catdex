import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ImageSourcePropType } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DEFAULT_PROFILE_NICKNAME } from '@/shared/constants/profile.constants';
import { nd } from '@/shared/styles/theme';
import type { AuthUser, ProfileUpdateDraft } from '@/shared/types/auth';

interface ProfileSetupScreenProps {
  user: AuthUser;
  isSaving: boolean;
  onComplete: (draft: ProfileUpdateDraft) => Promise<void> | void;
}

const illustrations = {
  profile: require('../../../../assets/illustrations/default-profile-avatar.png'),
} satisfies Record<string, ImageSourcePropType>;

export function ProfileSetupScreen({ user, isSaving, onComplete }: ProfileSetupScreenProps) {
  const [nickname, setNickname] = useState(user.providerProfile?.nickname ?? DEFAULT_PROFILE_NICKNAME);
  const [profileImageUri, setProfileImageUri] = useState<string | undefined>();
  const [profileImageMimeType, setProfileImageMimeType] = useState<string | undefined>();
  const [profileImageUrl, setProfileImageUrl] = useState<string | undefined>(user.providerProfile?.profileImageUrl);
  const previewImage = profileImageUri ?? profileImageUrl;
  const isNicknameValid = nickname.trim().length >= 2 && nickname.trim().length <= 20;

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('사진 접근 권한 필요', '사원증 이미지를 선택하려면 사진 접근을 허용해 주세요.');
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
  };

  const submit = () => {
    const nextNickname = nickname.trim();

    if (nextNickname.length < 2 || nextNickname.length > 20) {
      Alert.alert('닉네임 확인', '닉네임은 2자 이상 20자 이하로 입력해 주세요.');
      return;
    }

    onComplete({
      nickname: nextNickname,
      profileImageUri,
      profileImageMimeType,
      profileImageUrl,
      useDefaultProfileImage: !previewImage,
    });
  };

  return (
    <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>냥냥단 사원증</Text>
          <Text style={styles.subtitle}>탐험을 시작하기 전, 나만의 사원증을 만들어요.</Text>
        </View>

        <View style={styles.avatarWrap}>
          <Pressable accessibilityLabel="사원증 사진 선택" disabled={isSaving} onPress={handlePickImage}>
            <Image resizeMode="cover" source={previewImage ? { uri: previewImage } : illustrations.profile} style={styles.avatar} />
            <View style={styles.cameraBadge}>
              <Camera color="#FFFFFF" size={18} strokeWidth={1.8} />
            </View>
          </Pressable>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>닉네임</Text>
          <TextInput
            editable={!isSaving}
            maxLength={20}
            onChangeText={setNickname}
            placeholder="냥도감에서 쓸 이름"
            placeholderTextColor={nd.colors.sub}
            style={styles.input}
            value={nickname}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityLabel="사원증 완성"
          accessibilityRole="button"
          disabled={isSaving || !isNicknameValid}
          onPress={submit}
          style={({ pressed }) => [styles.cta, (isSaving || !isNicknameValid) && styles.ctaDisabled, pressed && styles.pressed]}
        >
          <Text style={styles.ctaText}>{isSaving ? '저장 중...' : '사원증 완성'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: nd.colors.bg,
  },
  content: {
    flexGrow: 1,
    paddingTop: 100,
  },
  header: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    lineHeight: 39,
    fontWeight: '600',
    letterSpacing: -0.7,
    color: nd.colors.ink,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
    letterSpacing: -0.4,
    color: nd.colors.sub,
  },
  avatarWrap: {
    marginTop: 32,
    alignItems: 'center',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: nd.colors.field,
  },
  cameraBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: nd.colors.ink,
  },
  field: {
    marginTop: 32,
    paddingHorizontal: 20,
    gap: 8,
  },
  label: {
    paddingHorizontal: 8,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: -0.35,
    color: nd.colors.ink,
  },
  input: {
    minHeight: 54,
    borderRadius: nd.radius.input,
    borderWidth: 1,
    borderColor: nd.colors.border,
    backgroundColor: nd.colors.bg,
    padding: 16,
    fontSize: 16,
    letterSpacing: -0.4,
    color: nd.colors.ink,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  cta: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: nd.radius.input,
    backgroundColor: nd.colors.primary,
    padding: 16,
  },
  ctaDisabled: {
    opacity: 0.4,
  },
  ctaText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: -0.4,
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.88,
  },
});
