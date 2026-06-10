import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type EntitlementStatus = 'active' | 'trialing' | 'canceled' | 'expired';

interface SubscriberAttribute {
  value?: unknown;
}

interface RevenueCatEvent {
  id?: string;
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  entitlement_ids?: string[];
  expiration_at_ms?: number | null;
  period_type?: string | null;
  subscriber_attributes?: Record<string, SubscriberAttribute | string | null>;
  transferred_from?: string[];
  transferred_to?: string[];
}

interface RevenueCatWebhookPayload {
  event?: RevenueCatEvent;
}

const jsonHeaders = {
  'content-type': 'application/json',
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const activeEventTypes = new Set([
  'INITIAL_PURCHASE',
  'NON_RENEWING_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'UNCANCELLATION',
  'REFUND_REVERSED',
  'SUBSCRIPTION_EXTENDED',
  'TEMPORARY_ENTITLEMENT_GRANT',
]);
const expiredEventTypes = new Set(['EXPIRATION', 'BILLING_ISSUE', 'REFUND', 'SUBSCRIPTION_PAUSED']);

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });
}

function timingSafeEqual(left: string, right: string) {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let difference = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return difference === 0;
}

function isAuthorized(request: Request, webhookSecret: string | undefined) {
  const normalizedSecret = webhookSecret?.trim();

  if (!normalizedSecret) {
    return false;
  }

  const authorizationHeader = request.headers.get('authorization') ?? '';
  return timingSafeEqual(authorizationHeader, `Bearer ${normalizedSecret}`);
}

function getSupabaseServiceKey() {
  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS');

  if (secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys) as Record<string, unknown>;
      const defaultSecretKey = parsed.default;

      if (typeof defaultSecretKey === 'string' && defaultSecretKey.length > 0) {
        return defaultSecretKey;
      }
    } catch (_error) {
      console.error('Failed to parse SUPABASE_SECRET_KEYS');
    }
  }

  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
}

function isUuid(value: string | undefined | null): value is string {
  return typeof value === 'string' && uuidPattern.test(value);
}

function getSubscriberAttributeValue(
  attributes: RevenueCatEvent['subscriber_attributes'],
  attributeName: string,
) {
  const attribute = attributes?.[attributeName];

  if (typeof attribute === 'string') {
    return attribute;
  }

  if (attribute && typeof attribute === 'object' && typeof attribute.value === 'string') {
    return attribute.value;
  }

  return undefined;
}

function getEventType(event: RevenueCatEvent) {
  return event.type?.trim().toUpperCase() ?? '';
}

function getEventUserId(event: RevenueCatEvent) {
  const candidates = [
    event.app_user_id,
    event.original_app_user_id,
    ...(event.aliases ?? []),
    getSubscriberAttributeValue(event.subscriber_attributes, 'supabase_user_id'),
    getSubscriberAttributeValue(event.subscriber_attributes, 'supabaseUserId'),
    getSubscriberAttributeValue(event.subscriber_attributes, 'user_id'),
    getSubscriberAttributeValue(event.subscriber_attributes, '$supabase_user_id'),
  ];

  return candidates.find(isUuid) ?? null;
}

function getTargetTransferUserIds(event: RevenueCatEvent, key: 'transferred_from' | 'transferred_to') {
  return [...new Set((event[key] ?? []).filter(isUuid))];
}

function getTargetEntitlementId() {
  return Deno.env.get('REVENUECAT_NYANGKKUREOMI_ENTITLEMENT_ID')?.trim() || 'nyangkkureomi';
}

function isTargetEntitlementEvent(event: RevenueCatEvent) {
  const eventType = getEventType(event);
  const entitlementIds = event.entitlement_ids ?? [];

  if (entitlementIds.length === 0) {
    return eventType === 'TRANSFER';
  }

  return entitlementIds.includes(getTargetEntitlementId());
}

function timestampMsToIso(timestampMs: number | null | undefined) {
  if (typeof timestampMs !== 'number' || !Number.isFinite(timestampMs)) {
    return null;
  }

  return new Date(timestampMs).toISOString();
}

function getStatus(event: RevenueCatEvent): EntitlementStatus {
  const eventType = getEventType(event);
  const periodType = event.period_type?.trim().toUpperCase();

  if (eventType === 'CANCELLATION') {
    return 'canceled';
  }

  if (expiredEventTypes.has(eventType)) {
    return 'expired';
  }

  if (periodType === 'TRIAL') {
    return 'trialing';
  }

  if (activeEventTypes.has(eventType)) {
    return 'active';
  }

  return 'active';
}

async function syncEntitlement(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  status: EntitlementStatus,
  currentPeriodEndsAt: string | null,
) {
  const { error } = await supabase
    .from('user_entitlements')
    .upsert(
      {
        user_id: userId,
        tier: 'nyangkkureomi',
        status,
        source: 'revenuecat',
        current_period_ends_at: currentPeriodEndsAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

  if (error) {
    throw error;
  }
}

async function syncTransfer(supabase: ReturnType<typeof createClient>, event: RevenueCatEvent) {
  const currentPeriodEndsAt = timestampMsToIso(event.expiration_at_ms);
  const transferredFrom = getTargetTransferUserIds(event, 'transferred_from');
  const transferredTo = getTargetTransferUserIds(event, 'transferred_to');

  for (const userId of transferredFrom) {
    await syncEntitlement(supabase, userId, 'expired', new Date().toISOString());
  }

  for (const userId of transferredTo) {
    await syncEntitlement(supabase, userId, getStatus(event), currentPeriodEndsAt);
  }

  return {
    expired: transferredFrom.length,
    activated: transferredTo.length,
  };
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  if (!isAuthorized(request, Deno.env.get('REVENUECAT_WEBHOOK_SECRET'))) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  let payload: RevenueCatWebhookPayload;

  try {
    payload = await request.json();
  } catch (_error) {
    return jsonResponse({ error: 'Invalid JSON payload' }, 400);
  }

  const event = payload.event;

  if (!event) {
    return jsonResponse({ error: 'Missing RevenueCat event' }, 400);
  }

  const eventType = getEventType(event);

  if (eventType === 'TEST') {
    return jsonResponse({ ok: true, ignored: true, reason: 'RevenueCat test event' });
  }

  if (!isTargetEntitlementEvent(event)) {
    return jsonResponse({
      ok: true,
      ignored: true,
      reason: 'Event does not include the nyangkkureomi entitlement',
      eventId: event.id ?? null,
      eventType,
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = getSupabaseServiceKey();

  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: 'Missing Supabase service configuration' }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
    },
  });

  try {
    if (eventType === 'TRANSFER') {
      const result = await syncTransfer(supabase, event);
      return jsonResponse({ ok: true, eventId: event.id ?? null, eventType, ...result });
    }

    const userId = getEventUserId(event);

    if (!userId) {
      return jsonResponse({ error: 'RevenueCat event does not include a Supabase user id' }, 400);
    }

    const status = getStatus(event);
    const currentPeriodEndsAt = timestampMsToIso(event.expiration_at_ms);

    await syncEntitlement(supabase, userId, status, currentPeriodEndsAt);

    return jsonResponse({
      ok: true,
      eventId: event.id ?? null,
      eventType,
      userId,
      status,
      currentPeriodEndsAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to sync RevenueCat entitlement';
    console.error(message);
    return jsonResponse({ error: message }, 500);
  }
});
