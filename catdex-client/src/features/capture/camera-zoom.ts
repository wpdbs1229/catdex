import { requireOptionalNativeModule } from 'expo-modules-core';

/**
 * expo-camera의 `zoom` prop은 기기 최대 배율에 대한 0~1 비율이라, JS만으로는
 * 현재 몇 배인지 알 수 없다. 배율 라벨을 추측으로 붙이지 않기 위해 네이티브에서
 * 기기 능력을 받아 와 여기서 환산한다.
 *
 * - iOS: videoZoomFactor = pow(maxFactor, zoom) → 지수 매핑
 * - Android: zoomRatio = zoom * maxFactor (1배 미만은 불가) → 선형 매핑
 */
export type ZoomMapping = 'exponential' | 'linear';

export interface ZoomCapabilities {
  available: boolean;
  minFactor: number;
  maxFactor: number;
  mapping: ZoomMapping;
}

export interface ZoomStop {
  factor: number;
  label: string;
  normalized: number;
}

export const DEFAULT_ZOOM_CAPABILITIES: ZoomCapabilities = {
  available: false,
  minFactor: 1,
  maxFactor: 1,
  mapping: 'linear',
};

/**
 * 칩으로 열어 주는 최대 배율. 이 위는 대부분 디지털 줌이라 화질이 무너지고,
 * 그 사진으로는 개체 매칭이 어려워진다. 더 당기고 싶으면 핀치로 가능하다.
 */
const MAX_OFFERED_FACTOR = 10;
const CANDIDATE_FACTORS = [1, 2, 3, 5, 10];

interface CameraZoomNativeModule {
  getZoomCapabilities: (facing: string) => Promise<ZoomCapabilities>;
}

const nativeCameraZoom = requireOptionalNativeModule<CameraZoomNativeModule>('CameraZoom');

export async function getZoomCapabilities(facing: 'back' | 'front'): Promise<ZoomCapabilities> {
  if (!nativeCameraZoom) {
    return DEFAULT_ZOOM_CAPABILITIES;
  }

  try {
    return await nativeCameraZoom.getZoomCapabilities(facing);
  } catch {
    return DEFAULT_ZOOM_CAPABILITIES;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** 표시 배율(2배 등)을 expo-camera에 넘길 0~1 값으로 바꾼다. */
export function normalizedForFactor(factor: number, capabilities: ZoomCapabilities): number {
  const { minFactor, maxFactor, mapping } = capabilities;

  if (maxFactor <= minFactor) {
    return 0;
  }

  const clamped = clamp(factor, minFactor, maxFactor);
  const normalized =
    mapping === 'exponential' ? Math.log(clamped) / Math.log(maxFactor) : clamped / maxFactor;

  return clamp(normalized, 0, 1);
}

/** expo-camera의 0~1 값이 실제 몇 배인지 되돌린다. 핀치 중 배율 표시에 쓴다. */
export function factorForNormalized(normalized: number, capabilities: ZoomCapabilities): number {
  const { minFactor, maxFactor, mapping } = capabilities;

  if (maxFactor <= minFactor) {
    return minFactor;
  }

  const factor =
    mapping === 'exponential'
      ? Math.pow(maxFactor, clamp(normalized, 0, 1))
      : clamp(normalized, 0, 1) * maxFactor;

  return clamp(factor, minFactor, maxFactor);
}

/** 기기가 실제로 지원하는 배율만 칩으로 만든다. 지원하지 않는 값은 노출하지 않는다. */
export function buildZoomStops(capabilities: ZoomCapabilities): ZoomStop[] {
  const ceiling = Math.min(capabilities.maxFactor, MAX_OFFERED_FACTOR);

  return CANDIDATE_FACTORS.filter((factor) => factor === 1 || factor <= ceiling).map((factor) => ({
    factor,
    label: String(factor),
    normalized: normalizedForFactor(factor, capabilities),
  }));
}

export function formatZoomFactor(factor: number): string {
  return Number.isInteger(factor) ? `x${factor}` : `x${factor.toFixed(1)}`;
}
