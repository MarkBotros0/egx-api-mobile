# Borsa Compass — mobile

Expo (SDK 57) React Native client for Borsa Compass (formerly EGX Analytics). The backend is `../egx-api-be`;
the web client `../egx-api-fe` owns the shared API client, types and maths in
`src/app/lib/`, copied here into `src/shared/` (never edit it here).

## Setup
1. Clone `egx-api-fe` beside this repo (`../egx-api-fe`).
2. `npm install`
3. `cp .env.example .env` and set `EXPO_PUBLIC_API_BASE_URL` (same as the web's `NEXT_PUBLIC_API_BASE_URL`).
4. `npx expo start --tunnel`, scan the QR code with Expo Go.

## Scripts
- `npm run verify` — shared-code drift check, typecheck, lint, tests. Run before every commit.
- `npm run sync:shared` — refresh `src/shared/` after changing `egx-api-fe/src/app/lib`.

## Plans
`docs/superpowers/plans/` — start with `2026-10-10-00-roadmap.md`.
