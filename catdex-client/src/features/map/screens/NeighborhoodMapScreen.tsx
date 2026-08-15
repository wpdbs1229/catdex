import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronDown, MapPin, PawPrint } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarBottomGap } from '@/app/navigation/useTabBarInset';
import type { MapStackParamList, RootStackParamList } from '@/app/navigation/types';
import { KakaoMapView, type CatMapPoint } from '@/features/map/components/KakaoMapView';
import { NeighborhoodTabBar } from '@/features/map/components/NeighborhoodTabBar';
import { useNeighborhoodData } from '@/features/map/hooks/useNeighborhoodData';
import { NeighborhoodSheet } from '@/shared/neighborhood/NeighborhoodSheet';
import { formatMapRegionName } from '@/features/map/map-region-label';
import { createNdShadow, nd } from '@/shared/styles/theme';
import type { Cat } from '@/shared/types/cat';
import type { Region } from '@/shared/types/region';
import { catPhotoSource } from '@/shared/utils/catImage';

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

/** 고양이별 흩뿌림 반경. 구역 중심에서 이 안쪽 어딘가에 발자국이 찍힌다. */
const CAT_SCATTER_RADIUS_M = 100;

/** 문자열을 0~1 사이 값으로 접는다. FNV-1a. */
function hashToUnit(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967296;
}

/**
 * 고양이 발자국이 찍힐 자리.
 *
 * 실제 좌표는 저장하지 않으므로 구역 중심에서 고양이 id로 정한 방향·거리만큼
 * 옮긴다. 난수 대신 해시를 쓰는 이유는 두 가지다 - 새로 그릴 때마다 발자국이
 * 널뛰면 안 되고, 같은 고양이는 늘 같은 자리에 보여야 한다. sqrt는 원판에
 * 고르게 퍼지게 하는 보정이다.
 */
function scatterCatPoint(catId: string, regionId: string, lat: number, lng: number): CatMapPoint {
  const angle = hashToUnit(catId) * Math.PI * 2;
  const distance = Math.sqrt(hashToUnit(`${catId}:distance`)) * CAT_SCATTER_RADIUS_M;
  const latOffset = (distance * Math.cos(angle)) / 111320;
  const lngOffset = (distance * Math.sin(angle)) / (111320 * Math.cos((lat * Math.PI) / 180));

  return {
    catId,
    regionId,
    lat: lat + latOffset,
    lng: lng + lngOffset,
  };
}

