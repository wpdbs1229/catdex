import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface NotificationEventRow {
  id: string;
  recipient_id: string;
  type: 'shared_cat' | 'achievement' | 'collection_like' | 'collection_follow' | 'cat_rediscovery' | 'rare_neighborhood_cat' | 'weekly_summary';
  title: string;
  body: string;
  data: Record<string, unknown>;
}

interface NotificationDeviceRow {
  user_id: string;
  expo_push_token: string;
}

interface ExpoPushTicket {
  status?: 'ok' | 'error';
  message?: string;
  details?: {
    error?: string;
  };
}

const dispatchLimit = 100;
const expoPushEndpoint = 'https://exp.host/--/api/v2/push/send';

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  });
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const dispatchSecret = Deno.env.get('NOTIFICATION_DISPATCH_SECRET');
  const authHeader = request.headers.get('authorization');

  if (!dispatchSecret) {
    return jsonResponse({ error: 'Missing notification dispatch secret' }, 500);
  }

  if (authHeader !== `Bearer ${dispatchSecret}`) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Missing Supabase service configuration' }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });

  const { data: events, error: fetchEventsError } = await supabase
    .from('notification_events')
    .select('id, recipient_id, type, title, body, data')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(dispatchLimit);

  if (fetchEventsError) {
    return jsonResponse({ error: fetchEventsError.message }, 500);
  }

  const pendingEvents = (events ?? []) as NotificationEventRow[];
  const eventIds = pendingEvents.map((event) => event.id);

  if (pendingEvents.length === 0) {
    return jsonResponse({ ok: true, processed: 0, sent: 0, skipped: 0, failed: 0 });
  }

  const { error: markSendingError } = await supabase
    .from('notification_events')
    .update({ status: 'sending', error: null })
    .in('id', eventIds)
    .eq('status', 'pending');

  if (markSendingError) {
    return jsonResponse({ error: markSendingError.message }, 500);
  }

  const recipientIds = [...new Set(pendingEvents.map((event) => event.recipient_id))];
  const { data: devices, error: fetchDevicesError } = await supabase
    .from('notification_devices')
    .select('user_id, expo_push_token')
    .in('user_id', recipientIds)
    .eq('enabled', true);

  if (fetchDevicesError) {
    return jsonResponse({ error: fetchDevicesError.message }, 500);
  }

  const devicesByUserId = new Map<string, NotificationDeviceRow[]>();

  for (const device of (devices ?? []) as NotificationDeviceRow[]) {
    const nextDevices = devicesByUserId.get(device.user_id) ?? [];
    nextDevices.push(device);
    devicesByUserId.set(device.user_id, nextDevices);
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const event of pendingEvents) {
    const eventDevices = devicesByUserId.get(event.recipient_id) ?? [];

    if (eventDevices.length === 0) {
      skipped += 1;
      await supabase
        .from('notification_events')
        .update({ status: 'skipped', error: 'No enabled Expo push token for recipient' })
        .eq('id', event.id);
      continue;
    }

    const messages = eventDevices.map((device) => ({
      to: device.expo_push_token,
      title: event.title,
      body: event.body,
      sound: 'default',
      data: {
        ...event.data,
        eventId: event.id,
        notificationType: event.type,
      },
    }));

    const tickets: ExpoPushTicket[] = [];

    try {
      for (const messageChunk of chunk(messages, 100)) {
        const response = await fetch(expoPushEndpoint, {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'accept-encoding': 'gzip, deflate',
            'content-type': 'application/json',
          },
          body: JSON.stringify(messageChunk),
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.errors?.[0]?.message ?? `Expo push request failed with ${response.status}`);
        }

        tickets.push(...(Array.isArray(payload.data) ? payload.data : [payload.data]));
      }

      const ticketErrors = tickets.filter((ticket) => ticket.status === 'error');

      if (ticketErrors.length === tickets.length) {
        failed += 1;
        await supabase
          .from('notification_events')
          .update({
            status: 'failed',
            error: ticketErrors.map((ticket) => ticket.message ?? ticket.details?.error ?? 'Expo push ticket failed').join('; '),
          })
          .eq('id', event.id);
        continue;
      }

      sent += 1;
      await supabase
        .from('notification_events')
        .update({ status: 'sent', error: ticketErrors.length > 0 ? 'Some Expo push tickets failed' : null, sent_at: new Date().toISOString() })
        .eq('id', event.id);
    } catch (error) {
      failed += 1;
      await supabase
        .from('notification_events')
        .update({ status: 'failed', error: error instanceof Error ? error.message : 'Expo push dispatch failed' })
        .eq('id', event.id);
    }
  }

  return jsonResponse({
    ok: true,
    processed: pendingEvents.length,
    sent,
    skipped,
    failed,
  });
});
