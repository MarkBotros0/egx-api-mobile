# Score Alerts — Design

**Status:** approved in conversation 2026-10-11; awaiting written-spec review.
**Repos touched:** `egx-api-be` (detection, storage, delivery, endpoints) and
`egx-api-mobile` (preferences, permission, token registration, tap routing).
The web app (`egx-api-fe`) is unchanged.

## 1. Intent

Tell a user, while the market is open, when the composite score of a stock they
care about moves a lot within one trading session — up or down — so they can go
and look. It is an **indicator, never an instruction**: no "buy", "sell",
"opportunity" or "risk" anywhere in the copy.

Why the neutral wording is a hard rule and not a style choice: the app's own
walk-forward backtest (see `composite.classify_signal` and CLAUDE.md, *the
per-stock score cannot rank stocks, IC ≈ 0*) shows a single stock's score does
not predict its returns. A notification that framed a score jump as an
opportunity would claim what the app's evidence contradicts. The copy reports
a fact — the score moved from X to Y and is now in band Z — using the existing
condition labels (Very Strong / Strong / Neutral / Weak / Very Weak).

**What the user said:** check scores regularly; if a score rises or falls by
10% in the same day, notify every user who has that stock in their watchlist,
or every user who chose "all stocks". Scope (watchlist vs all) and the
threshold are per-user preferences. Delivery must be free; FCM is acceptable.

**Assumptions made explicit:**
- "10%" means **10 points on the 0–100 score** (10% of the scale), not a
  relative change. A relative 10% would fire a score of 30 on a 3-point move.
- "Watchlist" scope includes **holdings** (`portfolio`) as well as `watchlist`.
- "Same day" means the **trading session**, identified by the bar date, so
  weekends and holidays need no calendar.

**Success:** a user with alerts on gets one push within ~20–30 minutes of a
qualifying move, at most once per stock per direction per session; tapping it
opens that stock showing the same score the push named.

## 2. Delivery platform

**Expo Push Service** via `expo-notifications`. Free with no message cap; on
Android it delivers through **FCM**, on iOS through APNs. One token format for
both platforms; the backend sends with a plain HTTPS POST to
`https://exp.host/--/api/v2/push/send` (batches of ≤100) — no Firebase SDK in
Python.

Rejected: direct FCM (`@react-native-firebase` + `firebase-admin`) — same cost,
more native setup, and iOS still needs an APNs key; OneSignal — a third-party
SDK and dashboard for nothing we need.

Prerequisites (owner: user, not code):
- Android: a free Firebase project; its FCM V1 service-account key uploaded to
  EAS (`eas credentials`); `google-services.json` referenced from `app.json`.
- iOS: Apple Developer Program membership ($99/yr, required for the App Store
  anyway); push key generated through EAS.
- Testing needs a **development build** (`expo-dev-client`); Expo Go cannot
  receive remote pushes.

## 3. Open item 0 — does the daily bar move during the session?

Scores are computed from daily bars fetched through tvDatafeed. Whether that
feed returns **today's in-progress bar** during the session is unverified.

- **If yes:** intraday rescoring produces moving scores; alerts arrive within
  a rescoring pass (~20 min) of the move. This is the design target.
- **If no:** scores only change once the session's bar is final. Everything in
  this spec still works unchanged; alerts simply arrive once, after the close.

The first plan task measures this during a live session (Sun–Thu,
10:00–14:30 Africa/Cairo) and records the answer in CLAUDE.md. No design branch
depends on it.

## 4. Architecture

```
cron-job.org ── every 1 min, Sun–Thu 10:00–15:30 Cairo (plus existing night runs)
   │ POST /api/cron/risk_snapshot   X-Cron-Secret
   ▼
risk_snapshot handler (existing, stalest-first, ~4 symbols per call)
   for each symbol rescored:
     1. capture baseline   (before overwriting the row)
     2. upsert snapshot    (existing)
   then, with the remaining time budget:
     3. detect signals for the symbols just rescored  → alert_log rows
     4. deliver pending alert_log rows                → Expo Push
   ▼
Expo Push ─► FCM / APNs ─► device ─► tap ─► StockDetail(symbol)
```

