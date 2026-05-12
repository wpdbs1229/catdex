import type { Badge, ExplorerProfile } from '@/shared/types/badge';

export const explorerProfile: ExplorerProfile = {
  title: '골목 탐험가',
  level: 7,
  totalDiscoveries: 17,
  rediscoveries: 11,
  nextLevelProgress: 68,
  nextLevelLabel: '다음 레벨까지 8회 발견 남음',
};

export const badgesMock: Badge[] = [
  { id: 'first-cat', name: '첫 고양이 발견', description: '첫 등록을 완료했어요.', achieved: true, achievedAt: '2026.03.12' },
  { id: 'cheese-five', name: '치즈냥 5마리 발견', description: '노란 털 포착 전문가', achieved: true, achievedAt: '2026.04.20' },
  { id: 'rediscovery-five', name: '같은 고양이 5번 재발견', description: '기억력 좋은 산책러', achieved: true, achievedAt: '2026.04.30' },
  { id: 'night-walk', name: '밤 산책 중 발견', description: '심야 관찰자', achieved: true, achievedAt: '2026.04.21' }
];
