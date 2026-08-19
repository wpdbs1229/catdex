import * as ImagePicker from 'expo-image-picker';
import { Camera, Check, CircleCheck, MapPin, RefreshCw } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CREW_COMPANY_NAME } from '@/shared/constants/crew.constants';
import { DEFAULT_PROFILE_AVATAR } from '@/shared/constants/profile.constants';
import { getActiveNeighborhood, setActiveNeighborhood } from '@/shared/neighborhood/active-neighborhood';
import { detectCurrentNeighborhood } from '@/shared/neighborhood/neighborhood-location';
import { nd } from '@/shared/styles/theme';
import type { AuthUser, ProfileUpdateDraft } from '@/shared/types/auth';
import type { SavedNeighborhood } from '@/shared/types/neighborhood';

const officeHero = require('../../../../assets/profile-setup/office-hero.png');

const NICKNAME_MIN_LENGTH = 2;
const NICKNAME_MAX_LENGTH = 10;

interface ProfileSetupScreenProps {
  user: AuthUser;
  isSaving: boolean;
  onComplete: (draft: ProfileUpdateDraft) => Promise<void> | void;
}

function formatBranch(city?: string, district?: string) {
  const candidates = [city, district]
    .flatMap((value) => value?.split(/\s+/) ?? [])
    .map((value) => value.trim())
    .filter(Boolean);
  const municipality = candidates.find((value) => /(특별자치시|특별시|광역시|시|군)$/.test(value));
  const fallback = candidates.find((value) => /(특별자치도|도)$/.test(value)) ?? candidates[0];
  const source = municipality ?? fallback;

  if (!source) {
    return '본사';
  }

  const base = source.replace(/(특별자치시|특별자치도|특별시|광역시|시|군|도)$/, '');

  return `${base || source}지부`;
}

