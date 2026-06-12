# RevenueCat Webhook Deploy

Target Supabase project: `wqiqdybzhbmsvccpklli`

## Current Remote State

- Before this change, Edge Functions only included `notification-dispatch`.
- `revenuecat-webhook` is deployed with `verify_jwt = false`; the function rejects requests unless its own `REVENUECAT_WEBHOOK_SECRET` check passes.
- `user_entitlements`: restored for the shared map lifetime entitlement
- Local follow-up migration `supabase/migrations/000019_restore_user_entitlements_for_revenuecat.sql` keeps the table available if later migrations remove it first.

## Required Secrets

Set the webhook secret before enabling the RevenueCat integration:

```sh
supabase secrets set REVENUECAT_WEBHOOK_SECRET='<strong-random-secret>' --project-ref wqiqdybzhbmsvccpklli
```

Optional, only if the RevenueCat entitlement id differs from `shared_map`:

```sh
supabase secrets set REVENUECAT_SHARED_MAP_ENTITLEMENT_ID='<revenuecat-entitlement-id>' --project-ref wqiqdybzhbmsvccpklli
```

RevenueCat Webhook settings:

- URL: `https://wqiqdybzhbmsvccpklli.supabase.co/functions/v1/revenuecat-webhook`
- Authorization header: `Bearer <strong-random-secret>`
- Events: include purchase, renewal, cancellation, uncancellation, expiration, billing issue, refund, subscription paused, subscription extended, temporary entitlement grant, and transfer events.

## Deploy

The endpoint is a third-party webhook, so JWT verification must be disabled and the function must enforce `REVENUECAT_WEBHOOK_SECRET` itself:

```sh
supabase functions deploy revenuecat-webhook --no-verify-jwt --project-ref wqiqdybzhbmsvccpklli
```

If applying pending database migrations, do not blindly push all local migrations to production. The remote migration history currently predates local removal migration `000018_remove_customization_social_badges.sql`, which drops `user_entitlements`. Apply the entitlement restore migration only after confirming the intended production migration sequence.

## Verify

Unauthorized requests must be rejected:

```sh
curl -i -X POST \
  'https://wqiqdybzhbmsvccpklli.supabase.co/functions/v1/revenuecat-webhook' \
  -H 'content-type: application/json' \
  -d '{"event":{"type":"TEST"}}'
```

Expected result: `401 Unauthorized`.

After setting `REVENUECAT_WEBHOOK_SECRET`, replace `<user-id>` with an existing Supabase Auth user id and send a signed RevenueCat-shaped event:

```sh
curl -i -X POST \
  'https://wqiqdybzhbmsvccpklli.supabase.co/functions/v1/revenuecat-webhook' \
  -H 'authorization: Bearer <strong-random-secret>' \
  -H 'content-type: application/json' \
  -d '{
    "event": {
      "id": "manual-verification-initial-purchase",
      "type": "INITIAL_PURCHASE",
      "app_user_id": "<user-id>",
      "period_type": "NORMAL",
      "entitlement_ids": ["shared_map"],
      "expiration_at_ms": null
    }
  }'
```

Expected result: `200 OK` with `"status":"active"`.

Confirm the database row:

```sql
select user_id, tier, status, source, current_period_ends_at
from public.user_entitlements
where user_id = '<user-id>';
```

Expected row:

- `tier = 'shared_map_lifetime'`
- `status = 'active'`
- `source = 'revenuecat'`
- `current_period_ends_at` is null for a lifetime purchase

Then verify cancellation and expiration transitions:

```sh
curl -i -X POST \
  'https://wqiqdybzhbmsvccpklli.supabase.co/functions/v1/revenuecat-webhook' \
  -H 'authorization: Bearer <strong-random-secret>' \
  -H 'content-type: application/json' \
  -d '{
    "event": {
      "id": "manual-verification-expiration",
      "type": "EXPIRATION",
      "app_user_id": "<user-id>",
      "entitlement_ids": ["shared_map"],
      "expiration_at_ms": 1767225600000
    }
  }'
```

Expected result: `200 OK` with `"status":"expired"`, and the database row status changes to `expired`.
