import { useEffect, useMemo, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { ChevronDown, MapPin, PawPrint } from 'lucide-react-native';
import { KakaoMapView } from '@/features/map/components/KakaoMapView';
import { formatMapRegionName } from '@/features/map/map-region-label';
import { createNdShadow, nd } from '@/shared/styles/theme';
import type { Cat, CatType } from '@/shared/types/cat';
import type { Region } from '@/shared/types/region';
import { getCatIllustrationKey, type CatIllustrationKey } from '@/shared/utils/catPresentation';

interface NeighborhoodMapScreenProps {
  regions: Region[];
  cats: Cat[];
  neighborhoodName: string;
  onGoCapture: () => void;
  onOpenCat: (catId: string) => void;
  onOpenCommunityBoard: () => void;
  onOpenDex: () => void;
}

const illustrations = {
  orange: require('../../../assets/illustrations/cat-orange-clean.png'),
  dark: require('../../../assets/illustrations/cat-dark-clean.png'),
  tuxedo: require('../../../assets/illustrations/cat-tuxedo-clean.png'),
  gray: require('../../../assets/illustrations/cat-gray-clean.png'),
} satisfies Record<CatIllustrationKey, ImageSourcePropType>;

function imageForType(type: CatType, imageUrl?: string): ImageSourcePropType {
  if (imageUrl) {
    return { uri: imageUrl };
  }

  return illustrations[getCatIllustrationKey(type)];
}

function getRegionCats(region: Region | null, catById: Map<string, Cat>, catByName: Map<string, Cat>) {
  if (!region) {
    return [];
  }

  if (region.catIds.length > 0) {
    return region.catIds.map((catId) => catById.get(catId)).filter((cat): cat is Cat => Boolean(cat));
  }

  return region.cats.map((catName) => catByName.get(catName)).filter((cat): cat is Cat => Boolean(cat));
}

function getRegionCatCount(region: Region) {
  return region.catIds.length > 0 ? region.catIds.length : region.cats.length;
}

export function NeighborhoodMapScreen({ regions, cats, neighborhoodName, onOpenCat }: NeighborhoodMapScreenProps) {
  const catById = useMemo(() => new Map(cats.map((cat) => [cat.id, cat])), [cats]);
  const catByName = useMemo(() => new Map(cats.map((cat) => [cat.name, cat])), [cats]);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);

  // 데이터가 갱신되면 선택된 구역 객체도 최신 데이터로 바꿔치기한다.
  useEffect(() => {
    if (!selectedRegion) {
      return;
    }

    const refreshedRegion = regions.find((region) => region.id === selectedRegion.id) ?? null;

    if (refreshedRegion !== selectedRegion) {
      setSelectedRegion(refreshedRegion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regions]);

  const selectedRegionCats = useMemo(
    () => getRegionCats(selectedRegion, catById, catByName),
    [catById, catByName, selectedRegion],
  );

  const handleStartDirections = () => {
    if (!selectedRegion) {
      return;
    }

    const name = encodeURIComponent(formatMapRegionName(selectedRegion.name));

    void Linking.openURL(`https://map.kakao.com/link/map/${name},${selectedRegion.lat},${selectedRegion.lng}`);
  };

  return (
    <View style={styles.screen}>
      <KakaoMapView
        onSelectRegion={(region) => setSelectedRegion((prev) => (prev?.id === region.id ? null : region))}
        regions={regions}
        selectedRegionId={selectedRegion?.id ?? null}
        style={styles.map}
      />

      <View pointerEvents="box-none" style={styles.topChrome}>
        <View style={styles.locationChip}>
          <MapPin color={nd.colors.ink} size={16} strokeWidth={1.8} />
          <Text style={styles.locationText}>{neighborhoodName}</Text>
          <ChevronDown color={nd.colors.ink} size={14} strokeWidth={1.8} />
        </View>

        {selectedRegion ? (
          <View style={styles.regionCard}>
            <Text style={styles.regionTitle}>{formatMapRegionName(selectedRegion.name)}</Text>
            <Text style={styles.regionSubtitle}>
              사용자들이 이 주변에서 고양이 {getRegionCatCount(selectedRegion)}마리를 만났어요.
            </Text>

            {selectedRegionCats.length > 0 ? (
              <View style={styles.regionCatRow}>
                {selectedRegionCats.slice(0, 2).map((cat) => (
                  <Pressable
                    accessibilityLabel={`${cat.name} 도감 보기`}
                    key={cat.id}
                    onPress={() => onOpenCat(cat.id)}
                    style={({ pressed }) => [styles.regionCatItem, pressed && styles.pressed]}
                  >
                    <Image resizeMode="contain" source={imageForType(cat.type, cat.imageUrl)} style={styles.regionCatImage} />
                  </Pressable>
                ))}
              </View>
            ) : null}

            <Text style={styles.privacyNote}>
              고양이의 이동 특성과 안전을 고려하여{'\n'}정확한 위치 대신 주변 위치를 제공합니다.
            </Text>
          </View>
        ) : null}

        {selectedRegion ? (
          <Pressable
            accessibilityLabel="길 안내 시작"
            accessibilityRole="button"
            onPress={handleStartDirections}
            style={({ pressed }) => [styles.directionsButton, pressed && styles.pressed]}
          >
            <PawPrint color="#FFFFFF" size={18} />
            <Text style={styles.directionsText}>길 안내 시작</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: nd.colors.bg,
  },
  map: {
    flex: 1,
  },
  topChrome: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  locationChip: {
    alignSelf: 'flex-start',
    marginLeft: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: nd.radius.input,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    ...createNdShadow(0.12, 8),
  },
  locationText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: -0.35,
    color: nd.colors.ink,
  },
  regionCard: {
    alignSelf: 'stretch',
    marginTop: 12,
    marginHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 20,
    ...createNdShadow(0.16, 20),
  },
  regionTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: -0.5,
    color: nd.colors.ink,
  },
  regionSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.35,
    color: nd.colors.sub,
  },
  regionCatRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-end',
  },
  regionCatItem: {
    width: 120,
    height: 120,
  },
  regionCatImage: {
    width: '100%',
    height: '100%',
  },
  privacyNote: {
    marginTop: 16,
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: -0.325,
    color: nd.colors.sub,
    textAlign: 'center',
  },
  directionsButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: nd.radius.pill,
    backgroundColor: nd.colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 14,
    ...createNdShadow(0.16, 12),
  },
  directionsText: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    letterSpacing: -0.375,
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.86,
  },
});
