import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface CleanupResult {
  label: string;
  ok: boolean;
  count?: number;
  error?: string;
}

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'content-type': 'application/json',
    },
  });
}

function getBearerToken(request: Request) {
  const authHeader = request.headers.get('authorization') ?? '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
}

function isIgnorableSchemaError(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false;
  }

  const message = error.message?.toLowerCase() ?? '';

  return error.code === '42P01' || error.code === '42703' || message.includes('does not exist') || message.includes('could not find');
}

async function runOptional(label: string, task: () => Promise<{ error: { code?: string; message?: string } | null; count?: number | null }>): Promise<CleanupResult> {
  const { error, count } = await task();

  if (!error) {
    return {
      label,
      ok: true,
      count: count ?? undefined,
    };
  }

  if (isIgnorableSchemaError(error)) {
    return {
      label,
      ok: true,
      error: error.message,
    };
  }

  return {
    label,
    ok: false,
    error: error.message,
  };
}

async function listStoragePaths(supabase: SupabaseClient, bucket: string, prefix: string): Promise<string[]> {
  const { data, error } = await supabase.storage.from(bucket).list(prefix, {
    limit: 1000,
    sortBy: {
      column: 'name',
      order: 'asc',
    },
  });

  if (error) {
    if (isIgnorableSchemaError(error)) {
      return [];
    }

    throw error;
  }

  const paths: string[] = [];

  for (const item of data ?? []) {
    const path = `${prefix}/${item.name}`;

    if (item.id || item.metadata) {
      paths.push(path);
      continue;
    }

    paths.push(...await listStoragePaths(supabase, bucket, path));
  }

  return paths;
}

async function removeUserStorage(supabase: SupabaseClient, bucket: string, userId: string): Promise<CleanupResult> {
  try {
    const paths = await listStoragePaths(supabase, bucket, userId);

    if (paths.length === 0) {
      return {
        label: `${bucket}.storage`,
        ok: true,
        count: 0,
      };
    }

    const { error } = await supabase.storage.from(bucket).remove(paths);

    return {
      label: `${bucket}.storage`,
      ok: !error,
      count: paths.length,
      error: error?.message,
    };
  } catch (error) {
    return {
      label: `${bucket}.storage`,
      ok: false,
      error: error instanceof Error ? error.message : 'Storage cleanup failed',
    };
  }
}

async function fetchUserCommunityPostIds(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.from('community_posts').select('id').eq('author_id', userId);

  if (error) {
    if (isIgnorableSchemaError(error)) {
      return [];
    }

    throw error;
  }

  return (data ?? []).map((row) => row.id as string).filter(Boolean);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Missing Supabase service configuration' }, 500);
  }

  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    return jsonResponse({ error: userError?.message ?? 'Unauthorized' }, 401);
  }

  const userId = user.id;
  const cleanupResults: CleanupResult[] = [];

  cleanupResults.push(await removeUserStorage(supabase, 'profile-images', userId));
  cleanupResults.push(await removeUserStorage(supabase, 'cat-images', userId));

  const communityPostIds = await fetchUserCommunityPostIds(supabase, userId);

  cleanupResults.push(await runOptional('community_post_likes.user_id', () => supabase.from('community_post_likes').delete({ count: 'exact' }).eq('user_id', userId)));
  if (communityPostIds.length > 0) {
    cleanupResults.push(await runOptional('community_post_likes.post_id', () => supabase.from('community_post_likes').delete({ count: 'exact' }).in('post_id', communityPostIds)));
    cleanupResults.push(await runOptional('community_comments.post_id', () => supabase.from('community_comments').delete({ count: 'exact' }).in('post_id', communityPostIds)));
  }
  cleanupResults.push(await runOptional('community_comments.author_id', () => supabase.from('community_comments').delete({ count: 'exact' }).eq('author_id', userId)));
  cleanupResults.push(await runOptional('community_posts.author_id', () => supabase.from('community_posts').delete({ count: 'exact' }).eq('author_id', userId)));
  cleanupResults.push(await runOptional('notification_events.actor_id', () => supabase.from('notification_events').delete({ count: 'exact' }).eq('actor_id', userId)));

  const failedCleanup = cleanupResults.find((result) => !result.ok);

  if (failedCleanup) {
    return jsonResponse({
      error: failedCleanup.error ?? 'Account cleanup failed',
      cleanup: cleanupResults,
    }, 500);
  }

  const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId);

  if (deleteUserError) {
    return jsonResponse({ error: deleteUserError.message, cleanup: cleanupResults }, 500);
  }

  return jsonResponse({
    ok: true,
    deletedUserId: userId,
    cleanup: cleanupResults,
  });
});
