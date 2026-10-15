# Borsa Compass — mobile (Expo) — guide for Claude

Borsa Compass (formerly "EGX Analytics") — React Native port of the web app (`../egx-api-fe`, Next.js) — the
Egyptian Exchange analysis/portfolio app. **The port changes the rendering, never
the rules.** Product rules live in `../egx-api-fe/CLAUDE.md`; read that screen's
section before touching a screen. Expo specifics: @AGENTS.md (do not trust
training data for Expo APIs — read `https://docs.expo.dev/versions/v57.0.0/`).

Binding plan set: `docs/superpowers/plans/2026-10-10-00-roadmap.md` (+ plans 01–05).

## Stack and commands

Expo SDK 57 · RN 0.86 · React 19.2 · TS 6 · Expo Router (`src/app`) · NativeWind 4.2.7
(Tailwind 3) · react-native-svg + d3 charts · Jest (`jest-expo`) + RNTL 14.

| Command | What |
|---|---|
| `npx expo install <pkg>` | ONLY way to add deps (`-- --dev` for dev deps). Exception: `tailwindcss@^3.4.17` |
| `npm run verify` | `check:shared` + `typecheck` + `lint` (`expo lint`) + `jest --ci` — green before every commit |
| `npm run sync:shared` / `check:shared` | copy / diff `../egx-api-fe/src/app/lib/*` → `src/shared/` |
| `npm run icons` | regenerate `assets/*.png` (incl. `notification-icon.png`, 96×96) from the web logo SVG |
| `npm run gen:chart-fixtures` | regenerate `src/charts/__fixtures__` |
| `npx expo start` | dev server — **always in tmux**: `tmux new -d -s egx-mobile-metro "npx expo start 2>&1 \| tee ~/logs/egx-mobile-metro.log"` |

Long-running commands (Metro, long test runs, EAS builds) go in tmux with output in
`~/logs/egx-mobile-<task>.log`; tell the user the session name and log path.
`expo lint`/`expo start` may rewrite `tsconfig.json` — revert it if unintended.

## Layout

- `src/app/` — routes ONLY (no tests, no components). Tabs: Dashboard, Portfolio, Learn, News.
  `src/navigation/` holds the root navigator.
- `src/shared/` — **GENERATED, never edit.** Change `../egx-api-fe/src/app/lib/`, commit
  there, `npm run sync:shared` here, commit here. Must stay platform-neutral.
- `src/ui/` UI kit (`Screen`, `Card`, `Sheet`, `Button`, `TextField`, …) · `src/charts/` chart kit ·
  `src/auth/`, `src/providers/` (app-wide state).
- Markets: `src/providers/market.tsx` (`MarketProvider`, `useMarket`) owns the selected
  market and calls `setApiMarket`; the chip, sheet and `MarketRow` live in `src/features/shell`.
  The rules (EG default, `ENABLED_MARKETS`, the per-user preference) are in the **Markets**
  section of `../egx-api-be/CLAUDE.md`.
- `src/features/<name>/` — one folder per area: `admin`, `alerts`, `auth`, `calibration`, `common`
  (shared widgets), `learn`, `market` (dashboard, stock, compare, news, dividends),
  `portfolio`, `shell`.
- `src/lib/` — small helpers: `env` (`apiBaseUrl`, `normalizeBaseUrl`), `runtime` (`isExpoGo`), `links` (`learnHref`,
  `stockHref`, `routes`), `errors` (`errorMessage`), `dates`, `zones`, `apiSetup`.
  `pct` lives in `@/features/market/logic/format`.
- `src/test-utils/` — `render.tsx` (`renderWithProviders`), `renderScreen.tsx`
  (`renderScreen`), `safeArea.tsx` (`TestSafeArea`), `fetch.ts`, and the shared jest
  mocks `datePickerMock`, `sliderMock`, `asyncStorageMock`, `sheetMock`, `secureStoreMock`, `socialAuthMock`
  (load with `jest.requireActual` inside `jest.mock` factories). Reuse, don't retype.
- Tests in `__tests__/` beside the code (`*.test.ts(x)`); route tests in `src/__tests__/routes/`.
- Import across folders with `@/…`; relative only within a folder.

## Rules that are easy to break

