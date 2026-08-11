import { PawPrint } from 'lucide-react-native';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { nd } from '@/shared/styles/theme';

const caseBack = require('../../../../assets/badge/case-back.png');
const caseFront = require('../../../../assets/badge/case-front.png');

interface CrewIdCardProps {
  nickname: string;
  /** 사원증 사진. 없으면 발바닥 자리표시자를 쓴다. */
  profileImageUrl?: string;
  rank: string;
  /** 지금까지 모은 마릿수 */
  collected: number;
  /** 가입 시각(ISO). 일련번호를 만드는 데 쓴다. */
  joinedAt?: string;
}

/**
 * 케이스 이미지는 1005x720이고 카드는 그 1/3로 그린다.
 * 안쪽 창 좌표도 같은 비율로 줄인다(에셋의 IMPLEMENTATION_NOTES 기준).
 */
const SCALE = 3;
const CARD_WIDTH = 1005 / SCALE;
const CARD_HEIGHT = 720 / SCALE;
const WINDOW = {
  left: 79 / SCALE,
  top: 145 / SCALE,
  width: 774 / SCALE,
  height: 492 / SCALE,
  radius: 34 / SCALE,
};
/** 주황 사이드바는 창 폭의 16% (목업 기준) */
const SIDEBAR_WIDTH = Math.round(WINDOW.width * 0.16);

const colors = {
  sheet: '#F9F8F6',
  orange: '#D3702D',
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

/** 좌측 바의 고양이 머리 실루엣 */
function CatMark({ size }: { size: number }) {
  return (
    <Svg height={(size * 40) / 48} viewBox="0 0 48 40" width={size}>
      <Path
        d="M8 6 L15 16 Q24 12 33 16 L40 6 Q42 4 42 8 L41 20 Q44 26 41 31 Q34 39 24 39 Q14 39 7 31 Q4 26 7 20 L6 8 Q6 4 8 6 Z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}

/**
 * 냥냥공사 사원증.
 *
 * 투명 케이스와 꼬리 클립은 코드로 낼 수 없는 질감(굴절·입체 명암)이라 PNG 두
 * 장으로 처리한다. 뒤판 -> 내용 -> 앞판 순으로 겹치면 카드가 케이스 안에 들어간
 * 것처럼 보인다. 내용은 데이터가 바뀌므로 그대로 코드로 그린다.
 */
export function CrewIdCard({ nickname, profileImageUrl, rank, collected, joinedAt }: CrewIdCardProps) {
  return (
    <View style={styles.card}>
      <Image resizeMode="stretch" source={caseBack} style={styles.caseLayer} />

      <View style={styles.window}>
        <View style={styles.sidebar}>
          <View style={styles.sidebarTop}>
            <CatMark size={21} />
            <Text style={styles.brand}>냥냥공사</Text>
            <Text style={styles.brandRoman}>NYANGGONGSA</Text>
          </View>
          <View style={styles.sidebarBottom}>
            <View style={styles.brandRule} />
            <Text style={styles.passLabel}>{'CREW\nACCESS\nPASS'}</Text>
          </View>
        </View>

        <View style={styles.body}>
          {/* 발바닥 양각 워터마크. RN에 inner shadow가 없어 두 겹으로 흉내 낸다. */}
          <View pointerEvents="none" style={styles.emboss}>
            <PawPrint color="#FFFFFF" size={46} strokeWidth={1.4} style={styles.embossLight} />
            <PawPrint color={colors.emboss} size={46} strokeWidth={1.4} />
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
                <Text style={styles.fieldLabel}>수집:</Text>
                <Text style={styles.fieldValue}>{collected}마리</Text>
              </View>
              <View style={styles.fieldRule} />
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>직책:</Text>
                <Text style={styles.fieldValue}>{rank}</Text>
              </View>
              <View style={styles.fieldRule} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    alignSelf: 'center',
  },
  caseLayer: {
    ...StyleSheet.absoluteFillObject,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  caseImage: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  // 케이스 앞판의 실제 창 위치
  window: {
    position: 'absolute',
    left: WINDOW.left,
    top: WINDOW.top,
    width: WINDOW.width,
    height: WINDOW.height,
    flexDirection: 'row',
    borderRadius: WINDOW.radius,
    backgroundColor: colors.sheet,
    overflow: 'hidden',
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.orange,
    paddingVertical: 9,
  },
  sidebarTop: {
    alignItems: 'center',
    gap: 2,
  },
  sidebarBottom: {
    alignItems: 'center',
    gap: 4,
  },
  brand: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: '#FFFFFF',
  },
  brandRoman: {
    fontSize: 4.5,
    fontWeight: '600',
    letterSpacing: 0.2,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  brandRule: {
    width: 16,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  passLabel: {
    fontSize: 6,
    lineHeight: 8.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  body: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 9,
    paddingBottom: 6,
  },
  emboss: {
    position: 'absolute',
    right: 10,
    bottom: 26,
  },
  embossLight: {
    position: 'absolute',
    left: 1.5,
    top: 1.5,
  },
  bodyTop: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  photo: {
    width: 58,
    height: 72,
    borderRadius: 36,
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
    gap: 4,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.ink,
  },
  fieldRule: {
    height: 1,
    backgroundColor: colors.fieldRule,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.ink,
  },
  fieldValue: {
    fontSize: 11,
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
    gap: 3,
    paddingTop: 4,
  },
  tagline: {
    flex: 1,
    fontSize: 6,
    color: colors.footer,
  },
  serial: {
    fontSize: 6,
    letterSpacing: 0.2,
    color: colors.footer,
  },
});
