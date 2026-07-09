import type { CommunityFilter, CommunityTopic } from '@/shared/types/community';

export const communityFilterOptions: Array<{ id: CommunityFilter; label: string }> = [
  { id: 'ALL', label: '전체' },
  { id: 'SIGHTING', label: '목격담' },
  { id: 'STATUS', label: '근황' },
  { id: 'QUESTION', label: '질문' },
  { id: 'INFO', label: '정보' },
];

export const communityComposerTopicOptions: Array<{ id: CommunityTopic; label: string; helper: string }> = [
  { id: 'SIGHTING', label: '목격담', helper: '어디서 어떻게 봤는지 나눠요' },
  { id: 'STATUS', label: '근황', helper: '최근 상태나 변화가 있을 때' },
  { id: 'QUESTION', label: '질문', helper: '이웃에게 물어보고 싶을 때' },
  { id: 'INFO', label: '정보', helper: '도움 되는 안내나 정정' },
];

export const communityTopicLabel: Record<CommunityTopic, string> = {
  SIGHTING: '목격담',
  STATUS: '근황',
  QUESTION: '질문',
  INFO: '정보',
};
