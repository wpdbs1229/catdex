import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** 시안 '기본 하단바'의 알약 높이. MainTabBar와 같은 값을 쓴다. */
export const TAB_BAR_HEIGHT = 60;
/** 알약 위에 두는 여백 (MainTabBar wrap의 paddingTop) */
export const TAB_BAR_TOP_GAP = 16;

/**
 * 떠 있는 하단바를 화면 아래에서 얼마나 띄울지.
 *
 * 홈(MainTabBar)과 섹션 전용 바(동네·고객)가 반드시 같은 값을 써야 한다. 예전에는
 * 섹션 쪽이 insets.bottom을 그대로 써서 홈보다 16pt 높이 떠 있었고, 탭을 오갈 때
 * 바가 위아래로 튀었다.
 *
 * 바를 감싸는 쪽이 이미 위쪽에 TAB_BAR_TOP_GAP을 두므로 그만큼 뺀다. 홈 인디케이터가
 * 없는 기기에서도 바닥에 붙지 않도록 최소 8pt는 남긴다.
 */
export function useTabBarBottomGap() {
  const insets = useSafeAreaInsets();

  return Math.max(insets.bottom - TAB_BAR_TOP_GAP, 8);
}

/**
 * 떠 있는 하단바에 콘텐츠가 가리지 않도록 스크롤 화면이 확보해야 하는 하단 여백.
 *
 * 시스템 탭바는 하위 화면에 인셋을 자동으로 전달하지만 플로팅 바는 그냥 위에 떠
 * 있을 뿐이라, 화면마다 직접 띄워야 한다. 그 값을 여기 한곳에서 계산한다.
 */
export function useTabBarInset() {
  return TAB_BAR_TOP_GAP + TAB_BAR_HEIGHT + useTabBarBottomGap();
}
