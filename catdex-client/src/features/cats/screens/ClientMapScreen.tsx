import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronDown, ListFilter, MapPin } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ClientStackParamList, RootStackParamList } from '@/app/navigation/types';
import { ClientCatSheet } from '@/features/cats/components/ClientCatSheet';
import { ClientRegionSheet } from '@/features/cats/components/ClientRegionSheet';
import { ClientTabBar } from '@/features/cats/components/ClientTabBar';
import { useClientMapData } from '@/features/cats/hooks/useClientMapData';
import { KakaoMapView } from '@/features/map/components/KakaoMapView';
import { useActiveNeighborhood } from '@/shared/neighborhood/useActiveNeighborhood';
import { createNdShadow, nd } from '@/shared/styles/theme';
import type { Cat } from '@/shared/types/cat';
import type { Region } from '@/shared/types/region';

export function ClientMapScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ClientStackParamList & RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { regions, catsByRegionId, isLoading } = useClientMapData();
  const { name: neighborhoodName, isDetecting, redetect } = useActiveNeighborhood();
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [selectedCat, setSelectedCat] = useState<Cat | null>(null);

  // 데이터가 새로 들어오면 선택한 구역도 최신 것으로 바꾼다. 사라졌으면 시트를 닫는다.
  useEffect(() => {
    if (!selectedRegion) {
      return;
    }

    const refreshed = regions.find((region) => region.id === selectedRegion.id) ?? null;

    if (refreshed !== selectedRegion) {
      setSelectedRegion(refreshed);

      if (!refreshed) {
        setSelectedCat(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regions]);

  const selectedRegionCats = useMemo(
    () => (selectedRegion ? (catsByRegionId.get(selectedRegion.id) ?? []) : []),
    [catsByRegionId, selectedRegion],
  );

  // 이미 CollectionTab 안이라 탭을 다시 가리켜 봐야 아무 일도 일어나지 않는다.
  // 같은 스택의 명단 화면으로 돌아가야 한다.
  const goRoster = () => navigation.navigate('ClientRoster');

  return (
    <View style={styles.screen}>
      <KakaoMapView
        onSelectRegion={(region) => {
          setSelectedCat(null);
          setSelectedRegion((previous) => (previous?.id === region.id ? null : region));
        }}
        regions={regions}
        selectedRegionId={selectedRegion?.id ?? null}
        style={styles.map}
      />

      <View pointerEvents="box-none" style={[styles.topChrome, { top: insets.top + 8 }]}>
        <Pressable
          accessibilityLabel="현재 위치로 동네 다시 확인"
          accessibilityRole="button"
          disabled={isDetecting}
          onPress={redetect}
          style={({ pressed }) => [styles.locationChip, pressed && styles.pressed]}
        >
          {isDetecting ? (
            <ActivityIndicator color={nd.colors.ink} size="small" />
          ) : (
            <MapPin color={nd.colors.ink} size={16} strokeWidth={1.8} />
          )}
          <Text style={styles.locationText}>{isDetecting ? '동네 확인 중' : neighborhoodName}</Text>
          <ChevronDown color={nd.colors.ink} size={14} strokeWidth={1.8} />
        </Pressable>

        <Pressable
          accessibilityLabel="지도 필터"
          accessibilityRole="button"
          onPress={() =>
            Alert.alert('지도 필터는 준비 중이에요', '털색·패턴으로 고객을 걸러 보는 기능은 다음 단계에서 열려요.')
          }
          style={({ pressed }) => [styles.filterButton, pressed && styles.pressed]}
        >
          <ListFilter color={nd.colors.ink} size={20} strokeWidth={2} />
        </Pressable>
      </View>

      {regions.length === 0 && !isLoading ? (
        <View pointerEvents="none" style={[styles.emptyCard, { top: insets.top + 72 }]}>
          <Text style={styles.emptyTitle}>아직 지도에 띄울 고객이 없어요</Text>
          <Text style={styles.emptyText}>고객을 등록하면 어느 구역에서 만났는지 여기에 표시돼요.</Text>
        </View>
      ) : null}

      <View pointerEvents="box-none" style={styles.bottom}>
        {selectedCat && selectedRegion ? (
          <ClientCatSheet
            cat={selectedCat}
            onOpenDetail={() => navigation.navigate('CatDetail', { catId: selectedCat.id })}
            onStartConsult={() =>
              Alert.alert('고객 상담은 준비 중이에요', '고양이와의 대화는 다음 단계에서 열려요.')
            }
            regionName={selectedRegion.name}
          />
        ) : selectedRegion ? (
          <ClientRegionSheet
            cats={selectedRegionCats}
            onSeeNearby={() => setSelectedCat(selectedRegionCats[0] ?? null)}
            region={selectedRegion}
          />
        ) : null}

        <View style={[styles.tabBarWrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <ClientTabBar
            active="map"
            onHome={() => navigation.getParent()?.navigate('HomeTab' as never)}
            onOpenConsult={() =>
              Alert.alert('고객 상담은 준비 중이에요', '고양이와의 대화는 다음 단계에서 열려요.')
            }
            onOpenMap={() => undefined}
            onOpenRoster={goRoster}
          />
        </View>
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
    ...StyleSheet.absoluteFillObject,
  },
  topChrome: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: nd.radius.pill,
    backgroundColor: nd.colors.barBg,
    ...createNdShadow(0.12, 10),
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.35,
    color: nd.colors.ink,
  },
  filterButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: nd.colors.barBg,
    ...createNdShadow(0.12, 10),
  },
  emptyCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    padding: 16,
    borderRadius: nd.radius.input,
    backgroundColor: nd.colors.barBg,
    gap: 4,
    ...createNdShadow(0.1, 10),
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.38,
    color: nd.colors.ink,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: -0.33,
    color: nd.colors.sub,
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  tabBarWrap: {
    paddingTop: 12,
  },
  pressed: {
    opacity: 0.84,
  },
});
