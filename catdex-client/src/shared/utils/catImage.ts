import type { ImageSourcePropType } from 'react-native';

/**
 * 고양이 대표 사진. 없으면 undefined다.
 *
 * 예전에는 털색 계열 일러스트로 대신했지만 그 자산을 걷어냈다. 사진이 없을 때
 * 무엇을 보여줄지는 화면이 정한다(대부분 발바닥 자리표시자).
 */
export function catPhotoSource(imageUrl?: string): ImageSourcePropType | undefined {
  return imageUrl ? { uri: imageUrl } : undefined;
}
