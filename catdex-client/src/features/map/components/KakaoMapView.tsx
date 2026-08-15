import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { Region } from '@/shared/types/region';
import { formatMapRegionName } from '@/features/map/map-region-label';
import { theme } from '@/shared/styles/theme';

const fallbackMessage = '지도를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.';

type KakaoMapBridgeMessage =
  | {
      type: 'REGION_SELECTED';
      regionId: string;
    }
  | {
      type: 'MAP_READY';
    }
  | {
      type: 'MAP_LOAD_ERROR';
      message?: string;
    };

export interface MapPoint {
  lat: number;
  lng: number;
}

/** 고양이 한 마리를 찍는 점. 좌표는 화면용으로 이미 흩어 놓은 값이다. */
export interface CatMapPoint {
  catId: string;
  regionId: string;
  lat: number;
  lng: number;
}

interface KakaoMapViewProps {
  regions: Region[];
  selectedRegionId: string | null;
  onSelectRegion: (region: Region) => void;
  /**
   * 아무것도 고르지 않았을 때 중심으로 삼을 구역.
   * 주지 않으면 모든 마커가 한 화면에 들어오도록 맞춘다.
   */
  focusRegionId?: string | null;
  /** 현재 위치 점. 저장하지 않고 화면에만 찍는다. */
  currentLocation?: MapPoint | null;
  /**
   * 구역이 하나도 없을 때 중심으로 삼을 좌표(예: 활성 동네 중심).
   * 마커 없이 지도만 띄운다. 없으면 구역 없는 지도는 그리지 않는다.
   */
  fallbackCenter?: MapPoint | null;
  /**
   * 주면 구역당 개수 마커 대신 고양이 한 마리당 발자국 하나를 찍는다.
   * 누르면 그 고양이가 속한 구역이 선택된다.
   */
  catPoints?: CatMapPoint[];
  style?: StyleProp<ViewStyle>;
}

function parseBridgeMessage(data: string): KakaoMapBridgeMessage | null {
  try {
    const parsed: unknown = JSON.parse(data);

    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const payload = parsed as Record<string, unknown>;

    if (payload.type === 'REGION_SELECTED' && typeof payload.regionId === 'string') {
      return {
        type: 'REGION_SELECTED',
        regionId: payload.regionId,
      };
    }

    if (payload.type === 'MAP_LOAD_ERROR') {
      return {
        type: 'MAP_LOAD_ERROR',
        message: typeof payload.message === 'string' ? payload.message : undefined,
      };
    }

    if (payload.type === 'MAP_READY') {
      return {
        type: 'MAP_READY',
      };
    }

    return null;
  } catch {
    return null;
  }
}

function serializeRegions(regions: Region[]) {
  return JSON.stringify(
    regions.map(({ id, name, lat, lng, radius, catIds, cats }) => ({
      id,
      name: formatMapRegionName(name),
      lat,
      lng,
      radius,
      cats,
      catCount: catIds.length > 0 ? catIds.length : cats.length,
    })),
  ).replace(/</g, '\\u003c');
}

