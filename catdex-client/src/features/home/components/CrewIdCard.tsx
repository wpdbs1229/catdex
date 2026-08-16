import { PawPrint } from 'lucide-react-native';
import { useMemo } from 'react';
import { Animated, Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { nd } from '@/shared/styles/theme';
import { CREW_COMPANY_SHORT_NAME } from '@/shared/constants/crew.constants';

const caseBack = require('../../../../assets/badge/case-back.png');
const caseFront = require('../../../../assets/badge/case-front.png');
const lanyard = require('../../../../assets/badge/lanyard.png');

interface CrewIdCardProps {
  nickname: string;
  /** 사원증 사진. 없으면 발바닥 자리표시자를 쓴다. */
  profileImageUrl?: string;
  rank: string;
  /** 활동 동네의 시·군 이름. 지부 표기에 쓴다. */
  city?: string;
  /**
   * 첫 고객을 아직 등록하지 못한 신입의 사원증. 내용을 흐리게 하고
   * '첫 고객 등록 후 활성화' 표를 붙인다.
   */
  inactive?: boolean;
  /** 가입 시각(ISO). 일련번호를 만드는 데 쓴다. */
  joinedAt?: string;
  /**
   * 0~MAX_PULL. 화면을 위에서 아래로 당긴 만큼 사원증이 끈에 끌려 내려간다.
   *
   * 제스처를 따로 잡지 않고 스크롤이 넘긴 값을 그대로 쓴다. 스크롤뷰 안에서
   * PanResponder로 아래 방향을 가로채면 iOS 네이티브 스크롤이 먼저 가져가
   * 화면만 통째로 튕긴다.
   */
  pull?: Animated.AnimatedInterpolation<number> | Animated.Value;
}

/**
 * 케이스 이미지 원본 크기와 그 안쪽 창 좌표(에셋의 IMPLEMENTATION_NOTES 기준).
 * 카드 폭이 정해지면 나머지는 전부 같은 비율로 따라간다.
 */
const ASSET = { width: 1005, height: 720, windowX: 79, windowY: 145, windowW: 774, windowH: 492, radius: 34 };
/**
 * 화면 양옆 여백.
 *
 * 넓게 쓰면 사원증이 첫 화면을 다 먹어서 그 아래 고객지원실 진입 카드가 스크롤
 * 밖으로 밀린다. 앱을 켰을 때 '새 장면이 생겼어요'가 보여야 하므로 사원증을
 * 조금 줄여 자리를 내준다.
 */
const SIDE_MARGIN = 44;
/** 태블릿에서 지나치게 커지지 않게 상한을 둔다. */
const MAX_WIDTH = 460;
/** 글자 크기 기준. 이 폭일 때의 값이 아래 스타일의 숫자다. */
const BASE_WIDTH = 335;

/** 목걸이 끈 원본 크기 (배경을 지우고 내용에 맞춰 자른 뒤) */
const LANYARD = { width: 600, height: 832 };
/**
 * 케이스 앞판에 뚫린 슬롯의 세로 중심. 끈 끝(투명 고리)이 이 자리에서 끝나야
 * 구멍에 꿴 것처럼 보인다. 앞판·뒤판 모두 이 자리가 비어 있어서, 끈을 카드
 * 뒤에 두면 구멍 사이로 끈이 비친다.
 */
const SLOT_CENTER_RATIO = 107 / 720;
/** 카드 폭 대비 끈 폭. 끈이 카드보다 좁아야 카드가 주인공으로 남는다. */
const LANYARD_WIDTH_RATIO = 0.5;
/**
 * 카드 높이 대비 '보이는' 끈 길이.
 *
 * 끈 전체를 그리면 V자가 통째로 들어앉아 사원증보다 커진다. 위쪽을 잘라 두면
 * 끈이 화면 밖으로 이어지는 것처럼 읽혀서, 실제로 목에 건 것처럼 보이면서
 * 자리는 훨씬 덜 먹는다.
 */
/**
 * 0.56 아래로 내리면 고양이 클립의 귀가 잘려 덩어리처럼 보인다.
 * 자리를 더 줄여야 하면 끈이 아니라 카드 폭(SIDE_MARGIN)을 건드린다.
 */
const LANYARD_VISIBLE_RATIO = 0.58;
/**
 * 사원증을 끌어내릴 수 있는 최대 거리(pt).
 *
 * 목에 건 사원증을 잡아당기면 끈이 딸려 나왔다가 놓으면 제자리로 돌아간다.
 * 평소에는 끈을 조금만 보여 두고, 당겼을 때만 길이가 드러나게 한다.
 */
export const MAX_PULL = 80;

/**
 * 이만큼 오버스크롤하면 끈이 최대로 늘어난다.
 *
 * MAX_PULL보다 작게 둔다. iOS 고무줄 스크롤이 손가락 움직임을 크게 깎아서
 * (220pt를 끌어도 30pt쯤만 넘어온다) 1:1로 매기면 끈이 거의 안 늘어난다.
 */
export const PULL_TRAVEL = 48;

/** 아무것도 받지 못했을 때 쓸 정지값 */
const NO_PULL = new Animated.Value(0);

const colors = {
  sheet: '#F9F8F6',
  orange: '#E07C33',
  ink: '#1A1A1A',
  footer: '#929090',
  emboss: '#EFEDEA',
  fieldRule: '#DED9D2',
  footerRule: '#E7C9A9',
};

/** 가입 날짜·시각을 합쳐 계정마다 고정된 사번을 만든다. */
function formatSerial(joinedAt?: string) {
  const joined = joinedAt ? new Date(joinedAt) : null;

  if (!joined || Number.isNaN(joined.getTime())) {
    return 'NYD-00000000-0000';
  }

  const pad = (value: number) => String(value).padStart(2, '0');
  const date = `${joined.getFullYear()}${pad(joined.getMonth() + 1)}${pad(joined.getDate())}`;
  const time = `${pad(joined.getHours())}${pad(joined.getMinutes())}`;

  return `NYD-${date}-${time}`;
}

/** 좌측 바의 고양이 머리. 시안 실루엣을 좌우 대칭 곡선으로 옮겼다. */
function CatMark({ width }: { width: number }) {
  return (
    <Svg height={(width * 38) / 40} viewBox="0 0 40 38" width={width}>
      <Path
        d="M3.4 1 Q3.4 0.2 4.4 0.2 L7 0.2 Q8.2 0.2 9.2 1.8 L12.4 5.6 Q12.8 6.1 13.5 6.1 L25.5 6.1 Q26.2 6.1 26.6 5.6 L29.8 1.8 Q30.8 0.2 32 0.2 L34.6 0.2 Q35.6 0.2 35.6 1 C35.6 4 36.8 10 37.8 14 C39.2 18 39.6 21 39.6 25 C39.6 31.5 34.5 37.6 28 37.6 L12 37.6 C5.5 37.6 0.4 31.5 0.4 25 C0.4 21 0.8 18 2.2 14 C3.2 10 3.4 4 3.4 1 Z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}

/** "부천시" -> "부천지부". 동네를 아직 못 찾았으면 본사 소속으로 둔다. */
export function formatBranch(city?: string) {
  const trimmed = city?.trim();

  if (!trimmed) {
    return '본사';
  }

  const base = trimmed.replace(/(특별자치시|특별자치도|특별시|광역시|시|군|도)$/, '');

  return `${base || trimmed}지부`;
}

/**
 * 냥냥공사 사원증.
 *
 * 투명 케이스와 꼬리 클립은 코드로 낼 수 없는 질감(굴절·입체 명암)이라 PNG 두
 * 장으로 처리한다. 뒤판 -> 내용 -> 앞판 순으로 겹치면 카드가 케이스 안에 들어간
 * 것처럼 보인다. 내용은 데이터가 바뀌므로 그대로 코드로 그린다.
 */
export function CrewIdCard({ nickname, profileImageUrl, rank, city, joinedAt, pull, inactive }: CrewIdCardProps) {
  const { width: screenWidth } = useWindowDimensions();
  const styles = useMemo(() => createStyles(screenWidth), [screenWidth]);
  const logoWidth = styles.catMarkBox.width;
  const stampPawSize = styles.embossPaw.width;

  const pullValue = pull ?? NO_PULL;

  return (
    <View style={styles.hanger}>
      {/* 카드보다 먼저 그려 뒤로 보낸다. 슬롯이 뚫려 있어 구멍으로 끈이 비친다.
          창이 끈 위쪽을 잘라 화면 밖으로 이어지는 것처럼 만든다. */}
      <View style={styles.lanyardWindow}>
        <Animated.View style={{ transform: [{ translateY: Animated.add(pullValue, -MAX_PULL) }] }}>
          <Image resizeMode="contain" source={lanyard} style={styles.lanyard} />
        </Animated.View>
      </View>

      <Animated.View style={[styles.card, { transform: [{ translateY: pullValue }] }]}>
        <Image resizeMode="stretch" source={caseBack} style={styles.caseLayer} />

      <View style={[styles.window, inactive && styles.windowInactive]}>
        <View style={styles.sidebar}>
          <View style={styles.sidebarTop}>
            <CatMark width={logoWidth} />
            <Text style={styles.brand}>{CREW_COMPANY_SHORT_NAME}</Text>
          </View>
          <View style={styles.sidebarBottom}>
            <View style={styles.brandRule} />
            <Text style={styles.passLabel}>{'CREW\nACCESS\nPASS'}</Text>
          </View>
        </View>

        <View style={styles.body}>
          {/* 발바닥 양각 워터마크. RN에 inner shadow가 없어 두 겹으로 흉내 낸다. */}
          <View pointerEvents="none" style={styles.emboss}>
            <View style={[styles.embossRing, styles.embossRingLight]} />
            <View style={styles.embossRing} />
            <PawPrint color="#FFFFFF" size={stampPawSize} strokeWidth={1.4} style={styles.embossPawLight} />
            <PawPrint color={colors.emboss} size={stampPawSize} strokeWidth={1.4} style={styles.embossPaw} />
          </View>

          <View style={styles.bodyTop}>
            {profileImageUrl ? (
              <Image resizeMode="cover" source={{ uri: profileImageUrl }} style={styles.photo} />
            ) : (
              <View style={[styles.photo, styles.photoFallback]}>
                <PawPrint color={nd.colors.subtle} size={26} strokeWidth={1.6} />
              </View>
            )}

            <View style={styles.fields}>
              <Text adjustsFontSizeToFit minimumFontScale={0.5} numberOfLines={1} style={styles.name}>
                {nickname}
              </Text>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>지부:</Text>
                <Text numberOfLines={1} style={styles.fieldValue}>
                  {formatBranch(city)}
                </Text>
              </View>
              <View style={[styles.fieldRow, styles.fieldRowLast]}>
                <Text style={styles.fieldLabel}>직책:</Text>
                <Text numberOfLines={1} style={styles.fieldValue}>
                  {rank}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.footerRule} />
          <View style={styles.footer}>
            <PawPrint color={colors.orange} size={9} strokeWidth={2.2} />
            <Text numberOfLines={1} style={styles.tagline}>
              고양이와 함께, 더 나은 내일을 만듭니다.
            </Text>
            <Text style={styles.serial}>{formatSerial(joinedAt)}</Text>
          </View>
        </View>
      </View>

        {/* 앞판이 카드 위를 덮어 케이스 안에 들어간 것처럼 보이게 한다. */}
        <View pointerEvents="none" style={styles.caseLayer}>
          <Image resizeMode="stretch" source={caseFront} style={styles.caseImage} />
        </View>

        {/* 케이스 위에 얹어야 흐림 처리와 무관하게 또렷이 읽힌다. */}
        {inactive ? (
          <View pointerEvents="none" style={styles.inactivePill}>
            <Text style={styles.inactivePillText}>첫 고객 등록 후 활성화</Text>
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

function createStyles(screenWidth: number) {
  const cardWidth = Math.min(screenWidth - SIDE_MARGIN * 2, MAX_WIDTH);
  const cardHeight = (cardWidth * ASSET.height) / ASSET.width;
  // 케이스 원본 좌표를 카드 폭에 맞춰 환산한다.
  const toCard = (assetValue: number) => (assetValue * cardWidth) / ASSET.width;
  const sidebarWidth = toCard(ASSET.windowW) * 0.16;
  // 글자·여백은 335pt 기준 값을 같은 비율로 키운다.
  const s = (value: number) => (value * cardWidth) / BASE_WIDTH;
  const stampSize = s(52);
  const lanyardWidth = cardWidth * LANYARD_WIDTH_RATIO;

  return StyleSheet.create({
  hanger: {
    alignItems: 'center',
  },
  // 당겼을 때 드러날 길이까지 미리 확보해 둔다. 그만큼 카드를 끌어올리므로
  // 쉬고 있을 때의 자리는 창을 키우기 전과 같다.
  lanyardWindow: {
    width: lanyardWidth,
    height: cardHeight * LANYARD_VISIBLE_RATIO + MAX_PULL,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  lanyard: {
    width: lanyardWidth,
    height: (lanyardWidth * LANYARD.height) / LANYARD.width,
  },
  // 끈 끝이 슬롯에 닿도록 카드를 그만큼 끌어올린다.
  card: {
    width: cardWidth,
    height: cardHeight,
    marginTop: -cardHeight * SLOT_CENTER_RATIO - MAX_PULL,
  },
  caseLayer: {
    ...StyleSheet.absoluteFillObject,
    width: cardWidth,
    height: cardHeight,
  },
  caseImage: {
    width: cardWidth,
    height: cardHeight,
  },
  // 케이스 앞판의 실제 창 위치
  window: {
    position: 'absolute',
    left: toCard(ASSET.windowX),
    top: toCard(ASSET.windowY),
    width: toCard(ASSET.windowW),
    height: toCard(ASSET.windowH),
    flexDirection: 'row',
    borderRadius: toCard(ASSET.radius),
    backgroundColor: colors.sheet,
    overflow: 'hidden',
  },
  // 왼쪽 패딩만 주고 왼쪽 정렬하면, 폭이 제일 넓은 '냥냥공사'가 오른쪽 끝에
  // 닿을 때까지 밀려 좌우 여백이 24px 대 4px로 어긋난다. 가운데 정렬로 맞춘다.
  sidebar: {
    width: sidebarWidth,
    alignItems: 'center',
    paddingHorizontal: sidebarWidth * 0.06,
    justifyContent: 'space-between',
    backgroundColor: colors.orange,
    paddingTop: s(13),
    paddingBottom: s(20),
  },
  sidebarTop: {
    alignItems: 'center',
    gap: s(5),
  },
  sidebarBottom: {
    alignItems: 'center',
    gap: s(11),
  },
  catMarkBox: {
    width: sidebarWidth * 0.62,
  },
  brand: {
    fontSize: s(10),
    fontWeight: '800',
    letterSpacing: -0.3,
    color: '#FFFFFF',
  },
  brandRule: {
    width: s(16),
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  passLabel: {
    fontSize: s(6),
    lineHeight: s(8.5),
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  body: {
    flex: 1,
    paddingHorizontal: s(13),
    paddingTop: s(9),
    paddingBottom: s(6),
  },
  // 원 테두리 + 발바닥을 밝은 겹과 어두운 겹으로 그려 양각처럼 보이게 한다.
  emboss: {
    position: 'absolute',
    right: s(6),
    bottom: s(26),
    width: stampSize,
    height: stampSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  embossRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: stampSize / 2,
    borderWidth: 1.4,
    borderColor: colors.emboss,
  },
  embossRingLight: {
    left: 1.5,
    top: 1.5,
    borderColor: '#FFFFFF',
  },
  embossPaw: {
    width: stampSize * 0.56,
  },
  embossPawLight: {
    position: 'absolute',
    left: stampSize * 0.22 + 1.5,
    top: stampSize * 0.22 + 1.5,
  },
  bodyTop: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(16),
  },
  photo: {
    width: s(58),
    height: s(72),
    borderRadius: s(36),
    borderWidth: 1,
    borderColor: '#111111',
    backgroundColor: '#FFFFFF',
  },
  photoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fields: {
    flex: 1,
    minWidth: 0,
    gap: s(9),
  },
  name: {
    fontSize: s(22),
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.ink,
  },
  // 시안처럼 구분선을 글자 위에 두고 폭 전체로 긋는다.
  // 발바닥 양각은 마지막 선보다 아래에 놓아 겹치지 않게 한다.
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(5),
    paddingTop: s(7),
    borderTopWidth: 1,
    borderTopColor: colors.fieldRule,
  },
  // 직책 줄은 오른쪽 발바닥 도장에 닿지 않게 절반만 긋는다.
  fieldRowLast: {
    width: '55%',
  },
  fieldLabel: {
    fontSize: s(11),
    fontWeight: '700',
    color: colors.ink,
  },
  fieldValue: {
    fontSize: s(11),
    fontWeight: '600',
    color: colors.ink,
  },
  footerRule: {
    height: 1,
    backgroundColor: colors.footerRule,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(3),
    paddingTop: s(4),
  },
  windowInactive: {
    opacity: 0.45,
  },
  // 창 아래 테두리에 걸쳐 앉는다. 시안의 '첫 고객 등록 후 활성화' 자리.
  inactivePill: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: toCard(ASSET.height - ASSET.windowY - ASSET.windowH) - s(12),
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.fieldRule,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: s(14),
    paddingVertical: s(6),
  },
  inactivePillText: {
    fontSize: s(12),
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.ink,
  },
  tagline: {
    flex: 1,
    fontSize: s(6),
    color: colors.footer,
  },
  serial: {
    fontSize: s(6),
    letterSpacing: 0.2,
    color: colors.footer,
  },
  });
}
