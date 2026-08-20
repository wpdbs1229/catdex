import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { createNdShadow, nd } from '@/shared/styles/theme';

interface Step {
  title: string;
  body: string;
}

/**
 * 첫 진입 안내.
 *
 * 이 화면은 "고양이가 스스로 찾아오고, 상담하면 기록과 포인트가 남고,
 * 그 포인트로 방을 꾸민다"는 순환이 핵심인데 화면만 봐서는 알 수가 없다.
 * 한 번만 보여 주고 다시 뜨지 않는다.
 */
const STEPS: readonly Step[] = [
  {
    title: '고객이 찾아와요',
    body: '동네에서 만난 고양이가 이 방에 손님으로 옵니다. 새 고객을 등록할수록 더 자주 찾아와요.',
  },
  {
    title: '비품에 앉으면 상담이 열려요',
    body: '방석·의자 같은 비품에 앉은 고객을 누르면 상담이 끝나고 상담일지에 남아요. 앉을 자리가 없으면 그냥 서성이다 갑니다.',
  },
  {
    title: '복지포인트로 방을 꾸며요',
    body: '상담과 고객 등록으로 복지포인트가 쌓여요. 오른쪽 상자에서 비품을 사고, 연필로 자리를 옮길 수 있어요.',
  },
  {
    title: '방은 한 단계씩 넓어져요',
    body: '포인트를 모으면 상자 안 "확장하기"에서 방을 넓힐 수 있어요. 다음 단계는 이번 단계를 마쳐야 열려요.',
  },
];

export function RoomOnboarding({ visible, onDone }: { visible: boolean; onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  return (
    <Modal animationType="fade" onRequestClose={onDone} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.step}>
            {index + 1} / {STEPS.length}
          </Text>
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.body}>{step.body}</Text>

          <View style={styles.dots}>
            {STEPS.map((item, dotIndex) => (
              <View
                key={item.title}
                style={[styles.dot, dotIndex === index && styles.dotActive]}
              />
            ))}
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityLabel="안내 건너뛰기"
              accessibilityRole="button"
              onPress={onDone}
              style={styles.skip}
            >
              <Text style={styles.skipText}>건너뛰기</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={isLast ? '안내 닫기' : '다음 안내 보기'}
              accessibilityRole="button"
              onPress={() => (isLast ? onDone() : setIndex((current) => current + 1))}
              style={styles.next}
            >
              <Text style={styles.nextText}>{isLast ? '시작하기' : '다음'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 17, 17, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    borderRadius: 22,
    backgroundColor: nd.colors.bg,
    padding: 24,
    gap: 10,
    ...createNdShadow(0.18, 20),
  },
  step: { fontSize: 12, fontWeight: '700', color: nd.colors.accent },
  title: { fontSize: 20, fontWeight: '800', color: '#3A2E22' },
  body: { fontSize: 14, lineHeight: 21, color: '#5C4B39' },
  dots: { flexDirection: 'row', gap: 6, paddingTop: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E0D3BE' },
  dotActive: { backgroundColor: nd.colors.accent, width: 18 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8 },
  skip: { flex: 1, height: 46, alignItems: 'center', justifyContent: 'center' },
  skipText: { fontSize: 14, fontWeight: '600', color: '#8B7A66' },
  next: {
    flex: 1.6,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: nd.colors.accent,
  },
  nextText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