export function NeighborhoodMapScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MapStackParamList & RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const tabBarBottomGap = useTabBarBottomGap();
  const {
    cats,
    regions,
    neighborhood,
    neighborhoodName,
    hasNeighborhood,
    isDetectingNeighborhood,
    redetectNeighborhood,
    refreshNeighborhood,
  } = useNeighborhoodData();
  const catById = useMemo(() => new Map(cats.map((cat) => [cat.id, cat])), [cats]);
  const catByName = useMemo(() => new Map(cats.map((cat) => [cat.name, cat])), [cats]);
  // 고양이가 0마리인 구역은 마커를 찍지 않는다. 기록이 다 지워진 구역 행이
  // DB에 남아 있어도 빈 발자국만 뜨면 눌러 볼 것도 없다.
  const markerRegions = useMemo(() => regions.filter((region) => getRegionCatCount(region) > 0), [regions]);
  // 구역당 개수 마커 대신 고양이 한 마리당 발자국 하나를 찍는다. 좌표는 구역
  // 중심 반경 100m 안에 고양이 id로 고정해 흩는다.
  const catPoints = useMemo(
    () =>
      markerRegions.flatMap((region) => {
        const catIds =
          region.catIds.length > 0
            ? region.catIds
            : region.cats
                .map((catName) => catByName.get(catName)?.id)
                .filter((catId): catId is string => Boolean(catId));

        return catIds.map((catId) => scatterCatPoint(catId, region.id, region.lat, region.lng));
      }),
    [catByName, markerRegions],
  );
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [isNeighborhoodSheetOpen, setIsNeighborhoodSheetOpen] = useState(false);

  // 데이터가 갱신되면 선택된 구역 객체도 최신 데이터로 바꿔치기한다.
  useEffect(() => {
    if (!selectedRegion) {
      return;
    }

    const refreshedRegion = markerRegions.find((region) => region.id === selectedRegion.id) ?? null;

    if (refreshedRegion !== selectedRegion) {
      setSelectedRegion(refreshedRegion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markerRegions]);

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
        catPoints={catPoints}
        // 동네 중심을 넘겨서 기록이 하나도 없는 지부에서도 지도는 뜨게 한다.
        fallbackCenter={neighborhood ? { lat: neighborhood.lat, lng: neighborhood.lng } : null}
        onSelectRegion={(region) => setSelectedRegion((prev) => (prev?.id === region.id ? null : region))}
        regions={markerRegions}
        selectedRegionId={selectedRegion?.id ?? null}
        style={styles.map}
      />

      <View pointerEvents="box-none" style={[styles.topChrome, { top: insets.top + 8 }]}>
        {/* 지부 도감과 같은 동네 칩. 눌러서 지부를 바꾼다. */}
        <Pressable
          accessibilityLabel="내 동네 목록 열기"
          accessibilityRole="button"
          onPress={() => setIsNeighborhoodSheetOpen(true)}
          style={({ pressed }) => [styles.locationChip, pressed && styles.pressed]}
        >
          {isDetectingNeighborhood ? (
            <ActivityIndicator color={nd.colors.ink} size="small" />
          ) : (
            <MapPin color={nd.colors.ink} size={16} strokeWidth={1.8} />
          )}
          <Text style={styles.locationText}>{isDetectingNeighborhood ? '동네 확인 중' : neighborhoodName}</Text>
          <ChevronDown color={nd.colors.ink} size={14} strokeWidth={1.8} />
        </Pressable>

        {markerRegions.length === 0 && !isDetectingNeighborhood ? (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>{hasNeighborhood ? `${neighborhoodName}에 아직 기록이 없어요` : '동네를 아직 못 찾았어요'}</Text>
            <Text style={styles.noticeText}>
              {hasNeighborhood
                ? '이 동네에서 첫 고양이를 기록하면 지도에 표시돼요.'
                : '위쪽 동네 칩을 눌러 지부로 삼을 동네를 정해 주세요.'}
            </Text>
          </View>
        ) : null}

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
                    onPress={() => navigation.navigate('CatDetail', { catId: cat.id })}
                    style={({ pressed }) => [styles.regionCatItem, pressed && styles.pressed]}
                  >
                    {catPhotoSource(cat.imageUrl) ? (
                      <Image resizeMode="contain" source={catPhotoSource(cat.imageUrl)!} style={styles.regionCatImage} />
                    ) : (
                      <View style={[styles.regionCatImage, styles.regionCatFallback]}>
                        <PawPrint color={nd.colors.subtle} size={22} />
                      </View>
                    )}
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

      <View style={[styles.tabBarWrap, { paddingBottom: tabBarBottomGap }]}>
        <NeighborhoodTabBar
          active="map"
          onHome={() => navigation.getParent()?.navigate('HomeTab' as never)}
          onOpenBoard={() => navigation.navigate('NeighborhoodCommunity')}
          onOpenDex={() => navigation.navigate('NeighborhoodDex')}
          onOpenMap={() => undefined}
        />
      </View>

      {/* 지부 도감과 같은 시트. 여기서 고른 동네가 곧 이 지도의 지부다. */}
      <NeighborhoodSheet
        activeId={neighborhood?.id}
        isDetecting={isDetectingNeighborhood}
        onAddCurrent={() => {
          void redetectNeighborhood();
        }}
        onChanged={refreshNeighborhood}
        onClose={() => setIsNeighborhoodSheetOpen(false)}
        visible={isNeighborhoodSheetOpen}
      />
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
  noticeCard: {
    alignSelf: 'stretch',
    marginTop: 12,
    marginHorizontal: 12,
    gap: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 20,
    ...createNdShadow(0.16, 20),
  },
  noticeTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: -0.4,
    color: nd.colors.ink,
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.35,
    color: nd.colors.sub,
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
  regionCatFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: nd.colors.field,
    borderRadius: 12,
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
  tabBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  pressed: {
    opacity: 0.86,
  },
});
