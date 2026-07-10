import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type WaitlistPlatform = 'ios' | 'android' | 'both' | 'unknown';

interface WaitlistPayload {
  email?: unknown;
  platform?: unknown;
  launchNoticeConsent?: unknown;
  updateNewsConsent?: unknown;
  source?: unknown;
  consentVersion?: unknown;
  website?: unknown;
}

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};

const consentText = '출시 알림 발송을 위해 이메일을 수집·이용하는 데 동의합니다.';
const defaultConsentVersion = 'launch_waitlist_2026_07_10';
const allowedPlatforms = new Set<WaitlistPlatform>(['ios', 'android', 'both', 'unknown']);

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'content-type': 'application/json',
    },
  });
}

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizePlatform(value: unknown): WaitlistPlatform {
  const nextPlatform = typeof value === 'string' ? value.trim().toLowerCase() : 'unknown';

  return allowedPlatforms.has(nextPlatform as WaitlistPlatform) ? nextPlatform as WaitlistPlatform : 'unknown';
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

  let payload: WaitlistPayload;

  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  if (typeof payload.website === 'string' && payload.website.trim()) {
    return jsonResponse({ ok: true, skipped: true });
  }

  const email = normalizeEmail(payload.email);

  if (!isValidEmail(email)) {
    return jsonResponse({ error: '이메일 주소를 다시 확인해 주세요.' }, 400);
  }

  if (payload.launchNoticeConsent !== true) {
    return jsonResponse({ error: '출시 알림 발송을 위한 필수 동의가 필요합니다.' }, 400);
  }

  const platform = normalizePlatform(payload.platform);
  const source = normalizeString(payload.source, 'docs_index').slice(0, 80);
  const consentVersion = normalizeString(payload.consentVersion, defaultConsentVersion).slice(0, 80);
  const updateNewsConsent = payload.updateNewsConsent === true;
  const userAgent = request.headers.get('user-agent') ?? null;
  const referer = request.headers.get('referer') ?? null;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: existing, error: existingError } = await supabase
    .from('launch_waitlist')
    .select('id, status')
    .eq('email_normalized', email)
    .maybeSingle();

  if (existingError) {
    return jsonResponse({ error: existingError.message }, 500);
  }

  const row = {
    email,
    email_normalized: email,
    platform,
    launch_notice_consent: true,
    update_news_consent: updateNewsConsent,
    source,
    status: 'subscribed',
    consent_version: consentVersion,
    consent_text: consentText,
    metadata: {
      userAgent,
      referer,
    },
    last_submitted_at: new Date().toISOString(),
    unsubscribed_at: null,
  };

  if (existing) {
    const { error: updateError } = await supabase
      .from('launch_waitlist')
      .update(row)
      .eq('id', existing.id);

    if (updateError) {
      return jsonResponse({ error: updateError.message }, 500);
    }

    return jsonResponse({
      ok: true,
      alreadySubscribed: existing.status === 'subscribed',
    });
  }

  const { error: insertError } = await supabase
    .from('launch_waitlist')
    .insert(row);

  if (insertError) {
    return jsonResponse({ error: insertError.message }, 500);
  }

  return jsonResponse({
    ok: true,
    alreadySubscribed: false,
  }, 201);
});
