import { PawPrint } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { nd } from '@/shared/styles/theme';

interface CatChatCardProps {
  /** 고양이 사진. 없으면 발바닥 자리표시자를 쓴다. */
  imageSource?: ImageSourcePropType;
  /** "페르의 이야기를 들어보세요."처럼 두 줄로 끊어 쓰는 안내 문구 */
  message: string;
  onPress: () => void;
}

/** 피그마 2_홈의 "ai 챗" 카드. */
export function CatChatCard({ imageSource, message, onPress }: CatChatCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.avatarFrame}>
          {imageSource ? (
            <Image resizeMode="cover" source={imageSource} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <PawPrint color={nd.colors.subtle} size={20} strokeWidth={1.6} />
            </View>
          )}
        </View>
        <Text numberOfLines={2} style={styles.message}>
          {message}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonText}>채팅 시작하기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 165,
    height: 188,
    justifyContent: 'space-between',
    borderRadius: 20,
    backgroundColor: '#F7F7FB',
    padding: 16,
  },
  head: {
    gap: 8,
  },
  avatarFrame: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(17, 17, 17, 0.1)',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: -0.35,
    color: nd.colors.ink,
  },
  button: {
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  buttonText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    letterSpacing: -0.325,
    color: nd.colors.ink,
  },
  pressed: {
    opacity: 0.88,
  },
});
