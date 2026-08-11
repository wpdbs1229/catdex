import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** 시안 '기본 하단바'의 알약 높이. MainTabBar와 같은 값을 쓴다. */
export const TAB_BAR_HEIGHT = 60;
/** 알약 위에 두는 여백 (MainTabBar wrap의 paddingTop) */
export const TAB_BAR_TOP_GAP = 16;

/**
 * 떠 있는 하단바에 콘텐츠가 가리지 않도록 스크롤 화면이 확보해야 하는 하단 여백.
 *
 * 시스템 탭바는 하위 화면에 인셋을 자동으로 전달하지만 플로팅 바는 그냥 위에 떠
 * 있을 뿐이라, 화면마다 직접 띄워야 한다. 그 값을 여기 한곳에서 계산한다.
 */
export function useTabBarInset() {
  const insets = useSafeAreaInsets();
  const bottomGap = Math.max(insets.bottom - TAB_BAR_TOP_GAP, 8);

  return TAB_BAR_TOP_GAP + TAB_BAR_HEIGHT + bottomGap;
}
