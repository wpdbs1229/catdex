import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RevenueCatEvent {
  app_user_id?: string;
  type?: string;
  entitlement_ids?: string[];
  expiration_at_ms?: number | null;
}

interface RevenueCatWebhookPayload {
  event?: RevenueCatEvent;
}

const entitlementId = 'nyangkkureomi';
const activeEventTypes = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
  'SUBSCRIPTION_EXTENDED',
  'TEMPORARY_ENTITLEMENT_GRANT',
]);
const inactiveEventTypes = new Set(['EXPIRATION', 'REFUND']);

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  });
}

function dateFromMillis(value?: number | null) {
  return typeof value === 'number' ? new Date(value).toISOString() : null;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const webhookSecret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  const authHeader = request.headers.get('authorization');

  if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Missing Supabase service configuration' }, 500);
  }

  const payload = (await request.json()) as RevenueCatWebhookPayload;
  const event = payload.event;
  const appUserId = event?.app_user_id;
  const eventType = event?.type ?? 'UNKNOWN';

  if (!appUserId) {
    return jsonResponse({ error: 'Missing RevenueCat app_user_id' }, 400);
  }

  const hasNyangkkureomi = event?.entitlement_ids?.includes(entitlementId) ?? false;
  const expiresAt = dateFromMillis(event?.expiration_at_ms);
  const expiresInFuture = !event?.expiration_at_ms || event.expiration_at_ms > Date.now();
  const shouldGrantAccess = hasNyangkkureomi && expiresInFuture && !inactiveEventTypes.has(eventType);
  const status = shouldGrantAccess ? (eventType === 'CANCELLATION' ? 'canceled' : 'active') : 'expired';

  if (!hasNyangkkureomi && !activeEventTypes.has(eventType) && !inactiveEventTypes.has(eventType)) {
    return jsonResponse({ ignored: true, eventType });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });

  const { error } = await supabase.from('user_entitlements').upsert(
    {
      user_id: appUserId,
      tier: shouldGrantAccess ? entitlementId : 'free',
      status,
      source: 'revenuecat',
      current_period_ends_at: expiresAt,
    },
    {
      onConflict: 'user_id',
    },
  );

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({
    ok: true,
    userId: appUserId,
    tier: shouldGrantAccess ? entitlementId : 'free',
    status,
    expiresAt,
  });
});
