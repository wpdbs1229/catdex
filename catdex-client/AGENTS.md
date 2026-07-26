# AGENTS.md

## Project Overview

The app concept is "냥도감", a cat collection app where users take photos of street cats and collect them like a creature encyclopedia.

The app uses Supabase directly for Auth, Postgres data, RPC, and Storage.

**The client is being rewritten from scratch** to match an incoming design overhaul. All screens were removed; only the integrations we decided to reuse remain. See the root `AGENTS.md` for the current state and `docs/domain-rules.md` for rules that survive the rewrite.

## Tech Stack

- React Native + TypeScript on Expo
- Expo AuthSession, SecureStore, WebBrowser (OAuth)
- react-native-webview (Kakao Map)
- @react-native-kakao/core (native SDK config)
- @supabase/supabase-js — Auth, RLS, RPC, Storage
- StyleSheet.create based styling

Anything else (camera, icon set, navigation) is chosen when the new design lands.

## Architecture Principles

Use a feature-based frontend structure.

Do not put all code into `App.tsx`. `App.tsx` should only handle global layout, route/screen state, and top-level composition.

Business/domain concepts belong in feature folders. Supabase access goes through `src/shared/api`, never inline in a screen.

## Current Folder Structure

Only reused code remains. The full structure is defined when the new design is confirmed.

```txt
src/
  features/
    auth/
      hooks/
        useAuth.ts            # session, SecureStore, provider sign-in
    map/
      components/
        KakaoMapView.tsx      # WebView-based Kakao Map, region circles
      map-region-label.ts

  shared/
    api/
      auth.api.ts             # Kakao/Google OAuth, profile, withdrawal
      client.ts
    supabase/
      client.ts
    errors/
      user-facing-error.ts
    constants/
      profile.constants.ts
    styles/
      theme.ts                # placeholder, replaced by the new design
    types/
      auth.ts
      region.ts
```

Native Kakao SDK setup lives outside `src` and was kept as is: `app.config.js`, `app.json`, `plugins/withKakaoMavenRepo.js`.

## Recovering Removed Code

The pre-rewrite state is preserved in the `pre-redesign` tag.

```bash
git show pre-redesign:catdex-client/src/shared/api/cats.api.ts   # single file
git checkout pre-redesign -- catdex-client/src/shared/api        # whole folder
```

The Supabase schema is unchanged, so the old API layer still matches it and is worth reading before rewriting queries.
