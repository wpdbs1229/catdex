import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber/native';
import * as THREE from 'three';
import { specLookup, STARTER_LAYOUT } from '@/features/support-room-v2/domain/fixtures';
import type { FurnitureSpec } from '@/features/support-room-v2/domain/furniture';
import type { Placement } from '@/features/support-room-v2/domain/placement';
import { validateLayout } from '@/features/support-room-v2/domain/placement';
import { DEFAULT_ROOM_SHELL } from '@/features/support-room-v2/domain/room-shell';
import { nd } from '@/shared/styles/theme';
import {
  ROOM_D,
  ROOM_W,
  WALL_H,
  cameraAngle,
  cellToWorld,
  hiddenWalls,
  placementCenter,
  worldToCell,
  type SnapAngle,
  type WallId,
} from './room3d.geometry';

/**
 * 단계 0 스파이크. 에셋을 한 장도 만들지 않고 3D 전환의 진짜 위험만 본다.
 *   1) 저사양 기기에서 프레임이 나오는가        → 화면 좌상단 fps
 *   2) 바닥 레이캐스트 드래그가 쓸 만한가        → 가구를 끌어 본다
 *   3) 90° 스냅 회전으로 방 안이 계속 보이는가   → 회전 버튼
 * 가구는 박스, 방은 판때기다. 여기서 답이 나쁘면 모델링을 시작하지 않는다.
 */

/** 박스 높이는 눈대중이다. 실제 모델이 생기면 통째로 사라질 값. */
const HEIGHT_BY_GROUP: Record<string, number> = {
  interactive: 0.5,
  office: 1.1,
  decor: 0.7,
  wall: 0.4,
};

const WALL_THICKNESS = 0.15;

function furnitureHeight(spec: FurnitureSpec) {
  return HEIGHT_BY_GROUP[spec.group] ?? 0.6;
}

