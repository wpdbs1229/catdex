# AGENTS.md

## Project Overview

This project is a mobile-first React Native + TypeScript mockup application.

The app concept is "냥도감", a cat collection app where users take photos of street cats and collect them like a creature encyclopedia.

The app now uses Supabase directly for Auth, Postgres data, RPC, and Storage.

## Tech Stack

- React
- React Native
- TypeScript
- Expo
- Expo AuthSession
- Expo SecureStore
- Expo Camera
- StyleSheet.create based styling
- lucide-react-native
- @supabase/supabase-js
- Supabase Auth, RLS, RPC, and Storage

## Architecture Principles

Use a feature-based frontend structure.

Do not put all code into `App.tsx`.
`App.tsx` should only handle global layout, route/screen state, and top-level composition.

Business/domain concepts should be separated into feature folders.

## Folder Structure

```txt
src/
  app/
    App.tsx

  features/
    auth/
      LoginScreen.tsx
      hooks/
        useAuth.ts

    splash/
      SplashScreen.tsx

    home/
      HomeScreen.tsx
      components/
        TodaySummaryCard.tsx
        RecentCatCard.tsx

    cats/
      CatDexScreen.tsx
      CatDetailScreen.tsx
      hooks/
        useCats.ts
      components/
        CatCard.tsx
        CatGrid.tsx
        CatAffinityGauge.tsx
        EncounterTimeline.tsx

    capture/
      CaptureScreen.tsx
      components/
        CameraPlaceholder.tsx
        CatRegisterForm.tsx
        TagChipGroup.tsx

    map/
      MapScreen.tsx
      components/
        KakaoMapView.tsx
        RegionCatList.tsx

    my/
      MyPageScreen.tsx
      components/
        UserLevelCard.tsx
        BadgeGrid.tsx

  shared/
    api/
      auth.api.ts
      app.api.ts
      cats.api.ts

    supabase/
      client.ts

    components/
      AppShell.tsx
      BottomTabBar.tsx
      Button.tsx
      Chip.tsx
      ProgressBar.tsx
      SectionHeader.tsx
      Card.tsx

    data/
      auth.mock.ts
      cats.mock.ts
      badges.mock.ts
      regions.mock.ts

    types/
      auth.ts
      cat.ts
      badge.ts
      navigation.ts
      region.ts

    utils/
      cn.ts
```
