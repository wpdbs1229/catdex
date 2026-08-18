import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Check, ChevronLeft, ChevronRight, Lock, MapPin, PawPrint } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatBranch, formatSerial } from '@/features/home/components/CrewIdCard';
import { fetchMyProfile, updateMyProfile } from '@/shared/api/auth.api';
import { checkInAndFetchCrewStatus } from '@/shared/api/crew.api';
import { DEFAULT_PROFILE_AVATAR } from '@/shared/constants/profile.constants';
import { getActiveNeighborhood, setActiveNeighborhood } from '@/shared/neighborhood/active-neighborhood';
import { detectCurrentNeighborhood } from '@/shared/neighborhood/neighborhood-location';
import { nd } from '@/shared/styles/theme';
import type { AuthUser } from '@/shared/types/auth';
import type { SavedNeighborhood } from '@/shared/types/neighborhood';

const deskHero = require('../../../../assets/profile-setup/desk-hero.png');

const NICKNAME_MIN_LENGTH = 2;
const NICKNAME_MAX_LENGTH = 10;

/** 시안의 프로필 수정 화면. 접수서 양식 카드 하나에 사진·닉네임·지부를 담는다. */
export function ProfileEditScreen() {
  const navigation = useNavigation();
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [nickname, setNickname] = useState('');
  const [profileImageUri, setProfileImageUri] = useState<string | undefined>();
  const [profileImageMimeType, setProfileImageMimeType] = useState<string | undefined>();
  const [rank, setRank] = useState('사원');
  const [neighborhood, setNeighborhood] = useState<SavedNeighborhood | null>(null);
  // 체크를 끄면 접수해도 지부는 그대로 둔다.
  const [applyBranch, setApplyBranch] = useState(true);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const previewImage = profileImageUri ?? profile?.profileImageUrl;
  const trimmedNickname = nickname.trim();
  const isNicknameValid =
    trimmedNickname.length >= NICKNAME_MIN_LENGTH && trimmedNickname.length <= NICKNAME_MAX_LENGTH;
  const isBusy = isSaving || isDetectingLocation;

  useEffect(() => {
    let isMounted = true;

    fetchMyProfile()
      .then((next) => {
        if (isMounted && next) {
          setProfile(next);
          setNickname(next.nickname);
        }
      })
      .catch((error: unknown) => {
        console.warn('[profile-edit] profile load failed', error);
      });
    getActiveNeighborhood()
      .then((saved) => {
        if (isMounted && saved) {
          setNeighborhood(saved);
        }
      })
      .catch((error: unknown) => {
        console.warn('[profile-edit] neighborhood restore failed', error);
      });
    // 출근 도장은 홈에서 이미 찍혀 있어 여기서 다시 불러도 셈이 늘지 않는다.
    checkInAndFetchCrewStatus()
      .then((status) => {
        if (isMounted) {
          setRank(status.rank);
        }
      })
      .catch((error: unknown) => {
        console.warn('[profile-edit] crew status load failed', error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('사진 접근 권한 필요', '프로필 사진을 바꾸려면 사진 접근을 허용해 주세요.');
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
  };

  const handleDetectBranch = async () => {
    if (isBusy) {
      return;
    }

    setIsDetectingLocation(true);

    try {
      const result = await detectCurrentNeighborhood();
      setNeighborhood(result.neighborhood);
      setApplyBranch(true);
    } catch (error) {
      Alert.alert(
        '위치를 확인하지 못했어요',
        error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.',
      );
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const submit = async () => {
    if (!profile) {
      return;
    }

    if (!isNicknameValid) {
      Alert.alert('닉네임 확인', `닉네임은 ${NICKNAME_MIN_LENGTH}자 이상 ${NICKNAME_MAX_LENGTH}자 이하로 입력해 주세요.`);
      return;
    }

    Keyboard.dismiss();
    setIsSaving(true);

    try {
      if (applyBranch && neighborhood) {
        await setActiveNeighborhood(neighborhood);
      }

      await updateMyProfile(
        {
          nickname: trimmedNickname,
          profileImageUri,
          profileImageMimeType,
          profileImageUrl: profile.profileImageUrl,
          useDefaultProfileImage: !previewImage,
        },
        profile.provider,
      );

      Alert.alert('수정 접수 완료', '사원증에 바로 반영됐다냥!', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('수정 접수 실패', error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="뒤로 가기"
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <ChevronLeft color={nd.colors.ink} size={26} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>프로필 수정</Text>
        <View style={styles.backButton} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroRow}>
            <Image accessibilityIgnoresInvertColors resizeMode="contain" source={deskHero} style={styles.heroImage} />
            <View style={styles.bubbleWrap}>
              <View style={styles.bubbleTail} />
              <View style={styles.bubble}>
                <Text style={styles.bubbleText}>수정할 내용을{'\n'}접수해달라냥!</Text>
              </View>
            </View>
          </View>

          <Text style={styles.subtitle}>사진과 닉네임, 소속 지부를 바꿀 수 있어요.</Text>

          <View style={styles.formCard}>
            <View style={styles.formTitleRow}>
              <PawPrint color={nd.colors.accent} fill={nd.colors.accent} size={22} strokeWidth={1.6} />
              <Text style={styles.formTitle}>프로필 수정 접수서</Text>
            </View>

            <Pressable
              accessibilityLabel="프로필 사진 바꾸기"
              accessibilityRole="button"
              disabled={isBusy}
              onPress={() => void handlePickImage()}
              style={({ pressed }) => [styles.photoRow, pressed && styles.pressed]}
            >
              <View>
                {previewImage ? (
                  <Image resizeMode="cover" source={{ uri: previewImage }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Image resizeMode="cover" source={DEFAULT_PROFILE_AVATAR} style={styles.defaultAvatar} />
                  </View>
                )}
                <View style={styles.cameraBadge}>
                  <Camera color="#FFFFFF" size={15} strokeWidth={2.2} />
                </View>
              </View>
              <Text style={styles.photoLabel}>프로필 사진</Text>
              <Text style={styles.linkText}>사진 바꾸기</Text>
              <ChevronRight color={nd.colors.accent} size={18} strokeWidth={2} />
            </Pressable>

            <View style={styles.divider} />

            <Text style={styles.fieldLabel}>닉네임</Text>
            <View style={styles.inputWrap}>
              <TextInput
                accessibilityLabel="닉네임"
                autoCapitalize="none"
                editable={!isBusy}
                maxLength={NICKNAME_MAX_LENGTH}
                onChangeText={setNickname}
                placeholder="냥도감에서 쓸 이름"
                placeholderTextColor={nd.colors.subtle}
                returnKeyType="done"
                selectionColor={nd.colors.primary}
                style={styles.input}
                textContentType="nickname"
                value={nickname}
              />
            </View>
            <Text style={styles.counter}>
              {nickname.length}/{NICKNAME_MAX_LENGTH}
            </Text>

            <View style={styles.divider} />

            <Text style={styles.fieldLabel}>소속 지부</Text>
            <Pressable
              accessibilityLabel="현재 위치로 소속 지부 확인"
              accessibilityRole="button"
              disabled={isBusy}
              onPress={() => void handleDetectBranch()}
              style={({ pressed }) => [styles.branchRow, pressed && styles.pressed]}
            >
              <MapPin color={nd.colors.sub} fill={nd.colors.sub} size={20} strokeWidth={1.7} />
              {/* 지부가 없으면 사원증과 같은 규칙으로 '본사'가 된다. */}
              <Text style={styles.branchName}>{formatBranch(neighborhood?.city)}</Text>
              {isDetectingLocation ? (
                <ActivityIndicator color={nd.colors.accent} size="small" />
              ) : (
                <>
                  <Text style={styles.linkText}>현재 위치로 확인</Text>
                  <ChevronRight color={nd.colors.accent} size={18} strokeWidth={2} />
                </>
              )}
            </Pressable>

            <View style={styles.lockedRow}>
              <Lock color={nd.colors.sub} size={16} strokeWidth={1.8} />
              <Text style={styles.lockedText}>
                직책 <Text style={styles.lockedStrong}>{rank}</Text> · 사번 {formatSerial(profile?.createdAt)}
              </Text>
            </View>

            <View style={styles.divider} />

            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: applyBranch }}
              disabled={isBusy}
              onPress={() => setApplyBranch((prev) => !prev)}
              style={({ pressed }) => [styles.consentRow, pressed && styles.pressed]}
            >
              <View style={[styles.checkbox, applyBranch && styles.checkboxChecked]}>
                {applyBranch ? <Check color="#FFFFFF" size={16} strokeWidth={3} /> : null}
              </View>
              <Text style={styles.consentText}>현재 위치로 소속 지부를 확인합니다.</Text>
            </Pressable>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityLabel="수정 접수하기"
            accessibilityRole="button"
            disabled={isBusy || !isNicknameValid}
            onPress={() => void submit()}
            style={({ pressed }) => [
              styles.cta,
              (isBusy || !isNicknameValid) && styles.ctaDisabled,
              pressed && styles.pressed,
            ]}
          >
            {isSaving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.ctaText}>수정 접수하기</Text>}
          </Pressable>
          <Text style={styles.footerNote}>접수하면 사원증도 함께 바뀐다냥. 🐾</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: nd.colors.bg,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    paddingHorizontal: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 19,
    lineHeight: 26,
    fontWeight: '700',
    letterSpacing: -0.475,
    color: nd.colors.ink,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  heroImage: {
    width: 188,
    height: 155,
  },
  bubbleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 26,
  },
  // 말풍선 꼬리. 몸통과 같은 흰색 사각형을 45도 돌려 왼쪽에 끼운다.
  bubbleTail: {
    width: 16,
    height: 16,
    marginRight: -11,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: nd.colors.border,
    transform: [{ rotate: '45deg' }],
  },
  bubble: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: nd.colors.border,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  bubbleText: {
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '700',
    letterSpacing: -0.425,
    color: nd.colors.ink,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.375,
    color: nd.colors.sub,
  },
  formCard: {
    marginTop: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: nd.colors.border,
    backgroundColor: nd.colors.bg,
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  formTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  formTitle: {
    fontSize: 19,
    lineHeight: 26,
    fontWeight: '700',
    letterSpacing: -0.475,
    color: nd.colors.ink,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: nd.colors.border,
    backgroundColor: '#FAFAFC',
  },
  // 기본 프로필은 배경까지 그려진 정사각형이라 원을 꽉 채운다.
  avatarFallback: {
    overflow: 'hidden',
  },
  defaultAvatar: {
    width: '100%',
    height: '100%',
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: nd.colors.accent,
  },
  photoLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700',
    letterSpacing: -0.425,
    color: nd.colors.ink,
  },
  linkText: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    letterSpacing: -0.375,
    color: nd.colors.accent,
  },
  divider: {
    height: 1,
    marginVertical: 18,
    backgroundColor: nd.colors.border,
    opacity: 0.6,
  },
  fieldLabel: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    letterSpacing: -0.375,
    color: nd.colors.ink,
  },
  inputWrap: {
    marginTop: 10,
    minHeight: 54,
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: nd.colors.border,
    backgroundColor: nd.colors.bg,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.425,
    color: nd.colors.ink,
  },
  counter: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: nd.colors.subtle,
    textAlign: 'right',
  },
  branchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: nd.colors.border,
    backgroundColor: nd.colors.bg,
    paddingHorizontal: 14,
  },
  branchName: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: nd.colors.ink,
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: nd.colors.field,
    paddingHorizontal: 14,
  },
  lockedText: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.35,
    color: nd.colors.sub,
  },
  lockedStrong: {
    fontWeight: '700',
    color: nd.colors.ink,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: nd.colors.border,
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    borderColor: nd.colors.accent,
    backgroundColor: nd.colors.accent,
  },
  consentText: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    letterSpacing: -0.375,
    color: nd.colors.ink,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  cta: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: nd.colors.accent,
  },
  ctaDisabled: {
    opacity: 0.42,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '700',
    letterSpacing: -0.45,
  },
  footerNote: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.325,
    color: nd.colors.sub,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.82,
  },
});
