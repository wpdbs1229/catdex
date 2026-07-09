export interface NyangnyangdanRankRule {
  level: number;
  title: string;
  discoveries: number;
  rediscoveries: number;
  summary: string;
}

export interface NyangnyangdanRankState {
  current: NyangnyangdanRankRule;
  next: NyangnyangdanRankRule | null;
  progress: number;
  nextGoalLabel: string;
}

export const NYANGNYANGDAN_RANK_RULES: NyangnyangdanRankRule[] = [
  { level: 1, title: '냥냥단 인턴', discoveries: 0, rediscoveries: 0, summary: '사원증 발급 완료' },
  { level: 2, title: '냥냥단 주임', discoveries: 1, rediscoveries: 0, summary: '고양이 1마리 기록' },
  { level: 3, title: '냥냥단 대리', discoveries: 3, rediscoveries: 0, summary: '고양이 3마리 기록' },
  { level: 4, title: '냥냥단 과장', discoveries: 7, rediscoveries: 0, summary: '고양이 7마리 기록' },
  { level: 5, title: '냥냥단 차장', discoveries: 12, rediscoveries: 3, summary: '고양이 12마리 + 재발견 3회' },
  { level: 6, title: '냥냥단 부장', discoveries: 20, rediscoveries: 8, summary: '고양이 20마리 + 재발견 8회' },
  { level: 7, title: '냥냥단 지점장', discoveries: 35, rediscoveries: 15, summary: '고양이 35마리 + 재발견 15회' },
  { level: 8, title: '냥냥단 본부장', discoveries: 50, rediscoveries: 30, summary: '고양이 50마리 + 재발견 30회' },
];

function hasReached(rule: NyangnyangdanRankRule, discoveries: number, rediscoveries: number) {
  return discoveries >= rule.discoveries && rediscoveries >= rule.rediscoveries;
}

function missingGoal(next: NyangnyangdanRankRule, discoveries: number, rediscoveries: number) {
  const missingDiscoveries = Math.max(next.discoveries - discoveries, 0);
  const missingRediscoveries = Math.max(next.rediscoveries - rediscoveries, 0);
  const goals: string[] = [];

  if (missingDiscoveries > 0) {
    goals.push(`고양이 ${missingDiscoveries}마리 더 기록`);
  }

  if (missingRediscoveries > 0) {
    goals.push(`재발견 ${missingRediscoveries}회 더`);
  }

  return goals.length > 0 ? `${goals.join(' · ')}하면 ${next.title}으로 승진` : `${next.title} 승진 대기`;
}

function rankProgress(current: NyangnyangdanRankRule, next: NyangnyangdanRankRule | null, discoveries: number, rediscoveries: number) {
  if (!next) {
    return 100;
  }

  const discoveryRange = Math.max(next.discoveries - current.discoveries, 1);
  const rediscoveryRange = Math.max(next.rediscoveries - current.rediscoveries, 0);
  const discoveryProgress = Math.min(Math.max((discoveries - current.discoveries) / discoveryRange, 0), 1);

  if (rediscoveryRange === 0) {
    return Math.round(discoveryProgress * 100);
  }

  const rediscoveryProgress = Math.min(Math.max((rediscoveries - current.rediscoveries) / rediscoveryRange, 0), 1);
  return Math.round(((discoveryProgress + rediscoveryProgress) / 2) * 100);
}

export function getNyangnyangdanRankState(discoveries: number, rediscoveries: number): NyangnyangdanRankState {
  const current =
    [...NYANGNYANGDAN_RANK_RULES].reverse().find((rule) => hasReached(rule, discoveries, rediscoveries)) ??
    NYANGNYANGDAN_RANK_RULES[0];
  const next = NYANGNYANGDAN_RANK_RULES.find((rule) => rule.level > current.level) ?? null;

  return {
    current,
    next,
    progress: rankProgress(current, next, discoveries, rediscoveries),
    nextGoalLabel: next ? missingGoal(next, discoveries, rediscoveries) : '최고 직급이에요. 동네 기록을 계속 이어가 주세요.',
  };
}
