import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { Region } from '@/shared/types/region';
import { theme } from '@/shared/styles/theme';

const fallbackMessage = 'Kakao 지도를 불러오지 못해 지역 단위 지도로 표시 중이에요.';
const defaultKakaoMapWebOrigin = 'https://catdex.local/';
const kakaoMapSdkUrl = 'https://dapi.kakao.com/v2/maps/sdk.js';
const kakaoMapSdkLoadTimeoutMs = 20000;
const nativeMapReadyTimeoutMs = 26000;

type KakaoMapBridgeMessage =
  | {
      type: 'MAP_READY';
    }
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
  style?: StyleProp<ViewStyle>;
}

function parseBridgeMessage(data: string): KakaoMapBridgeMessage | null {
  try {
    const parsed: unknown = JSON.parse(data);

    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const payload = parsed as Record<string, unknown>;

    if (payload.type === 'MAP_READY') {
      return {
        type: 'MAP_READY',
      };
    }

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
    regions.map(({ id, name, lat, lng, radius, cats, catPreviews }) => ({
      id,
      name,
      lat,
      lng,
      radius,
      cats,
      catPreviews: catPreviews ?? cats.map((catName, index) => ({
        id: `${id}-${index}`,
        name: catName,
      })),
    })),
  ).replace(/</g, '\\u003c');
}

