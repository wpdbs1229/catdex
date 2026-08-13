import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ClientStackParamList } from '@/app/navigation/types';
import { useTabBarBottomGap, useTabBarInset } from '@/app/navigation/useTabBarInset';
import { ClientTabBar } from '@/features/cats/components/ClientTabBar';
import {
  CAT_ACTION_IMAGES,
  PROP_IMAGES,
  SUPPORT_ROOM_BACKGROUND,
  SUPPORT_ROOM_ICONS,
} from '@/features/support-room/support-room.assets';
import {
  MAX_PENDING_SCENES,
  settleScenes,
  ZONES,
  type RoomCat,
  type Scene,
  type ZoneId,
} from '@/features/support-room/support-room.domain';
import { loadRoom, saveRoom, type StoredRoom } from '@/features/support-room/support-room.storage';
import { fetchMyCats } from '@/shared/api/cats.api';
import { nd } from '@/shared/styles/theme';

/**
 * 배경 원본 크기와 좌표. asset-manifest.json의 값을 그대로 옮겼다.
 * 여기 숫자를 고치면 앵커가 그림과 어긋나므로 매니페스트와 함께 고친다.
 */
const ROOM = {
  width: 3859,
  height: 2166,
  viewportMultiplier: 3.2,
  zoneCenterX: { reception: 643, work: 1930, records: 3216 } as Record<ZoneId, number>,
  /** 고양이·비품이 놓이는 바닥 지점 */
  anchorY: 1600,
};

/** 시안의 밀도. 방이 넓어 보이도록 고양이를 작게 둔다. */
const CAT_HEIGHT_RANGE = { min: 110, max: 150 };
/** 비품은 고양이보다 조금 작게 */
const PROP_HEIGHT_RATIO = 0.78;

const ZONE_LABEL: Record<ZoneId, string> = {
  reception: '접수',
  work: '업무',
  records: '기록·휴게',
};

type LoadPhase = 'loading' | 'ready' | 'failed';

/** 숨쉬기. 반복 모션은 이것 하나뿐이다. */
function useBreathing(enabled: boolean) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!enabled) {
      scale.setValue(1);

      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.02, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );

    loop.start();

    return () => loop.stop();
  }, [enabled, scale]);

  return scale;
}

interface SceneViewProps {
  scene: Scene;
  left: number;
  bottom: number;
  height: number;
  motionEnabled: boolean;
  onPress: () => void;
}

function SceneView({ scene, left, bottom, height, motionEnabled, onPress }: SceneViewProps) {
  const scale = useBreathing(motionEnabled);
  // 그림이 깨졌을 때 화면이 비지 않도록 중립 캐릭터의 기본 자세로 물러선다.
  const [failed, setFailed] = useState(false);
  const source = failed
    ? CAT_ACTION_IMAGES.fallback_cream.idle
    : CAT_ACTION_IMAGES[scene.characterAssetKeySnapshot][scene.behaviorId];

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.sceneWrap, { left, bottom, width: height, height, transform: [{ scale }] }]}
    >
      <Pressable
        accessibilityLabel={`${scene.catNameSnapshot} 고객, ${ZONE_LABEL[scene.zoneId]} 구역`}
        accessibilityRole="button"
        onPress={onPress}
        style={styles.sceneTouch}
      >
        <Image
          onError={() => setFailed(true)}
          resizeMode="contain"
          source={source}
          style={styles.sceneImage}
        />
      </Pressable>
    </Animated.View>
  );
}

/**
 * 고객지원실.
 *
 * 세로로는 움직이지 않고 가로로만 둘러보는 방이다. 화면 절반 이상을 빈 바닥과
 * 벽으로 두어 넓게 느끼게 하고, 고양이는 작게 세운다.
 *
 * 행동 그림(idle 제외)은 고양이와 비품이 한 장에 함께 그려져 있다. 그래서 그
 * 장면이 떠 있는 동안에는 같은 슬롯의 독립 비품을 숨겨야 한다 - 안 그러면
 * 의자가 두 개로 보인다.
 */
