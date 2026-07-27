import type { CatVisionSamples } from '../../../shared/native/catVision';
import { decodeBase64 } from './base64';
import type { CoatAnalysis, CoatColorId, CoatPatternId, CoatPatternMetrics } from './coat.types';

/**
 * 누끼 마스크 안의 픽셀만 보고 털색과 무늬를 추정한다.
 *
 * 판정을 네이티브가 아니라 여기서 하는 이유는 두 가지다.
 * 1. iOS와 Android가 같은 코드를 쓰므로 플랫폼 간 판정이 어긋날 수 없다.
 * 2. 아래 임계값들은 실사진으로 조정해야 하는 값인데, JS면 핫 리로드로 돌려볼 수 있다.
 *
 * 결과는 확정이 아니라 **사전 선택 제안**이다. 확신이 부족하면 비워서 돌려주고
 * 사용자가 직접 고르게 한다. 틀린 값을 우기는 것보다 낫다.
 */

/** 유의미한 색으로 볼 최소 비율 */
const SIGNIFICANT_COLOR_RATIO = 0.12;
const MAX_SUGGESTED_COLORS = 3;

/**
 * 실측 기준값 (앞으로 조정할 때 이 표를 늘려 간다)
 *
 * | 사진 | edge | 2nd | trans | blob | 정답 |
 * |---|---|---|---|---|---|
 * | 흰 몸 + 크림 머리, 흐린 야외 | 0.043 | 0.12 | 0.039 | 0.29 | 투톤 |
 *
 * 확신도는 임계값에서 0, 임계값의 2배에서 1이 되도록 잡았다. 최소 확신도 0.45를
 * 넘으려면 임계값의 1.45배는 되어야 한다. **애매하면 추측하지 않는다**는 뜻이다.
 */

/** 이 위면 줄무늬로 본다. 밝기 0~1 기준 고주파 에너지. */
const TABBY_EDGE_ENERGY = 0.06;
/** 두 번째 색이 이 비율 미만이면 단색으로 본다. */
const SOLID_SECONDARY_RATIO = 0.1;
/**
 * 투톤과 토티를 가르는 값. 이웃한 픽셀의 색 계열이 바뀌는 빈도다.
 * 투톤은 경계가 몇 군데뿐이라 낮고, 토티는 사방이 경계라 높다.
 */
const TORTIE_TRANSITION_DENSITY = 0.08;
/** 이 아래면 판정을 포기하고 사용자에게 맡긴다. */
const MIN_PATTERN_CONFIDENCE = 0.45;
/** 잡티로 볼 연결 요소의 최대 크기(피사체 대비 비율) */
const NOISE_BLOB_RATIO = 0.004;

/** 조명 추정에 쓸 배경 픽셀의 최대 채도. 잔디·벽처럼 색이 강한 배경은 제외한다. */
const NEUTRAL_BACKGROUND_SATURATION = 0.25;
/** 중성 배경 표본이 이보다 적으면 보정하지 않는다. */
const MIN_NEUTRAL_BACKGROUND_SAMPLES = 200;
/** 과보정을 막는 이득 범위 */
const MIN_ILLUMINANT_GAIN = 0.75;
const MAX_ILLUMINANT_GAIN = 1.35;

const EMPTY_ANALYSIS: CoatAnalysis = {
  colors: [],
  colorRatios: {},
  pattern: null,
  patternConfidence: 0,
  illuminantCorrected: false,
};

interface IlluminantGain {
  red: number;
  green: number;
  blue: number;
}

