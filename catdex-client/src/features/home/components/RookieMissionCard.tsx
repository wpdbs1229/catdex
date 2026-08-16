import { ClipboardList, PawPrint, Search } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TRAINING_CAT_NAME } from '@/shared/constants/training.constants';
import { nd } from '@/shared/styles/theme';

const STEP_ICON_SIZE = 18;

/**
 * 첫 업무의 세 단계. 온보딩 완료 화면도 같은 줄을 쓰므로 함께 내보낸다.
 * done이면 세 칸 모두 발도장이 찍힌 모양이 된다.
 */
export function MissionSteps({ done }: { done?: boolean }) {
  const steps: { label: string; icon: ReactNode; filled: boolean }[] = [
    {
      label: `${TRAINING_CAT_NAME} 만나기`,
      icon: <PawPrint color="#FFFFFF" size={STEP_ICON_SIZE} strokeWidth={2.2} />,
      filled: true,
    },
    {
      label: '특징 확인',
      icon: done ? (
        <PawPrint color="#FFFFFF" size={STEP_ICON_SIZE} strokeWidth={2.2} />
      ) : (
        <Search color={nd.colors.sub} size={STEP_ICON_SIZE} strokeWidth={2.2} />
      ),
      filled: Boolean(done),
    },
    {
      label: '고객 등록',
      icon: done ? (
        <PawPrint color="#FFFFFF" size={STEP_ICON_SIZE} strokeWidth={2.2} />
      ) : (
        <ClipboardList color={nd.colors.sub} size={STEP_ICON_SIZE} strokeWidth={2.2} />
      ),
      filled: Boolean(done),
    },
  ];

  return (
    <View style={styles.stepsRow}>
      {steps.map((step, index) => (
        <View key={step.label} style={styles.stepGroup}>
          {index > 0 ? <View style={styles.stepLink} /> : null}
          <View style={styles.step}>
            <View style={[styles.stepCircle, step.filled && styles.stepCircleFilled]}>{step.icon}</View>
            <Text style={styles.stepLabel}>{step.label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * 신입 사원 첫 업무 카드. 첫 고객(교육용 보리)을 등록할 때까지 인사고과
 * 자리를 대신 차지하고, 등록이 끝나면 인사고과로 돌아간다.
 */
export function RookieMissionCard({ onStart }: { onStart: () => void }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>첫 고객을 모집해라냥!</Text>
      <Text style={styles.subtitle}>
        {TRAINING_CAT_NAME} 고객님을 등록하면{'\n'}사원증이 활성화돼요.
      </Text>

      <MissionSteps />

      <View style={styles.progressRow}>
        <PawPrint color={nd.colors.subtle} size={12} strokeWidth={2.4} />
        <View style={styles.track} />
        <Text style={styles.progressText}>0/3</Text>
      </View>

      <Pressable
        accessibilityLabel="첫 업무 시작하기"
        accessibilityRole="button"
        onPress={onStart}
        style={({ pressed }) => [styles.startButton, pressed && styles.pressed]}
      >
        <Text style={styles.startButtonText}>첫 업무 시작하기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    backgroundColor: nd.colors.bgSecondary,
    paddingHorizontal: 18,
    paddingVertical: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.55,
    color: nd.colors.accent,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.35,
    textAlign: 'center',
    color: nd.colors.sub,
  },
  stepsRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  stepGroup: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  step: {
    alignItems: 'center',
    gap: 6,
    width: 76,
  },
  stepCircle: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: nd.colors.border,
    backgroundColor: '#FFFFFF',
  },
  stepCircleFilled: {
    borderColor: nd.colors.accent,
    backgroundColor: nd.colors.accent,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: nd.colors.ink,
  },
  // 원 가운데 높이에 맞춘 점선. 칸 사이를 잇는다.
  stepLink: {
    width: 22,
    marginTop: 21,
    borderBottomWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: nd.colors.subtle,
  },
  progressRow: {
    marginTop: 16,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  track: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E6E3DF',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: nd.colors.sub,
  },
  startButton: {
    marginTop: 16,
    alignSelf: 'stretch',
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: nd.radius.input,
    backgroundColor: nd.colors.primary,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.88,
  },
});
