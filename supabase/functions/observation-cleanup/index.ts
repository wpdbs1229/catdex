// 미종결(pending) 촬영 관찰 정리 함수
//
// pg_cron(private.request_observation_cleanup)이 매일 호출한다.
// 3일 넘게 pending인 관찰의 후보를 지우고, 업로드된 원본/누끼 파일을
// Storage API로 삭제한 뒤 관찰을 'expired'로 마감한다.
// (storage.objects 직접 삭제는 Supabase가 차단하므로 반드시 이 경로를 쓴다.)

import { createClient } from 'npm:@supabase/supabase-js@2';

const MAX_AGE_HOURS = 72;
const BATCH_LIMIT = 200;

interface StaleObservation {
  id: string;
  original_image_url: string | null;
  cutout_image_url: string | null;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

Deno.serve(async (request) => {
  const expectedSecret = Deno.env.get('OBSERVATION_CLEANUP_SECRET') ?? '';
  const providedSecret = request.headers.get('x-cleanup-secret') ?? '';

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const cutoffIso = new Date(Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('cat_observations')
    .select('id, original_image_url, cutout_image_url')
    .eq('status', 'pending')
    .lt('created_at', cutoffIso)
    .order('created_at', { ascending: true })
    .limit(BATCH_LIMIT);

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  const staleObservations = (data ?? []) as StaleObservation[];

  if (staleObservations.length === 0) {
    return jsonResponse({ expired: 0, removedFiles: 0 });
  }

  const observationIds = staleObservations.map((observation) => observation.id);

  // 관찰 전용 업로드 경로만 삭제 대상으로 삼는다.
  const filePaths = staleObservations
    .flatMap((observation) => [observation.original_image_url, observation.cutout_image_url])
    .filter((path): path is string => Boolean(path && path.includes('/observations/')));

  let removedFiles = 0;

  if (filePaths.length > 0) {
    const { data: removed, error: removeError } = await supabase.storage
      .from('cat-images')
      .remove(filePaths);

    if (removeError) {
      // 파일 삭제가 실패해도 다음 실행에서 재시도할 수 있도록
      // 관찰을 pending으로 남겨 둔다.
      return jsonResponse({ error: `storage cleanup failed: ${removeError.message}` }, 500);
    }

    removedFiles = removed?.length ?? 0;
  }

  const { error: candidatesError } = await supabase
    .from('cat_match_candidates')
    .delete()
    .in('observation_id', observationIds);

  if (candidatesError) {
    return jsonResponse({ error: candidatesError.message }, 500);
  }

  const { error: expireError } = await supabase
    .from('cat_observations')
    .update({ status: 'expired' })
    .in('id', observationIds);

  if (expireError) {
    return jsonResponse({ error: expireError.message }, 500);
  }

  return jsonResponse({ expired: observationIds.length, removedFiles });
});
