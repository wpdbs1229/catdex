# AGENTS.md

## Project Overview

The app concept is "냥도감", a cat collection app where users take photos of street cats and collect them like a creature encyclopedia.

The app uses Supabase directly for Auth, Postgres data, RPC, and Storage.

**The client is being rewritten from scratch** to match an incoming design overhaul. Step 1 rebuilt the capture flow; 홈·도감·동네 화면은 피그마 "냥도감(제윤)" 시안대로 옮겨졌고, 마이페이지 탭만 자리표시자로 남아 있다. See `docs/capture-screen-rebuild.md` for that step and `docs/domain-rules.md` for rules that survive the rewrite.

## Tech Stack

- React Native + TypeScript on Expo
- React Navigation (native stack + bottom tabs)
- expo-camera (capture), react-native-gesture-handler (pinch zoom)
- Local Expo modules: `modules/cat-vision` (detection + cutout), `modules/camera-zoom` (device zoom range)
- Expo AuthSession, SecureStore, WebBrowser (OAuth)
- react-native-webview (Kakao Map)
- @react-native-kakao/core (native SDK config)
- @supabase/supabase-js — Auth, RLS, RPC, Storage
- lucide-react-native icons, StyleSheet.create based styling

The native modules mean **Expo Go will not work** — use a development build.

## Architecture Principles

Use a feature-based frontend structure.

Do not put all code into `App.tsx`. `App.tsx` should only handle global layout, route/screen state, and top-level composition.

Business/domain concepts belong in feature folders. Supabase access goes through `src/shared/api`, never inline in a screen.

## Current Folder Structure

Capture is implemented; other screens are placeholders until their design lands.

```txt
modules/
  cat-vision/               # local Expo module: cat detection + background cutout
  camera-zoom/              # local Expo module: device max zoom factor lookup

src/
  app/
    navigation/
      RootNavigator.tsx     # tabs + full-screen capture flow
      types.ts
    screens/
      PlaceholderScreen.tsx # blank white screen for undesigned tabs

  features/
    home/
      screens/HomeScreen.tsx  # 피그마 2_홈
      components/             # CrewIdCard(사원증), CatChatCard(ai 챗)
    capture/
      screens/              # CameraScreen, CaptureReviewScreen
      components/           # top bar, zoom chips, shutter, grid, cutout canvas
      hooks/useZoomControl.ts
      camera-zoom.ts        # normalized zoom <-> real factor conversion
      capture.theme.ts
    auth/
      hooks/
        useAuth.ts            # session, SecureStore, provider sign-in
    map/
      components/
        KakaoMapView.tsx      # WebView-based Kakao Map, region circles
      map-region-label.ts

  shared/
    native/
      catVision.ts            # bridge + coat-hint derivation
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
