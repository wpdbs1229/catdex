# 운영 런북: 중복 개체 병합

**요약: 중복 등록된 고양이 두 마리를 `private.merge_cats(원본, 대상)`로 병합한다. Supabase SQL 편집기(service_role)에서만 실행할 수 있고, 만남·사진·수집·구역·게시글 참조가 모두 대상 개체로 이관된 뒤 원본은 삭제된다.**

## 언제 쓰나

- 같은 고양이가 두 개체로 중복 등록됐다는 신고(`reports.reason = 'duplicate_cat'`)가 들어왔을 때
- 두 개체의 사진을 비교해 동일 개체라고 운영자가 판단했을 때

## 실행 방법

Supabase 대시보드 → SQL Editor에서:

```sql
select private.merge_cats(
  '원본-cat-id'::uuid,   -- 사라질 개체 (기록이 대상으로 이동)
  '대상-cat-id'::uuid,   -- 남을 개체
  '신고 #123 처리'        -- 감사 로그 메모 (선택)
);
```

반환값으로 이동한 만남/사진 수를 확인할 수 있다.

## 무엇이 이관되나

| 데이터 | 처리 |
|---|---|
| 만남 기록(cat_encounters), 사진(cat_photos) | 대상으로 이동 |
| 사용자별 수집(user_cat_collections) | 대상과 **합산** (만남 횟수 합, 날짜는 min/max) |
| 구역 통계(cat_regions) | 대상과 합산 |
| 대표 고양이 슬롯(featured_cats) | 대상으로 변경 (이미 대상을 대표로 둔 사용자는 슬롯 정리) |
| 게시글·목격·관찰 참조 | 대상으로 변경 |
| 원본의 미확정 후보(cat_match_candidates) | 삭제 |
| 대상 통계(만남 수·날짜·관계 레벨) | 자동 재계산 |

병합 전체가 한 트랜잭션이라 중간 실패 시 아무것도 바뀌지 않는다.

## 주의

- **되돌릴 수 없다.** 실행 전 두 개체의 사진을 반드시 비교할 것.
- 방향에 주의: 첫 번째 인자(원본)가 삭제된다. 보통 기록이 적은 쪽을 원본으로 둔다.
- 모든 실행은 `private.cat_record_actions`에 감사 로그로 남는다:

```sql
select * from private.cat_record_actions order by created_at desc limit 20;
```

## 참고: 사용자 셀프 정정

사용자가 잘못 연결한 "내 만남 기록"은 앱의 고양이 상세 → 사진 기록 타임라인 → 분리 버튼으로 직접 정리할 수 있다 (`public.remove_my_cat_encounter`). 마지막 기록이 사라진 개체는 도감 카드도 함께 정리된다.