Detection and delivery ride the existing scoring call rather than a separate
cron: the moment a score changes is the moment to check it, the handler
already has the new category scores in hand, and it costs no extra scheduler
slot. Both steps are bounded by the handler's existing `DEADLINE_SECONDS`;
anything not delivered stays `pending` and the next call sends it.

**Cost check:** a call per minute for ~5.5 h × 5 days ≈ 1,650 calls/week at
≤20 s each — inside cron-job.org's free tier and Vercel Hobby's compute.

### 4.1 Baseline capture

A symbol's baseline for a session is **its category scores as of the previous
session's close** — i.e. whatever the snapshot row held before the first
rescore that carries a new `last_bar_date`.

In the scoring loop, before `upsert_snapshot` overwrites a row: if the new
`last_bar_date` differs from the stored one and the stored row has category
scores, insert `(symbol, session_date = new last_bar_date, <8 categories>,
source_bar_date = old last_bar_date)` into `score_baseline`
(`ON CONFLICT DO NOTHING` — first capture of the session wins).

No baseline for a symbol/session (new symbol, previously unscorable) → no
alerts for it that session. Never guess a baseline.

### 4.2 Detection — `detect_signals` (pure)

```
detect_signals(symbol, session_date, baseline_cats, current_cats, regime,
               subscribers, already_sent, sent_today_count) -> list[Signal]
```

For each subscriber `(user_id, weights, rise_threshold, fall_threshold)`:
- `before = blend_categories(baseline_cats, weights, regime)`
- `after  = blend_categories(current_cats,  weights, regime)`
  — **the same `regime` for both**, so a market-wide regime flip cannot fire
  alerts on every stock; only the stock's own movement counts.
- `delta = after − before` (rounded to 1 decimal, as displayed).
- `delta ≥ rise_threshold` → `up`; `delta ≤ −fall_threshold` → `down`;
  a threshold of `None` means that direction is off.
- Skip if `(user, symbol, session_date, direction)` is already in `already_sent`.
- Either composite is `None` (unscorable) → no signal.

Subscribers for a symbol:
- users with alerts **on** and scope `all`, plus
- users with alerts on and scope `watchlist` who have the symbol in
  `watchlist` or `portfolio`,
- and who have at least one row in `push_devices`.

Weights come from the user's saved weights (`get_weights_from_db(db, user_id)`),
regime from `fetch_macro(db)`, the same source `/api/dashboard` uses — so the number in the push
equals the number the stock page shows.

### 4.3 Daily cap

