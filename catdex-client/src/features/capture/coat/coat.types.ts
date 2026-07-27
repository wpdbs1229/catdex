export type CoatColorId =
  | 'black'
  | 'gray'
  | 'brown'
  | 'chocolate'
  | 'cinnamon'
  | 'orange'
  | 'cream'
  | 'lilac'
  | 'white';

export type CoatPatternId = 'solid' | 'bicolor' | 'tabby' | 'tortie';

export interface CoatColorOption {
  id: CoatColorId;
  label: string;
  /** 국제 털색 표기. 같은 색을 부르는 이름이 나라마다 달라 함께 보여 준다. */
  globalLabel: string;
  swatch: string;
}

export interface CoatPatternOption {
  id: CoatPatternId;
  label: string;
  description: string;
}

/** 화면 노출 순서를 그대로 따른다. */
export const COAT_COLORS: CoatColorOption[] = [
  { id: 'black', label: '검정', globalLabel: 'Black', swatch: '#1E1B19' },
  { id: 'gray', label: '회색', globalLabel: 'Gray · Blue', swatch: '#7E8B95' },
  { id: 'brown', label: '갈색', globalLabel: 'Brown', swatch: '#6B4A2F' },
  { id: 'chocolate', label: '초콜릿', globalLabel: 'Chocolate', swatch: '#4E3327' },
  { id: 'cinnamon', label: '시나몬', globalLabel: 'Cinnamon', swatch: '#A9603C' },
  { id: 'orange', label: '주황', globalLabel: 'Orange · Red', swatch: '#E08A3C' },
  { id: 'cream', label: '크림', globalLabel: 'Cream', swatch: '#EDD9BC' },
  { id: 'lilac', label: '라일락', globalLabel: 'Lilac', swatch: '#B7A9B4' },
  { id: 'white', label: '흰색', globalLabel: 'White', swatch: '#FFFFFF' },
];

export const COAT_PATTERNS: CoatPatternOption[] = [
  { id: 'solid', label: '원톤', description: '한 가지 색' },
  { id: 'bicolor', label: '투톤', description: '두 색이 크게 나뉨' },
  { id: 'tabby', label: '태비', description: '줄무늬' },
  { id: 'tortie', label: '토티', description: '두 색이 잘게 섞임' },
];

export interface CoatAnalysis {
  /** 사전 선택으로 제안할 색. 확신이 없으면 비어 있다. */
  colors: CoatColorId[];
  colorRatios: Partial<Record<CoatColorId, number>>;
  /** 확신이 부족하면 null. 사용자가 직접 고르게 둔다. */
  pattern: CoatPatternId | null;
  patternConfidence: number;
  /** 배경으로 조명 색온도를 보정했는지 여부 */
  illuminantCorrected: boolean;
  /** 무늬 판정에 쓴 측정값. 임계값을 실사진으로 조정할 때 본다. */
  metrics?: CoatPatternMetrics;
}

export interface CoatPatternMetrics {
  edgeEnergy: number;
  secondaryRatio: number;
  transitionDensity: number;
  largestBlobShare: number;
}
