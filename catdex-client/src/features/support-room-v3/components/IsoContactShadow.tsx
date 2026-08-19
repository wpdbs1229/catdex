import { View } from 'react-native';
import type { GroundedSpriteLayout } from '../render/sprite-layout';

/**
 * 바닥에 놓인 모든 물체(가구·고양이)가 공유하는 접지 그림자.
 * IsoFurniture와 idle 고양이가 각자 인라인으로 그리던 걸 하나로 합쳤다 -
 * 폭·높이 비율·색을 여기 한 곳에서만 정한다.
 */
export function IsoContactShadow({ layout }: { layout: GroundedSpriteLayout }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: layout.shadowLeft,
        top: layout.shadowTop,
        width: layout.shadowWidth,
        height: layout.shadowHeight,
        borderRadius: layout.shadowHeight / 2,
        backgroundColor: 'rgba(73, 44, 20, 0.14)',
        zIndex: layout.zIndex - 1,
      }}
    />
  );
}
