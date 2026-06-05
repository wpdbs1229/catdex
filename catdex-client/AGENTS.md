# AGENTS.md

## Project Overview

This project is a mobile-first Expo React Native + TypeScript application for 냥도감.

The app uses Supabase directly for Auth, Postgres data, RPC, and Storage.

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

Do not put all code into `App.tsx`. `App.tsx` should only handle global layout, screen state, and top-level composition.

Business/domain concepts should be separated into feature folders.

## Current Navigation

The bottom tab bar has four tabs:

- `home`: personal discovery map
- `dex`: cat card grid
- `capture`: camera and registration flow
- `my`: profile, stats, exploration history, notifications

## Folder Structure

```txt
src/
  app/
    App.tsx

  features/
    auth/
    splash/
    cats/
    capture/
    map/
    my/
    notifications/

  shared/
    api/
    supabase/
    components/
    constants/
    notifications/
    styles/
    types/
    utils/
```
