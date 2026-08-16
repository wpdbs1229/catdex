import { Cat as CatIcon, Image as ImageIcon, MapPin, Signpost, Star } from 'lucide-react-native';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { CAT_HABITAT_LABELS } from '@/shared/cats/habitat';
import { deriveCatType } from '@/shared/coat/coat-to-cat-type';
import { nd, theme } from '@/shared/styles/theme';
import type { Cat, CatEncounter } from '@/shared/types/cat';
import type { UserEquipment } from '@/shared/types/shop';
import { catPhotoSource } from '@/shared/utils/catImage';
import { getRarityLabel } from '@/shared/utils/catPresentation';

const clearCase = require('../../../../assets/customer-dossier/nyangdogam-clear-case.png');
const agencyBadge = require('../../../../assets/customer-dossier/agency-banner-reference.png');
const officialSeal = require('../../../../assets/customer-dossier/official-paw-seal-reference.png');
const crumpledPaper = require('../../../../assets/textures/crumpled-paper.jpg');

export const CUSTOMER_DOSSIER_ASPECT_RATIO = 1647 / 955;

/**
 * 희귀도 리본.
 *
 * 시안에서 오려낸 래스터를 쓰다가 코드로 옮겼다. 오려낸 그림에는 지운 글자
 * 자국(내부의 13.7%가 흰 얼룩)과 원본 사진의 담벼락·잎사귀가 아래 가장자리에
 * 그대로 구워져 있었다. 시안 위에서는 배경이 비슷해 안 보였지만 흰 카드 위에
 * 얹으니 주황이 물 빠져 보이고 밑단에 회색 얼룩이 남았다.
 *
 * 좌표는 시안 원본(304x400)에서 잰 값 그대로다. 위 모서리 반지름 24,
 * 본체는 y=316까지, 그 아래 오른쪽으로 접힌 꼬리가 (227,316)에서 오른쪽
 * 아래 끝까지 이어진다.
 */
const RIBBON_VIEWBOX = { width: 304, height: 400 };
const RIBBON_PATH = 'M24 0 H280 A24 24 0 0 1 304 24 V400 L227 316 H0 V24 A24 24 0 0 1 24 0 Z';
/** 접힌 꼬리. 살짝 그늘져야 접힌 것으로 보인다. */
const RIBBON_FOLD_PATH = 'M227 316 H304 V400 Z';
/** 시안 리본에서 얼룩을 뺀 순수 주황의 중앙값. */
const RIBBON_COLOR = '#E17E37';

interface CustomerDossierCardProps {
  affinityLabel: string;
  cat: Cat;
  encounters: CatEncounter[];
  width: number;
  /** 비품상점에서 장착한 배경지·케이스·라벨. 비어 있으면 기본(순정) 모습이다. */
  equipment?: UserEquipment;
}

interface CustomerDossierPeekCardProps {
  cat: Cat;
  side: 'left' | 'right';
  width: number;
}

function getBreedLabel(cat: Cat) {
  const breedTag = cat.tags.find((tag) => tag.startsWith('품종:'));

  return breedTag ? breedTag.slice('품종:'.length) : deriveCatType(cat.coatColors, cat.coatPattern);
}

function latestKnownRegion(encounters: CatEncounter[]) {
  const latest = [...encounters]
    .filter((encounter) => encounter.regionName.trim().length > 0)
    .sort((left, right) => right.seenAt.localeCompare(left.seenAt))[0];

  return latest?.regionName ?? '동네 미지정';
}

function cutoutPhotoSource(cat: Cat) {
  return catPhotoSource(cat.imageUrl ?? cat.originalPhotoUrl);
}