function Floor({ onPick }: { onPick: (event: ThreeEvent<PointerEvent>) => void }) {
  return (
    <mesh
      onPointerDown={onPick}
      onPointerMove={onPick}
      position={[0, 0, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[ROOM_W, ROOM_D]} />
      <meshStandardMaterial color="#E8D9C3" />
    </mesh>
  );
}

function FloorGrid() {
  // 격자를 눈으로 봐야 드래그가 칸에 맞는지 확인할 수 있다.
  const grid = useMemo(() => {
    const helper = new THREE.GridHelper(1, 1);
    helper.dispose();
    const points: number[] = [];
    for (let x = 0; x <= ROOM_W; x += 1) {
      points.push(x - ROOM_W / 2, 0.01, -ROOM_D / 2, x - ROOM_W / 2, 0.01, ROOM_D / 2);
    }
    for (let z = 0; z <= ROOM_D; z += 1) {
      points.push(-ROOM_W / 2, 0.01, z - ROOM_D / 2, ROOM_W / 2, 0.01, z - ROOM_D / 2);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    return geometry;
  }, []);

  return (
    <lineSegments geometry={grid}>
      <lineBasicMaterial color="#C4AE92" />
    </lineSegments>
  );
}

function Wall({ id, hidden }: { id: WallId; hidden: boolean }) {
  const isNorthSouth = id === 'north' || id === 'south';
  const width = isNorthSouth ? ROOM_W : ROOM_D;
  const position: [number, number, number] =
    id === 'north'
      ? [0, WALL_H / 2, -ROOM_D / 2]
      : id === 'south'
        ? [0, WALL_H / 2, ROOM_D / 2]
        : id === 'west'
          ? [-ROOM_W / 2, WALL_H / 2, 0]
          : [ROOM_W / 2, WALL_H / 2, 0];

  return (
    <mesh position={position} rotation={[0, isNorthSouth ? 0 : Math.PI / 2, 0]} visible={!hidden}>
      <boxGeometry args={[width, WALL_H, WALL_THICKNESS]} />
      <meshStandardMaterial color="#F3EADB" />
    </mesh>
  );
}

interface FurnitureBoxProps {
  placement: Placement;
  spec: FurnitureSpec;
  isSelected: boolean;
  isInvalid: boolean;
  onSelect: () => void;
}

function FurnitureBox({ placement, spec, isSelected, isInvalid, onSelect }: FurnitureBoxProps) {
  const [x, z] = placementCenter(placement, spec);
  const height = furnitureHeight(spec);
  const color = isInvalid ? '#D94F4F' : isSelected ? nd.colors.primary : '#B98B5E';

  return (
    <mesh
      castShadow
      onPointerDown={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      position={[x, height / 2, z]}
    >
      <boxGeometry args={[spec.footprint.width, height, spec.footprint.depth]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

/**
 * 카메라를 방 둘레 네 지점 중 하나에 세운다. 스냅이 바뀌면 그 자리로 미끄러진다.
 *
 * 거리는 상수로 두면 안 된다. 방이 30x8로 가로가 길고 화면은 세로라, 수평
 * 화각이 수직보다 훨씬 좁다. 둘 중 좁은 쪽에 맞춰야 방이 화면 밖으로 안 나간다.
 */
function SnapCamera({ snap }: { snap: SnapAngle }) {
  const { camera, size } = useThree();
  const target = useRef(new THREE.Vector3());

  useFrame(() => {
    const perspective = camera as THREE.PerspectiveCamera;
    const aspect = size.width / size.height;
    const verticalFov = THREE.MathUtils.degToRad(perspective.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
    // 방을 감싸는 구의 반지름(바닥 대각선 절반 + 벽 높이 여유)
    const boundingRadius = Math.hypot(ROOM_W, ROOM_D) / 2 + WALL_H * 0.4;
    const distance = boundingRadius / Math.sin(Math.min(verticalFov, horizontalFov) / 2);

    const angle = cameraAngle(snap);
    const direction = new THREE.Vector3(Math.cos(angle), 0.8, Math.sin(angle)).normalize();
    target.current.copy(direction).multiplyScalar(distance);

    camera.position.lerp(target.current, 0.12);
    camera.lookAt(0, WALL_H * 0.25, 0);
  });

  return null;
}

function FpsProbe({ onSample }: { onSample: (fps: number) => void }) {
  const frames = useRef(0);
  const since = useRef(0);

  useFrame((_, delta) => {
    frames.current += 1;
    since.current += delta;
    if (since.current >= 1) {
      onSample(Math.round(frames.current / since.current));
      frames.current = 0;
      since.current = 0;
    }
  });

  return null;
}

/**
 * 부하 시험용 배치. 30x8 바닥을 2x2 가구로 빈틈없이 채우면 정확히 60개다.
 * 가구 카탈로그가 56종이므로, 실제로 방을 꽉 채웠을 때의 드로우콜을 이걸로 본다.
 */
const STRESS_LAYOUT: readonly Placement[] = Array.from({ length: 60 }, (_, index) => ({
  placementId: `stress-${index}`,
  furnitureId: 'visitor_cushion_orange' as const,
  surface: 'floor' as const,
  gridX: (index % 15) * 2,
  gridY: Math.floor(index / 15) * 2,
  flipX: false,
}));

export function Room3DSpikeScreen() {
  const [isStressed, setIsStressed] = useState(false);
  const [placements, setPlacements] = useState<readonly Placement[]>(STARTER_LAYOUT);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snap, setSnap] = useState<SnapAngle>(0);
  const [fps, setFps] = useState(0);

  // 배치 규칙은 2D 때 쓰던 것을 그대로 쓴다. 3D는 그리기만 바뀐다.
  const issues = useMemo(
    () => validateLayout(placements, specLookup, DEFAULT_ROOM_SHELL),
    [placements],
  );
  const invalidIds = useMemo(
    () => new Set(issues.map((issue) => issue.placementId).filter(Boolean) as string[]),
    [issues],
  );

  const moveSelectedTo = (event: ThreeEvent<PointerEvent>) => {
    if (!selectedId) {
      return;
    }

    const cell = worldToCell(event.point.x, event.point.z);

    setPlacements((current) =>
      current.map((placement) =>
        placement.placementId === selectedId
          ? { ...placement, gridX: cell.x, gridY: cell.y }
          : placement,
      ),
    );
  };

  const hidden = new Set(hiddenWalls(snap));

  return (
    <SafeAreaView style={styles.screen}>
      <Canvas
        camera={{ fov: 35, position: [ROOM_W * 0.6, ROOM_W * 0.5, ROOM_W * 0.6] }}
        gl={{ antialias: false }}
        shadows={false}
      >
        <color args={['#2B2622']} attach="background" />
        <ambientLight intensity={0.8} />
        <directionalLight intensity={1.1} position={[10, 18, 8]} />

        <SnapCamera snap={snap} />
        <FpsProbe onSample={setFps} />

        <Floor onPick={moveSelectedTo} />
        <FloorGrid />
        {(['north', 'south', 'east', 'west'] as const).map((id) => (
          <Wall hidden={hidden.has(id)} id={id} key={id} />
        ))}

        {placements.map((placement) => {
          const spec = specLookup(placement.furnitureId);
          if (!spec) {
            return null;
          }

          return (
            <FurnitureBox
              isInvalid={invalidIds.has(placement.placementId)}
              isSelected={selectedId === placement.placementId}
              key={placement.placementId}
              onSelect={() => setSelectedId(placement.placementId)}
              placement={placement}
              spec={spec}
            />
          );
        })}
      </Canvas>

      <View pointerEvents="box-none" style={styles.hud}>
        <Text style={styles.stat}>{fps} fps</Text>
        <Text style={styles.stat}>
          {selectedId ? '바닥을 눌러 옮기기' : '가구를 골라 보세요'}
          {issues.length > 0 ? `  ·  배치 문제 ${issues.length}` : ''}
        </Text>
      </View>

      <Pressable
        onPress={() => {
          const next = !isStressed;
          setIsStressed(next);
          setSelectedId(null);
          setPlacements(next ? STRESS_LAYOUT : STARTER_LAYOUT);
        }}
        style={[styles.rotate, styles.stress]}
      >
        <Text style={styles.rotateLabel}>{isStressed ? '가구 3개' : '가구 60개'}</Text>
      </Pressable>

      <Pressable onPress={() => setSnap(((snap + 1) % 4) as SnapAngle)} style={styles.rotate}>
        <Text style={styles.rotateLabel}>90° 회전</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#2B2622',
  },
  hud: {
    position: 'absolute',
    top: 56,
    left: 20,
    gap: 4,
  },
  stat: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  rotate: {
    position: 'absolute',
    right: 20,
    bottom: 40,
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: nd.colors.primary,
  },
  stress: {
    bottom: 100,
    backgroundColor: '#4B5563',
  },
  rotateLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});
