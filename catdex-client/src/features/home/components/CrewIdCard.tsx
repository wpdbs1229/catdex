import { PawPrint } from 'lucide-react-native';
import { Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { nd } from '@/shared/styles/theme';

const defaultAvatar = require('../../../../assets/illustrations/default-profile-avatar.png');
const hangingCat = require('../../../../assets/illustrations/id-card-hanging-cat.png');

interface CrewIdCardProps {
  nickname: string;
  /** 사원증 사진. 없으면 기본 아바타를 쓴다. */
  profileImageUrl?: string;
  rank: string;
}

/**
 * 피그마 2_홈의 "냥냥단 사원증" 카드.
 * 시안은 손글씨 폰트(Ownglyph)를 쓰지만 프로젝트에 폰트 자산이 없어 시스템
 * 폰트로 그리고 자간·크기만 시안 값을 따른다.
 */
export function CrewIdCard({ nickname, profileImageUrl, rank }: CrewIdCardProps) {
  const avatarSource: ImageSourcePropType = profileImageUrl ? { uri: profileImageUrl } : defaultAvatar;

  return (
    <View style={styles.card}>
      <View style={styles.lanyardSlot} />

      <View style={styles.body}>
        <Image resizeMode="cover" source={avatarSource} style={styles.avatar} />

        <View style={styles.info}>
          <View style={styles.nameRow}>
            {/* 시안은 세 글자 이름 기준이라 긴 닉네임은 잘린다. 줄이 늘어나면 카드
                높이가 흔들리므로 한 줄을 유지하고 글자 크기를 줄인다. */}
            <Text adjustsFontSizeToFit minimumFontScale={0.55} numberOfLines={1} style={styles.name}>
              {nickname}
            </Text>
            <PawPrint color="#000000" size={24} strokeWidth={1.8} style={styles.pawMark} />
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>회사:</Text>
            <Text style={styles.fieldValue}>냥냥단</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>직책:</Text>
            <Text style={styles.fieldValue}>{rank}</Text>
          </View>
          <View style={styles.divider} />
        </View>
      </View>

      {/* 카드 오른쪽 위에 걸터앉은 고양이. 시안(285:4453)의 회전값과 위치를 그대로 쓴다.
          작은 흰 사각형은 고양이 앞발이 걸치는 자리의 카드 테두리를 지우는 조각이다. */}
      <View pointerEvents="none" style={styles.hangingCat}>
        <View style={styles.borderGap} />
        <Image resizeMode="contain" source={hangingCat} style={styles.hangingCatImage} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 174,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: nd.colors.card,
    // 고양이가 카드 위·오른쪽으로 걸쳐 나가므로 잘라내지 않는다.
  },
  lanyardSlot: {
    position: 'absolute',
    top: 9.5,
    alignSelf: 'center',
    width: 48,
    height: 8,
    borderRadius: nd.radius.pill,
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingTop: 12,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
  },
  info: {
    width: 154,
  },
  nameRow: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flexShrink: 1,
    fontSize: 26,
    fontWeight: '600',
    letterSpacing: 2.8,
    color: '#000000',
  },
  pawMark: {
    opacity: 0.1,
  },
  fieldRow: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fieldLabel: {
    fontSize: 16,
    letterSpacing: 1.6,
    color: '#000000',
  },
  fieldValue: {
    fontSize: 20,
    letterSpacing: 2,
    color: '#000000',
  },
  divider: {
    height: 1,
    backgroundColor: '#000000',
  },
  // 시안의 110px 상자를 32.19도 돌려 카드 오른쪽 위 모서리에 걸치게 한다.
  // 원본 그림은 -31.7도로 누워 있고 시안의 고양이는 -3.3도라, 시계방향 회전이 맞다.
  hangingCat: {
    position: 'absolute',
    right: -34.3,
    top: -62.5,
    width: 110,
    height: 110,
    transform: [{ rotate: '32.19deg' }],
  },
  hangingCatImage: {
    width: '100%',
    height: '100%',
  },
  borderGap: {
    position: 'absolute',
    left: 35,
    top: 60,
    width: 16,
    height: 9,
    backgroundColor: '#FFFFFF',
  },
});