export function analyzeCoat(
  subjectSamples: CatVisionSamples | null,
  sceneSamples: CatVisionSamples | null,
): CoatAnalysis {
  if (!subjectSamples) {
    return EMPTY_ANALYSIS;
  }

  const subject = decodeBase64(subjectSamples.base64);
  const size = subjectSamples.size;

  if (subject.length < size * size * 4) {
    return EMPTY_ANALYSIS;
  }

  const gain = sceneSamples ? estimateIlluminantGain(sceneSamples) : null;

  // -1은 배경, 그 외는 COLOR_ORDER의 인덱스
  const labels = new Int8Array(size * size).fill(-1);
  const luminance = new Float32Array(size * size);
  const counts = new Map<CoatColorId, number>();
  let classified = 0;

  for (let index = 0; index < size * size; index += 1) {
    const offset = index * 4;

    if (subject[offset + 3] < 128) {
      continue;
    }

    const red = applyGain(subject[offset] / 255, gain?.red);
    const green = applyGain(subject[offset + 1] / 255, gain?.green);
    const blue = applyGain(subject[offset + 2] / 255, gain?.blue);

    luminance[index] = 0.299 * red + 0.587 * green + 0.114 * blue;

    const color = classifyColor(red, green, blue);
    if (!color) {
      // 냉색 계열(배경 잔여물 등)은 분모에서 제외하되 무늬 분석에는 남긴다.
      labels[index] = -2;
      continue;
    }

    labels[index] = COLOR_ORDER.indexOf(color);
    counts.set(color, (counts.get(color) ?? 0) + 1);
    classified += 1;
  }

  if (classified < 64) {
    return { ...EMPTY_ANALYSIS, illuminantCorrected: Boolean(gain) };
  }

  const colorRatios: Partial<Record<CoatColorId, number>> = {};
  for (const [color, count] of counts) {
    colorRatios[color] = count / classified;
  }

  const sorted = [...counts.entries()].sort((left, right) => right[1] - left[1]);
  const suggested = sorted
    .filter(([, count], rank) => rank === 0 || count / classified >= SIGNIFICANT_COLOR_RATIO)
    .slice(0, MAX_SUGGESTED_COLORS)
    .map(([color]) => color);

  const dominantLabel = COLOR_ORDER.indexOf(sorted[0][0]);
  const { pattern, confidence, metrics } = detectPattern(labels, luminance, size, dominantLabel, classified);

  return {
    colors: suggested,
    colorRatios,
    pattern: confidence >= MIN_PATTERN_CONFIDENCE ? pattern : null,
    patternConfidence: confidence,
    illuminantCorrected: Boolean(gain),
    metrics,
  };
}

const COLOR_ORDER: CoatColorId[] = [
  'black',
  'gray',
  'brown',
  'chocolate',
  'cinnamon',
  'orange',
  'cream',
  'lilac',
  'white',
];

function applyGain(value: number, gain: number | undefined) {
  return gain ? Math.min(1, value * gain) : value;
}

/**
 * 색 계열 분류. 초콜릿·시나몬·라일락은 야외 조명에서 갈색·회색과 구분이 어려워
 * 조건을 좁게 잡았다. 잘 안 잡히는 편이 틀리게 잡히는 것보다 낫다.
 */
function classifyColor(red: number, green: number, blue: number): CoatColorId | null {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const saturation = max <= 0 ? 0 : delta / max;
  const hue = computeHue(red, green, blue, max, delta);

  if (max < 0.22) {
    return 'black';
  }

  if (saturation < 0.12 && max > 0.82) {
    return 'white';
  }

  // 라일락은 회색으로 흡수되기 전에 먼저 본다. 회색에 옅은 분홍기가 도는 색이다.
  if (saturation >= 0.08 && saturation < 0.22 && max >= 0.45 && max <= 0.85 && (hue >= 280 || hue <= 15)) {
    return 'lilac';
  }

  if (saturation < 0.18) {
    return 'gray';
  }

  const isWarm = hue >= 8 && hue <= 60;
  if (!isWarm) {
    return null;
  }

  if (saturation >= 0.45 && max >= 0.5) {
    return 'orange';
  }

  if (max < 0.42 && saturation >= 0.3) {
    return 'chocolate';
  }

  if (saturation < 0.4 && max >= 0.7) {
    return 'cream';
  }

  if (saturation >= 0.35 && max >= 0.42 && max <= 0.68 && hue <= 28) {
    return 'cinnamon';
  }

  return 'brown';
}

function computeHue(red: number, green: number, blue: number, max: number, delta: number) {
  if (delta <= 0) {
    return 0;
  }

  let hue: number;
  if (max === red) {
    hue = ((green - blue) / delta) % 6;
  } else if (max === green) {
    hue = (blue - red) / delta + 2;
  } else {
    hue = (red - green) / delta + 4;
  }

  hue *= 60;
  return hue < 0 ? hue + 360 : hue;
}

/**
 * 배경의 중성색 픽셀로 조명 색온도를 추정한다(gray-world).
 * 누끼 마스크가 생기면서 "고양이가 아닌 픽셀"을 고를 수 있게 되어 가능해진 보정이다.
 */
