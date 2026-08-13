import type { BehaviorId, PropId } from '@/features/support-room/support-room.assets';

export interface ConsultationCopy {
  purpose: string;
  detail: string;
  opinion: string;
}

/**
 * 상담기록 문구.
 *
 * 사용자를 공사 직원, 고양이를 고객으로 두는 은유를 따른다. 고양이가 귀엽다는
 * 말 대신 업무 보고서처럼 건조하게 쓰는 편이 더 웃긴다.
 *
 * 행동마다 한 벌이다. 같은 행동이 반복돼도 기록은 처음 한 번만 남으므로
 * 문구를 여러 개 돌려쓸 필요가 없다.
 */
export const CONSULTATION_COPY: Record<BehaviorId, ConsultationCopy> = {
  idle: {
    purpose: '용무 없음',
    detail: '창구 앞에 앉아 한참을 머무름',
    opinion: '특별한 요청 없이 자리만 지키다 감',
  },
  use_cushion: {
    purpose: '대기 환경 점검',
    detail: '방문자 방석에 자리를 잡고 눈을 감음',
    opinion: '대기 환경에 만족한 것으로 추정',
  },
  press_bell: {
    purpose: '직원 호출',
    detail: '호출벨을 앞발로 여러 차례 누름',
    opinion: '응대가 늦었다는 항의로 해석됨',
  },
  sit_swivel_chair: {
    purpose: '근무 환경 시찰',
    detail: '담당자 회전의자를 선점하고 비켜 주지 않음',
    opinion: '자리 반환 요청은 받아들여지지 않음',
  },
  stamp_paw: {
    purpose: '서류 결재',
    detail: '발도장 패드에 앞발을 대고 승인 표시를 남김',
    opinion: '결재 권한에 대한 확인이 필요함',
  },
  hide_paper_basket: {
    purpose: '보관함 점검',
    detail: '종이 바구니 안으로 완전히 들어가 나오지 않음',
    opinion: '해당 규격이 몸에 잘 맞는 것으로 보고됨',
  },
  peek_document_box: {
    purpose: '문서 보안 점검',
    detail: '중요 서류 상자 안에서 한참 머무름',
    opinion: '보관 환경에 매우 만족한 것으로 추정',
  },
};

export const PROP_LABEL: Record<PropId, string> = {
  prop_visitor_cushion: '방문자 방석',
  prop_service_bell: '호출벨',
  prop_swivel_chair: '회전의자',
  prop_paw_stamp_pad: '발도장 패드',
  prop_paper_basket: '종이 바구니',
  prop_document_box: '문서 상자',
};

/** "8월 13일 오후 6시" */
export function formatVisitedAt(timestamp: number): string {
  const date = new Date(timestamp);
  const hour = date.getHours();
  const meridiem = hour < 12 ? '오전' : '오후';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;

  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${meridiem} ${displayHour}시`;
}
