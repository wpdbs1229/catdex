# 커뮤니티 기능 전환 문서

## 목표

냥도감 모바일 앱에 고양이 중심 커뮤니티 탭을 추가한다. 첫 단계는 기존 앱 구조를 유지하면서 클라이언트 화면, 로컬 mock repository, 작성/좋아요/댓글/신고 흐름을 구현한다.

## 범위

- 하단 탭에 `커뮤니티` 추가
- 커뮤니티 피드, 게시글 작성, 댓글 화면 추가
- 게시글 카드, 미디어 미리보기, 글쓰기 FAB, 빈/오류 상태 컴포넌트 추가
- mock repository 기반 게시글/댓글/좋아요/신고 흐름 추가
- 향후 Supabase 테이블, RLS, RPC, Storage 정책 연결이 가능하도록 타입과 서비스 경계 분리

## 제외 범위

- Supabase 커뮤니티 테이블과 RLS 정책 적용
- 공개 Storage 업로드와 영상 인코딩/썸네일 생성
- 관리자 대시보드, 운영자 검수 큐, 신고 처리 콘솔
- 고양이 상세에서 연결 게시글 조회

## 위치 및 미디어 정책

- 커뮤니티 게시글에는 정확 GPS 좌표를 노출하지 않는다.
- 공개 이미지 업로드 전 EXIF 위치정보가 제거된 파생본을 사용한다.
- 동영상은 실제 업로드 전 메타데이터 제거, 썸네일 생성, 길이/용량 제한 정책을 별도 확정한다.
- 위치 노출 신고 사유 `LOCATION_EXPOSURE`를 모델에 포함한다.

## 구현 순서

1. 기존 하단 탭과 화면 전환 구조 확인
2. 커뮤니티 타입, mock repository, 상태 hook 추가
3. 피드/카드/FAB/작성/댓글 화면 추가
4. navigation 타입과 App 화면 스위칭에 커뮤니티 연결
5. `npm run typecheck`로 타입 검증

## 후속 Supabase 전환 항목

- `community_posts`, `community_post_media`, `community_post_likes`, `community_comments`, `community_reports` 테이블 설계
- 모든 public 테이블 RLS 활성화
- 작성자/관리자 권한 정책 및 반복 신고 방지 unique 제약
- public 파생 이미지 Storage bucket 정책
- 위치/개인정보/동물학대 신고 감사 로그와 운영자 접근 기록