function estimateIlluminantGain(sceneSamples: CatVisionSamples): IlluminantGain | null {
  const scene = decodeBase64(sceneSamples.base64);
  const size = sceneSamples.size;

  if (scene.length < size * size * 4) {
    return null;
  }

  let sumRed = 0;
  let sumGreen = 0;
  let sumBlue = 0;
  let samples = 0;

  for (let index = 0; index < size * size; index += 1) {
    const offset = index * 4;

    // 알파가 있는 픽셀은 피사체다. 배경만 본다.
    if (scene[offset + 3] >= 128) {
      continue;
    }

    const red = scene[offset] / 255;
    const green = scene[offset + 1] / 255;
    const blue = scene[offset + 2] / 255;
    const max = Math.max(red, green, blue);
    const saturation = max <= 0 ? 0 : (max - Math.min(red, green, blue)) / max;

    // 잔디나 붉은 벽돌처럼 색이 강한 배경으로 보정하면 오히려 색이 틀어진다.
    if (saturation > NEUTRAL_BACKGROUND_SATURATION || max < 0.1 || max > 0.95) {
      continue;
    }

    sumRed += red;
    sumGreen += green;
    sumBlue += blue;
    samples += 1;
  }

  if (samples < MIN_NEUTRAL_BACKGROUND_SAMPLES) {
    return null;
  }

  const meanRed = sumRed / samples;
  const meanGreen = sumGreen / samples;
  const meanBlue = sumBlue / samples;
  const meanGray = (meanRed + meanGreen + meanBlue) / 3;

  if (meanGray <= 0) {
    return null;
  }

  return {
    red: clampGain(meanGray / meanRed),
    green: clampGain(meanGray / meanGreen),
    blue: clampGain(meanGray / meanBlue),
  };
}

function clampGain(gain: number) {
  if (!Number.isFinite(gain)) {
    return 1;
  }

  return Math.min(MAX_ILLUMINANT_GAIN, Math.max(MIN_ILLUMINANT_GAIN, gain));
}

/**
 * 무늬는 절대 색이 아니라 공간 구조로 판정한다. 조명에 훨씬 덜 흔들린다.
 *
 * 분류 결과를 그대로 쓰면 음영 때문에 흰 털 일부가 회색으로, 갈색 일부가 시나몬으로
 * 튀어서 "잘게 섞인 것"처럼 보인다. 그래서 먼저 인접한 색끼리 묶고(coarse family)
 * 3×3 최빈값으로 잡티를 지운 뒤에 본다. 이 단계가 없으면 투톤이 토티로 잡힌다.
 */
function detectPattern(
  labels: Int8Array,
  luminance: Float32Array,
  size: number,
  dominantLabel: number,
  classified: number,
): { pattern: CoatPatternId; confidence: number; metrics: CoatPatternMetrics } {
  const edgeEnergy = measureHighFrequencyEnergy(labels, luminance, size);
  const families = denoise(toFamilies(labels), size);
  const dominantFamily = COLOR_FAMILY[dominantLabel] ?? -1;

  let secondaryCount = 0;
  const secondary = new Uint8Array(size * size);

  for (let index = 0; index < families.length; index += 1) {
    if (families[index] >= 0 && families[index] !== dominantFamily) {
      secondary[index] = 1;
      secondaryCount += 1;
    }
  }

  const secondaryRatio = secondaryCount / classified;
  const transitionDensity = measureTransitionDensity(families, size);
  const largestBlobShare =
    secondaryCount > 0 ? measureLargestBlobShare(secondary, size, classified) / secondaryCount : 0;
  const metrics = { edgeEnergy, secondaryRatio, transitionDensity, largestBlobShare };

  if (edgeEnergy >= TABBY_EDGE_ENERGY) {
    return {
      pattern: 'tabby',
      confidence: clamp01((edgeEnergy - TABBY_EDGE_ENERGY) / TABBY_EDGE_ENERGY),
      metrics,
    };
  }

  if (secondaryRatio < SOLID_SECONDARY_RATIO) {
    return {
      pattern: 'solid',
      confidence: Math.min(
        clamp01(1 - secondaryRatio / SOLID_SECONDARY_RATIO),
        clamp01(1 - edgeEnergy / TABBY_EDGE_ENERGY),
      ),
      metrics,
    };
  }

  // 경계가 사방에 있으면 토티, 몇 군데뿐이면 투톤이다.
  if (transitionDensity >= TORTIE_TRANSITION_DENSITY) {
    return {
      pattern: 'tortie',
      confidence: clamp01((transitionDensity - TORTIE_TRANSITION_DENSITY) / TORTIE_TRANSITION_DENSITY),
      metrics,
    };
  }

  return {
    pattern: 'bicolor',
    // 경계가 적을수록 확신이 높다. 덩어리 크기는 음영 때문에 쉽게 쪼개져서 보지 않는다.
    confidence: clamp01((TORTIE_TRANSITION_DENSITY - transitionDensity) / TORTIE_TRANSITION_DENSITY),
    metrics,
  };
}

