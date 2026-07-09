export interface BadgeCatalogItem {
  id: string;
  name: string;
  description: string;
}

export const DEFAULT_BADGE_CATALOG: BadgeCatalogItem[] = [
  {
    id: 'first-cat',
    name: '첫 만남',
    description: '첫 고양이를 도감에 기록했어요.',
  },
  {
    id: 'first-sighting',
    name: '첫 목격담',
    description: '이웃 확인 요청으로 첫 목격담을 남겼어요.',
  },
  {
    id: 'reunion-friend',
    name: '다시 만난 친구',
    description: '같은 고양이를 다시 만나 기록했어요.',
  },
  {
    id: 'familiar-friend',
    name: '눈인사 친구',
    description: '같은 고양이를 3번 기록했어요.',
  },
  {
    id: 'regular-cat',
    name: '단골 냥이',
    description: '같은 고양이를 5번 기록했어요.',
  },
  {
    id: 'longtime-friend',
    name: '오래 아는 사이',
    description: '같은 고양이를 10번 기록했어요.',
  },
  {
    id: 'cheese-collector',
    name: '치즈냥 수집가',
    description: '치즈냥 친구 3마리를 도감에 남겼어요.',
  },
  {
    id: 'tuxedo-detective',
    name: '턱시도냥 탐정',
    description: '턱시도냥 친구 3마리를 도감에 남겼어요.',
  },
  {
    id: 'calico-friend',
    name: '삼색 친구',
    description: '삼색이 친구를 도감에 남겼어요.',
  },
  {
    id: 'old-town-wanderer',
    name: '골목 산책자',
    description: '서로 다른 동네 3곳에서 고양이를 기록했어요.',
  },
  {
    id: 'neighborhood-regular',
    name: '우리 동네 기록가',
    description: '한 동네에서 고양이 기록을 10번 남겼어요.',
  },
  {
    id: 'careful-observer',
    name: '조심스러운 관찰자',
    description: '정확한 위치 없이 동네 단위 기록을 10번 남겼어요.',
  },
  {
    id: 'safety-reporter',
    name: '안전 제보자',
    description: '위치 위험이나 정보 오류를 신고해 고양이 안전을 도왔어요.',
  },
  {
    id: 'neighbor-verifier',
    name: '이웃 확인단',
    description: '이웃의 확인 요청에 댓글로 3번 참여했어요.',
  },
  {
    id: 'collection-starter',
    name: '대표 고양이 설정',
    description: '내 사원증과 홈에 보여줄 대표 고양이를 설정했어요.',
  },
  {
    id: 'spring-alley-recorder',
    name: '봄 골목 기록자',
    description: '봄 골목에서 고양이 기록을 3번 남겼어요.',
  },
  {
    id: 'rainy-day-recorder',
    name: '비 온 뒤 발자국',
    description: '비 온 뒤의 고양이 흔적을 기록했어요.',
  },
  {
    id: 'night-walk-watcher',
    name: '달빛 관찰자',
    description: '저녁 시간대의 고양이 기록을 남겼어요.',
  },
  {
    id: 'month-later-reunion',
    name: '한 달 뒤 다시 만남',
    description: '30일 이상 지나 같은 고양이를 다시 기록했어요.',
  },
  {
    id: 'quiet-note-keeper',
    name: '조용한 친구',
    description: '고양이의 행동이나 상태 메모를 5번 남겼어요.',
  },
  {
    id: 'dex-10',
    name: '동네 도감 10',
    description: '고양이 10마리를 도감에 남겼어요.',
  },
  {
    id: 'dex-50',
    name: '동네 도감 50',
    description: '고양이 50마리를 도감에 남겼어요.',
  },
  {
    id: 'rare-finder',
    name: '희귀 발견자',
    description: '희귀도 4 이상의 고양이를 발견했어요.',
  },
  {
    id: 'hundred-dex',
    name: '도감 완성가',
    description: '100마리 도감을 완성하면 획득해요.',
  },
];
