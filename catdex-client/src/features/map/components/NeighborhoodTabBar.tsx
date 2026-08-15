import { Compass, Globe, MessageCircle } from 'lucide-react-native';
import { SectionTabBar } from '@/shared/components/SectionTabBar';

export type NeighborhoodTab = 'map' | 'dex' | 'board';

interface NeighborhoodTabBarProps {
  active: NeighborhoodTab;
  onHome: () => void;
  onOpenMap: () => void;
  onOpenDex: () => void;
  onOpenBoard: () => void;
}

/**
 * 지부 흐름의 하단바. 모양은 SectionTabBar가 갖고, 여기서는 항목만 정한다.
 *
 * 고객 탭이 '고객 명단·고객 지도·고객 상담'으로 묶이듯 지부 탭도 '지부'로
 * 묶는다. 사원증의 '지부: 서울지부'와 같은 세계관이다. '동네'는 화면 안에서
 * 실제 행정 동네(부천시 중동 근처 같은 데이터)를 가리킬 때만 쓴다.
 */
export function NeighborhoodTabBar({
  active,
  onHome,
  onOpenMap,
  onOpenDex,
  onOpenBoard,
}: NeighborhoodTabBarProps) {
  return (
    <SectionTabBar
      active={active}
      items={[
        { id: 'map', label: '지부 지도', icon: Compass, onPress: onOpenMap },
        { id: 'dex', label: '지부 도감', icon: Globe, onPress: onOpenDex },
        { id: 'board', label: '커뮤니티', icon: MessageCircle, onPress: onOpenBoard },
      ]}
      onHome={onHome}
    />
  );
}
