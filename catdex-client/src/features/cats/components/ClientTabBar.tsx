import { Globe, MapPin, MessageCircle } from 'lucide-react-native';
import { SectionTabBar } from '@/shared/components/SectionTabBar';

export type ClientTab = 'roster' | 'map' | 'consult';

interface ClientTabBarProps {
  active: ClientTab;
  onHome: () => void;
  onOpenRoster: () => void;
  onOpenMap: () => void;
  onOpenConsult: () => void;
}

/** 고객(도감) 흐름의 하단바. 동네와 같은 모양을 쓰고 항목만 다르다. */
export function ClientTabBar({
  active,
  onHome,
  onOpenRoster,
  onOpenMap,
  onOpenConsult,
}: ClientTabBarProps) {
  return (
    <SectionTabBar
      active={active}
      items={[
        { id: 'roster', label: '고객 명부', icon: Globe, onPress: onOpenRoster },
        { id: 'map', label: '고객 지도', icon: MapPin, onPress: onOpenMap },
        { id: 'consult', label: '고객 상담', icon: MessageCircle, onPress: onOpenConsult },
      ]}
      onHome={onHome}
    />
  );
}