export function ProfileSetupScreen({ user, isSaving, onComplete }: ProfileSetupScreenProps) {
  const insets = useSafeAreaInsets();
  // 로그인 제공자가 준 이름·사진은 채워 넣지 않는다. 비워 두어야 사용자가
  // 사원증 정보를 직접 정하고 넘어간다(빈 닉네임이면 버튼이 잠긴다).
  const [nickname, setNickname] = useState('');
  const [profileImageUri, setProfileImageUri] = useState<string | undefined>();
  const [profileImageMimeType, setProfileImageMimeType] = useState<string | undefined>();
  const [profileImageUrl, setProfileImageUrl] = useState<string | undefined>();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isNicknameTouched, setIsNicknameTouched] = useState(false);
  const [locationConsent, setLocationConsent] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [neighborhood, setNeighborhood] = useState<SavedNeighborhood | null>(null);
  const keyboardProgress = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const fieldOffsetY = useRef(0);
  const previewImage = profileImageUri ?? profileImageUrl;
  const trimmedNickname = nickname.trim();
  const isNicknameValid =
    trimmedNickname.length >= NICKNAME_MIN_LENGTH && trimmedNickname.length <= NICKNAME_MAX_LENGTH;
  const isBusy = isSaving || isDetectingLocation;
  const branchName = formatBranch(neighborhood?.city, neighborhood?.district);

  useEffect(() => {
    let isMounted = true;

    getActiveNeighborhood()
      .then((saved) => {
        if (!isMounted || !saved) {
          return;
        }

        setNeighborhood(saved);
        setLocationConsent(true);
      })
      .catch((error: unknown) => {
        console.warn('[profile-setup] neighborhood restore failed', error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const animateTo = (value: number) => {
      Animated.timing(keyboardProgress, {
        toValue: value,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    };
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
      setIsKeyboardVisible(true);
      animateTo(1);

      setTimeout(() => {
        scrollRef.current?.scrollTo({ animated: true, y: Math.max(0, fieldOffsetY.current - 20) });
      }, 60);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
      animateTo(0);
      scrollRef.current?.scrollTo({ animated: true, y: 0 });
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [keyboardProgress]);

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

  const handleLocationConsent = async (forceRefresh = false) => {
    if (isDetectingLocation || isSaving) {
      return;
    }

    if (locationConsent && !forceRefresh) {
      setLocationConsent(false);
      setNeighborhood(null);
      return;
    }

    setIsDetectingLocation(true);

    try {
      const result = await detectCurrentNeighborhood();
      setNeighborhood(result.neighborhood);
      setLocationConsent(true);
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
    setIsNicknameTouched(true);

    if (!isNicknameValid) {
      Alert.alert('닉네임 확인', `닉네임은 ${NICKNAME_MIN_LENGTH}자 이상 ${NICKNAME_MAX_LENGTH}자 이하로 입력해 주세요.`);
      return;
    }

    Keyboard.dismiss();

    try {
      if (locationConsent && neighborhood) {
        await setActiveNeighborhood(neighborhood);
      }

      await onComplete({
        nickname: trimmedNickname,
        profileImageUri,
        profileImageMimeType,
        profileImageUrl,
        useDefaultProfileImage: !previewImage,
      });
    } catch (error) {
      Alert.alert('사원증 요청 실패', error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.');
    }
  };

  const heroWidth = keyboardProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [330, 210],
  });
  const heroHeight = keyboardProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [208, 133],
  });
  const heroMarginTop = keyboardProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });
  const titleSize = keyboardProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [28, 22],
  });
  const titleLineHeight = keyboardProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [38, 30],
  });
  const sectionGap = keyboardProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 12],
  });
  const avatarSize = keyboardProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [112, 92],
  });

  return (
    <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.safeArea}>
      <View style={styles.screen}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.content, isKeyboardVisible && styles.contentWithKeyboard]}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.heroWrap, { marginTop: heroMarginTop }]}>
            <Animated.Image
              accessibilityIgnoresInvertColors
              resizeMode="contain"
              source={officeHero}
              style={{ width: heroWidth, height: heroHeight }}
            />
          </Animated.View>

          <Animated.View style={[styles.header, { marginTop: sectionGap }]}>
            <Animated.Text style={[styles.title, { fontSize: titleSize, lineHeight: titleLineHeight }]}>
              {CREW_COMPANY_NAME}에 오신 걸 환영해요
            </Animated.Text>
            <Text style={[styles.subtitle, isKeyboardVisible && styles.subtitleWithKeyboard]}>
              사원증 발급에 필요한 정보를 알려주세요.
            </Text>
          </Animated.View>

          <Animated.View style={[styles.avatarWrap, { marginTop: sectionGap }]}>
            <Pressable
              accessibilityLabel="사원증 사진 선택"
              disabled={isBusy}
              onPress={handlePickImage}
              style={({ pressed }) => pressed && styles.pressed}
            >
              {previewImage ? (
                <Animated.Image
                  resizeMode="cover"
                  source={{ uri: previewImage }}
                  style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize }]}
                />
              ) : (
                <Animated.View
                  style={[styles.avatar, styles.avatarFallback, { width: avatarSize, height: avatarSize, borderRadius: avatarSize }]}
                >
                  <Image resizeMode="cover" source={DEFAULT_PROFILE_AVATAR} style={styles.defaultAvatar} />
                </Animated.View>
              )}
              <View style={styles.cameraBadge}>
                <Camera color={nd.colors.primary} size={19} strokeWidth={2.2} />
              </View>
            </Pressable>
          </Animated.View>

          <View
            onLayout={(event) => {
              fieldOffsetY.current = event.nativeEvent.layout.y;
            }}
            style={[styles.field, isKeyboardVisible && styles.fieldWithKeyboard]}
          >
            <Text style={styles.label}>닉네임</Text>
            <View
              style={[
                styles.inputWrap,
                isKeyboardVisible && styles.inputWrapFocused,
                isNicknameTouched && !isNicknameValid && styles.inputWrapError,
              ]}
            >
              <TextInput
                accessibilityLabel="닉네임"
                autoCapitalize="none"
                editable={!isBusy}
                maxLength={NICKNAME_MAX_LENGTH}
                onBlur={() => setIsNicknameTouched(true)}
                onChangeText={setNickname}
                onFocus={() => {
                  Animated.timing(keyboardProgress, {
                    toValue: 1,
                    duration: 180,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: false,
                  }).start();
                }}
                onSubmitEditing={() => Keyboard.dismiss()}
                placeholder="냥도감에서 쓸 이름"
                placeholderTextColor={nd.colors.subtle}
                returnKeyType="done"
                selectionColor={nd.colors.primary}
                style={styles.input}
                textContentType="nickname"
                value={nickname}
              />
              <Text style={styles.counter}>{nickname.length}/{NICKNAME_MAX_LENGTH}</Text>
            </View>
            {isNicknameTouched && !isNicknameValid ? (
              <Text style={styles.errorText}>
                닉네임은 {NICKNAME_MIN_LENGTH}~{NICKNAME_MAX_LENGTH}자로 입력해 주세요.
              </Text>
            ) : null}
          </View>

          {!isKeyboardVisible ? (
            <View style={styles.locationSection}>
              <View style={styles.branchHeader}>
                <Text style={styles.label}>소속 지부</Text>
                {locationConsent && neighborhood ? (
                  <Pressable
                    accessibilityLabel="현재 위치 다시 확인"
                    disabled={isBusy}
                    onPress={() => void handleLocationConsent(true)}
                    style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
                  >
                    <RefreshCw color={nd.colors.sub} size={14} strokeWidth={2} />
                    <Text style={styles.retryText}>다시 확인</Text>
                  </Pressable>
                ) : null}
              </View>

              <View style={[styles.branchCard, locationConsent && neighborhood && styles.branchCardActive]}>
                <View style={styles.locationIcon}>
                  <MapPin color="#FFFFFF" fill="#FFFFFF" size={22} strokeWidth={1.7} />
                </View>
                <View style={styles.branchCopy}>
                  <Text style={styles.branchName}>
                    {locationConsent && neighborhood ? branchName : '위치 동의 후 자동 배정'}
                  </Text>
                  <Text style={styles.branchDescription}>
                    {locationConsent && neighborhood
                      ? `${neighborhood.name} 기준으로 배정됐어요`
                      : '현재 위치의 시·군을 기준으로 지부를 연결해요'}
                  </Text>
                </View>
                {isDetectingLocation ? (
                  <ActivityIndicator color={nd.colors.primary} size="small" />
                ) : locationConsent && neighborhood ? (
                  <CircleCheck color="#77B94A" size={22} strokeWidth={2} />
                ) : null}
              </View>

              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ busy: isDetectingLocation, checked: locationConsent }}
                disabled={isBusy}
                onPress={() => void handleLocationConsent()}
                style={({ pressed }) => [styles.consentRow, pressed && styles.pressed]}
              >
                <View style={[styles.checkbox, locationConsent && styles.checkboxChecked]}>
                  {isDetectingLocation ? (
                    <ActivityIndicator color="#FFFFFF" size={12} />
                  ) : locationConsent ? (
                    <Check color="#FFFFFF" size={15} strokeWidth={3} />
                  ) : null}
                </View>
                <View style={styles.consentCopy}>
                  <Text style={styles.consentTitle}>현재 위치 사용에 동의해요</Text>
                  <Text style={styles.consentDescription}>정확한 위치는 저장하지 않고 동네 단위로만 사용해요.</Text>
                </View>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>

        <View
          style={[
            styles.footer,
            isKeyboardVisible && styles.footerWithKeyboard,
            isKeyboardVisible && { bottom: Math.max(0, keyboardHeight - insets.bottom) },
          ]}
        >
          <Pressable
            accessibilityLabel="사원증 요청"
            accessibilityRole="button"
            disabled={isBusy || !isNicknameValid}
            onPress={() => void submit()}
            style={({ pressed }) => [
              styles.cta,
              (isBusy || !isNicknameValid) && styles.ctaDisabled,
              pressed && styles.pressed,
            ]}
          >
            {isBusy ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.ctaText}>사원증 요청</Text>}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: nd.colors.bg,
  },
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 18,
  },
  contentWithKeyboard: {
    paddingBottom: 88,
  },
  heroWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  title: {
    color: nd.colors.ink,
    fontWeight: '700',
    letterSpacing: -0.9,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    color: nd.colors.sub,
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.35,
    lineHeight: 21,
    textAlign: 'center',
  },
  subtitleWithKeyboard: {
    marginTop: 5,
    fontSize: 14,
    lineHeight: 19,
  },
  avatarWrap: {
    alignItems: 'center',
  },
  avatar: {
    overflow: 'hidden',
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
    bottom: 2,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#FFE1C2',
    backgroundColor: '#FFFFFF',
  },
  field: {
    marginTop: 26,
    gap: 8,
  },
  fieldWithKeyboard: {
    marginTop: 18,
  },
  label: {
    color: nd.colors.ink,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.3,
    lineHeight: 20,
  },
  inputWrap: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: nd.colors.border,
    backgroundColor: nd.colors.bg,
  },
  inputWrapFocused: {
    borderColor: nd.colors.primary,
    borderWidth: 1.5,
  },
  inputWrapError: {
    borderColor: '#E5484D',
  },
  input: {
    minWidth: 0,
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: nd.colors.ink,
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: -0.4,
  },
  counter: {
    marginRight: 16,
    color: nd.colors.subtle,
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    color: '#E5484D',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
  },
  locationSection: {
    marginTop: 22,
  },
  branchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 28,
  },
  retryText: {
    color: nd.colors.sub,
    fontSize: 12,
    fontWeight: '600',
  },
  branchCard: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: nd.colors.border,
    backgroundColor: '#FFFCF8',
  },
  branchCardActive: {
    borderColor: '#FFD7AE',
    backgroundColor: '#FFF8F0',
  },
  locationIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: nd.colors.primary,
  },
  branchCopy: {
    minWidth: 0,
    flex: 1,
  },
  branchName: {
    color: nd.colors.ink,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.35,
    lineHeight: 21,
  },
  branchDescription: {
    marginTop: 2,
    color: nd.colors.sub,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: -0.2,
    lineHeight: 17,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: nd.colors.border,
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    borderColor: nd.colors.primary,
    backgroundColor: nd.colors.primary,
  },
  consentCopy: {
    minWidth: 0,
    flex: 1,
  },
  consentTitle: {
    color: nd.colors.ink,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.25,
    lineHeight: 19,
  },
  consentDescription: {
    marginTop: 2,
    color: nd.colors.sub,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: -0.15,
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(17, 17, 17, 0.05)',
    backgroundColor: '#FFFFFF',
  },
  footerWithKeyboard: {
    position: 'absolute',
    right: 0,
    left: 0,
    paddingTop: 8,
    paddingBottom: 8,
  },
  cta: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: nd.colors.primary,
    paddingHorizontal: 18,
  },
  ctaDisabled: {
    opacity: 0.42,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.35,
    lineHeight: 24,
  },
  pressed: {
    opacity: 0.78,
  },
});
