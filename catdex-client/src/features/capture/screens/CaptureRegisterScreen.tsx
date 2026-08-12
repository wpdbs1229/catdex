import { ArrowLeft, Heart } from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CaptureStackScreenProps } from '@/app/navigation/types';
import { createCat, resolveCatObservation } from '@/shared/api/cats.api';
import { getUserFacingError } from '@/shared/errors/user-facing-error';
import { createNdShadow, nd } from '@/shared/styles/theme';
import type { CaptureCatDraft } from '@/shared/types/cat';

type GenderKey = '수컷' | '암컷';

export function CaptureRegisterScreen({ navigation, route }: CaptureStackScreenProps<'CaptureRegister'>) {
  const insets = useSafeAreaInsets();
  const { cutoutUri, imageStoragePath, originalStoragePath, observationId, regionName, colors, pattern } =
    route.params;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [breed, setBreed] = useState('');
  const [selectedGender, setSelectedGender] = useState<GenderKey | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = name.trim().length > 0 && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);

    try {
      const tags: string[] = [];

      if (selectedGender) {
        tags.push(selectedGender);
      }

      if (breed.trim()) {
        tags.push(`품종:${breed.trim()}`);
      }

      const draft: CaptureCatDraft = {
        name: name.trim(),
        coatColors: colors,
        coatPattern: pattern,
        tags,
        regionName,
        memo: description.trim(),
        imageUrl: imageStoragePath,
        cutoutImageUrl: imageStoragePath,
        originalPhotoUrl: originalStoragePath,
      };
      const cat = await createCat(draft);

      if (observationId) {
        await resolveCatObservation(observationId, cat.id, 'new_cat').catch(() => undefined);
      }

      const rootNavigation = navigation.getParent();

      rootNavigation?.goBack();
      rootNavigation?.navigate('CatDetail', { catId: cat.id });
    } catch (error) {
      Alert.alert('등록 실패', getUserFacingError(error, 'generic').message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <View pointerEvents="none" style={styles.wash}>
        <View style={styles.washPink} />
        <View style={styles.washYellow} />
        <View style={styles.washPeach} />
      </View>

      <View style={[styles.header, { marginTop: insets.top }]}>
        <Pressable accessibilityLabel="뒤로 가기" onPress={() => navigation.goBack()} style={({ pressed }) => [styles.circleButton, pressed && styles.pressed]}>
          <ArrowLeft color={nd.colors.ink} size={20} strokeWidth={1.8} />
        </Pressable>
        <Text style={styles.headerTitle}>도감</Text>
        <View style={styles.circleButton}>
          <Heart color={nd.colors.ink} size={20} strokeWidth={1.8} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Image resizeMode="contain" source={{ uri: cutoutUri }} style={styles.cutout} />

        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.sheetTitle}>도감 추가하기</Text>

          <View style={styles.fieldStack}>
            <TextInput
              editable={!isSubmitting}
              maxLength={3}
              onChangeText={setName}
              placeholder="3글자 이내로 이름을 지어주세요"
              placeholderTextColor={nd.colors.sub}
              style={styles.input}
              value={name}
            />
            <TextInput
              editable={!isSubmitting}
              maxLength={50}
              onChangeText={setDescription}
              placeholder="생김새나 성격적인 특징을 적어주세요. (50자 이내)"
              placeholderTextColor={nd.colors.sub}
              style={styles.input}
              value={description}
            />
            <TextInput
              editable={!isSubmitting}
              maxLength={20}
              onChangeText={setBreed}
              placeholder="품종을 적어주세요"
              placeholderTextColor={nd.colors.sub}
              style={styles.input}
              value={breed}
            />
            <View style={styles.genderRow}>
              {(['수컷', '암컷'] as GenderKey[]).map((gender) => {
                const isSelected = selectedGender === gender;

                return (
                  <Pressable
                    accessibilityLabel={gender}
                    disabled={isSubmitting}
                    key={gender}
                    onPress={() => setSelectedGender((prev) => (prev === gender ? null : gender))}
                    style={[styles.genderButton, isSelected && styles.genderButtonSelected]}
                  >
                    <Text style={[styles.genderSymbol, isSelected && styles.genderSymbolSelected]}>
                      {gender === '수컷' ? '♂' : '♀'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable
            accessibilityLabel="등록하기"
            accessibilityRole="button"
            disabled={!canSubmit}
            onPress={handleSubmit}
            style={({ pressed }) => [styles.submitButton, !canSubmit && styles.submitButtonDisabled, pressed && styles.pressed]}
          >
            <Text style={styles.submitButtonText}>{isSubmitting ? '등록 중...' : '등록하기'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: nd.colors.bg,
  },
  wash: {
    ...StyleSheet.absoluteFillObject,
  },
  washPink: {
    position: 'absolute',
    top: -120,
    left: -80,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(255, 90, 205, 0.13)',
  },
  washYellow: {
    position: 'absolute',
    top: 200,
    right: -120,
    width: 430,
    height: 430,
    borderRadius: 215,
    backgroundColor: 'rgba(250, 218, 97, 0.14)',
  },
  washPeach: {
    position: 'absolute',
    bottom: -100,
    left: -60,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(255, 145, 136, 0.14)',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.5,
    color: nd.colors.ink,
  },
  circleButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    ...createNdShadow(0.08, 6),
  },
  content: {
    paddingTop: 20,
  },
  cutout: {
    alignSelf: 'center',
    width: 220,
    height: 220,
  },
  sheet: {
    marginTop: 20,
    borderTopLeftRadius: 46,
    borderTopRightRadius: 46,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    ...createNdShadow(0.16, 32),
  },
  grabber: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 100,
    backgroundColor: '#D9D9D9',
    marginBottom: 20,
  },
  sheetTitle: {
    paddingHorizontal: 8,
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '500',
    letterSpacing: -0.45,
    color: nd.colors.ink,
    marginBottom: 20,
  },
  fieldStack: {
    gap: 8,
  },
  input: {
    minHeight: 54,
    borderRadius: nd.radius.input,
    borderWidth: 1,
    borderColor: nd.colors.border,
    backgroundColor: '#FFFFFF',
    padding: 16,
    fontSize: 14,
    letterSpacing: -0.35,
    color: nd.colors.ink,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    borderRadius: nd.radius.input,
    borderWidth: 1,
    borderColor: nd.colors.border,
    backgroundColor: '#FFFFFF',
  },
  genderButtonSelected: {
    borderColor: nd.colors.primary,
    backgroundColor: nd.colors.primarySoft,
  },
  genderSymbol: {
    fontSize: 18,
    lineHeight: 22,
    color: nd.colors.ink,
  },
  genderSymbolSelected: {
    color: nd.colors.primary,
  },
  submitButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: nd.radius.input,
    backgroundColor: nd.colors.primary,
    padding: 16,
    marginTop: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#A5ADB8',
  },
  submitButtonText: {
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
