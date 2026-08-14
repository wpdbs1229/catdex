import { Cat as CatIcon, Image as ImageIcon, MapPin, Signpost } from 'lucide-react-native';
import { Image, StyleSheet, Text, View } from 'react-native';
import { CAT_HABITAT_LABELS } from '@/shared/cats/habitat';
import { deriveCatType } from '@/shared/coat/coat-to-cat-type';
import { nd, theme } from '@/shared/styles/theme';
import type { Cat, CatEncounter } from '@/shared/types/cat';
import { catPhotoSource } from '@/shared/utils/catImage';

const clearCase = require('../../../../assets/customer-dossier/nyangdogam-clear-case.png');
const agencyBadge = require('../../../../assets/customer-dossier/agency-banner-reference.png');
const fileBadge = require('../../../../assets/customer-dossier/file-banner-reference.png');
const officialSeal = require('../../../../assets/customer-dossier/official-paw-seal-reference.png');
const crumpledPaper = require('../../../../assets/textures/crumpled-paper.jpg');

export const CUSTOMER_DOSSIER_ASPECT_RATIO = 1647 / 955;

interface CustomerDossierCardProps {
  affinityLabel: string;
  cat: Cat;
  encounters: CatEncounter[];
  width: number;
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

export function CustomerDossierCard({ affinityLabel, cat, encounters, width }: CustomerDossierCardProps) {
  const height = width * CUSTOMER_DOSSIER_ASPECT_RATIO;
  const photoSource = cutoutPhotoSource(cat);
  const customerNumber = String(cat.number).padStart(3, '0');
  const agencyBadgeWidth = width * 0.168;
  const fileBadgeWidth = width * 0.17;
  const officialSealWidth = width * 0.19;

  return (
    <View accessibilityLabel={`${cat.name} 고객 파일`} style={[styles.case, { width, height }]}>
      <View style={styles.card}>
        <Image resizeMode="cover" source={crumpledPaper} style={styles.paperTexture} />

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
      <Image resizeMode="contain" source={clearCase} style={styles.caseLayer} />
      <Image
        resizeMode="contain"
        source={agencyBadge}
        style={[
          styles.agencyBadge,
          {
            left: width * 0.062,
            top: height * 0.078,
            width: agencyBadgeWidth,
            height: agencyBadgeWidth * (428 / 332),
          },
        ]}
      />
      <Image
        resizeMode="contain"
        source={fileBadge}
        style={[
          styles.fileBadge,
          {
            right: width * 0.044,
            top: height * 0.078,
            width: fileBadgeWidth,
            height: fileBadgeWidth * (400 / 304),
          },
        ]}
      />
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
  card: {
    position: 'absolute',
    left: '6.4%',
    right: '6.4%',
    top: '7.8%',
    bottom: '4.5%',
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
  fileBadge: {
    position: 'absolute',
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
