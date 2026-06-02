import { useRef, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { CameraType } from 'expo-camera';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera, RefreshCw, RotateCcw } from 'lucide-react-native';
import { Button } from '@/shared/components/Button';
import { theme } from '@/shared/styles/theme';

interface CameraPlaceholderProps {
  capturedImageUri: string | null;
  height?: number;
  onPhotoCaptured: (uri: string) => Promise<void> | void;
  onRetake: () => void;
}

export function CameraPlaceholder({ capturedImageUri, height, onPhotoCaptured, onRetake }: CameraPlaceholderProps) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleTakePicture = async () => {
    if (!isCameraReady || isCapturing) {
      return;
    }

    setIsCapturing(true);
    setErrorMessage(null);

    try {
      const photo = await cameraRef.current?.takePictureAsync({
        quality: 0.82,
        skipProcessing: false,
      });

      if (photo?.uri) {
        await onPhotoCaptured(photo.uri);
      }
    } catch {
      setErrorMessage('사진을 찍지 못했어요. 실제 기기에서 다시 시도해주세요.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleFlipCamera = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  if (capturedImageUri) {
    return (
      <View style={[styles.container, height ? { height } : null]}>
        <Image source={{ uri: capturedImageUri }} style={styles.capturedImage} />
        <View style={styles.capturedOverlay}>
          <Text style={styles.status}>촬영 완료</Text>
          <Pressable onPress={onRetake} style={styles.iconButton}>
            <RefreshCw color="#FFF7EA" size={18} />
          </Pressable>
        </View>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={[styles.fallback, height ? { minHeight: height } : null]}>
        <Text style={styles.fallbackTitle}>카메라 준비 중</Text>
        <Text style={styles.fallbackText}>권한 상태를 확인하고 있어요.</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.fallback, height ? { minHeight: height } : null]}>
        <Text style={styles.fallbackTitle}>카메라 권한이 필요해요</Text>
        <Text style={styles.fallbackText}>산책 중 만난 고양이를 사진으로 기록하려면 카메라 접근을 허용해주세요.</Text>
        <View style={styles.permissionButtonWrap}>
          <Button onPress={requestPermission}>카메라 권한 허용하기</Button>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, height ? { height } : null]}>
      <CameraView
        ref={cameraRef}
        facing={facing}
        onCameraReady={() => setIsCameraReady(true)}
        onMountError={() => setErrorMessage('카메라를 사용할 수 없어요. iOS 시뮬레이터 대신 실제 기기에서 확인해주세요.')}
        style={styles.camera}
      />
      <View style={styles.cameraOverlay}>
        <Text style={styles.status}>{isCameraReady ? '카메라 미리보기' : '카메라 준비 중'}</Text>
        <View style={styles.focusRing}>
          <Text style={styles.focusEmoji}>🐾</Text>
        </View>
        <View style={styles.controls}>
          <Pressable onPress={handleFlipCamera} style={styles.iconButton}>
            <RotateCcw color="#FFF7EA" size={18} />
          </Pressable>
          <Pressable disabled={!isCameraReady || isCapturing} onPress={handleTakePicture} style={styles.shutterButton}>
            <View style={styles.shutterInner}>
              <Camera color="#4A3428" size={24} />
            </View>
          </Pressable>
          <View style={styles.iconButtonPlaceholder} />
        </View>
      </View>

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 306,
    overflow: 'hidden',
    borderRadius: theme.radius.xl,
    backgroundColor: '#2F2924',
    borderWidth: 1,
    borderColor: 'rgba(255, 253, 246, 0.2)',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  capturedImage: {
    width: '100%',
    height: '100%',
  },
  capturedOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  status: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF7EA',
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  focusRing: {
    width: 180,
    height: 180,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 90,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  focusEmoji: {
    fontSize: 54,
    opacity: 0.72,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.34)',
  },
  iconButtonPlaceholder: {
    width: 44,
    height: 44,
  },
  shutterButton: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,247,234,0.92)',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.58)',
  },
  shutterInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7EA',
  },
  fallback: {
    minHeight: 286,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6F745C',
    borderWidth: 1,
    borderColor: 'rgba(255, 253, 246, 0.28)',
  },
  fallbackTitle: {
    color: '#FFF7EA',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  fallbackText: {
    marginTop: theme.spacing.md,
    color: '#FFF1DF',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  permissionButtonWrap: {
    width: '100%',
    marginTop: theme.spacing.xl,
  },
  errorBanner: {
    position: 'absolute',
    right: theme.spacing.md,
    bottom: theme.spacing.md,
    left: theme.spacing.md,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(47,36,29,0.86)',
  },
  errorText: {
    color: '#FFF7EA',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