function createMapHtml(
  appKey: string,
  regions: Region[],
  selectedRegionId: string | null,
  focusRegionId: string | null,
  currentLocation: MapPoint | null,
  fallbackCenter: MapPoint | null,
  catPoints: CatMapPoint[],
) {
  const encodedAppKey = encodeURIComponent(appKey);
  const serializedRegions = serializeRegions(regions);
  const serializedSelectedRegionId = JSON.stringify(selectedRegionId);
  const serializedCurrentLocation = JSON.stringify(currentLocation);
  const serializedCatPoints = JSON.stringify(catPoints).replace(/</g, '\\u003c');
  // 고른 구역 > 초점 구역 순으로 중심을 잡는다. 둘 다 없으면 아래에서 전체를 맞춘다.
  const anchorRegion =
    regions.find((region) => region.id === selectedRegionId) ??
    regions.find((region) => region.id === focusRegionId) ??
    null;
  // 점이 하나뿐이면 setBounds가 그 점에 최대로 파고들어 30m 축척까지 확대된다.
  // 둘 이상일 때만 전체 맞춤을 하고, 하나면 그 점을 중심으로 기본 축척을 쓴다.
  const markerCount = catPoints.length > 0 ? catPoints.length : regions.length;
  const fitPointCount = markerCount + (currentLocation ? 1 : 0);
  const shouldFitAll = anchorRegion === null && fitPointCount > 1;
  const centerLat = anchorRegion?.lat ?? currentLocation?.lat ?? regions[0]?.lat ?? fallbackCenter?.lat ?? 0;
  const centerLng = anchorRegion?.lng ?? currentLocation?.lng ?? regions[0]?.lng ?? fallbackCenter?.lng ?? 0;

  return `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <style>
      html,
      body,
      #map {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        background: #e9dfc9;
      }

      .fallback {
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        padding: 24px;
        color: #8a7468;
        font: 600 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        line-height: 1.5;
        text-align: center;
      }

      .here-dot {
        width: 18px;
        height: 18px;
        border-radius: 9px;
        background: #2C7BF2;
        border: 3px solid #ffffff;
        box-shadow: 0 0 0 6px rgba(44, 123, 242, 0.22);
      }
      .cat-marker {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 96px;
        height: 96px;
        margin: 0;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: rgba(245, 148, 47, 0.24);
        cursor: pointer;
      }

      .cat-marker-core {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: #f5942f;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
      }

      .cat-marker-selected .cat-marker-core {
        outline: 3px solid #ffffff;
      }

      .cat-marker-count {
        position: absolute;
        right: 18px;
        bottom: 18px;
        min-width: 22px;
        border-radius: 999px;
        padding: 3px 6px;
        background: #ffffff;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.16);
        color: #111111;
        font: 700 12px -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
        text-align: center;
      }

      /* 고양이 한 마리짜리 발자국. 개수 마커보다 작고 배지가 없다. */
      .cat-point {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 52px;
        height: 52px;
        margin: 0;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: rgba(245, 148, 47, 0.22);
        cursor: pointer;
      }

      .cat-point-core {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #f5942f;
        box-shadow: 0 3px 9px rgba(0, 0, 0, 0.2);
      }

      .cat-point-core svg {
        width: 18px;
        height: 18px;
      }

      .cat-point-selected .cat-point-core {
        outline: 3px solid #ffffff;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      (function () {
        var regions = ${serializedRegions};
        var catPoints = ${serializedCatPoints};
        var selectedRegionId = ${serializedSelectedRegionId};
        var didFinish = false;
        var readyTimeoutId = window.setTimeout(function () {
          fail('KAKAO_MAP_READY_TIMEOUT');
        }, 8000);

        function postMessage(payload) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify(payload));
          }
        }

        function fail(message) {
          if (didFinish) {
            return;
          }

          didFinish = true;
          window.clearTimeout(readyTimeoutId);
          postMessage({ type: 'MAP_LOAD_ERROR', message: message });
          document.body.innerHTML = '<div class="fallback">${fallbackMessage}</div>';
        }

        function initializeMap() {
          try {
            if (!window.kakao || !window.kakao.maps) {
              fail('KAKAO_SDK_NOT_AVAILABLE');
              return;
            }

            window.kakao.maps.load(function () {
              var kakao = window.kakao;
              var mapElement = document.getElementById('map');
              var map = new kakao.maps.Map(mapElement, {
                center: new kakao.maps.LatLng(${centerLat}, ${centerLng}),
                level: 5
              });

              var pawSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="#ffffff" xmlns="http://www.w3.org/2000/svg"><ellipse cx="12" cy="15.6" rx="4.4" ry="3.7"/><circle cx="6" cy="10.6" r="2"/><circle cx="9.6" cy="7.4" r="2.1"/><circle cx="14.4" cy="7.4" r="2.1"/><circle cx="18" cy="10.6" r="2"/></svg>';

              if (catPoints.length > 0) {
                // 고양이 한 마리당 발자국 하나. 누르면 그 고양이의 구역이 선택된다.
                catPoints.forEach(function (point) {
                  var isSelected = point.regionId === selectedRegionId;
                  var marker = document.createElement('button');
                  marker.type = 'button';
                  marker.className = 'cat-point' + (isSelected ? ' cat-point-selected' : '');
                  marker.innerHTML = '<span class="cat-point-core">' + pawSvg + '</span>';
                  marker.onclick = function () {
                    postMessage({ type: 'REGION_SELECTED', regionId: point.regionId });
                  };

                  new kakao.maps.CustomOverlay({
                    position: new kakao.maps.LatLng(point.lat, point.lng),
                    content: marker,
                    yAnchor: 0.5
                  }).setMap(map);
                });
              } else {
                regions.forEach(function (region) {
                  var isSelected = region.id === selectedRegionId;
                  var countLabel = region.catCount > 9 ? '9+' : String(region.catCount);
                  var marker = document.createElement('button');
                  marker.type = 'button';
                  marker.className = 'cat-marker' + (isSelected ? ' cat-marker-selected' : '');
                  marker.innerHTML = '<span class="cat-marker-core">' + pawSvg + '</span><span class="cat-marker-count">' + countLabel + '</span>';
                  marker.onclick = function () {
                    postMessage({ type: 'REGION_SELECTED', regionId: region.id });
                  };

                  new kakao.maps.CustomOverlay({
                    position: new kakao.maps.LatLng(region.lat, region.lng),
                    content: marker,
                    yAnchor: 0.5
                  }).setMap(map);
                });
              }

              var here = ${serializedCurrentLocation};

              if (here) {
                var dot = document.createElement('div');
                dot.className = 'here-dot';
                new kakao.maps.CustomOverlay({
                  position: new kakao.maps.LatLng(here.lat, here.lng),
                  content: dot,
                  zIndex: 1
                }).setMap(map);
              }

              // 초점 구역이 없으면 내 고객 마커가 모두 들어오도록 맞춘다.
              // 현재 위치도 함께 넣어야 "내가 어디에 있고 고객이 어디 있는지"가 한눈에 보인다.
              if (${shouldFitAll ? 'true' : 'false'}) {
                var bounds = new kakao.maps.LatLngBounds();
                var fitPoints = catPoints.length > 0 ? catPoints : regions;
                fitPoints.forEach(function (point) {
                  bounds.extend(new kakao.maps.LatLng(point.lat, point.lng));
                });
                if (here) {
                  bounds.extend(new kakao.maps.LatLng(here.lat, here.lng));
                }
                map.setBounds(bounds, 80, 80, 80, 80);

                // 발자국이 좁게 모여 있으면 setBounds가 골목 축척까지 조여진다.
                // 동네가 보이는 축척 아래로는 내려가지 않는다.
                if (map.getLevel() < 4) {
                  map.setLevel(4);
                }
              }

              didFinish = true;
              window.clearTimeout(readyTimeoutId);
              postMessage({ type: 'MAP_READY' });
            });
          } catch (error) {
            fail('KAKAO_MAP_INIT_FAILED');
          }
        }

        var script = document.createElement('script');
        script.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodedAppKey}&autoload=false';
        script.async = true;
        script.onload = initializeMap;
        script.onerror = function () {
          fail('KAKAO_SDK_LOAD_FAILED');
        };
        document.head.appendChild(script);
      })();
    </script>
  </body>
</html>`;
}

