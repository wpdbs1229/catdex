import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { Region } from '@/shared/types/region';
import { createShadow, theme } from '@/shared/styles/theme';

const fallbackMessage = '지도를 불러오지 못했어요. Kakao Map API Key 설정을 확인해주세요.';

type KakaoMapBridgeMessage =
  | {
      type: 'REGION_SELECTED';
      regionId: string;
    }
  | {
      type: 'MAP_LOAD_ERROR';
      message?: string;
    };

interface KakaoMapViewProps {
  regions: Region[];
  selectedRegionId: string | null;
  onSelectRegion: (region: Region) => void;
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

    return null;
  } catch {
    return null;
  }
}

function serializeRegions(regions: Region[]) {
  return JSON.stringify(
    regions.map(({ id, name, lat, lng, radius, cats }) => ({
      id,
      name,
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
  const centerLat = selectedRegion?.lat ?? 37.5035;
  const centerLng = selectedRegion?.lng ?? 126.766;

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
        background: #efe4d6;
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
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      (function () {
        var regions = ${serializedRegions};
        var selectedRegionId = ${serializedSelectedRegionId};

        function postMessage(payload) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify(payload));
          }
        }

        function fail(message) {
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
                  strokeColor: isSelected ? '#92400E' : '#C9804C',
                  strokeOpacity: 0.7,
                  strokeStyle: 'solid',
                  fillColor: isSelected ? '#F59E0B' : '#D97706',
                  fillOpacity: 0.2
                });

                circle.setMap(map);
                kakao.maps.event.addListener(circle, 'click', function () {
                  postMessage({ type: 'REGION_SELECTED', regionId: region.id });
                });
              });
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

export function KakaoMapView({ regions, selectedRegionId, onSelectRegion }: KakaoMapViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadFailed, setHasLoadFailed] = useState(false);
  const appKey = process.env.EXPO_PUBLIC_KAKAO_MAP_APP_KEY?.trim();
  const html = useMemo(() => (appKey ? createMapHtml(appKey, regions, selectedRegionId) : ''), [appKey, regions, selectedRegionId]);

  const handleMessage = (event: WebViewMessageEvent) => {
    const message = parseBridgeMessage(event.nativeEvent.data);

    if (!message) {
      return;
    }

    if (message.type === 'MAP_LOAD_ERROR') {
      setHasLoadFailed(true);
      return;
    }

    const nextRegion = regions.find((region) => region.id === message.regionId);

    if (nextRegion) {
      onSelectRegion(nextRegion);
    }
  };

  if (!appKey || hasLoadFailed) {
    return (
      <View style={styles.fallbackContainer}>
        <Text style={styles.fallbackText}>{fallbackMessage}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={theme.colors.primaryDark} />
        </View>
      ) : null}
      <WebView
        key={selectedRegionId ?? 'map'}
        domStorageEnabled
        javaScriptEnabled
        onError={() => setHasLoadFailed(true)}
        onHttpError={() => setHasLoadFailed(true)}
        onLoadEnd={() => setIsLoading(false)}
        onLoadStart={() => setIsLoading(true)}
        onMessage={handleMessage}
        originWhitelist={['*']}
        scrollEnabled={false}
        source={{ html }}
        style={styles.webView}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 300,
    overflow: 'hidden',
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.mapBase,
    ...createShadow(8),
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
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.xl,
    backgroundColor: theme.colors.mapBase,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  fallbackText: {
    color: theme.colors.mutedText,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 22,
    textAlign: 'center',
  },
});
