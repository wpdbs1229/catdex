import { ClipboardList, PawPrint, Search } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { DEFAULT_PROFILE_AVATAR } from '@/shared/constants/profile.constants';
import { TRAINING_CAT_NAME } from '@/shared/constants/training.constants';
import { createNdShadow, nd } from '@/shared/styles/theme';

/** 클립보드 모서리를 붙잡고 빼꼼 내다보는 보리. 시안에서 오려낸 누끼다. */
const boriPeek = require('../../../../assets/onboarding/bori-peek.png');

const STEP_ICON_SIZE = 18;

/** 시안의 클립보드 색. 연한 우드 테두리에 크림색 종이. */
const board = {
  frame: '#EED7B6',
  paper: '#FBF7EC',
  metal: '#C6C6C6',
  metalDark: '#9E9E9E',
};

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

interface RookieMissionCardProps {
  nickname: string;
  /** 사원증 발급 대기 칸에 쓸 지부 이름 (예: 부천지부) */
  branch: string;
  onStart: () => void;
  /** '다음에 할게요'. 이번 세션 동안 카드를 접고 인사고과를 돌려준다. */
  onLater: () => void;
}

/**
 * 신입 사원 첫 업무 클립보드.
 *
 * 첫 고객(교육용 보리)을 등록할 때까지 인사고과 자리를 대신 차지한다.
 * 발급 대기 중인 사원증이 서류철에 끼워져 있고, 보리가 모서리에서 빼꼼
 * 쳐다보는 시안을 따른다. 시작·미루기 버튼은 서류철 밖에 둔다.
 */
export function RookieMissionCard({ nickname, branch, onStart, onLater }: RookieMissionCardProps) {
  return (
    <View>
      <View style={styles.board}>
        {/* 금속 클립. 보드 위 테두리에 물려 있다. */}
        <View pointerEvents="none" style={styles.clip}>
          <View style={styles.clipHanger} />
          <View style={styles.clipBar} />
        </View>

        {/* 발급 대기 중인 사원증 */}
        <View style={styles.pendingCard}>
          <View style={styles.pendingClip} />
          <Text style={styles.pendingTitle}>사원증 발급 대기</Text>
          <View style={styles.pendingBody}>
            <Image resizeMode="cover" source={DEFAULT_PROFILE_AVATAR} style={styles.pendingPhoto} />
            <View style={styles.pendingFields}>
              <Text numberOfLines={1} style={styles.pendingName}>
                {nickname}
              </Text>
              <Text numberOfLines={1} style={styles.pendingField}>
                {branch}
              </Text>
              <Text style={styles.pendingField}>신입 사원</Text>
            </View>
          </View>
        </View>

        <Text style={styles.title}>첫 고객을 모집해라냥!</Text>
        <Text style={styles.subtitle}>
          고객 등록 실습을 완료하면{'\n'}정식 사원증이 발급돼요.
        </Text>

        <MissionSteps />

        <View style={styles.progressRow}>
          <PawPrint color={nd.colors.subtle} size={12} strokeWidth={2.4} />
          <View style={styles.track} />
          <Text style={styles.progressText}>0/3</Text>
        </View>

        {/* 보드 오른쪽 모서리를 붙잡은 보리 */}
        <Image resizeMode="contain" source={boriPeek} style={styles.peekCat} />
      </View>

      <Pressable
        accessibilityLabel="첫 업무 시작하기"
        accessibilityRole="button"
        onPress={onStart}
        style={({ pressed }) => [styles.startButton, pressed && styles.pressed]}
      >
        <Text style={styles.startButtonText}>첫 업무 시작하기</Text>
      </Pressable>

      <Pressable
        accessibilityLabel="다음에 할게요"
        accessibilityRole="button"
        onPress={onLater}
        style={({ pressed }) => [styles.laterButton, pressed && styles.pressed]}
      >
        <Text style={styles.laterText}>다음에 할게요</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 6,
    borderColor: board.frame,
    backgroundColor: board.paper,
    paddingHorizontal: 18,
    paddingTop: 34,
    paddingBottom: 22,
    alignItems: 'center',
    ...createNdShadow(0.1, 12),
  },
  clip: {
    position: 'absolute',
    top: -20,
    alignItems: 'center',
    zIndex: 2,
  },
  clipHanger: {
    width: 22,
    height: 14,
    borderRadius: 5,
    borderWidth: 4,
    borderColor: board.metalDark,
    backgroundColor: 'transparent',
    marginBottom: -4,
  },
  clipBar: {
    width: 96,
    height: 24,
    borderRadius: 7,
    backgroundColor: board.metal,
    borderWidth: 1,
    borderColor: board.metalDark,
  },
  pendingCard: {
    width: '72%',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    ...createNdShadow(0.08, 8),
  },
  // 사원증도 작은 클립에 끼워져 있는 시안의 디테일
  pendingClip: {
    position: 'absolute',
    top: -6,
    width: 14,
    height: 10,
    borderRadius: 3,
    backgroundColor: board.metalDark,
  },
  pendingTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: nd.colors.ink,
  },
  pendingBody: {
    marginTop: 10,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pendingPhoto: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: nd.colors.field,
  },
  pendingFields: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
    gap: 2,
  },
  pendingName: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: nd.colors.ink,
  },
  pendingField: {
    fontSize: 11.5,
    letterSpacing: -0.3,
    color: nd.colors.sub,
  },
  title: {
    marginTop: 18,
    fontSize: 21,
    lineHeight: 29,
    fontWeight: '800',
    letterSpacing: -0.5,
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
    backgroundColor: '#EAE2D2',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: nd.colors.sub,
  },
  // 이미지 왼쪽 세로줄이 보드 테두리와 같은 색이라, 오른쪽 테두리 위에
  // 얹으면 모서리를 실제로 붙잡은 것처럼 이어져 보인다.
  peekCat: {
    position: 'absolute',
    // 화면 여백(20pt)보다 조금만 내밀어 머리가 잘리지 않게 한다.
    right: -12,
    bottom: 42,
    width: 58,
    height: 115,
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
  laterButton: {
    marginTop: 4,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  laterText: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.35,
    color: nd.colors.sub,
  },
  pressed: {
    opacity: 0.88,
  },
});
