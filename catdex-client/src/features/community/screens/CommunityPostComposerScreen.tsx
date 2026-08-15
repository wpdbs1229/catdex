import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import {
  Camera,
  Cat as CatIcon,
  ChevronRight,
  Clock3,
  Image as ImageIcon,
  MapPin,
  Pencil,
  ShieldCheck,
  StickyNote,
  X,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { MapStackParamList } from '@/app/navigation/types';
import { fetchMyCats } from '@/shared/api/cats.api';
import { createCommunityPost } from '@/shared/api/community.api';
import { getUserFacingError } from '@/shared/errors/user-facing-error';
import { NeighborhoodSheet } from '@/shared/neighborhood/NeighborhoodSheet';
import { useActiveNeighborhood } from '@/shared/neighborhood/useActiveNeighborhood';
import { createNdShadow, nd } from '@/shared/styles/theme';
import type { Cat } from '@/shared/types/cat';
import type { CommunityImageDraft, CommunityPostDraft } from '@/shared/types/community';

const topics: Array<{ id: CommunityPostDraft['topic']; label: string }> = [
  { id: 'SIGHTING', label: '목격 소식' },
  { id: 'VERIFY', label: '질문' },
  { id: 'INFO', label: '정보 공유' },
];

function formatObservedAt(value: Date) {
  const now = new Date();
  const isToday = value.toDateString() === now.toDateString();
  const time = value.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${isToday ? '오늘' : `${value.getMonth() + 1}.${value.getDate()}`} ${time}`;
}

interface CatPickerProps {
  cats: Cat[];
  onClose: () => void;
  onSelect: (cat: Cat | null) => void;
  selectedCatId?: string;
  visible: boolean;
}

function CatPicker({ cats, onClose, onSelect, selectedCatId, visible }: CatPickerProps) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable accessibilityLabel="고양이 선택 닫기" accessibilityRole="button" onPress={onClose} style={styles.modalScrim} />
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.catSheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <View>
            <Text style={styles.sheetTitle}>고객 연결</Text>
            <Text style={styles.sheetSubtitle}>내 도감에서 이 이야기의 고양이를 골라 주세요.</Text>
          </View>
          <Pressable accessibilityLabel="고양이 선택 닫기" accessibilityRole="button" onPress={onClose} style={styles.sheetClose}>
            <X color={nd.colors.ink} size={22} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.catList} showsVerticalScrollIndicator={false}>
          <Pressable accessibilityRole="button" onPress={() => onSelect(null)} style={[styles.catOption, !selectedCatId && styles.catOptionSelected]}>
            <View style={styles.catFallback}><X color={nd.colors.sub} size={20} /></View>
            <Text style={styles.catOptionName}>연결하지 않기</Text>
          </Pressable>
          {cats.map((cat) => (
            <Pressable
              key={cat.id}
              accessibilityRole="button"
              onPress={() => onSelect(cat)}
              style={[styles.catOption, selectedCatId === cat.id && styles.catOptionSelected]}
            >
              {cat.imageUrl ? (
                <Image source={{ uri: cat.imageUrl }} style={styles.catImage} />
              ) : (
                <View style={styles.catFallback}><CatIcon color={nd.colors.sub} size={22} /></View>
              )}
              <View style={styles.catOptionCopy}>
                <Text style={styles.catOptionName}>{cat.name}</Text>
                <Text style={styles.catOptionMeta}>{cat.lastSeenAt} 마지막 만남</Text>
              </View>
              {selectedCatId === cat.id ? <View style={styles.selectedDot} /> : null}
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export function CommunityPostComposerScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MapStackParamList>>();
  const { width } = useWindowDimensions();
  const { neighborhood, name: neighborhoodName, isDetecting, redetect, refresh } = useActiveNeighborhood();
  const [topic, setTopic] = useState<CommunityPostDraft['topic']>('SIGHTING');
  const [content, setContent] = useState('');
  const [observationNote, setObservationNote] = useState('');
  const [images, setImages] = useState<CommunityImageDraft[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [selectedCat, setSelectedCat] = useState<Cat | null>(null);
  const [observedAt, setObservedAt] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCatPickerOpen, setIsCatPickerOpen] = useState(false);
  const [isNeighborhoodSheetOpen, setIsNeighborhoodSheetOpen] = useState(false);

  useEffect(() => {
    fetchMyCats().then(setCats).catch((error) => console.warn('[community] cats load failed', error));
  }, []);

  const locationName = neighborhood?.name ?? neighborhoodName;
  const previewSize = useMemo(() => Math.max(96, Math.floor((width - 48) / 3)), [width]);
  const hasDraft = Boolean(content.trim() || observationNote.trim() || images.length || selectedCat);
  const canSubmit = content.trim().length >= 2 && Boolean(locationName) && !isSubmitting;

  const appendAssets = (assets: ImagePicker.ImagePickerAsset[]) => {
    const remaining = Math.max(0, 3 - images.length);
    const nextImages = assets.slice(0, remaining).map<CommunityImageDraft>((asset) => ({
      uri: asset.uri,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
    }));
    setImages((previous) => [...previous, ...nextImages].slice(0, 3));
  };

  const pickFromAlbum = async () => {
    if (images.length >= 3) {
      Alert.alert('사진은 3장까지', '선택한 사진을 지운 뒤 새 사진을 추가해 주세요.');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('사진 접근 권한 필요', '동네 이야기에 사진을 추가하려면 사진 접근을 허용해 주세요.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ['images'],
      quality: 0.82,
      selectionLimit: 3 - images.length,
    });

    if (!result.canceled) {
      appendAssets(result.assets);
    }
  };

  const takePhoto = async () => {
    if (images.length >= 3) {
      Alert.alert('사진은 3장까지', '선택한 사진을 지운 뒤 새 사진을 추가해 주세요.');
      return;
    }

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('카메라 권한 필요', '동네 고양이를 촬영하려면 카메라 접근을 허용해 주세요.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.82 });
    if (!result.canceled) {
      appendAssets(result.assets);
    }
  };

  const closeComposer = () => {
    if (!hasDraft) {
      navigation.goBack();
      return;
    }

    Alert.alert('작성 중인 이야기를 닫을까요?', '지금 닫으면 입력한 내용이 사라져요.', [
      { text: '계속 작성', style: 'cancel' },
      { text: '닫기', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  };

  const chooseObservedAt = () => {
    const options = ['취소', '지금', '30분 전', '1시간 전'];
    const choose = (index: number) => {
      if (index === 1) setObservedAt(new Date());
      if (index === 2) setObservedAt(new Date(Date.now() - 30 * 60_000));
      if (index === 3) setObservedAt(new Date(Date.now() - 60 * 60_000));
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: 0 }, choose);
      return;
    }

    Alert.alert('발견 시간', undefined, [
      { text: '지금', onPress: () => choose(1) },
      { text: '30분 전', onPress: () => choose(2) },
      { text: '1시간 전', onPress: () => choose(3) },
      { text: '취소', style: 'cancel' },
    ]);
  };

  const submit = async () => {
    if (!canSubmit) {
      Alert.alert('내용을 확인해 주세요', content.trim().length < 2 ? '동네 이야기를 2자 이상 입력해 주세요.' : '발견 위치를 선택해 주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const postId = await createCommunityPost({
        content,
        topic,
        regionName: locationName,
        catId: selectedCat?.id,
        observationNote: observationNote || undefined,
        observedAt: observedAt.toISOString(),
        images,
      });
      navigation.replace('CommunityPostDetail', { postId });
    } catch (error) {
      const userError = getUserFacingError(error, 'community.save');
      Alert.alert(userError.title, userError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="글쓰기 닫기" accessibilityRole="button" onPress={closeComposer} style={styles.headerSide}>
            <X color={nd.colors.ink} size={30} strokeWidth={1.8} />
          </Pressable>
          <Text style={styles.headerTitle}>현장 기록 작성</Text>
          <Pressable accessibilityLabel="게시글 등록" accessibilityRole="button" disabled={!canSubmit} onPress={() => void submit()} style={styles.headerSide}>
            <Text style={[styles.registerText, !canSubmit && styles.registerDisabled]}>등록</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.segmentedControl}>
            {topics.map((item) => (
              <Pressable
                accessibilityLabel={`${item.label} 유형`}
                accessibilityRole="button"
                key={item.id}
                onPress={() => setTopic(item.id)}
                style={[styles.segment, topic === item.id && styles.segmentSelected]}
              >
                <Text style={[styles.segmentText, topic === item.id && styles.segmentTextSelected]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            accessibilityLabel="게시글 내용"
            maxLength={2000}
            multiline
            onChangeText={setContent}
            placeholder={topic === 'VERIFY' ? '무엇이 궁금한가요?' : topic === 'INFO' ? '어떤 정보를 나누고 싶나요?' : '어떤 냥이를 만났나요?'}
            placeholderTextColor="#8B8B96"
            style={styles.bodyInput}
            textAlignVertical="top"
            value={content}
          />

          <View style={styles.photoHeader}>
            <Text style={styles.sectionTitle}>사진 추가 <Text style={styles.optional}>(선택)</Text></Text>
            <View style={styles.photoActions}>
              <Pressable accessibilityLabel="앨범에서 사진 선택" accessibilityRole="button" onPress={() => void pickFromAlbum()} style={styles.outlineButton}>
                <ImageIcon color={nd.colors.ink} size={20} strokeWidth={1.8} />
                <Text style={styles.outlineButtonText}>앨범</Text>
              </Pressable>
              <Pressable accessibilityLabel="카메라로 촬영" accessibilityRole="button" onPress={() => void takePhoto()} style={styles.outlineButton}>
                <Camera color={nd.colors.ink} size={20} strokeWidth={1.8} />
                <Text style={styles.outlineButtonText}>카메라</Text>
              </Pressable>
            </View>
          </View>

          {images.length > 0 ? (
            <ScrollView contentContainerStyle={styles.previewRow} horizontal showsHorizontalScrollIndicator={false}>
              {images.map((image, index) => (
                <View key={`${image.uri}-${index}`}>
                  <Image source={{ uri: image.uri }} style={[styles.previewImage, { width: previewSize, height: previewSize }]} />
                  <Pressable
                    accessibilityLabel={`사진 ${index + 1} 삭제`}
                    accessibilityRole="button"
                    onPress={() => setImages((previous) => previous.filter((_, itemIndex) => itemIndex !== index))}
                    style={styles.removeImageButton}
                  >
                    <X color={nd.colors.ink} size={17} strokeWidth={2} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.photoHint}>
              <ImageIcon color={nd.colors.subtle} size={22} strokeWidth={1.6} />
              <Text style={styles.photoHintText}>고양이의 모습을 최대 3장 남길 수 있어요.</Text>
            </View>
          )}

          <View style={styles.formRows}>
            <View style={styles.formRow}>
              <StickyNote color={nd.colors.ink} size={22} strokeWidth={1.8} />
              <Text style={styles.formLabel}>관찰 스티커</Text>
              <View style={styles.noteInputWrap}>
                <TextInput
                  accessibilityLabel="관찰 스티커"
                  maxLength={120}
                  onChangeText={setObservationNote}
                  placeholder="특징을 짧게 남겨요"
                  placeholderTextColor={nd.colors.sub}
                  style={styles.noteInput}
                  value={observationNote}
                />
                <Pencil color={nd.colors.ink} size={17} strokeWidth={1.7} />
              </View>
            </View>

            <Pressable accessibilityLabel="고객 연결 선택" accessibilityRole="button" onPress={() => setIsCatPickerOpen(true)} style={styles.formRow}>
              <CatIcon color={nd.colors.ink} size={23} strokeWidth={1.7} />
              <Text style={styles.formLabel}>고객 연결</Text>
              <Text numberOfLines={1} style={styles.formValue}>{selectedCat?.name ?? '선택 안 함'}</Text>
              <ChevronRight color={nd.colors.sub} size={22} strokeWidth={1.7} />
            </Pressable>

            <Pressable accessibilityLabel="발견 위치 선택" accessibilityRole="button" onPress={() => setIsNeighborhoodSheetOpen(true)} style={styles.formRow}>
              <MapPin color={nd.colors.ink} size={23} strokeWidth={1.7} />
              <Text style={styles.formLabel}>발견 위치</Text>
              <Text numberOfLines={1} style={styles.formValue}>{isDetecting ? '확인 중' : locationName}</Text>
              <ChevronRight color={nd.colors.sub} size={22} strokeWidth={1.7} />
            </Pressable>

            <Pressable accessibilityLabel="발견 시간 선택" accessibilityRole="button" onPress={chooseObservedAt} style={styles.formRow}>
              <Clock3 color={nd.colors.ink} size={23} strokeWidth={1.7} />
              <Text style={styles.formLabel}>발견 시간</Text>
              <Text style={styles.formValue}>{formatObservedAt(observedAt)}</Text>
              <ChevronRight color={nd.colors.sub} size={22} strokeWidth={1.7} />
            </Pressable>
          </View>

          <View style={styles.safetyNotice}>
            <ShieldCheck color="#F0642E" size={24} strokeWidth={1.8} />
            <Text style={styles.safetyText}>정확한 사유지나 내부 위치는 공유하지 마세요.{`\n`}고객님의 안전을 위해 배려해 주세요.</Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityLabel="이야기 올리기"
            accessibilityRole="button"
            disabled={!canSubmit}
            onPress={() => void submit()}
            style={({ pressed }) => [styles.submitButton, !canSubmit && styles.submitDisabled, pressed && styles.pressed]}
          >
            {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>이야기 올리기</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <CatPicker
        cats={cats}
        onClose={() => setIsCatPickerOpen(false)}
        onSelect={(cat) => {
          setSelectedCat(cat);
          setIsCatPickerOpen(false);
        }}
        selectedCatId={selectedCat?.id}
        visible={isCatPickerOpen}
      />

      <NeighborhoodSheet
        activeId={neighborhood?.id}
        isDetecting={isDetecting}
        onAddCurrent={() => {
          void redetect().then((detected) => {
            if (detected) refresh();
          });
        }}
        onChanged={refresh}
        onClose={() => setIsNeighborhoodSheetOpen(false)}
        visible={isNeighborhoodSheetOpen}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: nd.colors.bg },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  headerSide: { width: 54, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, lineHeight: 28, fontWeight: '700', letterSpacing: -0.5, color: nd.colors.ink },
  registerText: { fontSize: 17, lineHeight: 24, fontWeight: '700', color: '#FF5A1F' },
  registerDisabled: { opacity: 0.35 },
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  segmentedControl: { height: 56, flexDirection: 'row', borderWidth: 1, borderColor: nd.colors.border, borderRadius: 28, backgroundColor: '#F8F8FA', marginTop: 8, overflow: 'hidden' },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 28 },
  segmentSelected: { borderWidth: 1.5, borderColor: '#FF6A23', backgroundColor: '#FFF8EF' },
  segmentText: { fontSize: 15, lineHeight: 21, fontWeight: '600', letterSpacing: -0.38, color: nd.colors.ink },
  segmentTextSelected: { color: '#FF5A1F' },
  bodyInput: { minHeight: 100, paddingTop: 28, paddingHorizontal: 2, fontSize: 17, lineHeight: 25, letterSpacing: -0.43, color: nd.colors.ink },
  photoHeader: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 17, lineHeight: 24, fontWeight: '600', letterSpacing: -0.43, color: nd.colors.ink },
  optional: { color: nd.colors.sub, fontWeight: '400' },
  photoActions: { flexDirection: 'row', gap: 8 },
  outlineButton: { height: 42, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: nd.colors.ink, borderRadius: 10, paddingHorizontal: 12 },
  outlineButtonText: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: nd.colors.ink },
  previewRow: { gap: 8, paddingVertical: 4 },
  previewImage: { borderRadius: 10, backgroundColor: nd.colors.field },
  removeImageButton: { position: 'absolute', top: 6, right: 6, width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.92)', ...createNdShadow(0.12, 5) },
  photoHint: { height: 84, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, backgroundColor: '#FAFAFC', marginVertical: 4 },
  photoHintText: { fontSize: 13, color: nd.colors.sub },
  formRows: { marginTop: 12 },
  formRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderColor: nd.colors.border, paddingHorizontal: 2 },
  formLabel: { minWidth: 72, fontSize: 16, lineHeight: 23, fontWeight: '600', letterSpacing: -0.4, color: nd.colors.ink },
  formValue: { flex: 1, fontSize: 15, lineHeight: 21, textAlign: 'right', color: nd.colors.ink },
  noteInputWrap: { flex: 1, height: 42, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#EADABF', backgroundColor: '#FFF8E7', paddingHorizontal: 10 },
  noteInput: { flex: 1, padding: 0, fontSize: 14, color: '#3D342D' },
  safetyNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 12, backgroundColor: '#FFF0E3', padding: 14, marginTop: 12 },
  safetyText: { flex: 1, fontSize: 14, lineHeight: 21, letterSpacing: -0.35, color: '#C94F2B' },
  footer: { borderTopWidth: 1, borderColor: '#F3F3F6', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6, backgroundColor: nd.colors.bg },
  submitButton: { height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 28, backgroundColor: '#FF6A00' },
  submitDisabled: { opacity: 0.34 },
  submitText: { fontSize: 18, lineHeight: 25, fontWeight: '700', letterSpacing: -0.45, color: '#FFFFFF' },
  pressed: { opacity: 0.78 },
  modalScrim: { flex: 1, backgroundColor: 'rgba(17,17,17,0.4)' },
  catSheet: { maxHeight: '72%', borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: nd.colors.bg, paddingTop: 10 },
  sheetHandle: { width: 42, height: 5, alignSelf: 'center', borderRadius: 3, backgroundColor: nd.colors.border },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  sheetTitle: { fontSize: 20, lineHeight: 28, fontWeight: '700', color: nd.colors.ink },
  sheetSubtitle: { marginTop: 2, fontSize: 13, lineHeight: 19, color: nd.colors.sub },
  sheetClose: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  catList: { paddingHorizontal: 16, paddingBottom: 20, gap: 8 },
  catOption: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'transparent', borderRadius: 14, paddingHorizontal: 12 },
  catOptionSelected: { borderColor: nd.colors.accent, backgroundColor: nd.colors.primarySoft },
  catImage: { width: 46, height: 46, borderRadius: 23, backgroundColor: nd.colors.field },
  catFallback: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 23, backgroundColor: nd.colors.field },
  catOptionCopy: { flex: 1 },
  catOptionName: { fontSize: 15, lineHeight: 21, fontWeight: '700', color: nd.colors.ink },
  catOptionMeta: { fontSize: 12, lineHeight: 17, color: nd.colors.sub },
  selectedDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: nd.colors.accent },
});