- `gain`/`loss` (and Learn's `V.up`/`V.down`) mean a real direction in the data, never decoration.
  Hexes only from `COLORS` (`@/shared/theme`) or `V` (`@/shared/learnVisuals`).
- Score labels are condition words (`scoreBand`/`SCORE_BAND_LABEL`), never Buy/Sell.
- Fonts are families: `font-sans`, `-medium`, `-semibold`, `-bold`, `font-mono`, `font-mono-semibold`.
- NativeWind: em tracking → px, relative leading → px, `space-y` → `gap`, no `md:`/`hover:`.
- Never `{n && <X/>}` with a number/string `n` — use a ternary.
- Touch targets ≥ 44pt. Safe areas via `Screen` only. `Screen scroll` applies `px-4`
  (don't add another); `Screen scroll={false}` applies NONE — the list or scroll view
  inside pads itself to 16pt (double padding once put every margin at 32pt). `Screen` pads NO edge by default:
  every signed-in screen sits under a tab or stack header that already clears the
  notch, and a `["top"]` there doubled the gap (fixed 2026-10-14). Only the signed-out
  screens (`AuthShell`, no header) pass `edges={["top", "bottom"]}`. The tab bar is
  `src/features/shell/PillTabBar.tsx` — the web's floating pill, not the stock bar — and
  pads the bottom inset itself. Widths come from layout, never `Dimensions` at module scope.
- Everything must RUN in **Expo Go**. Two exceptions: (1) remote push (score alerts) — Expo Go cannot receive it, so `src/features/alerts` checks `isExpoGo()` and renders disabled there; (2) Google sign-in — `isExpoGo()` (in `src/lib/runtime.ts`) hides the button, and `@react-native-google-signin/google-signin` is `require`d lazily inside `GoogleButton.tsx` and must NEVER be imported at top level (it throws at import time in Expo Go). Apple sign-in in Expo Go on iOS works ONLY against a development backend that lists `host.exp.Exponent` in `APPLE_CLIENT_IDS` AND sets `APPLE_ALLOW_EXPO_GO=1`; the production backend refuses that audience (every Expo Go app receives it, so accepting it would allow account takeover by email), so in Expo Go against production Apple sign-in fails with 401 — use a development or store build. No other custom native modules.
- Money inputs accept 3 decimals; share counts are integers.
- UI sweep rules (2026-10-14, from emulator screenshots against the web):
  - The phone layout follows the web AT PHONE WIDTH: dashboard = controls then
    stocks, market condition + watchlist after the list. Cards: 2 per row on a phone
    (`StockCard compact`, the web's half-width card; it uses `grow`, never `flex-1`,
    which collapsed cards to zero height on a cold start), 3 from 700pt, 1 under 340pt.
  - The pill tab bar FLOATS over content (absolute, reports its height); tab screens
    pad their scroll content with `useTabBarClearance()`.
  - The tab header carries only the market chip (`MarketChip`, flag + currency; hidden
    with one enabled market or while the preference loads), the alerts bell and the
    account button; the Account screen has the matching `MarketRow`. Compare and
    Dividends are labelled buttons under the dashboard title (no bare icons).
  - Tab headers show the `BrandTitle` wordmark; a stack screen's top bar carries its
    title (and actions, e.g. the stock page's watch star) — never repeat it in the body.
  - Dashboard filters are TWO rows: index chips, then three dropdown chips (Filter =
    sector + dividend payers, Sort, Score) that open sheets holding the choices and
    their explanations (`DashboardControls`).
  - Chip rows elsewhere: `PillRow label=…` with a `RowLabel` ("INTERVAL", "HISTORY"); selectable
    `Pill`s are borderless until chosen, on/off toggles pass `outlined`. Explanations
    hang off the dotted row label (`LearnTerm`), not paragraphs between rows.
  - `LearnTerm` draws its own dashed underline (Android renders a one-side dashed
    border solid); pass `className` so the term matches the labels around it.
  - Sign-in providers are round icon buttons (`ProviderIconButton`), never the
    providers' native buttons, which follow the phone's language.
  - The portfolio appears in one piece: realized winnings wait for the analysis
    (or its failure) instead of popping in above skeletons.

## Learn

Content is the SHARED `@/shared/curriculum` (web `lib/curriculum.ts`), diagrams are
`VisualSpec` objects rendered by `src/features/learn/LearnVisual.tsx` (twin of the web's
`components/learn/LearnVisual.tsx` — a new kind needs a case in both). Edit content in
the web repo only.
- Anchors are a public contract: 9 hyphenated module ids, underscore concept ids; never
  rename/drop (pinned by `sharedCurriculum.test.ts`). Deep link = `learnHref(id)` →
  `/learn?concept=<id>`; module ids and title slugs work too; the param is cleared
  after handling so the same link works twice.
- Seeded `walk()`, never `Math.random()`; gradient ids from `useId()` (sanitised).
- Cards rest VISIBLE; the only animation is the deep-link flash ring over an opaque card.
- Widgets import their formula (`@/shared/learnWidgets` → `constants`); curriculum strings
  interpolate `T_BILL_RATE_PCT`.
- Search: `searchConcepts`/`normalizeSearch` fold punctuation on both sides.
- Progress: AsyncStorage key `egx.learn.progress`, keyed by `conceptKey()`; storage failures
  are swallowed; taps before hydration are replayed.
- LiveChart: ONE shared COMI fetch, armed by FlatList viewability, silent fallback to the diagram.

## Accounts

Sign-in is by **email + password**. Signed-out screens (login, signup, forgot-password, under a signed-out
route guard) live in `src/features/auth/`; signed-in users get `/account` (`src/features/account/`), opened
from the header person-circle button (`AccountHeaderButton`). **Log out lives on the Account screen**, next
to "Delete account" (typed confirmation; Apple requires in-app deletion). Emailed verify/reset links open the
**web app**, after which the user signs in here. `AuthProvider` (`src/auth/AuthProvider.tsx`) exposes `login`,
`completeSignIn(session)` (used by the Google/Apple buttons), `deleteAccount` and `logout`. `SocialButtons`
decides what renders: Apple only on iOS when `AppleAuthentication.isAvailableAsync()`; Google only outside
Expo Go and when `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is set (both client ids are read lazily, at call time).
Jest mocks for both providers: `src/test-utils/socialAuthMock.ts`.

## Admin

"Manage users" button on the Account screen (admins only, `ManageUsersButton`) → `/admin`, guarded by `Stack.Protected guard={isAdmin}` plus an in-screen
"Admins only". Admin **invites a user by email** (`InviteUserSheet`) and can **send a reset email** (or
re-send the invitation); no passwords are generated or shown. No role picker (admin = server `AUTH_ADMINS`).
You cannot disable/delete yourself.

## Environment and release

`.env` (gitignored; see `.env.example`): `EXPO_PUBLIC_API_BASE_URL` (via `apiBaseUrl()`),
`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` (Google sign-in), and build-time
`GOOGLE_IOS_URL_SCHEME` (reversed iOS client id), read by `app.config.ts`, which adds the
`@react-native-google-signin/google-signin` plugin only when it is set (the plugin is deliberately NOT in
`app.json`). EAS builds read them from EAS environments,
not `.env`. App name "Borsa Compass", bundle id / package `com.markbotros.borsacompass`, scheme
`borsacompass` — chosen 2026-10-11; the id is permanent after the first store upload. Build/submit steps: `docs/release.md`.

## Score alerts

Push alerts when a stock's composite score moves by the user's threshold. Files in `src/features/alerts/`:
- `push.ts` — the **only** file importing `expo-notifications` / `expo-device`. `isExpoGo()` guards it.
- `api.ts` — mobile-only API calls; uses `getApiConfig` (not `src/shared/api.ts`, which is generated from the web).
- `registration.ts` — token registration. The Expo push token is kept in SecureStore under key `egx.push.token`, and is removed only after the server DELETE succeeds (a failed one is re-bound by the next `syncRegistration`). Logout waits at most 3 s for that DELETE (`boundedUnregister` in `AuthProvider`).
- `AlertsScreen` (route `src/app/alerts.tsx` → `/alerts`), opened from the bell header button (`AlertsHeaderButton`).
- `NotificationRouter` — mounted in `RootNavigator` while signed in; handles taps and foreground banners. `push.ts` remembers the last handled notification identifier so a remount (next login) never replays an old tap. `AlertsScreen` shows "Turn on for this phone" when the account has alerts on but this phone has no token (`deviceRegistered()`).

Copy rule: never use buy/sell/opportunity/risk/recommend. Alerts say what changed, and the screen states "A change in score is information, not advice."

Testing: push only works in a **dev build** (`npx eas-cli@latest build --profile development`). Expo Go renders the screen disabled. Jest mocks live in `src/test-utils/notificationsMock.ts`, loaded from `jest.setup.ts`.

## Git

Remote `origin` = github.com/MarkBotros0/egx-api-mobile (default branch `main`). Push only
when asked: `gh auth switch --hostname github.com --user MarkBotros0 && git push`. Commit trailer:
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` +
`Claude-Session: https://claude.ai/code/session_01XDkAB7UCK8WyT267W5ZxNV`.
