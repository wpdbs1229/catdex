import { useIsFocused } from '@react-navigation/native';
import { CameraView, useCameraPermissions, type CameraType, type FlashMode } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Images, SwitchCamera } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { prepareCatVision } from '../../../shared/native/catVision';
import { CaptureTopBar } from '../components/CaptureTopBar';
import { GridOverlay } from '../components/GridOverlay';
import { ShutterButton } from '../components/ShutterButton';
import { ZoomLevelSelector } from '../components/ZoomLevelSelector';
import { captureColors, captureSpacing } from '../capture.theme';
import { useZoomControl } from '../hooks/useZoomControl';
import type { CaptureStackScreenProps } from '../../../app/navigation/types';

/** 프리뷰는 4:3으로 고정한다. 개체마다 프레이밍이 달라지면 누끼와 매칭 품질이 흔들린다. */
const PREVIEW_ASPECT_RATIO = 3 / 4;

export function CameraScreen({ navigation, route }: CaptureStackScreenProps<'Camera'>) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [showGrid, setShowGrid] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // 확인 화면에서 돌아올 때 넘겨받는다. 직전에 잘라낸 고양이를 좌하단에 남겨 둔다.
  const lastCutoutUri = route.params?.lastCutoutUri ?? null;
  const zoom = useZoomControl(facing);

  useEffect(() => {
    // Android는 Play 서비스에서 누끼 모델을 내려받아야 한다. 첫 촬영에서 기다리지
    // 않도록 화면에 들어오는 시점에 미리 요청한다. 실패해도 촬영은 계속된다.
    prepareCatVision();
  }, []);

  useEffect(() => {
    // 확인 화면으로 넘어가면 프리뷰를 내린다. 돌아왔을 때 onCameraReady를 다시 기다려야
    // 아직 살아나지 않은 세션에 셔터를 누르는 일이 없다.
    if (!isFocused) {
      setIsCameraReady(false);
    }
  }, [isFocused]);

  const openReview = useCallback(
    (photoUri: string) => {
      navigation.navigate('CaptureReview', { photoUri });
    },
    [navigation],
  );

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || !isCameraReady || isCapturing) {
      return;
    }

    setIsCapturing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9, skipProcessing: false });

      if (photo?.uri) {
        openReview(photo.uri);
      }
    } catch (error) {
      Alert.alert('촬영에 실패했어요', error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.');
    } finally {
      setIsCapturing(false);
    }
  }, [isCameraReady, isCapturing, openReview]);

  const handlePickFromLibrary = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      openReview(result.assets[0].uri);
    }
  }, [openReview]);

  const pinchGesture = Gesture.Pinch()
    .onBegin(zoom.beginGesture)
    .onUpdate((event) => zoom.updateGesture(event.scale))
    .onFinalize(zoom.endGesture);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.permissionContainer, { paddingTop: insets.top }]}>
        <Text style={styles.permissionTitle}>카메라 권한이 필요해요</Text>
        <Text style={styles.permissionBody}>
          길고양이를 찍어 도감에 남기려면 카메라 접근을 허용해주세요. 사진은 기기 안에서 먼저 처리됩니다.
        </Text>
        <Pressable accessibilityRole="button" onPress={requestPermission} style={styles.permissionButton}>
          <Text style={styles.permissionButtonText}>카메라 허용하기</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <CaptureTopBar
        flash={flash}
        showGrid={showGrid}
        onClose={() => navigation.goBack()}
        onToggleFlash={() => setFlash((current) => (current === 'off' ? 'on' : 'off'))}
        onToggleGrid={() => setShowGrid((current) => !current)}
      />

      <GestureDetector gesture={pinchGesture}>
        <View style={styles.preview}>
          {isFocused ? (
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing={facing}
              flash={flash}
              zoom={zoom.normalized}
              // ratio는 Android 전용이다. iOS는 프리뷰 컨테이너 비율이 그대로 4:3이 된다.
              ratio="4:3"
              mode="picture"
              animateShutter={false}
              onCameraReady={() => setIsCameraReady(true)}
              onMountError={(event) => Alert.alert('카메라를 열지 못했어요', event.message)}
            />
          ) : null}

          {showGrid ? <GridOverlay /> : null}
        </View>
      </GestureDetector>

      <View style={styles.controls}>
        <ZoomLevelSelector
          stops={zoom.stops}
          factor={zoom.factor}
          isAdjusting={zoom.isAdjusting}
          onSelect={zoom.setFactor}
        />

        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="갤러리에서 사진 가져오기"
            onPress={handlePickFromLibrary}
            style={styles.sideButton}
          >
            {lastCutoutUri ? (
              <Image source={{ uri: lastCutoutUri }} style={styles.thumbnail} resizeMode="cover" />
            ) : (
              <Images color={captureColors.text} size={22} />
            )}
          </Pressable>

          <ShutterButton disabled={!isCameraReady} isBusy={isCapturing} onPress={handleCapture} />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="전면 후면 카메라 전환"
            onPress={() => {
              setIsCameraReady(false);
              setFacing((current) => (current === 'back' ? 'front' : 'back'));
            }}
            style={styles.sideButton}
          >
            <SwitchCamera color={captureColors.text} size={22} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: captureColors.background,
  },
  preview: {
    width: '100%',
    aspectRatio: PREVIEW_ASPECT_RATIO,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  controls: {
    flex: 1,
    justifyContent: 'space-evenly',
    paddingHorizontal: captureSpacing.gutter,
    paddingVertical: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sideButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: captureColors.control,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  permissionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  permissionTitle: {
    color: captureColors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  permissionBody: {
    color: captureColors.mutedText,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  permissionButton: {
    marginTop: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: captureColors.accent,
  },
  permissionButtonText: {
    color: captureColors.onControlActive,
    fontSize: 15,
    fontWeight: '800',
  },
});
