import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type WaitlistPlatform = 'ios' | 'android' | 'both' | 'unknown';
type WaitlistStatus = 'subscribed' | 'unsubscribed';

interface WaitlistRow {
  id: string;
  email: string;
  platform: WaitlistPlatform;
  launch_notice_consent: boolean;
  update_news_consent: boolean;
  source: string;
  status: WaitlistStatus;
  consent_version: string;
  last_submitted_at: string;
  created_at: string;
  updated_at: string;
}

const allowedOrigins = new Set([
  'https://wpdbs1229.github.io',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
]);

const allowedPlatforms = new Set<WaitlistPlatform>(['ios', 'android', 'both', 'unknown']);
const allowedStatuses = new Set<WaitlistStatus>(['subscribed', 'unsubscribed']);

function getCorsHeaders(request: Request) {
  const origin = request.headers.get('origin') ?? '';
  const allowOrigin = allowedOrigins.has(origin) ? origin : 'https://wpdbs1229.github.io';

  return {
    'access-control-allow-origin': allowOrigin,
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
    'access-control-allow-methods': 'GET, OPTIONS',
    vary: 'origin',
  };
}

function jsonResponse(request: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(request),
      'cache-control': 'no-store',
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

function getSecretKey() {
  const legacyServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (legacyServiceRoleKey) {
    return legacyServiceRoleKey;
  }

  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS');

  if (!secretKeys) {
    return null;
  }

  try {
    const parsed = JSON.parse(secretKeys) as Record<string, string | undefined>;
    return parsed.default ?? Object.values(parsed).find(Boolean) ?? null;
  } catch {
    return null;
  }
}

function clampLimit(value: string | null) {
  const parsed = Number.parseInt(value ?? '', 10);

  if (!Number.isFinite(parsed)) {
    return 50;
  }

  return Math.min(Math.max(parsed, 1), 200);
}

function clampOffset(value: string | null) {
  const parsed = Number.parseInt(value ?? '', 10);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(parsed, 0);
}

function normalizeOptionalFilter<T extends string>(value: string | null, allowedValues: Set<T>) {
  if (!value || value === 'all') {
    return null;
  }

  return allowedValues.has(value as T) ? value as T : null;
}

function getClientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('cf-connecting-ip') ||
    null;
}

function toResponseRow(row: WaitlistRow) {
  return {
    id: row.id,
    email: row.email,
    platform: row.platform,
    launchNoticeConsent: row.launch_notice_consent,
    updateNewsConsent: row.update_news_consent,
    source: row.source,
    status: row.status,
    consentVersion: row.consent_version,
    lastSubmittedAt: row.last_submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(request) });
  }

  if (request.method !== 'GET') {
    return jsonResponse(request, { error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const secretKey = getSecretKey();

  if (!supabaseUrl || !secretKey) {
    return jsonResponse(request, { error: 'Missing Supabase service configuration' }, 500);
  }

  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return jsonResponse(request, { error: 'Unauthorized' }, 401);
  }

  const supabase = createClient(supabaseUrl, secretKey, {
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
    return jsonResponse(request, { error: userError?.message ?? 'Unauthorized' }, 401);
  }

  const { data: adminUser, error: adminError } = await supabase
    .schema('private')
    .from('admin_users')
    .select('user_id, role')
    .eq('user_id', user.id)
    .is('revoked_at', null)
    .maybeSingle();

  if (adminError) {
    return jsonResponse(request, { error: adminError.message }, 500);
  }

  if (!adminUser) {
    return jsonResponse(request, { error: 'Forbidden' }, 403);
  }

  const url = new URL(request.url);
  const limit = clampLimit(url.searchParams.get('limit'));
  const offset = clampOffset(url.searchParams.get('offset'));
  const platform = normalizeOptionalFilter(url.searchParams.get('platform'), allowedPlatforms);
  const status = normalizeOptionalFilter(url.searchParams.get('status'), allowedStatuses);
  const search = (url.searchParams.get('q') ?? '').trim().toLowerCase().slice(0, 120);

  const auditMetadata = {
    limit,
    offset,
    platform,
    status,
    hasSearch: Boolean(search),
  };

  const { error: auditError } = await supabase
    .schema('private')
    .from('admin_audit_logs')
    .insert({
      actor_user_id: user.id,
      action: 'launch_waitlist.list',
      target: 'launch_waitlist',
      metadata: auditMetadata,
      ip_address: getClientIp(request),
      user_agent: request.headers.get('user-agent'),
    });

  if (auditError) {
    return jsonResponse(request, { error: auditError.message }, 500);
  }

  let waitlistQuery = supabase
    .from('launch_waitlist')
    .select(
      'id, email, platform, launch_notice_consent, update_news_consent, source, status, consent_version, last_submitted_at, created_at, updated_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (platform) {
    waitlistQuery = waitlistQuery.eq('platform', platform);
  }

  if (status) {
    waitlistQuery = waitlistQuery.eq('status', status);
  }

  if (search) {
    waitlistQuery = waitlistQuery.ilike('email_normalized', `%${search.replaceAll('%', '\\%').replaceAll('_', '\\_')}%`);
  }

  const { data, error, count } = await waitlistQuery;

  if (error) {
    return jsonResponse(request, { error: error.message }, 500);
  }

  return jsonResponse(request, {
    ok: true,
    role: adminUser.role,
    total: count ?? 0,
    limit,
    offset,
    entries: ((data ?? []) as WaitlistRow[]).map(toResponseRow),
  });
});