At most **10** alerts per user per session date. The 11th signal of the day
becomes a single summary alert ("More stocks moved today — open Borsa
Compass"); signals beyond it are recorded as `suppressed`, not sent. The cap
counts `sent` + `pending`.

### 4.4 Delivery

`deliver_pending(db, sender, now)`:
- Reads `alert_log` rows with `status = 'pending'`, newest session first.
- **Quiet hours 22:00–08:00 Africa/Cairo:** nothing is sent; rows stay
  pending and go out on the first call after 08:00 **if their session_date is
  still the latest session**, otherwise they are marked `expired` (yesterday's
  move is not news).
- Groups by user, fans out to each of the user's tokens, POSTs to Expo in
  batches of ≤100.
- Expo ticket `ok` → `sent` (+ `sent_at`); ticket error `DeviceNotRegistered`
  → delete that token; other errors → leave `pending`, increment `attempts`,
  give up (`failed`) after 3.
- `sender` is injected so tests never touch the network.

Receipts (the second Expo round trip) are **not** polled in v1;
`DeviceNotRegistered` on the ticket covers the common dead-token case.

### 4.5 Notification content

```
title: "COMI score up 12 points"        |  "FWRY score down 12 points"
body:  "58 → 70 · now Strong"           |  "62 → 50 · now Neutral"
data:  { "type": "score_alert", "symbol": "COMI", "session": "2026-10-11" }
```

Band labels come from `classify_signal`. Banned words in any alert copy:
buy, sell, opportunity, risk, recommend — enforced by a test.

## 5. Data model (`app/core/db.py`, additive, idempotent)

```sql
push_devices (
  token       TEXT PRIMARY KEY,          -- ExponentPushToken[...]
  user_id     TEXT NOT NULL,
  platform    TEXT NOT NULL,             -- 'ios' | 'android'
  created_at  TEXT NOT NULL,
  last_seen   TEXT NOT NULL
)  -- index on user_id

alert_preferences (
  user_id         TEXT PRIMARY KEY,
  enabled         BOOLEAN NOT NULL DEFAULT FALSE,
  scope           TEXT NOT NULL DEFAULT 'watchlist',  -- 'watchlist' | 'all'
  rise_threshold  INTEGER DEFAULT 10,    -- 5|10|15|20, NULL = off
  fall_threshold  INTEGER DEFAULT 10,    -- 5|10|15|20, NULL = off
  updated_at      TEXT NOT NULL
)

score_baseline (
  symbol           TEXT NOT NULL,
  session_date     TEXT NOT NULL,
  cat_<name> DOUBLE PRECISION × 8      -- card_snapshot.CATEGORY_COLUMNS, same as risk_snapshot
  source_bar_date  TEXT,
  captured_at      TEXT NOT NULL,
  PRIMARY KEY (symbol, session_date)
)  -- rows older than 10 days deleted opportunistically by the cron

alert_log (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  symbol        TEXT NOT NULL,           -- '*' for the daily-cap summary
  session_date  TEXT NOT NULL,
  direction     TEXT NOT NULL,           -- 'up' | 'down' | 'summary'
  score_before  DOUBLE PRECISION,
  score_after   DOUBLE PRECISION,
  status        TEXT NOT NULL,           -- pending|sent|failed|suppressed|expired
  attempts      INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  sent_at       TEXT,
  UNIQUE (user_id, symbol, session_date, direction)
)
```

The `UNIQUE` constraint is the duplicate guard of last resort: two overlapping
cron calls cannot both insert the same alert.

## 6. API (all under the existing bearer auth unless noted)

| Method & path | Purpose |
|---|---|
| `POST /api/push/devices` | Body `{token, platform}`. Upsert; re-binds a token to the caller if it belonged to another user (shared phone). Rejects tokens not shaped `ExponentPushToken[…]`. |
| `DELETE /api/push/devices/{token}` | Called on logout. Deletes only the caller's own token. |
| `GET /api/alerts/preferences` | Returns the row, or defaults if none. |
| `PUT /api/alerts/preferences` | Validates scope ∈ {watchlist, all}, thresholds ∈ {5,10,15,20,null}. |
| `GET /api/alerts` | The caller's last 30 days of `sent` alerts (for an in-app list later; v1 mobile does not render it). |

No new public route: `test_auth_gate.py` must keep passing; detection and
delivery live inside the already secret-guarded `risk_snapshot` cron.

## 7. Mobile

**Amends the "Everything must run in Expo Go" rule** in the mobile CLAUDE.md:
the app must still *run* in Expo Go, but remote push cannot work there
(unavailable on Android since SDK 53). In Expo Go
(`Constants.executionEnvironment === 'storeClient'`) the Alerts screen
renders disabled with "Alerts need the installed app build", and no
registration is attempted. Every other screen is unaffected. CLAUDE.md is
updated to say so.

- Dependencies (via `npx expo install`): `expo-notifications`, `expo-device`,
  `expo-dev-client` (development profile only).
- `app.json`: `expo-notifications` plugin with `icon` (96×96 all-white PNG,
  generated by `npm run icons`), `color` (mint accent), `defaultChannel:
  "score-alerts"`; Android `googleServicesFile`; `extra.eas.projectId` (set by
  `eas init` — a user prerequisite, since `getExpoPushTokenAsync` needs it).
- API names verified against the SDK 57 docs: `setNotificationHandler`
  returning `shouldShowBanner`/`shouldShowList`/`shouldPlaySound`/
  `shouldSetBadge`; `getExpoPushTokenAsync({ projectId })`;
  `setNotificationChannelAsync('score-alerts', { name, importance })` **before**
  requesting a token (Android 13+ shows no permission prompt until a channel
  exists); `addNotificationResponseReceivedListener` +
  `getLastNotificationResponseAsync()` for cold start.
- **Alerts screen** — new route `src/app/alerts.tsx` (stack screen, header
  "Score alerts"), opened from a bell button in the tab header beside
  Admin / Log out (the app has no Settings screen). Contents: master switch, scope (Watchlist &
  holdings / All stocks), "Notify when a score rises by" (Off/5/10/15/20),
  "…falls by" (Off/5/10/15/20). Saves through `PUT /api/alerts/preferences`.
  Copy states plainly: "A change in score is information, not advice."
- Turning the switch **on** requests OS permission. Denied → switch reverts
  to off and shows how to enable it in system settings. Granted → get the Expo
  token (`getExpoPushTokenAsync({projectId})`), `POST /api/push/devices`.
- On every app start while signed in and permitted: re-register the token
  (tokens can rotate; refreshes `last_seen`).
- Logout: `DELETE /api/push/devices/{token}` before clearing auth (best effort).
- Token fetch can reject on network failure: wrapped, retried on the next app
  start, never surfaced as an error toast.
- Tap handling (listener + cold-start last response, then
  `clearLastNotificationResponseAsync()` so it is not replayed):
  `type === 'score_alert'` → navigate to StockDetail for
  `symbol`; `symbol === '*'` → Dashboard.
- Foreground: show the banner and list entry, no sound, no badge.
- Android channel `score-alerts`, `AndroidImportance.DEFAULT`.
- Expo Go guard: all of the above is skipped in `storeClient`; a jest test
  pins that the screen renders disabled there.

## 8. Error handling summary

| Failure | Behaviour |
|---|---|
| Expo unreachable / 5xx | Rows stay `pending`, retried next call, `failed` after 3 attempts |
| Token dead | Deleted on `DeviceNotRegistered` |
| Deadline reached mid-delivery | Rest stays `pending` |
| No baseline for symbol | No alerts for that symbol this session |
| Unscorable composite | No signal |
| Overlapping cron calls | `UNIQUE` on alert_log; baseline `ON CONFLICT DO NOTHING` |
| Detection raises | Logged; never fails the scoring call (scores are the primary job) |
| Permission denied on device | Switch stays off; nothing registered |

## 9. Testing

Backend (no Postgres, project convention — pure functions + fakes):
- `detect_signals`: thresholds inclusive at exactly ±T; direction off when
  `None`; same-regime blending (a regime change alone yields no signal);
  dedupe per direction; up and down both possible for one stock in one day;
  unscorable → nothing; per-user weights give different deltas.
- Baseline capture: written only when `last_bar_date` changes; first capture
  wins; no baseline from a row without categories.
- Daily cap: 10 sent, 11th becomes the summary, 12th+ suppressed.
- Delivery: batching ≤100; `DeviceNotRegistered` deletes the token; retries
  and `failed` after 3; quiet hours hold; stale session expires.
- Copy test: no banned word in any title/body produced.
- Preferences validation; device registration ownership (cannot delete
  another user's token); auth-gate sweep still covers every new route.

Mobile (jest):
- Alerts screen logic (threshold options, scope, save payload).
- Permission flow: denied reverts the switch; granted registers.
- Tap routing: symbol → StockDetail, `*` → Dashboard, unknown type ignored.

Manual (device checklist): receive a test push on Android and iOS dev builds;
tap from killed state opens the stock.

## 10. Out of scope (v1)

In-app alert history screen; web push; per-stock mute; custom thresholds
beyond the four steps; Expo receipt polling; alerts on price (not score).
