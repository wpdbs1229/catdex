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

interface KakaoMapViewProps {
  regions: Region[];
  selectedRegionId: string | null;
  onSelectRegion: (region: Region) => void;
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
    regions.map(({ id, name, lat, lng, radius, cats }) => ({
      id,
      name: formatMapRegionName(name),
      lat,
      lng,
      radius,
      cats,
    })),
  ).replace(/</g, '\\u003c');
}

function createMapHtml(appKey: string, regions: Region[], selectedRegionId: string | null) {
  const encodedAppKey = encodeURIComponent(appKey);
  const serializedRegions = serializeRegions(regions);
  const serializedSelectedRegionId = JSON.stringify(selectedRegionId);
  const selectedRegion = regions.find((region) => region.id === selectedRegionId) ?? regions[0];
  const centerLat = selectedRegion?.lat ?? 0;
  const centerLng = selectedRegion?.lng ?? 0;

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

      .map-label {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        min-width: 74px;
        transform: translate(-50%, -100%);
        border: 1px solid rgba(91, 62, 48, 0.18);
        border-radius: 999px;
        padding: 7px 10px;
        background: rgba(255, 253, 246, 0.86);
        box-shadow: 0 6px 16px rgba(91, 62, 48, 0.1);
        color: #4A3428;
        font: 800 12px -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
        white-space: nowrap;
      }

      .map-label-selected {
        background: rgba(248, 234, 210, 0.9);
        border-color: rgba(191, 120, 72, 0.48);
      }

      .map-label-dot {
        width: 8px;
        height: 8px;
        border-radius: 4px;
        background: #617A43;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      (function () {
        var regions = ${serializedRegions};
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

              regions.forEach(function (region) {
                var isSelected = region.id === selectedRegionId;
                var circle = new kakao.maps.Circle({
                  center: new kakao.maps.LatLng(region.lat, region.lng),
                  radius: region.radius,
                  strokeWeight: 2,
                  strokeColor: isSelected ? '#B9794B' : '#8BA070',
                  strokeOpacity: 0.7,
                  strokeStyle: 'solid',
                  fillColor: isSelected ? '#F2C69F' : '#8BA070',
                  fillOpacity: 0.2
                });

                circle.setMap(map);
                kakao.maps.event.addListener(circle, 'click', function () {
                  postMessage({ type: 'REGION_SELECTED', regionId: region.id });
                });

                var label = document.createElement('button');
                label.type = 'button';
                label.className = 'map-label' + (isSelected ? ' map-label-selected' : '');
                label.innerHTML = '<span class="map-label-dot"></span><span>' + region.name.replace('부천시 ', '').replace(' 근처', '') + ' · ' + region.cats.length + '마리</span>';
                label.onclick = function () {
                  postMessage({ type: 'REGION_SELECTED', regionId: region.id });
                };

                var overlay = new kakao.maps.CustomOverlay({
                  position: new kakao.maps.LatLng(region.lat, region.lng),
                  content: label,
                  yAnchor: 0.18
                });

                overlay.setMap(map);
              });

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

export function KakaoMapView({ regions, selectedRegionId, onSelectRegion, style }: KakaoMapViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadFailed, setHasLoadFailed] = useState(false);
  const appKey = process.env.EXPO_PUBLIC_KAKAO_MAP_APP_KEY?.trim();
  const kakaoMapWebOrigin = process.env.EXPO_PUBLIC_KAKAO_MAP_WEB_ORIGIN?.trim() ?? '';
  const kakaoMapWebBaseUrl = kakaoMapWebOrigin ? normalizeBaseUrl(kakaoMapWebOrigin) : undefined;
  const html = useMemo(() => (appKey && regions.length > 0 ? createMapHtml(appKey, regions, selectedRegionId) : ''), [appKey, regions, selectedRegionId]);

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

  if (!appKey || regions.length === 0 || hasLoadFailed) {
    return (
      <View style={[styles.fallbackContainer, style]}>
        <Text style={styles.fallbackTitle}>지도를 불러오지 못했어요</Text>
        <Text style={styles.fallbackText}>지도 대신 동네 냥이 구역 목록을 보여드릴게요.</Text>
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
                {region.cats.length}마리
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