export function CustomerDossierCard({ affinityLabel, cat, encounters, width, equipment }: CustomerDossierCardProps) {
  const height = width * CUSTOMER_DOSSIER_ASPECT_RATIO;
  const photoSource = cutoutPhotoSource(cat);
  const customerNumber = String(cat.number).padStart(3, '0');
  const agencyBadgeWidth = width * 0.168;
  const rarityBadgeWidth = width * 0.17;
  const officialSealWidth = width * 0.19;
  // 장착한 상품이 있으면 그 자산으로, 없으면 순정 자산 그대로.
  const backgroundSource = equipment?.background?.assetImageUrl
    ? { uri: equipment.background.assetImageUrl }
    : crumpledPaper;
  const caseSource = equipment?.case?.assetImageUrl ? { uri: equipment.case.assetImageUrl } : clearCase;
  const badgeSource = equipment?.label?.assetImageUrl ? { uri: equipment.label.assetImageUrl } : agencyBadge;

  return (
    <View accessibilityLabel={`${cat.name} 고객 파일`} style={[styles.case, { width, height }]}>
      <View style={styles.card}>
        <Image
          resizeMode="cover"
          source={backgroundSource}
          style={[styles.paperTexture, equipment?.background ? styles.paperTextureFull : null]}
        />

        <View style={styles.photoFrame}>
          <Image resizeMode="cover" source={crumpledPaper} style={styles.photoPaper} />
          {photoSource ? (
            <Image resizeMode="contain" source={photoSource} style={styles.photo} />
          ) : (
            <View style={styles.photoFallback}>
              <ImageIcon color={nd.colors.subtle} size={36} strokeWidth={1.5} />
              <Text style={styles.photoFallbackText}>등록된 고객 사진이 없어요</Text>
            </View>
          )}
        </View>

        <View style={styles.infoPanel}>
          <Text style={styles.customerNumber}>고객번호 #{customerNumber}</Text>

          <Text numberOfLines={1} style={styles.name}>
            {cat.name}
          </Text>

          <View style={styles.detailRows}>
            <View style={styles.detailRow}>
              <MapPin color={theme.colors.primary} size={14} strokeWidth={2} />
              <Text style={styles.detailLabel}>서식지</Text>
              <Text numberOfLines={1} style={styles.detailValue}>
                {CAT_HABITAT_LABELS[cat.habitat]}
              </Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailRow}>
              <Signpost color={theme.colors.primary} size={14} strokeWidth={2} />
              <Text style={styles.detailLabel}>주 활동지</Text>
              <Text numberOfLines={1} style={styles.detailValue}>
                {latestKnownRegion(encounters)}
              </Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailRow}>
              <CatIcon color={theme.colors.primary} size={14} strokeWidth={2} />
              <Text style={styles.detailLabel}>묘종</Text>
              <Text numberOfLines={1} style={styles.detailValue}>
                {getBreedLabel(cat)}
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <Text style={styles.statText}>발견 <Text style={styles.statStrong}>{cat.encounterCount}회</Text></Text>
            <View style={styles.statDivider} />
            <Text style={styles.statText}>기록 <Text style={styles.statStrong}>{encounters.length}회</Text></Text>
          </View>

          <View style={styles.affinityBadge}>
            <Text style={styles.affinityBadgeText}>{affinityLabel} 고객</Text>
          </View>
        </View>
      </View>

      <Image
        resizeMode="contain"
        source={officialSeal}
        style={[
          styles.officialSeal,
          {
            right: width * 0.08,
            top: height * 0.68,
            width: officialSealWidth,
            height: officialSealWidth,
          },
        ]}
      />
      <Image resizeMode="contain" source={caseSource} style={styles.caseLayer} />
      <Image
        resizeMode="contain"
        source={badgeSource}
        style={[
          styles.agencyBadge,
          {
            // 배지는 카드 모서리에 물려야 한다. 카드와 같은 여백을 쓴다.
            left: width * 0.0639,
            top: height * 0.0814,
            width: agencyBadgeWidth,
            height: agencyBadgeWidth * (428 / 332),
          },
        ]}
      />
      <View
        accessibilityLabel={`발견 희귀도 ${cat.rarity}성, ${getRarityLabel(cat.rarity)}`}
        style={[
          styles.rarityBadge,
          {
            // 리본의 오른쪽·위가 카드 모서리와 정확히 겹쳐야 카드에 물린 탭으로
            // 보인다. 예전 값(4.4%)은 카드 테두리를 2% 넘어가 케이스 테 위에
            // 걸쳐 떠 있었다.
            right: width * 0.0670,
            top: height * 0.0814,
            width: rarityBadgeWidth,
            height: rarityBadgeWidth * (400 / 304),
          },
        ]}
      >
        <Svg
          height="100%"
          style={StyleSheet.absoluteFill}
          viewBox={`0 0 ${RIBBON_VIEWBOX.width} ${RIBBON_VIEWBOX.height}`}
          width="100%"
        >
          <Path d={RIBBON_PATH} fill={RIBBON_COLOR} />
          <Path d={RIBBON_FOLD_PATH} fill="#000000" fillOpacity={0.08} />
        </Svg>
        <View style={styles.rarityBadgeContent}>
          <Text style={styles.rarityBadgeTitle}>희귀도</Text>
          <View style={styles.rarityValueRow}>
            <Star color="#FFFFFF" fill="#FFFFFF" size={9} strokeWidth={2} />
            <Text style={styles.rarityBadgeValue}>{cat.rarity}성</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export function CustomerDossierPeekCard({ cat, side, width }: CustomerDossierPeekCardProps) {
  const height = width * CUSTOMER_DOSSIER_ASPECT_RATIO;
  const photoSource = cutoutPhotoSource(cat);

  return (
    <View
      pointerEvents="none"
      style={[
        styles.peekCase,
        {
          width,
          height,
          transform: [{ rotate: side === 'left' ? '-5deg' : '5deg' }],
        },
      ]}
    >
      <View style={styles.peekCard}>
        <Image resizeMode="cover" source={crumpledPaper} style={styles.photoPaper} />
        {photoSource ? <Image resizeMode="contain" source={photoSource} style={styles.peekPhoto} /> : null}
        <View style={styles.peekNumberTag}>
          <Text style={styles.peekNumberText}>#{String(cat.number).padStart(3, '0')}</Text>
        </View>
      </View>
      <Image resizeMode="contain" source={clearCase} style={styles.caseLayer} />
    </View>
  );
}