function resolveKakaoMapWebOrigin(value?: string) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return {
      origin: defaultKakaoMapWebOrigin,
      warning: null,
    };
  }

  const hasExplicitProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmedValue);
  const candidate = hasExplicitProtocol ? trimmedValue : `https://${trimmedValue}`;

  try {
    const url = new URL(candidate);

    if ((url.protocol !== 'http:' && url.protocol !== 'https:') || !url.hostname) {
      throw new Error('Kakao Map Web origin must use http or https.');
    }

    const origin = `${url.protocol}//${url.host}/`;
    const warning =
      !hasExplicitProtocol || url.pathname !== '/' || url.search || url.hash
        ? `EXPO_PUBLIC_KAKAO_MAP_WEB_ORIGIN을 ${origin}로 정규화했어요.`
        : null;

    return {
      origin,
      warning,
    };
  } catch {
    return {
      origin: defaultKakaoMapWebOrigin,
      warning: `EXPO_PUBLIC_KAKAO_MAP_WEB_ORIGIN 값이 유효한 http(s) origin이 아니어서 ${defaultKakaoMapWebOrigin}를 사용했어요.`,
    };
  }
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
        background: #e7dec9;
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

      .map-cat-marker {
        appearance: none;
        -webkit-appearance: none;
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
        min-width: 74px;
        transform: translate(-50%, -100%);
        border: 0;
        padding: 0;
        background: transparent;
        color: #4A3428;
        font: 700 12px -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
        white-space: nowrap;
        cursor: pointer;
      }

      .map-cat-avatar {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 58px;
        height: 58px;
        border: 3px solid rgba(255, 253, 246, 0.96);
        border-radius: 999px;
        background: #FFFDF6;
        box-shadow: 0 8px 18px rgba(91, 62, 48, 0.22);
      }

      .map-cat-marker-selected .map-cat-avatar {
        border-color: #C97949;
        box-shadow: 0 10px 24px rgba(91, 62, 48, 0.28);
      }

      .map-cat-image {
        display: block;
        width: 100%;
        height: 100%;
        border-radius: 999px;
        object-fit: cover;
      }

      .map-cat-initial {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        border-radius: 999px;
        background: #DDE8C8;
        color: #4A3428;
        font-size: 22px;
        font-weight: 900;
      }

      .map-cat-count {
        position: absolute;
        right: -6px;
        bottom: -5px;
        min-width: 24px;
        height: 24px;
        border: 2px solid #FFFDF6;
        border-radius: 999px;
        padding: 0 6px;
        background: #BF7848;
        color: #FFFDF6;
        font-size: 10px;
        font-weight: 900;
        line-height: 20px;
        text-align: center;
      }

      .map-cat-name {
        max-width: 96px;
        overflow: hidden;
        border: 1px solid rgba(91, 62, 48, 0.14);
        border-radius: 999px;
        padding: 4px 8px;
        background: rgba(255, 253, 246, 0.9);
        box-shadow: 0 5px 12px rgba(91, 62, 48, 0.12);
        text-overflow: ellipsis;
      }

      .map-cat-marker-selected .map-cat-name {
        background: rgba(246, 226, 190, 0.96);
        border-color: rgba(191, 120, 72, 0.38);
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

        function redactUrl(url) {
          return String(url || 'unknown').replace(/appkey=[^&]+/i, 'appkey=<redacted>');
        }

        function getScriptDiagnostics() {
          return Array.prototype.slice.call(document.scripts)
            .map(function (script) {
              return redactUrl(script.src || 'inline');
            })
            .join(',');
        }

        function getErrorMessage(error) {
          if (!error) {
            return 'unknown';
          }

          if (error.message) {
            return error.name ? error.name + ':' + error.message : error.message;
          }

          return String(error);
        }

        function getDiagnostics(message) {
          return [
            message,
            'origin=' + (window.location && window.location.origin ? window.location.origin : 'unknown'),
            'href=' + (window.location && window.location.href ? window.location.href : 'unknown'),
            'referrer=' + (document.referrer || 'empty'),
            'readyState=' + document.readyState,
            'scripts=' + getScriptDiagnostics()
          ].join(' | ');
        }

        function fail(message) {
          if (hasResolvedMapLoad) {
            return;
          }

          hasResolvedMapLoad = true;
          clearTimeout(loadTimeoutId);
          postMessage({ type: 'MAP_LOAD_ERROR', message: getDiagnostics(message) });
          document.body.innerHTML = '<div class="fallback">${fallbackMessage}</div>';
        }

        window.addEventListener('error', function (event) {
          var target = event.target;

          if (target && target.tagName === 'SCRIPT') {
            fail('SCRIPT_LOAD_ERROR:' + redactUrl(target.src));
            return;
          }

          if (event.message) {
            fail('WINDOW_ERROR:' + event.message);
          }
        }, true);

        window.addEventListener('unhandledrejection', function (event) {
          fail('UNHANDLED_REJECTION:' + getErrorMessage(event.reason));
        });

        function initializeMap() {
          try {
            if (!window.kakao || !window.kakao.maps) {
              fail('KAKAO_SDK_NOT_AVAILABLE');
              return;
            }

            window.kakao.maps.load(function () {
              try {
                if (hasResolvedMapLoad) {
                  return;
                }

                clearTimeout(loadTimeoutId);
                var kakao = window.kakao;
                var mapElement = document.getElementById('map');

                if (!mapElement) {
                  fail('KAKAO_MAP_ELEMENT_NOT_FOUND');
                  return;
                }

                var map = new kakao.maps.Map(mapElement, {
                  center: new kakao.maps.LatLng(${centerLat}, ${centerLng}),
                  level: 5
                });

                function getShortRegionName(regionName) {
                  return String(regionName || '').replace('부천시 ', '').replace(' 근처', '');
                }

                function getPrimaryCat(region) {
                  var previews = Array.isArray(region.catPreviews) ? region.catPreviews : [];

                  if (previews.length > 0) {
                    return previews[0];
                  }

                  if (Array.isArray(region.cats) && region.cats.length > 0) {
                    return {
                      name: region.cats[0]
                    };
                  }

                  return null;
                }

                function appendInitial(avatar, label) {
                  var initial = document.createElement('span');
                  initial.className = 'map-cat-initial';
                  initial.textContent = String(label || '?').slice(0, 1);
                  avatar.appendChild(initial);
                }

                regions.forEach(function (region) {
                  var isSelected = region.id === selectedRegionId;
                  var circle = new kakao.maps.Circle({
                    center: new kakao.maps.LatLng(region.lat, region.lng),
                    radius: region.radius,
                    strokeWeight: 2,
                    strokeColor: isSelected ? '#5B3E30' : '#8BA070',
                    strokeOpacity: 0.7,
                    strokeStyle: 'solid',
                    fillColor: isSelected ? '#C97949' : '#8BA070',
                    fillOpacity: 0.2
                  });

                  circle.setMap(map);
                  kakao.maps.event.addListener(circle, 'click', function () {
                    postMessage({ type: 'REGION_SELECTED', regionId: region.id });
                  });

                  var primaryCat = getPrimaryCat(region);
                  var marker = document.createElement('button');
                  marker.type = 'button';
                  marker.className = 'map-cat-marker' + (isSelected ? ' map-cat-marker-selected' : '');

                  var avatar = document.createElement('span');
                  avatar.className = 'map-cat-avatar';

                  if (primaryCat && primaryCat.imageUrl) {
                    var image = document.createElement('img');
                    image.className = 'map-cat-image';
                    image.alt = primaryCat.name || region.name;
                    image.src = primaryCat.imageUrl;
                    image.onerror = function () {
                      if (image.parentNode) {
                        image.parentNode.removeChild(image);
                      }
                      appendInitial(avatar, primaryCat.name || region.name);
                    };
                    avatar.appendChild(image);
                  } else {
                    appendInitial(avatar, (primaryCat && primaryCat.name) || region.name);
                  }

                  if (Array.isArray(region.cats) && region.cats.length > 1) {
                    var count = document.createElement('span');
                    count.className = 'map-cat-count';
                    count.textContent = String(region.cats.length);
                    avatar.appendChild(count);
                  }

                  var name = document.createElement('span');
                  name.className = 'map-cat-name';
                  name.textContent = primaryCat ? primaryCat.name : getShortRegionName(region.name);

                  marker.appendChild(avatar);
                  marker.appendChild(name);
                  marker.onclick = function () {
                    postMessage({ type: 'REGION_SELECTED', regionId: region.id });
                  };

                  var overlay = new kakao.maps.CustomOverlay({
                    position: new kakao.maps.LatLng(region.lat, region.lng),
                    content: marker,
                    yAnchor: 0.16
                  });

                  overlay.setMap(map);
                });

                hasResolvedMapLoad = true;
                postMessage({ type: 'MAP_READY' });
              } catch (error) {
                fail('KAKAO_MAP_INIT_FAILED:' + getErrorMessage(error));
              }
            });
          } catch (error) {
            fail('KAKAO_MAP_LOAD_FAILED:' + getErrorMessage(error));
          }
        }

        var hasResolvedMapLoad = false;
        var loadTimeoutId = setTimeout(function () {
          fail('KAKAO_MAP_LOAD_TIMEOUT_${kakaoMapSdkLoadTimeoutMs}MS');
        }, ${kakaoMapSdkLoadTimeoutMs});
        var script = document.createElement('script');
        script.src = '${kakaoMapSdkUrl}?appkey=${encodedAppKey}&autoload=false';
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

interface FallbackRegionMapProps {
  detail?: string | null;
  onSelectRegion: (region: Region) => void;
  regions: Region[];
  selectedRegionId: string | null;
  style?: StyleProp<ViewStyle>;
  webOrigin?: string;
}

function getShortRegionName(regionName: string) {
  return regionName.replace('부천시 ', '').replace(' 근처', '');
}

function getPrimaryRegionCat(region: Region) {
  return region.catPreviews?.[0] ?? (region.cats[0] ? { id: `${region.id}-fallback`, name: region.cats[0] } : null);
}

function FallbackRegionMap({ detail, onSelectRegion, regions, selectedRegionId, style, webOrigin }: FallbackRegionMapProps) {
  return (
    <View style={[styles.fallbackContainer, style]}>
      <View style={styles.paperRoad} />
      <View style={styles.paperPark} />
      {regions.map((region, index) => {
        const isSelected = region.id === selectedRegionId;
        const position = fallbackRegionPositions[index % fallbackRegionPositions.length];
        const primaryCat = getPrimaryRegionCat(region);
        const markerLabel = primaryCat?.name ?? getShortRegionName(region.name);

        return (
          <Pressable
            key={region.id}
            onPress={() => onSelectRegion(region)}
            style={[
              styles.regionCircle,
              position,
              isSelected ? styles.regionCircleSelected : null,
            ]}
          >
            <View style={[styles.regionAvatarFrame, isSelected ? styles.regionAvatarFrameSelected : null]}>
              {primaryCat?.imageUrl ? (
                <Image resizeMode="cover" source={{ uri: primaryCat.imageUrl }} style={styles.regionAvatarImage} />
              ) : (
                <Text style={styles.regionAvatarInitial}>{markerLabel.slice(0, 1)}</Text>
              )}
              {region.cats.length > 1 ? (
                <View style={styles.regionAvatarCountBadge}>
                  <Text style={styles.regionAvatarCountText}>{region.cats.length}</Text>
                </View>
              ) : null}
            </View>
            <Text numberOfLines={1} style={[styles.regionCircleText, isSelected ? styles.regionCircleTextSelected : null]}>
              {markerLabel}
            </Text>
            <Text style={[styles.regionCircleCount, isSelected ? styles.regionCircleTextSelected : null]}>
              {region.cats.length}마리
            </Text>
          </Pressable>
        );
      })}
      <View style={styles.fallbackCopy}>
        <Text style={styles.fallbackText}>{fallbackMessage}</Text>
        {detail ? (
          <Text selectable style={styles.fallbackDetail}>
            {detail}
          </Text>
        ) : null}
        {webOrigin ? (
          <Text selectable style={styles.fallbackDetail}>
            webOrigin={webOrigin}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function isKakaoMapResourceRequest(url?: string) {
  if (!url) {
    return false;
  }

  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.hostname === 'dapi.kakao.com') {
      return parsedUrl.pathname.startsWith('/v2/maps/sdk.js');
    }

    if (parsedUrl.hostname === 't1.daumcdn.net') {
      return parsedUrl.pathname.includes('/mapjsapi/');
    }

    return false;
  } catch {
    return url.startsWith(kakaoMapSdkUrl);
  }
}

function redactKakaoMapUrl(url?: string) {
  if (!url) {
    return 'unknown';
  }

  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.searchParams.has('appkey')) {
      parsedUrl.searchParams.set('appkey', '<redacted>');
    }

    return parsedUrl.toString();
  } catch {
    return url.replace(/appkey=[^&]+/i, 'appkey=<redacted>');
  }
}

export function KakaoMapView({ regions, selectedRegionId, onSelectRegion, style }: KakaoMapViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isMapReady, setIsMapReady] = useState(false);
  const [hasLoadFailed, setHasLoadFailed] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const appKey = process.env.EXPO_PUBLIC_KAKAO_MAP_APP_KEY?.trim();
  const { origin: kakaoMapWebOrigin, warning: kakaoMapWebOriginWarning } = resolveKakaoMapWebOrigin(process.env.EXPO_PUBLIC_KAKAO_MAP_WEB_ORIGIN);
  const regionsFingerprint = useMemo(
    () => regions
      .map((region) => {
        const previewFingerprint = (region.catPreviews ?? [])
          .map((cat) => `${cat.id}:${cat.imageUrl ?? ''}`)
          .join(',');

        return `${region.id}:${region.lat}:${region.lng}:${region.radius}:${region.cats.length}:${previewFingerprint}`;
      })
      .join('|'),
    [regions],
  );
  const mapSourceKey = `${appKey ?? ''}:${kakaoMapWebOrigin}:${regionsFingerprint}`;
  const html = useMemo(() => (appKey ? createMapHtml(appKey, regions, selectedRegionId) : ''), [appKey, regions, selectedRegionId]);

  useEffect(() => {
    setHasLoadFailed(false);
    setIsMapReady(false);
    setLoadErrorMessage(null);
    setIsLoading(Boolean(appKey));
  }, [appKey, mapSourceKey]);

  useEffect(() => {
    if (!appKey || hasLoadFailed || isMapReady) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setLoadErrorMessage(`NATIVE_WEBVIEW_LOAD_TIMEOUT_${nativeMapReadyTimeoutMs}MS`);
      setIsLoading(false);
    }, nativeMapReadyTimeoutMs);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [appKey, hasLoadFailed, isMapReady, mapSourceKey]);

  const handleMessage = (event: WebViewMessageEvent) => {
    const message = parseBridgeMessage(event.nativeEvent.data);

    if (!message) {
      return;
    }

    if (message.type === 'MAP_LOAD_ERROR') {
      setHasLoadFailed(true);
      setIsMapReady(false);
      setLoadErrorMessage(message.message ?? 'KAKAO_MAP_UNKNOWN_ERROR');
      setIsLoading(false);
      return;
    }

    if (message.type === 'MAP_READY') {
      setHasLoadFailed(false);
      setIsMapReady(true);
      setIsLoading(false);
      return;
    }

    const nextRegion = regions.find((region) => region.id === message.regionId);

    if (nextRegion) {
      onSelectRegion(nextRegion);
    }
  };

  if (!appKey || hasLoadFailed) {
    const fallbackDetail = [
      !appKey ? 'EXPO_PUBLIC_KAKAO_MAP_APP_KEY가 비어 있어요.' : loadErrorMessage ?? 'Kakao SDK 로드 상태를 확인하지 못했어요.',
      kakaoMapWebOriginWarning,
    ]
      .filter(Boolean)
      .join('\n');

    return (
      <FallbackRegionMap
        detail={fallbackDetail}
        onSelectRegion={onSelectRegion}
        regions={regions}
        selectedRegionId={selectedRegionId}
        style={style}
        webOrigin={kakaoMapWebOrigin}
      />
    );
  }

  return (
    <View style={[styles.container, style]}>
      <FallbackRegionMap
        detail={!isMapReady ? (isLoading ? 'Kakao 지도 로딩 중이에요.' : loadErrorMessage) : null}
        onSelectRegion={onSelectRegion}
        regions={regions}
        selectedRegionId={selectedRegionId}
        style={styles.fallbackUnderlay}
      />
      <View pointerEvents={isMapReady ? 'auto' : 'none'} style={[styles.webViewLayer, isMapReady ? null : styles.hiddenWebView]}>
        <WebView
          key={mapSourceKey}
          domStorageEnabled
          javaScriptEnabled
          mixedContentMode="always"
          onError={(event) => {
            setHasLoadFailed(true);
            setIsMapReady(false);
            setLoadErrorMessage(event.nativeEvent.description || 'WEBVIEW_LOAD_ERROR');
            setIsLoading(false);
          }}
          onHttpError={(event) => {
            const requestUrl = event.nativeEvent.url;

            if (!isKakaoMapResourceRequest(requestUrl)) {
              return;
            }

            setHasLoadFailed(true);
            setIsMapReady(false);
            setLoadErrorMessage(`WEBVIEW_HTTP_ERROR_${event.nativeEvent.statusCode}:${redactKakaoMapUrl(requestUrl)}`);
            setIsLoading(false);
          }}
          onLoadStart={() => setIsLoading(true)}
          onMessage={handleMessage}
          originWhitelist={['*']}
          scrollEnabled={false}
          source={{ html, baseUrl: kakaoMapWebOrigin }}
          style={styles.webView}
          thirdPartyCookiesEnabled
        />
      </View>
      {isLoading && !isMapReady ? (
        <View style={styles.loadingBadge}>
          <ActivityIndicator color={theme.colors.primaryDark} size="small" />
          <Text style={styles.loadingBadgeText}>Kakao 지도 확인 중</Text>
        </View>
      ) : null}
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
  webViewLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.mapBase,
  },
  hiddenWebView: {
    opacity: 0,
  },
  loadingBadge: {
    position: 'absolute',
    right: theme.spacing.xl,
    bottom: 232,
    left: theme.spacing.xl,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 253, 246, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(139, 112, 83, 0.16)',
  },
  loadingBadgeText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
  },
  fallbackUnderlay: {
    ...StyleSheet.absoluteFillObject,
  },
  fallbackContainer: {
    flex: 1,
    overflow: 'hidden',
    paddingHorizontal: theme.spacing.xl,
    backgroundColor: theme.colors.mapBase,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  paperRoad: {
    position: 'absolute',
    top: 80,
    left: -40,
    width: 520,
    height: 110,
    borderRadius: 80,
    backgroundColor: 'rgba(255,253,246,0.38)',
    transform: [{ rotate: '-14deg' }],
  },
  paperPark: {
    position: 'absolute',
    right: -70,
    bottom: 82,
    left: -70,
    height: 190,
    borderTopLeftRadius: 180,
    borderTopRightRadius: 180,
    backgroundColor: 'rgba(221,229,200,0.64)',
  },
  regionCircle: {
    position: 'absolute',
    width: 118,
    height: 118,
    borderRadius: 59,
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
  regionAvatarFrame: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 3,
    borderColor: 'rgba(255,253,246,0.92)',
  },
  regionAvatarFrameSelected: {
    borderColor: theme.colors.primary,
  },
  regionAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
  },
  regionAvatarInitial: {
    color: theme.colors.primaryDark,
    fontSize: 21,
    fontWeight: '900',
  },
  regionAvatarCountBadge: {
    position: 'absolute',
    right: -5,
    bottom: -5,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    paddingHorizontal: 5,
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  regionAvatarCountText: {
    color: theme.colors.surface,
    fontSize: 10,
    fontWeight: '900',
  },
  regionCircleText: {
    marginTop: 7,
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
  fallbackCopy: {
    position: 'absolute',
    right: theme.spacing.xl,
    bottom: 260,
    left: theme.spacing.xl,
    gap: 6,
  },
  fallbackText: {
    color: theme.colors.mutedText,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
    textAlign: 'center',
  },
  fallbackDetail: {
    color: '#8A7468',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 15,
    textAlign: 'center',
  },
});

const fallbackRegionPositions: Array<{
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}> = [
  { top: 190, left: 42 },
  { top: 300, right: 52 },
  { bottom: 260, left: 92 },
];
