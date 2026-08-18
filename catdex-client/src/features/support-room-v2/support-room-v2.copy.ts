import {
  CONSULTATION_COPY,
  type ConsultationCopy,
} from '@/features/support-room/consultation-copy';
import type { BehaviorId } from './domain/furniture';

/**
 * V2 행동 8종의 상담기록 문구. 기존 6종은 V1 문구를 재사용하고
 * 신규 2종만 같은 공사 보고서 말투로 더한다.
 */
export const V2_CONSULTATION_COPY: Record<BehaviorId, ConsultationCopy> = {
  use_cushion: CONSULTATION_COPY.use_cushion,
  press_bell: CONSULTATION_COPY.press_bell,
  sit_swivel_chair: CONSULTATION_COPY.sit_swivel_chair,
  stamp_paw: CONSULTATION_COPY.stamp_paw,
  hide_paper_basket: CONSULTATION_COPY.hide_paper_basket,
  peek_document_box: CONSULTATION_COPY.peek_document_box,
  watch_window: {
    purpose: '외부 동향 감시',
    detail: '창가 벤치에 앉아 창밖을 오래 주시함',
    opinion: '외부 위협은 발견되지 않았다고 보고됨',
  },
  drink_water: {
    purpose: '복지 시설 이용',
    detail: '고객용 정수기의 물을 여러 번 마심',
    opinion: '음수 시설 만족도가 높은 것으로 추정',
  },
};

export function consultationCopyFor(behaviorId: string): ConsultationCopy {
  return (
    V2_CONSULTATION_COPY[behaviorId as BehaviorId] ?? {
      purpose: '용무 미상',
      detail: '기록 담당자가 자리를 비운 사이 다녀감',
      opinion: '다음 방문 시 상세 확인 필요',
    }
  );
}