/**
 * 사람이 보기에 같은 털색인데 분류만 갈리는 조합을 묶는다.
 * 무늬 판정에서만 쓰고 색 제안에는 쓰지 않는다.
 */
const COLOR_FAMILY: number[] = [
  0, // black     -> dark
  1, // gray      -> gray
  2, // brown     -> brown
  2, // chocolate -> brown
  2, // cinnamon  -> brown
  3, // orange    -> orange
  4, // cream     -> cream
  1, // lilac     -> gray
  5, // white     -> white
];

/** COLOR_FAMILY가 만드는 계열 개수 */
const FAMILY_COUNT = 6;

function toFamilies(labels: Int8Array) {
  const families = new Int8Array(labels.length);

  for (let index = 0; index < labels.length; index += 1) {
    families[index] = labels[index] >= 0 ? COLOR_FAMILY[labels[index]] : -1;
  }

  return families;
}

/** 3×3 최빈값 필터. 음영 때문에 튄 점들을 주변 색으로 흡수한다. */
function denoise(families: Int8Array, size: number) {
  const output = new Int8Array(families);
  const tally = new Int32Array(FAMILY_COUNT);

  for (let y = 1; y < size - 1; y += 1) {
    for (let x = 1; x < size - 1; x += 1) {
      const index = y * size + x;
      if (families[index] < 0) {
        continue;
      }

      tally.fill(0);
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const family = families[index + dy * size + dx];
          if (family >= 0) {
            tally[family] += 1;
          }
        }
      }

      let best = families[index];
      let bestCount = 0;
      for (let family = 0; family < tally.length; family += 1) {
        if (tally[family] > bestCount) {
          bestCount = tally[family];
          best = family;
        }
      }

      output[index] = best;
    }
  }

  return output;
}

/** 이웃한 피사체 픽셀의 색 계열이 바뀌는 비율 */
function measureTransitionDensity(families: Int8Array, size: number) {
  let transitions = 0;
  let pairs = 0;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = y * size + x;
      if (families[index] < 0) {
        continue;
      }

      if (x + 1 < size && families[index + 1] >= 0) {
        pairs += 1;
        if (families[index + 1] !== families[index]) {
          transitions += 1;
        }
      }

      if (y + 1 < size && families[index + size] >= 0) {
        pairs += 1;
        if (families[index + size] !== families[index]) {
          transitions += 1;
        }
      }
    }
  }

  return pairs > 0 ? transitions / pairs : 0;
}

/** 2픽셀 간격 명암차의 평균. 부드러운 음영은 작게, 줄무늬는 크게 나온다. */
function measureHighFrequencyEnergy(labels: Int8Array, luminance: Float32Array, size: number) {
  const step = 2;
  let total = 0;
  let pairs = 0;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = y * size + x;
      if (labels[index] === -1) {
        continue;
      }

      if (x + step < size) {
        const right = index + step;
        if (labels[right] !== -1) {
          total += Math.abs(luminance[index] - luminance[right]);
          pairs += 1;
        }
      }

      if (y + step < size) {
        const below = index + step * size;
        if (labels[below] !== -1) {
          total += Math.abs(luminance[index] - luminance[below]);
          pairs += 1;
        }
      }
    }
  }

  return pairs > 0 ? total / pairs : 0;
}

/** 4방향 연결 요소 중 가장 큰 덩어리. 잡티 크기 이하는 세지 않는다. */
function measureLargestBlobShare(mask: Uint8Array, size: number, classified: number) {
  const minBlobSize = Math.max(2, Math.round(classified * NOISE_BLOB_RATIO));
  const visited = new Uint8Array(mask.length);
  const stack: number[] = [];
  let largest = 0;

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) {
      continue;
    }

    visited[start] = 1;
    stack.push(start);
    let blobSize = 0;

    while (stack.length > 0) {
      const index = stack.pop() as number;
      blobSize += 1;

      const x = index % size;
      const y = (index - x) / size;

      if (x > 0) pushIfUnvisited(index - 1);
      if (x < size - 1) pushIfUnvisited(index + 1);
      if (y > 0) pushIfUnvisited(index - size);
      if (y < size - 1) pushIfUnvisited(index + size);
    }

    if (blobSize >= minBlobSize) {
      largest = Math.max(largest, blobSize);
    }
  }

  return largest;

  function pushIfUnvisited(neighbour: number) {
    if (mask[neighbour] && !visited[neighbour]) {
      visited[neighbour] = 1;
      stack.push(neighbour);
    }
  }
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}
