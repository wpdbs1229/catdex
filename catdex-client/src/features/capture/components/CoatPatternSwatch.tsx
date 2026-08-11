import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from 'react-native-svg';

import type { CoatPatternId } from '@/shared/coat/coat.types';

interface CoatPatternSwatchProps {
  pattern: CoatPatternId;
  size: number;
}

/**
 * 무늬 견본은 사진 대신 SVG로 그린다. 에셋을 늘리지 않아도 되고 크기를 바꿔도
 * 깨지지 않는다. 색 견본과 같은 원형이라 두 줄이 같은 리듬으로 읽힌다.
 */
export function CoatPatternSwatch({ pattern, size }: CoatPatternSwatchProps) {
  const clipId = `coat-pattern-${pattern}`;

  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Defs>
        <ClipPath id={clipId}>
          <Circle cx={20} cy={20} r={20} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>{renderPattern(pattern)}</G>
    </Svg>
  );
}

function renderPattern(pattern: CoatPatternId) {
  switch (pattern) {
    case 'solid':
      return <Rect width={40} height={40} fill="#F1EBE0" />;

    // 두 색이 크게 나뉜 모습. 흰 바탕에 큰 덩어리 하나.
    case 'bicolor':
      return (
        <>
          <Rect width={40} height={40} fill="#EDE2CD" />
          <Circle cx={21} cy={20} r={11} fill="#33251E" />
        </>
      );

    // 줄무늬. 살짝 휘어야 태비처럼 보인다.
    case 'tabby':
      return (
        <>
          <Rect width={40} height={40} fill="#AEB9BF" />
          {[1, 8, 15, 22, 29, 36].map((x) => (
            <Path
              key={x}
              d={`M${x} -2 Q ${x + 4} 20 ${x} 42`}
              stroke="#4F5C63"
              strokeWidth={3}
              fill="none"
            />
          ))}
        </>
      );

    // 두 색이 잘게 섞인 모습. 경계가 불규칙해야 투톤과 구분된다.
    case 'tortie':
      return (
        <>
          <Rect width={40} height={40} fill="#C08A56" />
          <Path d="M-2 -2 L18 -2 L13 13 L23 21 L11 34 L-2 29 Z" fill="#2B211C" />
          <Path d="M27 -2 L42 -2 L42 13 L31 10 Z" fill="#2B211C" />
          <Path d="M23 31 L36 26 L42 42 L25 42 Z" fill="#2B211C" />
        </>
      );

    default:
      return null;
  }
}
