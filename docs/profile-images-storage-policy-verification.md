# profile-images Storage 정책 검증 절차

대상 원격 프로젝트: `wqiqdybzhbmsvccpklli`

## 배경

Supabase security advisor의 `public_bucket_allows_listing` 경고는 public bucket에 broad `SELECT` 정책이 있어 클라이언트가 버킷 객체 목록을 조회할 수 있을 때 발생한다.

`profile-images` 버킷은 public URL을 유지해야 하므로 버킷의 `public = true` 설정은 유지하고, `storage.objects`의 `profile_images_select_public` 정책만 제거한다. Public URL 다운로드는 public bucket 설정으로 제공되며, broad `SELECT` 정책이 필요하지 않다.

참고 문서:

- [Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control)
- [Storage Buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- [Storage Helper Functions](https://supabase.com/docs/guides/storage/schema/helper-functions)

## 적용 초안

마이그레이션 초안은 `supabase/migrations/000023_tighten_profile_images_select_policy.sql`에 있다.

핵심 변경:

- `profile-images` 버킷이 존재하는지 확인한다.
- 버킷 `public` 값을 `true`로 유지한다.
- `profile_images_select_public` 정책을 삭제한다.
- 인증 사용자는 본인 폴더와 본인 소유 객체만 `SELECT` 가능하도록 `profile_images_select_own` 정책을 둔다.

## 적용 전 확인

Supabase SQL editor 또는 MCP에서 현재 상태를 확인한다.

```sql
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'profile-images';

select policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname like 'profile_images_%'
order by policyname;
```

예상 전 상태:

- `profile-images.public = true`
- `profile_images_select_public` 정책이 존재한다.
- 해당 정책의 조건이 `bucket_id = 'profile-images'` 수준으로 broad하다.

## 적용

원격 프로젝트에 `supabase/migrations/000023_tighten_profile_images_select_policy.sql` 내용을 적용한다.

CLI가 준비된 환경에서는 프로젝트 링크 후 migration apply 흐름을 사용하고, 현재 저장소처럼 Supabase CLI가 없는 환경에서는 Supabase Dashboard SQL editor 또는 MCP migration apply로 동일 SQL을 적용한다.

## SQL 검증

적용 후 `supabase/verify_profile_images_storage_policy.sql`을 실행한다.

모든 행의 `passed`가 `true`여야 한다.

특히 다음을 확인한다.

- `profile_images_bucket_public = true`
- `profile_images_select_public_removed = true`
- `profile_images_anon_select_absent = true`
- `profile_images_select_own_present = true`
- `anon_cannot_select_profile_images_objects = true`

## API 검증

환경 변수:

```sh
SUPABASE_URL=https://wqiqdybzhbmsvccpklli.supabase.co
SUPABASE_PUBLISHABLE_KEY=<publishable-or-anon-key>
PROFILE_IMAGE_PATH=<existing-object-path-inside-profile-images>
```

공개 URL 유지 확인:

```sh
curl -I "$SUPABASE_URL/storage/v1/object/public/profile-images/$PROFILE_IMAGE_PATH"
```

예상 결과:

- 존재하는 객체라면 `200`, 캐시 조건에 따라 `304`도 정상이다.
- `401` 또는 `403`이면 public URL 동작이 깨진 것이다.

익명 전체 목록 차단 확인:

```sh
curl -i \
  -X POST "$SUPABASE_URL/storage/v1/object/list/profile-images" \
  -H "apikey: $SUPABASE_PUBLISHABLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_PUBLISHABLE_KEY" \
  -H "Content-Type: application/json" \
  --data '{"prefix":"","limit":100,"offset":0}'
```

예상 결과:

- `403` 계열 응답이거나 객체 목록이 비어 있어야 한다.
- 다른 사용자의 객체명, 폴더명, metadata가 응답에 포함되면 실패다.
- 버킷에 객체가 하나도 없으면 broad 정책이 남아 있어도 빈 배열이 나올 수 있으므로, 최종 판단은 SQL 검증과 security advisor 재확인을 기준으로 한다.

로그인 사용자 업로드 회귀 확인:

앱의 프로필 이미지 변경 플로우를 한 번 실행한다. 현재 클라이언트는 `profile-images/{userId}/avatar-{timestamp}.{ext}` 경로로 `upload(..., { upsert: false })`를 호출하므로, 업로드 성공 후 저장된 `publicUrl`이 다시 열리면 정상이다.

## Advisor 재확인

적용 후 Supabase security advisor를 다시 실행한다.

예상 결과:

- `public_bucket_allows_listing` 경고에서 `profile-images`가 사라진다.
- 별도 경고인 `auth_leaked_password_protection`은 이번 변경 범위가 아니므로 남아 있을 수 있다.
