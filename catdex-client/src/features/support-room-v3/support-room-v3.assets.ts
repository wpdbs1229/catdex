/**
 * V3 벽 부착물(문·창·조명) 에셋 맵.
 * 원본은 셸 배경에서 크롭·투명화한 정면 그림이며 scripts/extract-iso-fixtures.py가 만든다.
 * 앱에서 skewY로 기울여 아이소 벽면에 붙인다.
 */

type ImageSource = ReturnType<typeof require>;

export type FixtureId =
  | 'door_exterior'
  | 'door_interior'
  | 'window_arch_left'
  | 'window_arch_right'
  | 'wall_lamp'
  | 'pendant_lamp';

export const V3_FIXTURE_IMAGES: Record<FixtureId, ImageSource> = {
  door_exterior: require('../../../assets/support-room-v3/fixtures/door_exterior.webp'),
  door_interior: require('../../../assets/support-room-v3/fixtures/door_interior.webp'),
  window_arch_left: require('../../../assets/support-room-v3/fixtures/window_arch_left.webp'),
  window_arch_right: require('../../../assets/support-room-v3/fixtures/window_arch_right.webp'),
  wall_lamp: require('../../../assets/support-room-v3/fixtures/wall_lamp.webp'),
  pendant_lamp: require('../../../assets/support-room-v3/fixtures/pendant_lamp.webp'),
};
