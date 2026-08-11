import { ArrowLeft } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { nd } from '@/shared/styles/theme';

interface AttendanceHeaderProps {
  onBack: () => void;
}

/** 출근 현황·월별 기록이 함께 쓰는 헤더. 가운데 제목, 왼쪽 뒤로가기. */
export function AttendanceHeader({ onBack }: AttendanceHeaderProps) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityLabel="뒤로 가기"
        accessibilityRole="button"
        hitSlop={10}
        onPress={onBack}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
      >
        <ArrowLeft color={nd.colors.ink} size={22} strokeWidth={1.9} />
      </Pressable>
      <Text style={styles.title}>출근 현황</Text>
      {/* 제목을 가운데 두기 위한 좌우 균형추 */}
      <View style={styles.back} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  back: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.4,
    color: nd.colors.ink,
  },
  pressed: {
    opacity: 0.6,
  },
});