function normalizeBaseUrl(origin: string) {
  return origin.endsWith('/') ? origin : `${origin}/`;
}

export function KakaoMapView({
  regions,
  selectedRegionId,
  onSelectRegion,
  focusRegionId = null,
  currentLocation = null,
  fallbackCenter = null,
  catPoints = [],
  style,
}: KakaoMapViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadFailed, setHasLoadFailed] = useState(false);
  const appKey = process.env.EXPO_PUBLIC_KAKAO_MAP_APP_KEY?.trim();
  const kakaoMapWebOrigin = process.env.EXPO_PUBLIC_KAKAO_MAP_WEB_ORIGIN?.trim() ?? '';
  const kakaoMapWebBaseUrl = kakaoMapWebOrigin ? normalizeBaseUrl(kakaoMapWebOrigin) : undefined;
  // 구역이 없어도 중심 잡을 좌표가 있으면 빈 지도라도 띄운다. 지도 자체가
  // 사라지면 "여기가 내 지부"라는 감각도 함께 사라진다.
  const canRenderMap = regions.length > 0 || currentLocation !== null || fallbackCenter !== null;
  const html = useMemo(
    () =>
      appKey && canRenderMap
        ? createMapHtml(appKey, regions, selectedRegionId, focusRegionId, currentLocation, fallbackCenter, catPoints)
        : '',
    [appKey, canRenderMap, catPoints, currentLocation, fallbackCenter, focusRegionId, regions, selectedRegionId],
  );

  useEffect(() => {
    setHasLoadFailed(false);
  }, [appKey, kakaoMapWebBaseUrl]);

  const handleMessage = (event: WebViewMessageEvent) => {
    const message = parseBridgeMessage(event.nativeEvent.data);

    if (!message) {
      return;
    }

    if (message.type === 'MAP_LOAD_ERROR') {
      console.warn('[kakao-map] map load failed', message.message ?? 'UNKNOWN');
      setHasLoadFailed(true);
      return;
    }

    if (message.type === 'MAP_READY') {
      setIsLoading(false);
      setHasLoadFailed(false);
      return;
    }

    const nextRegion = regions.find((region) => region.id === message.regionId);

    if (nextRegion) {
      onSelectRegion(nextRegion);
    }
  };

  // 구역도 중심 좌표도 없어서 지도를 못 그리는 것과 지도가 실제로 실패한
  // 것은 다르다. 전자에 "불러오지 못했어요"라고 하면 오류로 읽힌다. 그 경우는
  // 화면 위의 안내 카드가 이미 설명하므로 바탕만 남긴다.
  const isEmptyWithoutFailure = Boolean(appKey) && !hasLoadFailed && !canRenderMap;

  if (!appKey || !canRenderMap || hasLoadFailed) {
    return (
      <View style={[styles.fallbackContainer, style]}>
        {isEmptyWithoutFailure ? null : (
          <>
            <Text style={styles.fallbackTitle}>지도를 불러오지 못했어요</Text>
            <Text style={styles.fallbackText}>지도 대신 동네 냥이 구역 목록을 보여드릴게요.</Text>
          </>
        )}
        <View style={styles.fallbackRegionList}>
        {regions.map((region) => {
          const isSelected = region.id === selectedRegionId;

          return (
            <Pressable
              key={region.id}
              onPress={() => onSelectRegion(region)}
              style={[
                styles.regionFallbackItem,
                isSelected ? styles.regionCircleSelected : null,
              ]}
            >
              <Text numberOfLines={1} style={[styles.regionCircleText, isSelected ? styles.regionCircleTextSelected : null]}>
                {formatMapRegionName(region.name)}
              </Text>
              <Text style={[styles.regionCircleCount, isSelected ? styles.regionCircleTextSelected : null]}>
                {(region.catIds.length > 0 ? region.catIds.length : region.cats.length)}마리
              </Text>
            </Pressable>
          );
        })}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {isLoading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={theme.colors.primaryDark} />
        </View>
      ) : null}
      <WebView
        key={selectedRegionId ?? 'map'}
        domStorageEnabled
        javaScriptEnabled
        mixedContentMode="always"
        onError={(event) => {
          console.warn('[kakao-map] webview error', event.nativeEvent);
          setHasLoadFailed(true);
        }}
        onHttpError={(event) => {
          console.warn('[kakao-map] webview http error', event.nativeEvent);
        }}
        onLoadEnd={() => setIsLoading(false)}
        onLoadStart={() => setIsLoading(true)}
        onMessage={handleMessage}
        originWhitelist={['*']}
        scrollEnabled={false}
        source={kakaoMapWebBaseUrl ? { html, baseUrl: kakaoMapWebBaseUrl } : { html }}
        style={styles.webView}
        thirdPartyCookiesEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: theme.colors.mapBase,
  },
  webView: {
    flex: 1,
    backgroundColor: theme.colors.mapBase,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 228, 214, 0.72)',
  },
  fallbackContainer: {
    flex: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.mapBase,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  fallbackTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  fallbackText: {
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  fallbackRegionList: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  regionFallbackItem: {
    minHeight: 46,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(139,160,112,0.25)',
    borderWidth: 2,
    borderColor: 'rgba(139,160,112,0.58)',
  },
  regionCircleSelected: {
    backgroundColor: 'rgba(201,121,73,0.26)',
    borderColor: theme.colors.primary,
  },
  regionCircleText: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.primaryDark,
    textAlign: 'center',
  },
  regionCircleCount: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.mutedText,
  },
  regionCircleTextSelected: {
    color: theme.colors.text,
  },
});
