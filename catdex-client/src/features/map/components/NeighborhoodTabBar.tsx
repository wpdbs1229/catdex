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

/** 동네 흐름의 하단바. 모양은 SectionTabBar가 갖고, 여기서는 항목만 정한다. */
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
        { id: 'map', label: '지도', icon: Compass, onPress: onOpenMap },
        { id: 'dex', label: '동네 도감', icon: Globe, onPress: onOpenDex },
        { id: 'board', label: '커뮤니티', icon: MessageCircle, onPress: onOpenBoard },
      ]}
      onHome={onHome}
    />
  );
}
