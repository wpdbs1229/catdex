import { PawPrint } from 'lucide-react-native';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { nd } from '@/shared/styles/theme';

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

/** 목업 비율 664:476. 폭을 고정하고 높이를 비율로 잡는다. */
const CARD_WIDTH = 335;
const CARD_HEIGHT = Math.round((CARD_WIDTH * 476) / 664);
/** 주황 사이드바는 카드 폭의 14% */
const SIDEBAR_WIDTH = Math.round(CARD_WIDTH * 0.14);

const colors = {
  holder: '#E7E6E7',
  holderGloss: '#FCFCFC',
  sheet: '#F9F8F6',
  orange: '#D3702D',
  orangeDeep: '#D46229',
  clip: '#E47D31',
  clipBand: '#C96526',
  ink: '#1A1A1A',
  footer: '#929090',
  emboss: '#EFEDEA',
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
 * 냥냥공사 사원증. 목업의 플라스틱 홀더 형태를 이미지 없이 코드로 그린다.
 *
 * RN에는 inner shadow가 없어 발바닥 양각은 밝은 발바닥과 어두운 발바닥을 1pt
 * 어긋나게 겹쳐 흉내 낸다. 플라스틱 광택도 실제 반사가 아니라 그라데이션이다.
 */
export function CrewIdCard({ nickname, profileImageUrl, rank, collected, joinedAt }: CrewIdCardProps) {
  return (
    <View style={styles.holder}>
      <Svg height={CARD_HEIGHT} pointerEvents="none" style={StyleSheet.absoluteFill} width={CARD_WIDTH}>
        <Defs>
          <LinearGradient id="holderGloss" x1="0" x2="0.35" y1="0" y2="1">
            <Stop offset="0" stopColor={colors.holderGloss} stopOpacity={1} />
            <Stop offset="0.45" stopColor={colors.holderGloss} stopOpacity={0.15} />
            <Stop offset="1" stopColor="#C9C7C8" stopOpacity={0.35} />
          </LinearGradient>
        </Defs>
        <Rect fill="url(#holderGloss)" height={CARD_HEIGHT} rx={22} width={CARD_WIDTH} x={0} y={0} />
      </Svg>

      <View style={styles.lanyardSlot} />

      <View style={styles.sheet}>
        <View style={styles.sidebar}>
          <View style={styles.sidebarTop}>
            <CatMark size={24} />
            <Text style={styles.brand}>냥냥공사</Text>
            <Text style={styles.brandRoman}>NYANGGONGSA</Text>
          </View>
          <View style={styles.sidebarBottom}>
            <View style={styles.brandRule} />
            <Text style={styles.passLabel}>{'CREW\nACCESS\nPASS'}</Text>
          </View>
        </View>

        <View style={styles.body}>
          {/* 발바닥 양각 워터마크 */}
          <View pointerEvents="none" style={styles.emboss}>
            <PawPrint color="#FFFFFF" size={54} strokeWidth={1.4} style={styles.embossLight} />
            <PawPrint color={colors.emboss} size={54} strokeWidth={1.4} />
          </View>

          <View style={styles.bodyTop}>
            {profileImageUrl ? (
              <Image resizeMode="cover" source={{ uri: profileImageUrl }} style={styles.photo} />
            ) : (
              <View style={[styles.photo, styles.photoFallback]}>
                <PawPrint color={nd.colors.subtle} size={30} strokeWidth={1.6} />
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
            <PawPrint color={colors.orange} size={11} strokeWidth={2.2} />
            <Text numberOfLines={1} style={styles.tagline}>
              고양이와 함께, 더 나은 내일을 만듭니다.
            </Text>
            <Text style={styles.serial}>{formatSerial(joinedAt)}</Text>
          </View>
        </View>
      </View>

      <View pointerEvents="none" style={styles.clip}>
        <Svg height={74} viewBox="0 0 48 132" width={27}>
          {/* 발가락 4개 + 발바닥 + 아래로 뻗은 팔 */}
          <Circle cx={8} cy={26} fill={colors.clip} r={8} />
          <Circle cx={19} cy={11} fill={colors.clip} r={9} />
          <Circle cx={33} cy={12} fill={colors.clip} r={9} />
          <Circle cx={42} cy={28} fill={colors.clip} r={7} />
          <Ellipse cx={24} cy={48} fill={colors.clip} rx={19} ry={16} />
          <Rect fill={colors.clip} height={78} rx={14} width={28} x={10} y={46} />
          <Rect fill={colors.clipBand} height={15} rx={3} width={30} x={9} y={96} />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  holder: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 22,
    backgroundColor: colors.holder,
    paddingHorizontal: 14,
    paddingTop: 38,
    paddingBottom: 20,
  },
  lanyardSlot: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    width: 62,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#D9D7D7',
  },
  sheet: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 10,
    backgroundColor: colors.sheet,
    overflow: 'hidden',
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
  },
  sidebarTop: {
    alignItems: 'center',
    gap: 2,
  },
  sidebarBottom: {
    alignItems: 'center',
    gap: 5,
  },
  brand: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: '#FFFFFF',
  },
  brandRoman: {
    fontSize: 5,
    fontWeight: '600',
    letterSpacing: 0.3,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  brandRule: {
    width: 18,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  passLabel: {
    fontSize: 6.5,
    lineHeight: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  body: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 7,
  },
  emboss: {
    position: 'absolute',
    right: 14,
    bottom: 30,
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
    gap: 12,
  },
  photo: {
    width: 66,
    height: 82,
    borderRadius: 40,
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
    gap: 5,
  },
  name: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.ink,
  },
  fieldRule: {
    height: 1,
    backgroundColor: '#DED9D2',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
  },
  fieldValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink,
  },
  footerRule: {
    height: 1,
    backgroundColor: '#E7C9A9',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 5,
  },
  tagline: {
    flex: 1,
    fontSize: 7,
    color: colors.footer,
  },
  serial: {
    fontSize: 7,
    letterSpacing: 0.2,
    color: colors.footer,
  },
  clip: {
    position: 'absolute',
    right: -13,
    top: '26%',
  },
});