const styles = StyleSheet.create({
  case: {
    position: 'relative',
  },
  caseLayer: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  /**
   * 케이스 에셋(955x1647)에서 잰 속지 창 그대로다. 가운데 선에서 투명 구간을
   * 재면 위 134, 아래 1559, 왼 61, 오른 891 - 비율로 8.14% / 5.34% / 6.39% /
   * 6.70%. 예전 값은 위가 0.3% 높아 카드의 주황 테두리가 케이스 테에 먹혀
   * 윗변만 사라져 보였다.
   */
  card: {
    position: 'absolute',
    left: '6.39%',
    right: '6.70%',
    top: '8.14%',
    bottom: '5.34%',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    backgroundColor: '#FFFDF8',
    overflow: 'hidden',
  },
  paperTexture: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.26,
  },
  // 장착한 배경지는 옅은 얼룩이 아니라 그 자체가 배경이어야 하므로 그대로 보인다.
  paperTextureFull: {
    opacity: 1,
  },
  photoFrame: {
    height: '61.5%',
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
    backgroundColor: '#FAFAF8',
    overflow: 'hidden',
  },
  photoPaper: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.72,
  },
  photo: {
    alignSelf: 'center',
    width: '88%',
    height: '96%',
    marginTop: '2%',
  },
  peekPhoto: {
    alignSelf: 'center',
    width: '88%',
    height: '92%',
    marginTop: '4%',
  },
  photoFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoFallbackText: {
    fontSize: 11,
    letterSpacing: -0.25,
    color: nd.colors.subtle,
  },
  infoPanel: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 11,
    paddingBottom: 10,
  },
  customerNumber: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.25,
    color: theme.colors.primary,
  },
  name: {
    marginTop: 4,
    fontSize: 27,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: nd.colors.ink,
  },
  detailRows: {
    width: '66%',
    marginTop: 4,
  },
  detailRow: {
    height: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  detailDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 19,
    backgroundColor: 'rgba(229, 229, 236, 0.8)',
  },
  detailLabel: {
    width: 47,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: -0.25,
    color: nd.colors.sub,
  },
  detailValue: {
    flex: 1,
    minWidth: 0,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: -0.25,
    color: nd.colors.ink,
  },
  statsRow: {
    position: 'absolute',
    left: 15,
    bottom: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  statText: {
    fontSize: 10,
    fontWeight: '600',
    color: nd.colors.ink,
  },
  statStrong: {
    color: theme.colors.primary,
    fontWeight: '800',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 11,
    backgroundColor: nd.colors.border,
  },
  affinityBadge: {
    position: 'absolute',
    right: 10,
    bottom: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    paddingHorizontal: 7,
    paddingVertical: 4,
    backgroundColor: '#FFFDF8',
  },
  affinityBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  agencyBadge: {
    position: 'absolute',
  },
  rarityBadge: {
    position: 'absolute',
    // 시안처럼 카드 위에 얹힌 리본으로 보이려면 그림자가 있어야 한다. 흰 카드
    // 위에서는 그림자 없이 주황만 있으면 인쇄된 무늬처럼 납작해 보인다.
    shadowColor: '#7C4A1E',
    shadowOpacity: 0.28,
    shadowRadius: 5,
    shadowOffset: { width: -1, height: 3 },
    elevation: 5,
  },
  rarityBadgeContent: {
    position: 'absolute',
    top: '18%',
    left: '7%',
    right: '7%',
    alignItems: 'center',
  },
  rarityBadgeTitle: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: -0.45,
    color: '#FFFFFF',
    textShadowColor: 'rgba(119, 55, 20, 0.22)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  rarityValueRow: {
    marginTop: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  rarityBadgeValue: {
    fontSize: 10.5,
    lineHeight: 13,
    fontWeight: '700',
    letterSpacing: -0.35,
    color: '#FFFFFF',
    textShadowColor: 'rgba(119, 55, 20, 0.22)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  officialSeal: {
    position: 'absolute',
  },
  peekCase: {
    position: 'relative',
  },
  peekCard: {
    position: 'absolute',
    left: '6.4%',
    right: '6.4%',
    top: '7.8%',
    bottom: '4.5%',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#D9C6A8',
    backgroundColor: '#FFFDF8',
    overflow: 'hidden',
  },
  peekNumberTag: {
    position: 'absolute',
    top: 12,
    left: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 253, 248, 0.9)',
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  peekNumberText: {
    fontSize: 11,
    fontWeight: '700',
    color: nd.colors.sub,
  },
});
