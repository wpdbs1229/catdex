import type { CoatColorId, CoatPatternId } from '@/shared/coat/coat.types';

/**
 * 교육용 고객 '보리'.
 *
 * 첫 사용자 온보딩(신입 사원 첫 업무)에서 등록 연습에 쓰는 전역 공용 개체다.
 * 서버에 한 마리만 시드되어 있고, 사용자마다 만남 기록으로 수집만 한다.
 * id·이름·구역은 시드 마이그레이션(training_cat_bori.sql)과 같아야 한다.
 */
export const TRAINING_CAT_ID = '00000000-0000-0000-0000-00000000b021';
export const TRAINING_CAT_NAME = '보리';
export const TRAINING_REGION_NAME = '냥냥공사 연수원';
export const TRAINING_CAT_COLORS: CoatColorId[] = ['orange', 'white'];
export const TRAINING_CAT_PATTERN: CoatPatternId = 'tabby';