export function SupportRoomScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ClientStackParamList>>();
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const tabBarInset = useTabBarInset();
  const tabBarBottomGap = useTabBarBottomGap();
  const insets = useSafeAreaInsets();

  const [stored, setStored] = useState<StoredRoom | null>(null);
  const [cats, setCats] = useState<RoomCat[]>([]);
  const [phase, setPhase] = useState<LoadPhase>('loading');
  const [bubble, setBubble] = useState<{ sceneId: string; text: string } | null>(null);
  const [motionEnabled, setMotionEnabled] = useState(true);
  const scrollRef = useRef<ScrollView>(null);
  const [scrollX, setScrollX] = useState(0);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => setMotionEnabled(!reduced))
      .catch(() => setMotionEnabled(true));

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (reduced) =>
      setMotionEnabled(!reduced),
    );

    return () => subscription.remove();
  }, []);

  // 방 높이는 상단 안전영역·머리글과 하단 탭을 뺀 나머지다. 세로 스크롤이 생기면
  // 안 되므로 SafeAreaView가 밀어내는 상단 인셋까지 빼야 한다.
  const roomHeight = Math.max(
    240,
    viewportHeight - insets.top - styles.header.height - tabBarInset,
  );
  // 폭 기준 3.2 viewport가 원칙이지만, 그 배율로 세로가 넘치는 기기에서는
  // 높이에 맞춘다. 종횡비는 어느 쪽이든 그대로 둔다.
  const scale = Math.min((viewportWidth * ROOM.viewportMultiplier) / ROOM.width, roomHeight / ROOM.height);
  const roomWidth = ROOM.width * scale;
  const renderedRoomHeight = ROOM.height * scale;
  const catHeight = Math.min(CAT_HEIGHT_RANGE.max, Math.max(CAT_HEIGHT_RANGE.min, renderedRoomHeight * 0.19));

  const anchorLeft = useCallback(
    (zoneId: ZoneId, size: number) => ROOM.zoneCenterX[zoneId] * scale - size / 2,
    [scale],
  );
  const anchorBottom = useMemo(
    () => renderedRoomHeight - ROOM.anchorY * scale,
    [renderedRoomHeight],
  );

  const reload = useCallback(async () => {
    const [loadedRoom, myCats] = await Promise.all([loadRoom(), fetchMyCats()]);
    const roomCats: RoomCat[] = myCats.map((cat) => ({
      id: cat.id,
      name: cat.name,
      coatColors: cat.coatColors,
      coatPattern: cat.coatPattern,
    }));

    const settled = settleScenes({
      state: loadedRoom.room,
      cats: roomCats,
      now: Date.now(),
      pick: (candidates) => candidates[Math.floor(Math.random() * candidates.length)],
      makeSceneId: (scheduledAt, catId, propId) => `${scheduledAt}-${catId}-${propId}`,
    });
    const next: StoredRoom = { ...loadedRoom, room: settled };

    // 화면에 보여 주기 전에 저장한다. 여기서 앱이 죽어도 같은 장면이 두 번
    // 생기거나 사라지지 않는다.
    await saveRoom(next);
    setStored(next);
    setCats(roomCats);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      setPhase('loading');
      reload()
        .then(() => isActive && setPhase('ready'))
        .catch((error: unknown) => {
          console.warn('[support-room] load failed', error);

          if (isActive) {
            setPhase('failed');
          }
        });

      return () => {
        isActive = false;
      };
    }, [reload]),
  );

  // 마지막으로 보던 구역으로 돌아간다. 첫 방문은 업무 구역이다.
  useEffect(() => {
    if (!stored || phase !== 'ready') {
      return;
    }

    const target = ROOM.zoneCenterX[stored.view.lastZoneId] * scale - viewportWidth / 2;

    scrollRef.current?.scrollTo({ x: Math.max(0, target), animated: false });
  }, [phase, scale, stored, viewportWidth]);

  const scenes = stored?.room.pendingScenes ?? [];
  const activeProps = useMemo(() => {
    // 행동 장면이 있는 슬롯은 그림에 비품이 함께 그려져 있으므로 독립 비품을 숨긴다.
    const busy = new Set(scenes.filter((scene) => scene.behaviorId !== 'idle').map((scene) => scene.zoneId));

    return (Object.entries(stored?.room.installedProps ?? {}) as Array<[ZoneId, keyof typeof PROP_IMAGES]>).filter(
      ([zoneId]) => !busy.has(zoneId),
    );
  }, [scenes, stored]);

  const goToZone = useCallback(
    (zoneId: ZoneId) => {
      const target = ROOM.zoneCenterX[zoneId] * scale - viewportWidth / 2;

      scrollRef.current?.scrollTo({ x: Math.max(0, target), animated: motionEnabled });

      if (stored) {
        const next = { ...stored, view: { ...stored.view, lastZoneId: zoneId } };

        setStored(next);
        void saveRoom(next);
      }
    },
    [motionEnabled, scale, stored, viewportWidth],
  );

  /** 화면 밖에 새 장면이 있으면 어느 쪽인지 알려 준다. */
  const offscreen = useMemo(() => {
    const left = scenes.some((scene) => ROOM.zoneCenterX[scene.zoneId] * scale < scrollX);
    const right = scenes.some((scene) => ROOM.zoneCenterX[scene.zoneId] * scale > scrollX + viewportWidth);

    return { left, right };
  }, [scenes, scale, scrollX, viewportWidth]);

  const openRoster = () => navigation.navigate('ClientRoster');
  const openMap = () => navigation.navigate('ClientMap');

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerCompany}>대한냥냥공사</Text>
          <Text style={styles.headerTitle}>고객지원실</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.visitCount}>방문 중 {scenes.length}</Text>
          <Pressable
            accessibilityLabel={`상담 기록, 새 기록 ${scenes.filter((scene) => scene.isFirstSeen).length}개`}
            accessibilityRole="button"
            style={({ pressed }) => [styles.hudButton, pressed && styles.pressed]}
          >
            <Image resizeMode="contain" source={SUPPORT_ROOM_ICONS.icon_consultation_log} style={styles.hudIcon} />
            {scenes.length > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{scenes.length}</Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable
            accessibilityLabel="비품 바꾸기"
            accessibilityRole="button"
            style={({ pressed }) => [styles.hudButton, pressed && styles.pressed]}
          >
            <Image resizeMode="contain" source={SUPPORT_ROOM_ICONS.icon_supply_box} style={styles.hudIcon} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.roomViewport, { height: roomHeight }]}>
        {phase === 'loading' ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color={nd.colors.accent} />
          </View>
        ) : phase === 'failed' ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>고객지원실을 열지 못했다냥</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setPhase('loading');
                reload()
                  .then(() => setPhase('ready'))
                  .catch(() => setPhase('failed'));
              }}
              style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
            >
              <Text style={styles.ctaText}>다시 시도</Text>
            </Pressable>
          </View>
        ) : cats.length === 0 ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>아직 방문할 고객이 없어요.</Text>
            <Text style={styles.stateText}>고객 지도에서 첫 고객을 만나보세요.</Text>
            <Pressable
              accessibilityRole="button"
              onPress={openMap}
              style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
            >
              <Text style={styles.ctaText}>고객 지도 보기</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            horizontal
            onScroll={(event) => setScrollX(event.nativeEvent.contentOffset.x)}
            ref={scrollRef}
            scrollEventThrottle={32}
            showsHorizontalScrollIndicator={false}
          >
            <View style={{ width: roomWidth, height: renderedRoomHeight }}>
              <Image
                resizeMode="stretch"
                source={SUPPORT_ROOM_BACKGROUND}
                style={{ width: roomWidth, height: renderedRoomHeight }}
              />

              {activeProps.map(([zoneId, propId]) => {
                const size = catHeight * PROP_HEIGHT_RATIO;

                return (
                  <Image
                    key={zoneId}
                    resizeMode="contain"
                    source={PROP_IMAGES[propId]}
                    style={[styles.prop, { left: anchorLeft(zoneId, size), bottom: anchorBottom, width: size, height: size }]}
                  />
                );
              })}

              {scenes.map((scene) => (
                <SceneView
                  bottom={anchorBottom}
                  height={catHeight}
                  key={scene.id}
                  left={anchorLeft(scene.zoneId, catHeight)}
                  motionEnabled={motionEnabled}
                  onPress={() =>
                    setBubble({ sceneId: scene.id, text: `${scene.catNameSnapshot} 고객이 방문했어요` })
                  }
                  scene={scene}
                />
              ))}

              {bubble ? (
                <View
                  pointerEvents="none"
                  style={[
                    styles.bubble,
                    {
                      left: anchorLeft(
                        scenes.find((scene) => scene.id === bubble.sceneId)?.zoneId ?? 'work',
                        160,
                      ),
                      bottom: anchorBottom + catHeight + 8,
                    },
                  ]}
                >
                  <Text style={styles.bubbleText}>{bubble.text}</Text>
                </View>
              ) : null}
            </View>
          </ScrollView>
        )}

        {phase === 'ready' && cats.length > 0 ? (
          <>
            {offscreen.left ? (
              <Image
                accessibilityLabel="새 고객이 왼쪽에 있음"
                resizeMode="contain"
                source={SUPPORT_ROOM_ICONS.icon_direction_paw}
                style={[styles.directionPaw, styles.directionLeft]}
              />
            ) : null}
            {offscreen.right ? (
              <Image
                accessibilityLabel="새 고객이 오른쪽에 있음"
                resizeMode="contain"
                source={SUPPORT_ROOM_ICONS.icon_direction_paw}
                style={[styles.directionPaw, styles.directionRight]}
              />
            ) : null}

            <View style={styles.minimap}>
              {ZONES.map((zone) => {
                const hasScene = scenes.some((scene) => scene.zoneId === zone.id);

                return (
                  <Pressable
                    accessibilityLabel={`${ZONE_LABEL[zone.id]} 구역으로 이동`}
                    accessibilityRole="button"
                    key={zone.id}
                    onPress={() => goToZone(zone.id)}
                    style={({ pressed }) => [styles.minimapZone, pressed && styles.pressed]}
                  >
                    <Text style={styles.minimapLabel}>{ZONE_LABEL[zone.id]}</Text>
                    {hasScene ? <View style={styles.minimapDot} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}
      </View>

      <View style={[styles.tabBarWrap, { paddingBottom: tabBarBottomGap }]}>
        <ClientTabBar
          active="consult"
          onHome={() => navigation.getParent()?.navigate('HomeTab' as never)}
          onOpenConsult={() => undefined}
          onOpenMap={openMap}
          onOpenRoster={openRoster}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: nd.colors.bg,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerCompany: {
    fontSize: 11,
    letterSpacing: -0.28,
    color: nd.colors.sub,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.45,
    color: nd.colors.ink,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  visitCount: {
    marginRight: 4,
    fontSize: 12,
    fontWeight: '600',
    color: nd.colors.sub,
  },
  hudButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hudIcon: {
    width: 26,
    height: 26,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: nd.colors.accent,
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  roomViewport: {
    overflow: 'hidden',
  },
  prop: {
    position: 'absolute',
  },
  sceneWrap: {
    position: 'absolute',
  },
  sceneTouch: {
    width: '100%',
    height: '100%',
  },
  sceneImage: {
    width: '100%',
    height: '100%',
  },
  bubble: {
    position: 'absolute',
    maxWidth: 160,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bubbleText: {
    fontSize: 12,
    letterSpacing: -0.3,
    color: nd.colors.ink,
  },
  directionPaw: {
    position: 'absolute',
    top: '46%',
    width: 32,
    height: 32,
  },
  directionLeft: {
    left: 8,
    transform: [{ scaleX: -1 }],
  },
  directionRight: {
    right: 8,
  },
  minimap: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    maxWidth: 220,
    borderRadius: nd.radius.pill,
    backgroundColor: nd.colors.barBg,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  minimapZone: {
    minWidth: 64,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minimapLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.28,
    color: nd.colors.ink,
  },
  minimapDot: {
    position: 'absolute',
    top: 4,
    right: 10,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: nd.colors.accent,
  },
  stateBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 32,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: nd.colors.ink,
  },
  stateText: {
    fontSize: 13,
    letterSpacing: -0.325,
    color: nd.colors.sub,
  },
  cta: {
    marginTop: 8,
    borderRadius: nd.radius.pill,
    backgroundColor: nd.colors.accent,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.35,
    color: '#FFFFFF',
  },
  // 다른 고객 화면과 같은 배치를 쓴다. 탭을 오갈 때 바가 튀면 안 된다.
  tabBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  pressed: {
    opacity: 0.7,
  },
});
