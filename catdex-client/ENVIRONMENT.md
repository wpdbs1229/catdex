# Environment Setup

Catdex uses two app variants.

| Variant | Build profile | App name | Scheme | iOS bundle id | Android package |
| --- | --- | --- | --- | --- | --- |
| Development | `development`, `preview` | `냥도감 Dev` | `catdex-dev` | `com.persimmontree.catdex.dev` | `com.persimmontree.catdex.dev` |
| Production | `production` | `냥도감` | `catdex` | `com.persimmontree.catdex` | `com.persimmontree.catdex` |

EAS Submit does not change environment values. The values are selected when the binary is built.

## EAS env values

Create these values separately for `development` and `production`.

```sh
eas env:create --environment development --name EXPO_PUBLIC_SUPABASE_URL --value https://dev-project.supabase.co --visibility plaintext
eas env:create --environment development --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value sb_publishable_dev --visibility plaintext
eas env:create --environment development --name EXPO_PUBLIC_OAUTH_REDIRECT_URI --value catdex-dev://auth/callback --visibility plaintext
eas env:create --environment development --name EXPO_PUBLIC_KAKAO_MAP_APP_KEY --value kakao_dev_javascript_key --visibility plaintext
eas env:create --environment development --name EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY --value kakao_dev_native_key --visibility plaintext
eas env:create --environment development --name EXPO_PUBLIC_KAKAO_MAP_WEB_ORIGIN --value https://catdex.local --visibility plaintext

eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value https://prod-project.supabase.co --visibility plaintext
eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value sb_publishable_prod --visibility plaintext
eas env:create --environment production --name EXPO_PUBLIC_OAUTH_REDIRECT_URI --value catdex://auth/callback --visibility plaintext
eas env:create --environment production --name EXPO_PUBLIC_KAKAO_MAP_APP_KEY --value kakao_prod_javascript_key --visibility plaintext
eas env:create --environment production --name EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY --value kakao_prod_native_key --visibility plaintext
eas env:create --environment production --name EXPO_PUBLIC_KAKAO_MAP_WEB_ORIGIN --value https://your-production-domain.example --visibility plaintext
```

## Local env

For local development, copy `.env.example` to `.env` and fill development values.

To sync EAS development values into local `.env`:

```sh
eas env:pull --environment development
```

## Builds

```sh
npm run build:dev:ios
npm run build:dev:android
npm run build:prd:ios
npm run build:prd:android
```

Store builds should use the production profile. Internal QA builds should use development or preview.

## External console settings

Supabase Auth redirect URLs must include:

```txt
catdex-dev://auth/callback
catdex://auth/callback
```

Kakao Developers must include the dev and production Android package names, iOS bundle IDs, URL schemes, key hashes, and web domains used by Kakao Map.
