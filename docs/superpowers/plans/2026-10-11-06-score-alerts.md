# Score Alerts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Push a notification to mobile users when the composite score of a stock they follow (or any stock, by preference) moves by at least their chosen number of points within one trading session.

**Architecture:** Detection and delivery ride the existing secret-guarded `POST /api/cron/risk_snapshot` (cron-job.org, every minute in session). Before each rescored row is overwritten, the previous session's category scores are captured as that session's baseline; after the scoring loop, each subscriber's composite is blended from baseline and current categories with their own weights and the SAME macro regime, and qualifying moves become `alert_log` rows sent through Expo Push (FCM on Android, APNs on iOS). Mobile gets an Alerts screen (preferences, permission, token registration) and routes a tapped notification to the stock.

**Tech Stack:** FastAPI + psycopg (Neon) + pytest with fake DBs; Expo SDK 57 (`expo-notifications`, `expo-device`, `expo-dev-client`), Expo Router, NativeWind, jest-expo + RNTL.

**Spec:** `egx-api-mobile/docs/superpowers/specs/2026-10-11-score-alerts-design.md`

## Global Constraints

- Two repos: backend `/home/mark/projects/egx-api/egx-api-be` (default branch `master`), mobile `/home/mark/projects/egx-api/egx-api-mobile` (default branch `main`). Work on a branch `score-alerts` in each (worktrees). The web repo `egx-api-fe` is touched ONLY to mirror CLAUDE.md (Task 7).
- `egx-api-fe/CLAUDE.md` and `egx-api-be/CLAUDE.md` must stay byte-identical: edit one, `cp` to the other, `cmp` them, commit in both repos.
- Threshold unit: **points on the 0–100 score**. Allowed values exactly `5, 10, 15, 20` or `null` (= that direction off). Defaults: enabled `false`, scope `"watchlist"`, rise `10`, fall `10`.
- Scope values exactly `"watchlist"` (watchlist ∪ portfolio holdings) and `"all"`.
- Daily cap: **10** alerts per user per session date, then ONE summary alert (`symbol = "*"`, `direction = "summary"`), then `suppressed`.
- Quiet hours: **22:00–08:00 Africa/Cairo** — nothing sent; pending rows from an older session than the latest are marked `expired` after quiet hours.
- Delivery retries: `failed` after **3** attempts.
- Alert copy never contains (case-insensitive, whole word): `buy`, `sell`, `opportunity`, `risk`, `recommend`. Band words come from `composite.classify_signal` (Very Strong / Strong / Neutral / Weak / Very Weak).
- Expo push endpoint `https://exp.host/--/api/v2/push/send`, ≤100 messages per POST, Android `channelId: "score-alerts"`.
- Backend tests never touch Postgres or the network (project convention: fake DB + injected senders).
- Backend venv: `/tmp/claude-1000/-home-mark-projects-egx-api/f3f9fba8-4a93-4720-b415-a22413998dfa/scratchpad/bevenv/bin/python` (create one with `python -m venv` + `pip install -r requirements.txt pytest` if missing). Run single test files directly; the FULL suite takes ~2.5 min and MUST run in tmux: `tmux kill-session -t egx-be-tests 2>/dev/null; tmux new -d -s egx-be-tests "cd /home/mark/projects/egx-api/egx-api-be && <venv python> -m pytest -q 2>&1 | tee ~/logs/egx-be-tests.log"`.
- Mobile: add deps ONLY with `npx expo install <pkg>`; `npm run verify` green before every mobile commit; `expo lint` may rewrite `tsconfig.json` → `git checkout tsconfig.json` if it changed. Mobile rules in `egx-api-mobile/CLAUDE.md` apply (touch targets ≥44pt, `Screen` owns `px-4`, no `{n && …}` with numbers, hexes only from `COLORS`/`V`).
- The app must still RUN in Expo Go: in Expo Go the Alerts screen renders disabled and nothing registers.
- Commit trailer on every commit:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01XDkAB7UCK8WyT267W5ZxNV
  ```
- Never push. Never use bare `git stash`. Never `pkill -f`.

## Rulings made while planning (deviations from the spec text)

1. **Open item 0 is resolved:** probed 2026-10-11 10:42 Cairo — `get_OHLCV_data(..., "Daily", 5)` returned a `2026-10-11` bar with partial volume for COMI, ETEL, FWRY. The daily bar moves intraday, so alerts fire mid-session. Task 12 records this in the spec and CLAUDE.md; no probe task.
2. **Device unregister is `DELETE /api/push/devices?token=…`** (query param, like `/api/watchlist`), not a path segment — Expo tokens contain `[` `]`.
3. **`googleServicesFile` is NOT added to `app.json` now:** the file does not exist until the user creates a Firebase project, and a missing file breaks the build. `docs/release.md` gets the step.
4. **Mobile API calls live in `src/features/alerts/api.ts`** using the exported `getApiConfig()`, not in `src/shared/api.ts` (that file is generated from the web repo, and the web has no alerts).
5. **`tzdata` is added to requirements** so `zoneinfo.ZoneInfo("Africa/Cairo")` works on Vercel regardless of the image's system tz database.

## Review Focus

1. A stock whose previous row has NO category scores (first scoring, or previously unscorable) must produce no baseline and no alert — never a "0 → 65" alert. Pinned in Task 3.
2. Two overlapping cron calls rescoring the same symbol must not send two pushes — `alert_log` UNIQUE + `ON CONFLICT DO NOTHING`, and detection skips already-logged keys. Pinned in Task 4.
3. A user who switches scope from watchlist to all must not get a burst for stocks that moved before they subscribed — baseline is per symbol (the previous close), so this is ACCEPTED behaviour: they get at most the cap. Pinned as an explicit cap test in Task 2.
4. A crash in alert code must never fail the scoring call (scores are the primary product). Pinned in Task 6.
5. Turning alerts on with permission denied must leave the switch OFF and save `enabled: false`. Pinned in Task 10.

---

## File map

**Backend (`egx-api-be`)**
- Modify `app/core/db.py` — 4 tables (Task 1).
- Modify `app/core/constants.py` — alert constants (Task 1).
- Create `app/core/score_alerts.py` — pure: `Subscriber`, `Signal`, `detect_signals`, `alert_copy`, `apply_daily_cap`, `in_quiet_hours` (Task 2).
- Create `app/core/alert_store.py` — DB glue: `read_previous_rows`, `capture_baselines`, `load_subscribers`, `run_detection` (Tasks 3–4).
- Create `app/core/expo_push.py` — `send_expo`, `deliver_pending` (Task 5).
- Modify `app/routers/cron.py` — hook baseline capture + detection + delivery (Task 6).
- Create `app/routers/alerts.py`; modify `app/main.py` (Task 7).
- Modify `requirements.txt` (`tzdata`) (Task 1).
- Tests: `tests/alert_fakes.py` (shared FakeDB), `tests/test_score_alerts.py`, `tests/test_alert_store.py`, `tests/test_expo_push.py`, `tests/test_alerts_router.py`, extend `tests/test_risk_grade.py`-style cron test in `tests/test_alert_cron_hook.py`.
- `CLAUDE.md` (mirrored to `egx-api-fe/CLAUDE.md`) (Task 7).

**Mobile (`egx-api-mobile`)**
- `package.json`, `app.json`, `scripts/make-icons.mjs`, `assets/notification-icon.png`, `jest.setup.ts`, `src/test-utils/notificationsMock.ts` (Task 8).
- Create `src/features/alerts/push.ts` (native boundary) (Task 8).
- Create `src/features/alerts/options.ts`, `api.ts`, `registration.ts` (Task 9).
- Modify `src/auth/AuthProvider.tsx` (logout unregisters) (Task 9).
- Create `src/features/alerts/AlertsScreen.tsx`, `AlertsHeaderButton.tsx`, `src/app/alerts.tsx`; modify `src/navigation/RootNavigator.tsx`, `src/app/(tabs)/_layout.tsx`, `src/lib/links.ts` (Task 10).
- Create `src/features/alerts/NotificationRouter.tsx`; modify `src/navigation/RootNavigator.tsx` (Task 11).
- `CLAUDE.md`, `docs/release.md`, spec (Task 12).

---

## BACKEND

### Task 1: Schema, constants, tzdata

**Files:**
- Modify: `app/core/db.py` (inside `init_db`, after the `risk_snapshot` ALTER loop near line 515)
- Modify: `app/core/constants.py` (append)
- Modify: `requirements.txt`
- Create: `tests/alert_fakes.py` (shared `FakeDB` for every alerts test — tests import sibling helpers top-level, exactly like `from route_table import api_routes`; there is no `tests/__init__.py` and none may be added)
- Test: `tests/test_alert_store.py` (new; later tasks append)

**Interfaces:**
- Produces: tables `push_devices`, `alert_preferences`, `score_baseline`, `alert_log`; constants `ALERT_THRESHOLD_CHOICES = (5, 10, 15, 20)`, `ALERT_DEFAULT_THRESHOLD = 10`, `ALERT_SCOPES = ("watchlist", "all")`, `ALERT_DAILY_CAP = 10`, `ALERT_MAX_ATTEMPTS = 3`, `ALERT_QUIET_START_HOUR = 22`, `ALERT_QUIET_END_HOUR = 8`, `ALERT_TIMEZONE = "Africa/Cairo"`, `ALERT_BASELINE_RETENTION_DAYS = 10`, `EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"`, `EXPO_BATCH_SIZE = 100`, `EXPO_TIMEOUT_SECONDS = 3.0`, `ALERT_CHANNEL_ID = "score-alerts"`.

- [ ] **Step 1: Write the failing test**

Create `tests/alert_fakes.py`:

```python
"""
A scriptable fake DB for the score-alerts tests: matches on a substring of the
SQL (first match wins) and records every statement. Same pattern as
tests/test_users_and_roles.py; imported top-level like route_table.py.
"""

from __future__ import annotations

from contextlib import contextmanager


class _Result:
    def __init__(self, rows):
        self._rows = rows

    def fetchone(self):
        return self._rows[0] if self._rows else None

    def fetchall(self):
        return self._rows


class FakeDB:
    def __init__(self, responses=None):
        self.responses = responses or []   # (sql_substring, rows); first match wins
        self.log = []

    def _answer(self, sql):
        for needle, rows in self.responses:
            if needle in sql:
                return rows
        return []

    def execute(self, sql, params=()):
        self.log.append((sql, params))
        return _Result(self._answer(sql))

    def commit(self):
        pass

    @contextmanager
    def transaction(self):
        outer = self

        class _Tx:
            def execute(self, sql, params=()):
                return outer.execute(sql, params)

        yield _Tx()

    def statements(self, needle):
        return [(s, p) for s, p in self.log if needle in s]
```

Create `tests/test_alert_store.py`:

```python
"""Score alerts — storage glue. No Postgres (see alert_fakes.FakeDB)."""

from __future__ import annotations

from alert_fakes import FakeDB
from app.core.card_snapshot import CATEGORY_COLUMNS


def test_init_db_creates_the_four_alert_tables():
    from app.core.db import init_db

    db = FakeDB()
    init_db(db)
    sql = " ".join(s for s, _ in db.log)
    for table in ("push_devices", "alert_preferences", "score_baseline", "alert_log"):
        assert f"CREATE TABLE IF NOT EXISTS {table}" in sql, table
    assert "UNIQUE (user_id, symbol, session_date, direction)" in sql
    assert "PRIMARY KEY (symbol, session_date)" in sql
    for column in CATEGORY_COLUMNS:
        assert f"{column} DOUBLE PRECISION" in sql
```

- [ ] **Step 2: Run test to verify it fails**

Run: `<venv python> -m pytest tests/test_alert_store.py -q`
Expected: FAIL — `push_devices` not found.

- [ ] **Step 3: Implement**

Append to `app/core/constants.py`:

```python
# ---------------------------------------------------------------------------
# Score alerts (mobile push). See CLAUDE.md "Score alerts".
# ---------------------------------------------------------------------------
# Thresholds are POINTS on the 0-100 composite, not a relative percentage: a
# relative 10% would fire a score of 30 on a 3-point wobble.
ALERT_THRESHOLD_CHOICES = (5, 10, 15, 20)
ALERT_DEFAULT_THRESHOLD = 10
ALERT_SCOPES = ("watchlist", "all")
ALERT_DAILY_CAP = 10
ALERT_MAX_ATTEMPTS = 3
ALERT_QUIET_START_HOUR = 22
ALERT_QUIET_END_HOUR = 8
ALERT_TIMEZONE = "Africa/Cairo"
ALERT_BASELINE_RETENTION_DAYS = 10
ALERT_CHANNEL_ID = "score-alerts"
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
EXPO_BATCH_SIZE = 100
EXPO_TIMEOUT_SECONDS = 3.0
```

In `app/core/db.py`, inside `init_db`, directly after the `for column, coltype in ...: db.execute(f"ALTER TABLE risk_snapshot ...")` loop (it already imports `CATEGORY_COLUMNS` just above), add:

```python
    # --- Score alerts (mobile push) -----------------------------------------
    # A device token belongs to whoever registered it last: a shared phone
    # re-binds rather than duplicating. No FK to users, matching the rest of
    # this schema (users are deleted through the admin API, which cleans up).
    db.execute("""
        CREATE TABLE IF NOT EXISTS push_devices (
            token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            platform TEXT NOT NULL,
            created_at TEXT NOT NULL,
            last_seen TEXT NOT NULL
        )
    """)
    db.execute("CREATE INDEX IF NOT EXISTS idx_push_devices_user ON push_devices(user_id)")

    # NULL threshold = that direction is off. Points on the 0-100 score.
    db.execute("""
        CREATE TABLE IF NOT EXISTS alert_preferences (
            user_id TEXT PRIMARY KEY,
            enabled BOOLEAN NOT NULL DEFAULT FALSE,
            scope TEXT NOT NULL DEFAULT 'watchlist',
            rise_threshold INTEGER DEFAULT 10,
            fall_threshold INTEGER DEFAULT 10,
            updated_at TEXT NOT NULL
        )
    """)

    # The category scores a symbol carried at the PREVIOUS session's close,
    # captured just before the first rescore of a new session overwrites them.
    # Weight-free and macro-free like risk_snapshot, so every subscriber's own
    # sliders apply to both ends of the comparison.
    baseline_categories = ",\n            ".join(
        f"{c} DOUBLE PRECISION" for c in CATEGORY_COLUMNS
    )
    db.execute(f"""
        CREATE TABLE IF NOT EXISTS score_baseline (
            symbol TEXT NOT NULL,
            session_date TEXT NOT NULL,
            {baseline_categories},
            source_bar_date TEXT,
            captured_at TEXT NOT NULL,
            PRIMARY KEY (symbol, session_date)
        )
    """)

    # One row per (user, stock, session, direction). The UNIQUE constraint is
    # the duplicate guard of last resort: two overlapping cron calls cannot
    # both queue the same push.
    db.execute("""
        CREATE TABLE IF NOT EXISTS alert_log (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            symbol TEXT NOT NULL,
            session_date TEXT NOT NULL,
            direction TEXT NOT NULL,
            score_before DOUBLE PRECISION,
            score_after DOUBLE PRECISION,
            status TEXT NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            sent_at TEXT,
            UNIQUE (user_id, symbol, session_date, direction)
        )
    """)
    db.execute("CREATE INDEX IF NOT EXISTS idx_alert_log_status ON alert_log(status)")
    db.execute("CREATE INDEX IF NOT EXISTS idx_alert_log_user_session ON alert_log(user_id, session_date)")
```

Append `tzdata` to `requirements.txt` on its own line after `defusedxml>=0.7.1`, and install it into the venv: `<venv python> -m pip install tzdata`.

- [ ] **Step 4: Run test to verify it passes**

Run: `<venv python> -m pytest tests/test_alert_store.py -q`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/core/db.py app/core/constants.py requirements.txt tests/alert_fakes.py tests/test_alert_store.py
git commit -m "feat(alerts): schema and constants for score alerts"
```

---

### Task 2: Pure detection, copy, cap, quiet hours

**Files:**
- Create: `app/core/score_alerts.py`
- Test: `tests/test_score_alerts.py`

**Interfaces:**
- Consumes: `blend_categories`, `classify_signal`, `CATEGORY_ORDER` from `app.core.composite`; constants from Task 1.
- Produces:
  - `@dataclass(frozen=True) Subscriber(user_id: str, weights: dict, rise: Optional[int], fall: Optional[int])`
  - `@dataclass(frozen=True) Signal(user_id: str, symbol: str, session_date: str, direction: str, before: float, after: float)` — direction `"up"|"down"|"summary"`
  - `detect_signals(symbol: str, session_date: str, baseline: dict, current: dict, macro: Optional[dict], subscribers: list[Subscriber], already: set[tuple[str, str, str]]) -> list[Signal]` — `already` holds `(user_id, symbol, direction)` for this session.
  - `apply_daily_cap(signals: list[Signal], sent_today: dict[str, int], summary_sent: set[str], cap: int = ALERT_DAILY_CAP) -> list[tuple[Signal, str]]` — `(signal, status)` with status `"pending"|"suppressed"`; may append a summary `Signal(symbol="*", direction="summary", before=0.0, after=0.0)`.
  - `alert_copy(signal: Signal) -> tuple[str, str]` — `(title, body)`.
  - `in_quiet_hours(now_utc: datetime) -> bool`
  - `BANNED_WORDS = ("buy", "sell", "opportunity", "risk", "recommend")`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_score_alerts.py`:

```python
"""Score alerts — the pure decision layer. No DB, no network."""

from __future__ import annotations

import re
from datetime import datetime, timezone

import pytest

from app.core.composite import CATEGORY_ORDER, PRESETS, blend_categories
from app.core.score_alerts import (
    BANNED_WORDS,
    Signal,
    Subscriber,
    alert_copy,
    apply_daily_cap,
    detect_signals,
    in_quiet_hours,
)

BAL = PRESETS["balanced"]


def cats(value):
    return {name: float(value) for name in CATEGORY_ORDER}


def sub(user="u1", rise=10, fall=10, weights=BAL):
    return Subscriber(user_id=user, weights=weights, rise=rise, fall=fall)


def test_a_rise_of_exactly_the_threshold_fires_up():
    [s] = detect_signals("COMI", "2026-10-11", cats(50), cats(60), None, [sub()], set())
    assert (s.direction, s.before, s.after) == ("up", 50.0, 60.0)


def test_a_fall_of_exactly_the_threshold_fires_down():
    [s] = detect_signals("COMI", "2026-10-11", cats(60), cats(50), None, [sub()], set())
    assert s.direction == "down"


def test_just_under_the_threshold_fires_nothing():
    assert detect_signals("COMI", "d", cats(50), cats(59.9), None, [sub()], set()) == []


def test_a_direction_set_to_none_is_off():
    assert detect_signals("COMI", "d", cats(50), cats(70), None, [sub(rise=None)], set()) == []
    assert detect_signals("COMI", "d", cats(70), cats(50), None, [sub(fall=None)], set()) == []


def test_already_logged_direction_is_skipped_but_the_other_is_not():
    already = {("u1", "COMI", "up")}
    assert detect_signals("COMI", "d", cats(50), cats(70), None, [sub()], already) == []
    [s] = detect_signals("COMI", "d", cats(70), cats(50), None, [sub()], already)
    assert s.direction == "down"


def test_unscorable_baseline_or_current_fires_nothing():
    empty = {name: None for name in CATEGORY_ORDER}
    assert detect_signals("COMI", "d", empty, cats(90), None, [sub()], set()) == []
    assert detect_signals("COMI", "d", cats(10), empty, None, [sub()], set()) == []
    assert detect_signals("COMI", "d", {}, cats(90), None, [sub()], set()) == []


def test_the_same_regime_on_both_ends_means_a_regime_alone_never_fires():
    bearish = {"egx30": {"trend": "bearish"}}
    out = detect_signals("COMI", "d", cats(60), cats(60), bearish, [sub()], set())
    assert out == []


def test_each_subscriber_is_judged_on_their_own_weights():
    before = cats(50)
    after = dict(before, trend=100.0)   # only trend moved
    trend_heavy = {name: (100 if name == "trend" else 0) for name in CATEGORY_ORDER}
    flat = {name: 1 for name in CATEGORY_ORDER}
    out = detect_signals("COMI", "d", before, after, None,
                         [sub("heavy", weights=trend_heavy), sub("flat", weights=flat)], set())
    assert [s.user_id for s in out] == ["heavy"]


def test_scores_match_blend_categories_exactly():
    before, after = cats(40), cats(80)
    [s] = detect_signals("COMI", "d", before, after, None, [sub()], set())
    assert s.before == blend_categories(before, BAL, None)["score"]
    assert s.after == blend_categories(after, BAL, None)["score"]


def _sig(user, i):
    return Signal(user, f"S{i}", "d", "up", 50.0, 61.0)


def test_cap_ten_then_one_summary_then_suppressed():
    signals = [_sig("u1", i) for i in range(13)]
    out = apply_daily_cap(signals, sent_today={}, summary_sent=set())
    statuses = [(s.symbol, st) for s, st in out]
    assert [st for _, st in statuses[:10]] == ["pending"] * 10
    assert statuses[10] == ("*", "pending")
    assert [st for _, st in statuses[11:]] == ["suppressed"] * 3


def test_cap_counts_what_was_already_sent_today_and_summary_is_sent_once():
    out = apply_daily_cap([_sig("u1", 1)], sent_today={"u1": 10}, summary_sent={"u1"})
    assert [(s.symbol, st) for s, st in out] == [("S1", "suppressed")]


def test_cap_is_per_user():
    out = apply_daily_cap([_sig("a", 1), _sig("b", 1)], sent_today={"a": 10}, summary_sent=set())
    assert [(s.user_id, s.symbol, st) for s, st in out] == [
        ("a", "*", "pending"), ("a", "S1", "suppressed"), ("b", "S1", "pending"),
    ]


def test_copy_names_the_move_and_the_band():
    title, body = alert_copy(Signal("u", "COMI", "d", "up", 58.0, 70.4))
    assert title == "COMI score up 12 points"
    assert body.startswith("58 → 70 · now ")


def test_copy_for_a_fall_and_for_the_summary():
    title, _ = alert_copy(Signal("u", "FWRY", "d", "down", 62.0, 50.0))
    assert title == "FWRY score down 12 points"
    title, body = alert_copy(Signal("u", "*", "d", "summary", 0.0, 0.0))
    assert title == "More stocks moved today"
    assert "Borsa Compass" in body


@pytest.mark.parametrize("direction", ["up", "down", "summary"])
@pytest.mark.parametrize("after", [5.0, 30.0, 50.0, 70.0, 95.0])
def test_no_copy_ever_gives_an_instruction(direction, after):
    title, body = alert_copy(Signal("u", "COMI", "d", direction, 50.0, after))
    for word in BANNED_WORDS:
        assert not re.search(rf"\b{word}\b", f"{title} {body}", re.IGNORECASE), word


@pytest.mark.parametrize("hour_utc, quiet", [
    (18, False),   # 21:00 Cairo (EEST, UTC+3)
    (19, True),    # 22:00 Cairo
    (2, True),     # 05:00 Cairo
    (5, False),    # 08:00 Cairo
])
def test_quiet_hours_are_cairo_local(hour_utc, quiet):
    assert in_quiet_hours(datetime(2026, 10, 11, hour_utc, 0, tzinfo=timezone.utc)) is quiet
```

- [ ] **Step 2: Run to verify failure**

Run: `<venv python> -m pytest tests/test_score_alerts.py -q`
Expected: FAIL — `ModuleNotFoundError: app.core.score_alerts`.

- [ ] **Step 3: Implement `app/core/score_alerts.py`**

```python
"""
Score alerts — the pure decision layer: who should hear that a stock's score
moved, and what the notification says. No DB, no network; `alert_store` feeds
it and `expo_push` delivers what it decides.

An alert is an INDICATOR, never an instruction. The walk-forward backtest
(see classify_signal) shows a single stock's score does not rank its future
returns, so a push that framed a jump as an "opportunity" would claim what the
app's own evidence contradicts. The copy states the move and the band, and a
test bans instruction words outright.

Both ends of a comparison are blended with the SAME macro regime: a regime
flip moves every score at once, and only the stock's own movement should
alert. Each subscriber is judged on their own weights, so the number in the
push is the number their stock page shows.
"""

from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import datetime
from typing import Optional
from zoneinfo import ZoneInfo

from app.core.composite import CATEGORY_ORDER, blend_categories, classify_signal
from app.core.constants import (
    ALERT_DAILY_CAP,
    ALERT_QUIET_END_HOUR,
    ALERT_QUIET_START_HOUR,
    ALERT_TIMEZONE,
)

BANNED_WORDS = ("buy", "sell", "opportunity", "risk", "recommend")
SUMMARY_SYMBOL = "*"


@dataclass(frozen=True)
class Subscriber:
    user_id: str
    weights: dict
    rise: Optional[int]
    fall: Optional[int]


@dataclass(frozen=True)
class Signal:
    user_id: str
    symbol: str
    session_date: str
    direction: str          # "up" | "down" | "summary"
    before: float
    after: float


def _scorable(categories: dict) -> bool:
    return any(categories.get(name) is not None for name in CATEGORY_ORDER)


def detect_signals(symbol: str, session_date: str, baseline: dict, current: dict,
                   macro: Optional[dict], subscribers: list,
                   already: set) -> list:
    """Signals for one symbol across its subscribers. `already` = {(user, symbol, direction)}."""
    if not _scorable(baseline) or not _scorable(current):
        return []
    out = []
    for s in subscribers:
        before = blend_categories(baseline, s.weights, macro)["score"]
        after = blend_categories(current, s.weights, macro)["score"]
        delta = round(after - before, 1)
        direction = None
        if s.rise is not None and delta >= s.rise:
            direction = "up"
        elif s.fall is not None and delta <= -s.fall:
            direction = "down"
        if direction is None or (s.user_id, symbol, direction) in already:
            continue
        out.append(Signal(s.user_id, symbol, session_date, direction, before, after))
    return out


def apply_daily_cap(signals: list, sent_today: dict, summary_sent: set,
                    cap: int = ALERT_DAILY_CAP) -> list:
    """
    [(signal, "pending" | "suppressed")]. The cap-th+1 signal of a user's day
    becomes ONE summary alert (unless one was already queued); the rest are
    recorded as suppressed so a later call does not re-detect them.
    """
    counts = dict(sent_today)
    summarized = set(summary_sent)
    out = []
    for sig in signals:
        n = counts.get(sig.user_id, 0)
        if n < cap:
            out.append((sig, "pending"))
            counts[sig.user_id] = n + 1
            continue
        if sig.user_id not in summarized:
            summarized.add(sig.user_id)
            out.append((replace(sig, symbol=SUMMARY_SYMBOL, direction="summary",
                                before=0.0, after=0.0), "pending"))
        out.append((sig, "suppressed"))
    return out


def alert_copy(signal: Signal) -> tuple:
    """(title, body). Facts only: the move, the scores, the band."""
    if signal.direction == "summary":
        return ("More stocks moved today",
                "Open Borsa Compass to see your scores.")
    points = abs(round(signal.after) - round(signal.before))
    word = "up" if signal.direction == "up" else "down"
    title = f"{signal.symbol} score {word} {points} points"
    body = (f"{round(signal.before)} → {round(signal.after)} · "
            f"now {classify_signal(signal.after)}")
    return title, body


def in_quiet_hours(now_utc: datetime) -> bool:
    hour = now_utc.astimezone(ZoneInfo(ALERT_TIMEZONE)).hour
    return hour >= ALERT_QUIET_START_HOUR or hour < ALERT_QUIET_END_HOUR
```

Note for the copy test `"58 → 70"` with after 70.4: `round(70.4) == 70`, `points = 70 - 58 = 12`. Keep `points` from the rounded displayed numbers so title and body never disagree.

- [ ] **Step 4: Run to verify pass**

Run: `<venv python> -m pytest tests/test_score_alerts.py -q`
Expected: PASS (all).

- [ ] **Step 5: Commit**

```bash
git add app/core/score_alerts.py tests/test_score_alerts.py
git commit -m "feat(alerts): pure signal detection, daily cap, copy and quiet hours"
```

---

### Task 3: Baseline capture

**Files:**
- Create: `app/core/alert_store.py`
- Test: `tests/test_alert_store.py` (append)

**Interfaces:**
- Consumes: `CATEGORY_ORDER`, `CATEGORY_COLUMNS`.
- Produces:
  - `read_previous_rows(db, symbols: list[str]) -> dict[str, dict]` — `{symbol: {"last_bar_date": str|None, "categories": {name: float|None}}}`
  - `capture_baseline(db, symbol: str, previous: Optional[dict], card: Optional[dict], now: str) -> bool` — True when a baseline row was written.
  - `prune_baselines(db, today: str) -> None`

Rule: write a baseline ONLY when `card` is not None, `card["last_bar_date"]` is truthy, `previous` exists, `previous["last_bar_date"]` differs from the new one, and the previous categories are scorable (any non-None). `session_date = card["last_bar_date"]`, `source_bar_date = previous["last_bar_date"]`, `ON CONFLICT (symbol, session_date) DO NOTHING`.

- [ ] **Step 1: Write the failing tests** (append to `tests/test_alert_store.py`)

```python
from app.core.composite import CATEGORY_ORDER
from app.core.alert_store import capture_baseline, prune_baselines, read_previous_rows


def _cats(v):
    return {name: v for name in CATEGORY_ORDER}


def _card(bar_date, v=60.0):
    return {"categories": _cats(v), "last_bar_date": bar_date}


def test_read_previous_rows_shapes_categories_by_name():
    row = ("COMI", "2026-10-07") + tuple(float(i) for i in range(len(CATEGORY_ORDER)))
    db = FakeDB([("FROM risk_snapshot", [row])])
    out = read_previous_rows(db, ["COMI"])
    assert out["COMI"]["last_bar_date"] == "2026-10-07"
    assert out["COMI"]["categories"][CATEGORY_ORDER[1]] == 1.0
    sql, params = db.log[0]
    assert "symbol = ANY(%s)" in sql and params == (["COMI"],)


def test_read_previous_rows_with_no_symbols_skips_the_query():
    db = FakeDB()
    assert read_previous_rows(db, []) == {}
    assert db.log == []


def test_a_new_session_captures_the_previous_close_as_baseline():
    db = FakeDB()
    prev = {"last_bar_date": "2026-10-07", "categories": _cats(50.0)}
    assert capture_baseline(db, "COMI", prev, _card("2026-10-11"), "now") is True
    [(sql, params)] = db.statements("INSERT INTO score_baseline")
    assert "ON CONFLICT (symbol, session_date) DO NOTHING" in sql
    assert params[:2] == ("COMI", "2026-10-11")
    assert params[2:2 + len(CATEGORY_ORDER)] == tuple([50.0] * len(CATEGORY_ORDER))
    assert params[-2:] == ("2026-10-07", "now")


def test_same_session_rescore_writes_no_baseline():
    db = FakeDB()
    prev = {"last_bar_date": "2026-10-11", "categories": _cats(50.0)}
    assert capture_baseline(db, "COMI", prev, _card("2026-10-11"), "now") is False
    assert db.log == []


def test_no_baseline_from_an_unscored_previous_row_or_without_a_card():
    db = FakeDB()
    empty = {"last_bar_date": "2026-10-07", "categories": _cats(None)}
    assert capture_baseline(db, "COMI", empty, _card("2026-10-11"), "now") is False
    assert capture_baseline(db, "COMI", None, _card("2026-10-11"), "now") is False
    full = {"last_bar_date": "2026-10-07", "categories": _cats(50.0)}
    assert capture_baseline(db, "COMI", full, None, "now") is False
    assert capture_baseline(db, "COMI", full, {"categories": _cats(1.0), "last_bar_date": None}, "now") is False
    assert db.log == []


def test_prune_deletes_baselines_older_than_retention():
    db = FakeDB()
    prune_baselines(db, "2026-10-11")
    [(sql, params)] = db.log
    assert sql.startswith("DELETE FROM score_baseline WHERE session_date <")
    assert params == ("2026-10-01",)
```

- [ ] **Step 2: Run to verify failure**

Run: `<venv python> -m pytest tests/test_alert_store.py -q`
Expected: FAIL — `ModuleNotFoundError: app.core.alert_store`.

- [ ] **Step 3: Implement `app/core/alert_store.py`**

```python
"""
Score alerts — the Postgres glue between the scoring cron and the pure
decision layer in `score_alerts`. Every function takes `db` so tests run on a
fake; nothing here talks to the network.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Optional

from app.core.card_snapshot import CATEGORY_COLUMNS
from app.core.composite import CATEGORY_ORDER
from app.core.constants import ALERT_BASELINE_RETENTION_DAYS


def _categories(values) -> dict:
    return {name: values[i] for i, name in enumerate(CATEGORY_ORDER)}


def read_previous_rows(db, symbols: list) -> dict:
    """The snapshot rows about to be overwritten: bar date + eight categories."""
    if not symbols:
        return {}
    rows = db.execute(
        f"SELECT symbol, last_bar_date, {', '.join(CATEGORY_COLUMNS)} "
        "FROM risk_snapshot WHERE symbol = ANY(%s)",
        (list(symbols),),
    ).fetchall()
    return {r[0]: {"last_bar_date": r[1], "categories": _categories(r[2:])} for r in rows}


def capture_baseline(db, symbol: str, previous: Optional[dict],
                     card: Optional[dict], now: str) -> bool:
    """
    Store the previous session's close scores as this session's baseline, the
    first time a rescore carries a new bar date. First capture wins; never
    guesses a baseline from an unscored row.
    """
    if card is None or previous is None:
        return False
    session = card.get("last_bar_date")
    if not session or previous.get("last_bar_date") == session:
        return False
    cats = previous.get("categories") or {}
    if not any(cats.get(name) is not None for name in CATEGORY_ORDER):
        return False
    db.execute(
        f"INSERT INTO score_baseline (symbol, session_date, {', '.join(CATEGORY_COLUMNS)}, "
        "source_bar_date, captured_at) "
        f"VALUES ({', '.join(['%s'] * (len(CATEGORY_COLUMNS) + 4))}) "
        "ON CONFLICT (symbol, session_date) DO NOTHING",
        (symbol, session) + tuple(cats.get(name) for name in CATEGORY_ORDER)
        + (previous.get("last_bar_date"), now),
    )
    return True


def prune_baselines(db, today: str) -> None:
    cutoff = date.fromisoformat(today) - timedelta(days=ALERT_BASELINE_RETENTION_DAYS)
    db.execute("DELETE FROM score_baseline WHERE session_date < %s", (cutoff.isoformat(),))
```

- [ ] **Step 4: Run to verify pass**

Run: `<venv python> -m pytest tests/test_alert_store.py -q`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/core/alert_store.py tests/test_alert_store.py
git commit -m "feat(alerts): capture the previous close as each session's baseline"
```

---

### Task 4: Subscribers and the detection runner

**Files:**
- Modify: `app/core/alert_store.py`
- Test: `tests/test_alert_store.py` (append)

**Interfaces:**
- Consumes: `Subscriber`, `detect_signals`, `apply_daily_cap`, `SUMMARY_SYMBOL` (Task 2); `get_weights_from_db(db, user_id)` from `app.core.composite`.
- Produces:
  - `load_subscribers(db, symbols: list[str]) -> dict[str, list[Subscriber]]` — per symbol; only users with `enabled`, active, ≥1 device; scope `all` → every symbol; scope `watchlist` → symbols in their `watchlist` ∪ `portfolio`.
  - `run_detection(db, scored: dict[str, dict], macro: Optional[dict], now: str, new_id=lambda: uuid4().hex) -> int` — `scored = {symbol: {"session_date": str, "categories": dict}}`; returns rows inserted (pending + suppressed). Reads baselines for those (symbol, session) pairs, already-logged keys, today's counts, writes `alert_log` with `ON CONFLICT (user_id, symbol, session_date, direction) DO NOTHING`.

- [ ] **Step 1: Write the failing tests** (append)

```python
from app.core.alert_store import load_subscribers, run_detection
from app.core.composite import PRESETS

BAL = PRESETS["balanced"]


def _subs_db(prefs, watch=(), extra=()):
    """prefs rows: (user_id, scope, rise, fall)."""
    return FakeDB([
        ("FROM alert_preferences", list(prefs)),
        ("FROM watchlist", list(watch)),
        ("FROM settings", []),
        ("FROM user_settings", []),
        *extra,
    ])


def test_scope_all_subscribes_to_every_symbol_and_watchlist_only_to_followed():
    db = _subs_db(
        prefs=[("all-user", "all", 10, 10), ("watch-user", "watchlist", 5, None)],
        watch=[("watch-user", "COMI")],
    )
    out = load_subscribers(db, ["COMI", "FWRY"])
    assert sorted(s.user_id for s in out["COMI"]) == ["all-user", "watch-user"]
    assert [s.user_id for s in out["FWRY"]] == ["all-user"]
    watch = next(s for s in out["COMI"] if s.user_id == "watch-user")
    assert (watch.rise, watch.fall) == (5, None)
    pref_sql = db.statements("FROM alert_preferences")[0][0]
    assert "enabled" in pref_sql and "is_active" in pref_sql and "push_devices" in pref_sql
    follow_sql = db.statements("FROM watchlist")[0][0]
    assert "UNION" in follow_sql and "FROM portfolio" in follow_sql


def test_no_enabled_users_means_no_follow_query():
    db = _subs_db(prefs=[])
    assert load_subscribers(db, ["COMI"]) == {}
    assert db.statements("FROM watchlist") == []


def _baseline_row(symbol, session, v):
    return (symbol, session) + tuple([v] * len(CATEGORY_ORDER))


def test_run_detection_queues_a_pending_alert_for_a_qualifying_move():
    db = _subs_db(
        prefs=[("u1", "all", 10, 10)],
        extra=[
            ("FROM score_baseline", [_baseline_row("COMI", "2026-10-11", 50.0)]),
            ("FROM alert_log", []),
        ],
    )
    n = run_detection(db, {"COMI": {"session_date": "2026-10-11", "categories": _cats(70.0)}},
                      None, "now", new_id=lambda: "id1")
    assert n == 1
    [(sql, params)] = db.statements("INSERT INTO alert_log")
    assert "ON CONFLICT (user_id, symbol, session_date, direction) DO NOTHING" in sql
    assert params[:5] == ("id1", "u1", "COMI", "2026-10-11", "up")
    assert params[7] == "pending"


def test_run_detection_without_a_baseline_queues_nothing():
    db = _subs_db(prefs=[("u1", "all", 10, 10)], extra=[("FROM score_baseline", [])])
    assert run_detection(db, {"COMI": {"session_date": "2026-10-11", "categories": _cats(90.0)}},
                         None, "now") == 0
    assert db.statements("INSERT INTO alert_log") == []


def test_run_detection_skips_a_direction_already_logged_this_session():
    db = _subs_db(
        prefs=[("u1", "all", 10, 10)],
        extra=[
            ("FROM score_baseline", [_baseline_row("COMI", "2026-10-11", 50.0)]),
            ("SELECT user_id, symbol, direction FROM alert_log", [("u1", "COMI", "up")]),
            ("FROM alert_log", []),
        ],
    )
    assert run_detection(db, {"COMI": {"session_date": "2026-10-11", "categories": _cats(70.0)}},
                         None, "now") == 0


def test_run_detection_with_nothing_scored_touches_nothing():
    db = FakeDB()
    assert run_detection(db, {}, None, "now") == 0
    assert db.log == []
```

- [ ] **Step 2: Run to verify failure**

Run: `<venv python> -m pytest tests/test_alert_store.py -q`
Expected: FAIL — `ImportError: cannot import name 'load_subscribers'`.

- [ ] **Step 3: Implement** (append to `app/core/alert_store.py`; add imports at top: `from uuid import uuid4`, `from app.core.composite import CATEGORY_ORDER, get_weights_from_db`, `from app.core.score_alerts import SUMMARY_SYMBOL, Subscriber, apply_daily_cap, detect_signals`)

```python
def load_subscribers(db, symbols: list) -> dict:
    """{symbol: [Subscriber]} for users who would hear about that symbol now."""
    if not symbols:
        return {}
    prefs = db.execute(
        "SELECT p.user_id, p.scope, p.rise_threshold, p.fall_threshold "
        "FROM alert_preferences p JOIN users u ON u.id = p.user_id "
        "WHERE p.enabled AND u.is_active "
        "AND EXISTS (SELECT 1 FROM push_devices d WHERE d.user_id = p.user_id)"
    ).fetchall()
    if not prefs:
        return {}

    watch_users = [r[0] for r in prefs if r[1] != "all"]
    follows: set = set()
    if watch_users:
        rows = db.execute(
            "SELECT user_id, symbol FROM watchlist "
            "WHERE user_id = ANY(%s) AND symbol = ANY(%s) "
            "UNION SELECT user_id, symbol FROM portfolio "
            "WHERE user_id = ANY(%s) AND symbol = ANY(%s)",
            (watch_users, list(symbols), watch_users, list(symbols)),
        ).fetchall()
        follows = {(r[0], r[1]) for r in rows}

    out: dict = {}
    for user_id, scope, rise, fall in prefs:
        sub = Subscriber(user_id, get_weights_from_db(db, user_id), rise, fall)
        for symbol in symbols:
            if scope == "all" or (user_id, symbol) in follows:
                out.setdefault(symbol, []).append(sub)
    return out


def _read_baselines(db, scored: dict) -> dict:
    rows = db.execute(
        f"SELECT symbol, session_date, {', '.join(CATEGORY_COLUMNS)} FROM score_baseline "
        "WHERE symbol = ANY(%s) AND session_date = ANY(%s)",
        (list(scored), sorted({v["session_date"] for v in scored.values()})),
    ).fetchall()
    return {(r[0], r[1]): _categories(r[2:]) for r in rows}


def run_detection(db, scored: dict, macro: Optional[dict], now: str,
                  new_id=lambda: uuid4().hex) -> int:
    """Queue alert_log rows for every qualifying move among `scored` symbols."""
    if not scored:
        return 0
    subscribers = load_subscribers(db, list(scored))
    if not subscribers:
        return 0
    baselines = _read_baselines(db, scored)

    sessions = sorted({v["session_date"] for v in scored.values()})
    logged = db.execute(
        "SELECT user_id, symbol, direction FROM alert_log "
        "WHERE session_date = ANY(%s) AND symbol = ANY(%s)",
        (sessions, list(scored) + [SUMMARY_SYMBOL]),
    ).fetchall()
    already = {(r[0], r[1], r[2]) for r in logged}
    counts = db.execute(
        "SELECT user_id, COUNT(*) FROM alert_log WHERE session_date = ANY(%s) "
        "AND status IN ('pending', 'sent') AND direction <> 'summary' GROUP BY user_id",
        (sessions,),
    ).fetchall()
    sent_today = {r[0]: r[1] for r in counts}
    summary_sent = {u for (u, s, d) in already if d == "summary"}

    signals = []
    for symbol, info in scored.items():
        baseline = baselines.get((symbol, info["session_date"]))
        if baseline is None:
            continue
        signals += detect_signals(symbol, info["session_date"], baseline,
                                  info["categories"], macro,
                                  subscribers.get(symbol, []), already)

    inserted = 0
    for sig, status in apply_daily_cap(signals, sent_today, summary_sent):
        db.execute(
            "INSERT INTO alert_log (id, user_id, symbol, session_date, direction, "
            "score_before, score_after, status, attempts, created_at) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 0, %s) "
            "ON CONFLICT (user_id, symbol, session_date, direction) DO NOTHING",
            (new_id(), sig.user_id, sig.symbol, sig.session_date, sig.direction,
             sig.before, sig.after, status, now),
        )
        inserted += 1
    return inserted
```

Note: the FakeDB matches the FIRST substring hit, so in tests `"SELECT user_id, symbol, direction FROM alert_log"` must be listed before `"FROM alert_log"`; the count query (`SELECT user_id, COUNT(*) FROM alert_log`) then falls to the generic `"FROM alert_log"` entry → `[]`.

- [ ] **Step 4: Run to verify pass**

Run: `<venv python> -m pytest tests/test_alert_store.py tests/test_score_alerts.py -q`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/core/alert_store.py tests/test_alert_store.py
git commit -m "feat(alerts): load subscribers and queue qualifying moves"
```

---

### Task 5: Expo delivery

**Files:**
- Create: `app/core/expo_push.py`
- Test: `tests/test_expo_push.py`

**Interfaces:**
- Consumes: `alert_copy`, `in_quiet_hours`, `Signal` (Task 2); constants (Task 1).
- Produces:
  - `send_expo(messages: list[dict], timeout: float = EXPO_TIMEOUT_SECONDS) -> list[dict]` — POSTs one batch, returns Expo's `data` ticket list (same order). Raises on HTTP/network error.
  - `deliver_pending(db, now_utc: datetime, sender=send_expo) -> dict` — returns `{"sent": int, "failed": int, "expired": int, "held": bool}`.

Behaviour of `deliver_pending`:
1. If `in_quiet_hours(now_utc)` → return `{"sent": 0, "failed": 0, "expired": 0, "held": True}` with no queries.
2. `latest = SELECT MAX(last_bar_date) FROM risk_snapshot`; `UPDATE alert_log SET status = 'expired' WHERE status = 'pending' AND session_date < %s` (params `(latest,)`), count via `RETURNING id`.
3. Pending rows: `SELECT id, user_id, symbol, session_date, direction, score_before, score_after, attempts FROM alert_log WHERE status = 'pending' ORDER BY created_at LIMIT 200`.
4. Tokens: `SELECT token, user_id FROM push_devices WHERE user_id = ANY(%s)`.
5. A row whose user has no token → `UPDATE alert_log SET status = 'failed' WHERE id = %s`.
6. Build one message per (row, token): `{"to": token, "title", "body", "data": {"type": "score_alert", "symbol", "session"}, "channelId": "score-alerts", "sound": None}`; chunk by `EXPO_BATCH_SIZE`; call `sender(chunk)`.
7. Sender raised → every row in that chunk: attempts + 1, `failed` if attempts reach `ALERT_MAX_ATTEMPTS` else stays `pending`.
8. Ticket `{"status": "ok"}` → row `sent`, `sent_at = now`. Ticket error with `details.error == "DeviceNotRegistered"` → `DELETE FROM push_devices WHERE token = %s`. A row is `sent` if ANY of its tickets is ok; otherwise attempts + 1 / `failed` at the max.

- [ ] **Step 1: Write the failing tests**

Create `tests/test_expo_push.py`:

```python
"""Score alerts — Expo delivery. The sender is injected; no network."""

from __future__ import annotations

from datetime import datetime, timezone

from app.core import expo_push
from app.core.expo_push import deliver_pending
from alert_fakes import FakeDB

DAY = datetime(2026, 10, 11, 9, 0, tzinfo=timezone.utc)      # 12:00 Cairo
NIGHT = datetime(2026, 10, 11, 21, 0, tzinfo=timezone.utc)   # 00:00 Cairo


def _row(id_, user="u1", symbol="COMI", direction="up", attempts=0):
    return (id_, user, symbol, "2026-10-11", direction, 58.0, 70.0, attempts)


def _db(rows, tokens):
    return FakeDB([
        ("MAX(last_bar_date)", [("2026-10-11",)]),
        ("SET status = 'expired'", []),
        ("WHERE status = 'pending' ORDER BY", rows),
        ("FROM push_devices", tokens),
    ])


def _status_updates(db):
    return [(s, p) for s, p in db.log if s.startswith("UPDATE alert_log SET")]


def test_quiet_hours_hold_everything_without_a_query():
    db = FakeDB()
    out = deliver_pending(db, NIGHT, sender=lambda m: [])
    assert out["held"] is True and db.log == []


def test_ok_ticket_marks_the_row_sent_and_message_is_shaped_for_expo():
    sent = []
    db = _db([_row("a")], [("ExponentPushToken[x]", "u1")])
    out = deliver_pending(db, DAY, sender=lambda m: sent.extend(m) or [{"status": "ok", "id": "t"}])
    assert out["sent"] == 1
    [msg] = sent
    assert msg["to"] == "ExponentPushToken[x]"
    assert msg["title"] == "COMI score up 12 points"
    assert msg["data"] == {"type": "score_alert", "symbol": "COMI", "session": "2026-10-11"}
    assert msg["channelId"] == "score-alerts"
    assert any("status = 'sent'" in s and p[-1] == "a" for s, p in _status_updates(db))


def test_device_not_registered_deletes_the_token():
    db = _db([_row("a")], [("ExponentPushToken[dead]", "u1")])
    deliver_pending(db, DAY, sender=lambda m: [
        {"status": "error", "message": "x", "details": {"error": "DeviceNotRegistered"}}
    ])
    assert db.statements("DELETE FROM push_devices WHERE token = %s")[0][1] == ("ExponentPushToken[dead]",)


def test_a_failed_send_retries_then_gives_up_at_three_attempts():
    def boom(_):
        raise OSError("expo down")

    db = _db([_row("a", attempts=0), _row("b", symbol="FWRY", attempts=2)],
             [("ExponentPushToken[x]", "u1")])
    out = deliver_pending(db, DAY, sender=boom)
    updates = _status_updates(db)
    assert any("attempts = attempts + 1" in s and "'pending'" in s and p[-1] == "a" for s, p in updates)
    assert any("'failed'" in s and p[-1] == "b" for s, p in updates)
    assert out["failed"] == 1


def test_a_user_with_no_device_fails_the_row_without_sending():
    calls = []
    db = _db([_row("a")], [])
    deliver_pending(db, DAY, sender=lambda m: calls.append(m) or [])
    assert calls == []
    assert any("'failed'" in s and p == ("a",) for s, p in _status_updates(db))


def test_stale_sessions_expire_before_sending():
    db = _db([], [])
    deliver_pending(db, DAY, sender=lambda m: [])
    [(sql, params)] = db.statements("SET status = 'expired'")
    assert "session_date < %s" in sql and params == ("2026-10-11",)


def test_messages_are_batched_at_one_hundred():
    batches = []
    rows = [_row(f"r{i}", symbol=f"S{i}") for i in range(150)]
    db = _db(rows, [("ExponentPushToken[x]", "u1")])
    deliver_pending(db, DAY, sender=lambda m: batches.append(len(m)) or [{"status": "ok"}] * len(m))
    assert batches == [100, 50]


def test_send_expo_posts_json_and_returns_tickets(monkeypatch):
    captured = {}

    class _Resp:
        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def read(self):
            return b'{"data": [{"status": "ok", "id": "1"}]}'

    def fake_urlopen(req, timeout):
        captured["url"] = req.full_url
        captured["body"] = req.data
        captured["timeout"] = timeout
        captured["ctype"] = req.get_header("Content-type")
        return _Resp()

    monkeypatch.setattr(expo_push.urllib.request, "urlopen", fake_urlopen)
    tickets = expo_push.send_expo([{"to": "ExponentPushToken[x]", "title": "t", "body": "b"}])
    assert tickets == [{"status": "ok", "id": "1"}]
    assert captured["url"] == "https://exp.host/--/api/v2/push/send"
    assert captured["ctype"] == "application/json"
    assert captured["timeout"] == 3.0
```

- [ ] **Step 2: Run to verify failure**

Run: `<venv python> -m pytest tests/test_expo_push.py -q`
Expected: FAIL — `ModuleNotFoundError: app.core.expo_push`.

- [ ] **Step 3: Implement `app/core/expo_push.py`**

```python
"""
Score alerts — delivery through the Expo Push Service (FCM on Android, APNs on
iOS). Free, no SDK: one JSON POST per batch of <=100 messages.

Runs inside the scoring cron's time budget, so every failure is soft: a row
that could not be sent stays pending for the next call, and gives up after
ALERT_MAX_ATTEMPTS. Receipts are not polled; DeviceNotRegistered on the ticket
already catches the common dead-token case.
"""

from __future__ import annotations

import json
import urllib.request
from datetime import datetime

from app.core.constants import (
    ALERT_CHANNEL_ID,
    ALERT_MAX_ATTEMPTS,
    EXPO_BATCH_SIZE,
    EXPO_PUSH_URL,
    EXPO_TIMEOUT_SECONDS,
)
from app.core.score_alerts import Signal, alert_copy, in_quiet_hours

_PENDING_LIMIT = 200


def send_expo(messages: list, timeout: float = EXPO_TIMEOUT_SECONDS) -> list:
    req = urllib.request.Request(
        EXPO_PUSH_URL,
        data=json.dumps(messages).encode("utf-8"),
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8")).get("data") or []


def _bump(db, row_id: str, attempts: int) -> bool:
    """attempts+1; True when the row is now failed for good."""
    if attempts + 1 >= ALERT_MAX_ATTEMPTS:
        db.execute("UPDATE alert_log SET status = 'failed', attempts = attempts + 1 "
                   "WHERE id = %s", (row_id,))
        return True
    db.execute("UPDATE alert_log SET status = 'pending', attempts = attempts + 1 "
               "WHERE id = %s", (row_id,))
    return False


def deliver_pending(db, now_utc: datetime, sender=send_expo) -> dict:
    result = {"sent": 0, "failed": 0, "expired": 0, "held": False}
    if in_quiet_hours(now_utc):
        result["held"] = True
        return result

    latest = (db.execute("SELECT MAX(last_bar_date) FROM risk_snapshot").fetchone() or [None])[0]
    if latest:
        expired = db.execute(
            "UPDATE alert_log SET status = 'expired' "
            "WHERE status = 'pending' AND session_date < %s RETURNING id",
            (latest,),
        ).fetchall()
        result["expired"] = len(expired)

    rows = db.execute(
        "SELECT id, user_id, symbol, session_date, direction, score_before, "
        "score_after, attempts FROM alert_log "
        f"WHERE status = 'pending' ORDER BY created_at LIMIT {_PENDING_LIMIT}"
    ).fetchall()
    if not rows:
        return result

    users = sorted({r[1] for r in rows})
    tokens: dict = {}
    for token, user_id in db.execute(
        "SELECT token, user_id FROM push_devices WHERE user_id = ANY(%s)", (users,)
    ).fetchall():
        tokens.setdefault(user_id, []).append(token)

    messages, owners = [], []          # owners[i] = (row, token) for messages[i]
    for row in rows:
        row_id, user_id, symbol, session, direction, before, after, _ = row
        if not tokens.get(user_id):
            db.execute("UPDATE alert_log SET status = 'failed' WHERE id = %s", (row_id,))
            result["failed"] += 1
            continue
        title, body = alert_copy(Signal(user_id, symbol, session, direction,
                                        before or 0.0, after or 0.0))
        for token in tokens[user_id]:
            messages.append({
                "to": token, "title": title, "body": body,
                "data": {"type": "score_alert", "symbol": symbol, "session": session},
                "channelId": ALERT_CHANNEL_ID, "sound": None,
            })
            owners.append((row, token))

    outcome: dict = {}                 # row_id -> (row, any_ok)
    now = now_utc.isoformat()
    for start in range(0, len(messages), EXPO_BATCH_SIZE):
        chunk = messages[start:start + EXPO_BATCH_SIZE]
        chunk_owners = owners[start:start + EXPO_BATCH_SIZE]
        try:
            tickets = sender(chunk)
        except Exception:
            tickets = [None] * len(chunk)
        for (row, token), ticket in zip(chunk_owners, tickets):
            ok = bool(ticket) and ticket.get("status") == "ok"
            if ticket and ((ticket.get("details") or {}).get("error") == "DeviceNotRegistered"):
                db.execute("DELETE FROM push_devices WHERE token = %s", (token,))
            prev = outcome.get(row[0], (row, False))
            outcome[row[0]] = (row, prev[1] or ok)

    for row_id, (row, any_ok) in outcome.items():
        if any_ok:
            db.execute("UPDATE alert_log SET status = 'sent', sent_at = %s WHERE id = %s",
                       (now, row_id))
            result["sent"] += 1
        elif _bump(db, row_id, row[7]):
            result["failed"] += 1
    return result
```

- [ ] **Step 4: Run to verify pass**

Run: `<venv python> -m pytest tests/test_expo_push.py -q`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/core/expo_push.py tests/test_expo_push.py
git commit -m "feat(alerts): deliver queued alerts through Expo Push"
```

---

### Task 6: Hook into the scoring cron

**Files:**
- Modify: `app/routers/cron.py` (`risk_snapshot`)
- Test: `tests/test_alert_cron_hook.py`

**Interfaces:**
- Consumes: `read_previous_rows`, `capture_baseline`, `prune_baselines`, `run_detection` (Tasks 3–4), `deliver_pending` (Task 5), `fetch_macro` from `app.core.macro_fetch`.
- Produces: new function in `cron.py`: `run_alerts(db, scored: dict, now_iso: str, elapsed: float) -> dict` and a response field `"alerts"`. New constant `ALERTS_START_LIMIT_SECONDS = 22.0` (the loop ends by 20s worst case; detection + one 3s Expo call must finish inside Vercel's 30s).

Changes inside `risk_snapshot`:
1. After `fundamentals`/`risk_free_rate_pct` are read, add:
   ```python
       try:
           previous_rows = read_previous_rows(db, slice_)
       except Exception:
           previous_rows = {}
       scored_for_alerts: dict = {}
   ```
2. In the loop, directly after `card = _score_card(symbol, df)` and BEFORE either `_upsert` call that follows it, add:
   ```python
           if card is not None:
               try:
                   capture_baseline(db, symbol, previous_rows.get(symbol), card, now)
               except Exception:
                   pass
               scored_for_alerts[symbol] = {
                   "session_date": card["last_bar_date"],
                   "categories": card["categories"],
               }
   ```
3. After the loop and before `after, after_failures = _snapshot_state(db)`:
   ```python
       alerts = run_alerts(db, scored_for_alerts, now,
                           time.monotonic() - started)
   ```
4. Add `"alerts": alerts,` to the returned dict (after `"unscored"`).

`run_alerts` (module level, below `_require_secret`):

```python
# Alerts ride this call because the moment a score changes is the moment to
# check it, and the new category scores are already in hand. They must never
# cost the scoring: the loop ends by DEADLINE_SECONDS (20s) worst case, and
# detection plus one Expo call (EXPO_TIMEOUT_SECONDS) fits before Vercel's 30s
# only if they START by this mark. Anything not sent stays pending.
ALERTS_START_LIMIT_SECONDS = 22.0


def run_alerts(db, scored: dict, now_iso: str, elapsed: float,
               deliver=deliver_pending) -> dict:
    out = {"queued": 0, "sent": 0, "skipped": None, "error": None}
    if elapsed > ALERTS_START_LIMIT_SECONDS:
        out["skipped"] = "deadline"
        return out
    try:
        macro = fetch_macro(db) if scored else None
        out["queued"] = run_detection(db, scored, macro, now_iso)
        prune_baselines(db, now_iso[:10])
        delivered = deliver(db, datetime.fromisoformat(now_iso))
        out["sent"] = delivered.get("sent", 0)
        if delivered.get("held"):
            out["skipped"] = "quiet-hours"
    except Exception as e:   # alerts never fail the scoring call
        out["error"] = type(e).__name__
    return out
```

Imports to add at the top of `cron.py`:
```python
from app.core.alert_store import capture_baseline, prune_baselines, read_previous_rows, run_detection
from app.core.expo_push import deliver_pending
from app.core.macro_fetch import fetch_macro, read_risk_free_rate
```
(replace the existing `from app.core.macro_fetch import read_risk_free_rate` line).

- [ ] **Step 1: Write the failing tests**

Create `tests/test_alert_cron_hook.py`:

```python
"""Score alerts ride the scoring cron and can never break it."""

from __future__ import annotations

import inspect

from app.routers import cron


class _DB:
    def execute(self, *a, **k):
        raise AssertionError("no DB expected")


def test_alerts_are_skipped_past_the_start_limit():
    out = cron.run_alerts(_DB(), {"COMI": {}}, "2026-10-11T09:00:00+00:00", 22.5)
    assert out["skipped"] == "deadline" and out["queued"] == 0


def test_an_exception_in_alerts_is_reported_not_raised(monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("detector broke")

    monkeypatch.setattr(cron, "fetch_macro", lambda db: None)
    monkeypatch.setattr(cron, "run_detection", boom)
    out = cron.run_alerts(object(), {"COMI": {}}, "2026-10-11T09:00:00+00:00", 5.0)
    assert out["error"] == "RuntimeError"


def test_quiet_hours_are_reported(monkeypatch):
    monkeypatch.setattr(cron, "run_detection", lambda *a, **k: 0)
    monkeypatch.setattr(cron, "prune_baselines", lambda *a, **k: None)
    out = cron.run_alerts(object(), {}, "2026-10-11T21:00:00+00:00", 5.0,
                          deliver=lambda db, now: {"sent": 0, "held": True})
    assert out["skipped"] == "quiet-hours"


def test_baseline_is_captured_before_the_row_is_overwritten():
    """Order matters: capture reads the row the upsert is about to replace."""
    src = inspect.getsource(cron.risk_snapshot)
    assert src.index("read_previous_rows(") < src.index("for symbol in slice_")
    capture = src.index("capture_baseline(")
    assert capture > src.index("card = _score_card(symbol, df)")
    assert capture < src.index("_upsert(symbol, stats, is_tradeable")
    assert "run_alerts(" in src and '"alerts": alerts' in src
```

- [ ] **Step 2: Run to verify failure**

Run: `<venv python> -m pytest tests/test_alert_cron_hook.py -q`
Expected: FAIL — `AttributeError: module 'app.routers.cron' has no attribute 'run_alerts'`.

- [ ] **Step 3: Implement** the four changes and `run_alerts` exactly as listed above.

- [ ] **Step 4: Run to verify pass, then the cron-adjacent suites**

Run: `<venv python> -m pytest tests/test_alert_cron_hook.py tests/test_risk_grade.py tests/test_dashboard_snapshot.py tests/test_auth_gate.py -q`
Expected: PASS (nothing pre-existing regresses).

- [ ] **Step 5: Commit**

```bash
git add app/routers/cron.py tests/test_alert_cron_hook.py
git commit -m "feat(alerts): capture baselines, detect and deliver inside the scoring cron"
```

---

### Task 7: Alerts API + CLAUDE.md

**Files:**
- Create: `app/routers/alerts.py`
- Modify: `app/main.py` (import `alerts` with the other routers and add it to the `for router_module in (...)` tuple after `dashboard`)
- Test: `tests/test_alerts_router.py`
- Modify: `CLAUDE.md` (be) → copy to `../egx-api-fe/CLAUDE.md`

**Interfaces:**
- Consumes: `CurrentUser`, `get_current_user` (`app.core.auth`); `get_db`; constants (Task 1).
- Produces HTTP routes (all bearer-auth):
  - `POST /api/push/devices` body `{"token": str, "platform": "ios"|"android"}` → 201 `{"token": str}`
  - `DELETE /api/push/devices?token=…` → `{"deleted": bool}`
  - `GET /api/alerts/preferences` → `{"enabled": bool, "scope": str, "rise_threshold": int|null, "fall_threshold": int|null}`
  - `PUT /api/alerts/preferences` same body → same shape
  - `GET /api/alerts` → `{"alerts": [{"symbol", "session_date", "direction", "score_before", "score_after", "sent_at"}]}`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_alerts_router.py`:

```python
"""Alerts API: devices and preferences, scoped to the caller."""

from __future__ import annotations

import pytest
from fastapi import HTTPException

import app.routers.alerts as alerts_mod
from app.core.auth import CurrentUser
from alert_fakes import FakeDB

ME = CurrentUser(id="u1", username="sara")


@pytest.fixture
def db(monkeypatch):
    fake = FakeDB()
    monkeypatch.setattr(alerts_mod, "get_db", lambda: fake)
    return fake


def test_register_device_upserts_and_rebinds(db):
    out = alerts_mod.register_device(
        alerts_mod.DeviceIn(token="ExponentPushToken[abc-123]", platform="android"), ME)
    assert out == {"token": "ExponentPushToken[abc-123]"}
    [(sql, params)] = db.statements("INSERT INTO push_devices")
    assert "ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id" in sql
    assert params[:3] == ("ExponentPushToken[abc-123]", "u1", "android")


@pytest.mark.parametrize("token, platform", [
    ("not-a-token", "android"),
    ("ExponentPushToken[]", "ios"),
    ("ExponentPushToken[abc]", "web"),
])
def test_register_device_rejects_bad_input(db, token, platform):
    with pytest.raises(HTTPException) as e:
        alerts_mod.register_device(alerts_mod.DeviceIn(token=token, platform=platform), ME)
    assert e.value.status_code == 400


def test_unregister_only_touches_the_callers_token(db):
    alerts_mod.unregister_device("ExponentPushToken[abc]", ME)
    [(sql, params)] = db.statements("DELETE FROM push_devices")
    assert "user_id = %s" in sql and params == ("ExponentPushToken[abc]", "u1")


def test_preferences_default_when_no_row(db):
    assert alerts_mod.get_preferences(ME) == {
        "enabled": False, "scope": "watchlist", "rise_threshold": 10, "fall_threshold": 10,
    }


def test_preferences_round_trip(db):
    body = alerts_mod.PreferencesIn(enabled=True, scope="all", rise_threshold=None, fall_threshold=5)
    out = alerts_mod.put_preferences(body, ME)
    assert out == {"enabled": True, "scope": "all", "rise_threshold": None, "fall_threshold": 5}
    [(sql, params)] = db.statements("INSERT INTO alert_preferences")
    assert "ON CONFLICT (user_id) DO UPDATE" in sql
    assert params[:5] == ("u1", True, "all", None, 5)


@pytest.mark.parametrize("field, value", [("scope", "everything"), ("rise_threshold", 7), ("fall_threshold", 0)])
def test_preferences_reject_values_outside_the_choices(db, field, value):
    data = {"enabled": True, "scope": "watchlist", "rise_threshold": 10, "fall_threshold": 10}
    data[field] = value
    with pytest.raises(HTTPException) as e:
        alerts_mod.put_preferences(alerts_mod.PreferencesIn(**data), ME)
    assert e.value.status_code == 400


def test_alert_history_is_the_callers_sent_alerts(db):
    db.responses.append(("FROM alert_log", [("COMI", "2026-10-11", "up", 58.0, 70.0, "t")]))
    out = alerts_mod.list_alerts(ME)
    assert out["alerts"][0]["symbol"] == "COMI"
    sql, params = db.statements("FROM alert_log")[0]
    assert "status = 'sent'" in sql and params[0] == "u1"
```

- [ ] **Step 2: Run to verify failure**

Run: `<venv python> -m pytest tests/test_alerts_router.py -q`
Expected: FAIL — `ModuleNotFoundError: app.routers.alerts`.

- [ ] **Step 3: Implement `app/routers/alerts.py`**

```python
"""
Score alerts — device registration and per-user preferences.

POST   /api/push/devices            register this phone's Expo push token
DELETE /api/push/devices?token=…    forget it (logout); only the caller's own
GET    /api/alerts/preferences      the caller's settings, or the defaults
PUT    /api/alerts/preferences      save them
GET    /api/alerts                  the caller's sent alerts, last 30 days

Detection and delivery are NOT here: they ride the secret-guarded scoring
cron (routers/cron.py), so this file adds no public route.
"""

import re
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.core.auth import CurrentUser, get_current_user
from app.core.constants import (
    ALERT_DEFAULT_THRESHOLD,
    ALERT_SCOPES,
    ALERT_THRESHOLD_CHOICES,
)
from app.core.db import get_db

router = APIRouter()

_TOKEN = re.compile(r"^Expo(nent)?PushToken\[[A-Za-z0-9_\-]+\]$")
_PLATFORMS = ("ios", "android")
_DEFAULTS = {
    "enabled": False,
    "scope": "watchlist",
    "rise_threshold": ALERT_DEFAULT_THRESHOLD,
    "fall_threshold": ALERT_DEFAULT_THRESHOLD,
}


class DeviceIn(BaseModel):
    token: str
    platform: str


class PreferencesIn(BaseModel):
    enabled: bool
    scope: str
    rise_threshold: Optional[int] = None
    fall_threshold: Optional[int] = None


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.post("/api/push/devices", status_code=201)
def register_device(body: DeviceIn, user: CurrentUser = Depends(get_current_user)):
    token = body.token.strip()
    if not _TOKEN.match(token) or body.platform not in _PLATFORMS:
        raise HTTPException(status_code=400, detail="Invalid push token or platform")
    now = _now()
    get_db().execute(
        "INSERT INTO push_devices (token, user_id, platform, created_at, last_seen) "
        "VALUES (%s, %s, %s, %s, %s) "
        "ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, "
        "platform = EXCLUDED.platform, last_seen = EXCLUDED.last_seen",
        (token, user.id, body.platform, now, now),
    )
    return {"token": token}


@router.delete("/api/push/devices")
def unregister_device(token: str = Query(...), user: CurrentUser = Depends(get_current_user)):
    rows = get_db().execute(
        "DELETE FROM push_devices WHERE token = %s AND user_id = %s RETURNING token",
        (token.strip(), user.id),
    ).fetchall()
    return {"deleted": bool(rows)}


@router.get("/api/alerts/preferences")
def get_preferences(user: CurrentUser = Depends(get_current_user)):
    row = get_db().execute(
        "SELECT enabled, scope, rise_threshold, fall_threshold "
        "FROM alert_preferences WHERE user_id = %s",
        (user.id,),
    ).fetchone()
    if not row:
        return dict(_DEFAULTS)
    return {"enabled": bool(row[0]), "scope": row[1],
            "rise_threshold": row[2], "fall_threshold": row[3]}


@router.put("/api/alerts/preferences")
def put_preferences(body: PreferencesIn, user: CurrentUser = Depends(get_current_user)):
    allowed = (None,) + ALERT_THRESHOLD_CHOICES
    if (body.scope not in ALERT_SCOPES or body.rise_threshold not in allowed
            or body.fall_threshold not in allowed):
        raise HTTPException(status_code=400, detail="Invalid alert preferences")
    get_db().execute(
        "INSERT INTO alert_preferences (user_id, enabled, scope, rise_threshold, "
        "fall_threshold, updated_at) VALUES (%s, %s, %s, %s, %s, %s) "
        "ON CONFLICT (user_id) DO UPDATE SET enabled = EXCLUDED.enabled, "
        "scope = EXCLUDED.scope, rise_threshold = EXCLUDED.rise_threshold, "
        "fall_threshold = EXCLUDED.fall_threshold, updated_at = EXCLUDED.updated_at",
        (user.id, body.enabled, body.scope, body.rise_threshold, body.fall_threshold, _now()),
    )
    return {"enabled": body.enabled, "scope": body.scope,
            "rise_threshold": body.rise_threshold, "fall_threshold": body.fall_threshold}


@router.get("/api/alerts")
def list_alerts(user: CurrentUser = Depends(get_current_user)):
    since = (datetime.now(timezone.utc) - timedelta(days=30)).date().isoformat()
    rows = get_db().execute(
        "SELECT symbol, session_date, direction, score_before, score_after, sent_at "
        "FROM alert_log WHERE user_id = %s AND status = 'sent' AND session_date >= %s "
        "ORDER BY sent_at DESC LIMIT 200",
        (user.id, since),
    ).fetchall()
    keys = ("symbol", "session_date", "direction", "score_before", "score_after", "sent_at")
    return {"alerts": [dict(zip(keys, r)) for r in rows]}
```

In `app/main.py`, add `alerts` to the router import list and to the `for router_module in (...)` tuple (last entry).

- [ ] **Step 4: Run to verify pass, including the auth sweep**

Run: `<venv python> -m pytest tests/test_alerts_router.py tests/test_auth_gate.py -q`
Expected: PASS — the auth sweep now also proves the 5 new routes reject anonymous callers.

- [ ] **Step 5: Document in CLAUDE.md (mirrored)**

In `egx-api-be/CLAUDE.md`: add the new files to the file tree next to their neighbours (`alert_store.py`, `expo_push.py`, `score_alerts.py` under `core/`; `alerts.py` under `routers/`), add the four tables to the *Database Schema* block, and add a section `### Score alerts (mobile push)` after the `POST /api/cron/risk_snapshot` section containing:
- What it does (one paragraph), the INDICATOR-not-instruction rule and the banned-word test.
- Baseline = previous session's close, captured before overwrite; same-regime blending; per-user weights.
- Measured 2026-10-11 10:42 Cairo: the tvDatafeed daily bar includes today's in-progress bar, so scores move intraday.
- Scheduling: cron-job.org must call `POST /api/cron/risk_snapshot` every minute Sun–Thu 10:00–15:30 Africa/Cairo for intraday alerts (in addition to the existing schedule); response field `alerts` = `{queued, sent, skipped, error}`.
- `ALERTS_START_LIMIT_SECONDS = 22` and why; quiet hours; daily cap; retries; DeviceNotRegistered.
- The 5 routes.

Then:
```bash
cp CLAUDE.md ../egx-api-fe/CLAUDE.md && cmp CLAUDE.md ../egx-api-fe/CLAUDE.md
```

- [ ] **Step 6: Full backend suite (tmux)**

```bash
mkdir -p ~/logs; tmux kill-session -t egx-be-tests 2>/dev/null
tmux new -d -s egx-be-tests "cd /home/mark/projects/egx-api/egx-api-be && <venv python> -m pytest -q 2>&1 | tee ~/logs/egx-be-tests.log"
```
Wait for it (`tail ~/logs/egx-be-tests.log`). Expected: all passed (≥520 + the new ones), 0 failed.

- [ ] **Step 7: Commit (both repos)**

```bash
git add app/routers/alerts.py app/main.py tests/test_alerts_router.py CLAUDE.md
git commit -m "feat(alerts): device and preference API; document score alerts"
cd ../egx-api-fe && git add CLAUDE.md && git commit -m "docs: mirror CLAUDE.md (score alerts)"
```
(fe commit happens on the fe default branch `master` or a `score-alerts` branch there — use a branch if the executor created one.)

---

## MOBILE

### Task 8: Dependencies, config, native boundary

**Files:**
- Modify: `package.json` / `package-lock.json` (via `npx expo install expo-notifications expo-device expo-dev-client`)
- Modify: `app.json`
- Modify: `scripts/make-icons.mjs`; create `assets/notification-icon.png` (generated)
- Create: `src/features/alerts/push.ts`
- Create: `src/test-utils/notificationsMock.ts`; modify `jest.setup.ts`
- Test: `src/features/alerts/__tests__/push.test.ts`

**Interfaces:**
- Produces (`@/features/alerts/push`):
  - `isExpoGo(): boolean`
  - `configureNotifications(): void` — sets the foreground handler (banner + list, no sound, no badge). Idempotent.
  - `ensureChannel(): Promise<void>` — Android only: `setNotificationChannelAsync("score-alerts", { name: "Score alerts", importance: AndroidImportance.DEFAULT })`.
  - `permissionStatus(): Promise<"granted" | "denied" | "undetermined">`
  - `requestPermission(): Promise<"granted" | "denied">`
  - `getPushToken(): Promise<string | null>` — null when not a physical device or no EAS projectId; rejects on network failure.
  - `devicePlatform(): "ios" | "android"`
  - `type AlertTap = { symbol: string }`
  - `onAlertTap(cb: (tap: AlertTap) => void): () => void`
  - `consumeColdStartTap(): Promise<AlertTap | null>` — reads `getLastNotificationResponseAsync()`, then `clearLastNotificationResponseAsync()`.
  - `parseTap(data: unknown): AlertTap | null` — `{type: "score_alert", symbol: string}` → `{symbol}`; anything else null.

- [ ] **Step 1: Install and configure**

```bash
cd /home/mark/projects/egx-api/egx-api-mobile
npx expo install expo-notifications expo-device expo-dev-client
```

`app.json` → add to `plugins` (after `"@react-native-community/datetimepicker"`):
```json
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#4488ff",
          "defaultChannel": "score-alerts"
        }
      ]
```
`#4488ff` is `COLORS.accent` in `src/shared/theme.ts` (verified 2026-10-11); if it has changed, use the current value — hexes come from `COLORS`.

`scripts/make-icons.mjs` → after the `android-icon-monochrome.png` render line add:
```js
// Android status-bar notification icon: 96x96, all-white silhouette on transparent.
render("notification-icon.png", wrap(mono, { scale: 0.8 }), 96);
```
and add `notification-icon.png  96, transparent, white silhouette for the Android status bar` to the header comment list. Run `npm run icons`; confirm `assets/notification-icon.png` exists (`file assets/notification-icon.png` → 96 x 96).

- [ ] **Step 2: Global jest mock**

Create `src/test-utils/notificationsMock.ts`:
```ts
/**
 * A stand-in for expo-notifications with bare jest.fn()s. Loaded globally from
 * jest.setup.ts because AuthProvider imports the alerts registration module.
 * Tests that care about a call override it with mockResolvedValue etc.
 */
export const AndroidImportance = { DEFAULT: 3 };
export const setNotificationHandler = jest.fn();
export const setNotificationChannelAsync = jest.fn().mockResolvedValue(null);
export const getPermissionsAsync = jest.fn().mockResolvedValue({ status: "undetermined" });
export const requestPermissionsAsync = jest.fn().mockResolvedValue({ status: "denied" });
export const getExpoPushTokenAsync = jest.fn().mockResolvedValue({ data: "ExponentPushToken[test]" });
export const addNotificationResponseReceivedListener = jest.fn(() => ({ remove: jest.fn() }));
export const getLastNotificationResponseAsync = jest.fn().mockResolvedValue(null);
export const clearLastNotificationResponseAsync = jest.fn().mockResolvedValue(undefined);
```
In `jest.setup.ts` add:
```ts
jest.mock("expo-notifications", () => require("./src/test-utils/notificationsMock"));
jest.mock("expo-device", () => ({ isDevice: true }));
```

- [ ] **Step 3: Write the failing test**

Create `src/features/alerts/__tests__/push.test.ts`:
```ts
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";

import { consumeColdStartTap, getPushToken, isExpoGo, parseTap, requestPermission } from "../push";

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { executionEnvironment: "standalone", expoConfig: { extra: { eas: { projectId: "proj-1" } } } },
  ExecutionEnvironment: { StoreClient: "storeClient", Standalone: "standalone", Bare: "bare" },
}));

const N = Notifications as jest.Mocked<typeof Notifications>;

describe("push boundary", () => {
  it("parses only score-alert taps with a symbol", () => {
    expect(parseTap({ type: "score_alert", symbol: "COMI" })).toEqual({ symbol: "COMI" });
    expect(parseTap({ type: "score_alert", symbol: "*" })).toEqual({ symbol: "*" });
    expect(parseTap({ type: "other", symbol: "COMI" })).toBeNull();
    expect(parseTap({ type: "score_alert" })).toBeNull();
    expect(parseTap(null)).toBeNull();
  });

  it("detects Expo Go from the execution environment", () => {
    expect(isExpoGo()).toBe(false);
    (Constants as unknown as { executionEnvironment: string }).executionEnvironment = "storeClient";
    expect(isExpoGo()).toBe(true);
    (Constants as unknown as { executionEnvironment: string }).executionEnvironment = "standalone";
  });

  it("creates the Android channel before asking for permission", async () => {
    Platform.OS = "android";
    N.getPermissionsAsync.mockResolvedValueOnce({ status: "undetermined" } as never);
    N.requestPermissionsAsync.mockResolvedValueOnce({ status: "granted" } as never);
    await expect(requestPermission()).resolves.toBe("granted");
    const channelOrder = N.setNotificationChannelAsync.mock.invocationCallOrder[0];
    const requestOrder = N.requestPermissionsAsync.mock.invocationCallOrder[0];
    expect(channelOrder).toBeLessThan(requestOrder);
    expect(N.setNotificationChannelAsync).toHaveBeenCalledWith("score-alerts", expect.objectContaining({ name: "Score alerts" }));
  });

  it("gets the Expo token with the EAS project id", async () => {
    N.getExpoPushTokenAsync.mockResolvedValueOnce({ data: "ExponentPushToken[abc]" } as never);
    await expect(getPushToken()).resolves.toBe("ExponentPushToken[abc]");
    expect(N.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: "proj-1" });
  });

  it("returns the cold-start tap once and clears it", async () => {
    N.getLastNotificationResponseAsync.mockResolvedValueOnce({
      notification: { request: { content: { data: { type: "score_alert", symbol: "FWRY" } } } },
    } as never);
    await expect(consumeColdStartTap()).resolves.toEqual({ symbol: "FWRY" });
    expect(N.clearLastNotificationResponseAsync).toHaveBeenCalled();
  });
});
```

If TypeScript or jest-expo rejects assigning `Platform.OS`, use `jest.replaceProperty(Platform, "OS", "android")` instead.

- [ ] **Step 4: Run to verify failure**

Run: `npx jest src/features/alerts/__tests__/push.test.ts`
Expected: FAIL — cannot find module `../push`.

- [ ] **Step 5: Implement `src/features/alerts/push.ts`**

```ts
/**
 * The ONLY file that touches expo-notifications / expo-device. Everything else
 * in alerts imports from here, so tests mock one module and the rest of the
 * feature stays plain TypeScript.
 *
 * Remote push needs an installed build: Expo Go cannot receive it (Android
 * since SDK 53). isExpoGo() lets the screen say so instead of failing.
 */
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const ALERT_CHANNEL_ID = "score-alerts";

export type AlertTap = { symbol: string };

export function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

let configured = false;
export function configureNotifications(): void {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function ensureChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(ALERT_CHANNEL_ID, {
    name: "Score alerts",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function permissionStatus(): Promise<"granted" | "denied" | "undetermined"> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted" ? "granted" : status === "denied" ? "denied" : "undetermined";
}

/** Android 13+ shows no prompt until a channel exists, so the channel comes first. */
export async function requestPermission(): Promise<"granted" | "denied"> {
  await ensureChannel();
  if ((await permissionStatus()) === "granted") return "granted";
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted" ? "granted" : "denied";
}

export async function getPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) return null;
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
}

export function devicePlatform(): "ios" | "android" {
  return Platform.OS === "ios" ? "ios" : "android";
}

export function parseTap(data: unknown): AlertTap | null {
  if (!data || typeof data !== "object") return null;
  const d = data as { type?: unknown; symbol?: unknown };
  if (d.type !== "score_alert" || typeof d.symbol !== "string" || !d.symbol) return null;
  return { symbol: d.symbol };
}

export function onAlertTap(cb: (tap: AlertTap) => void): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const tap = parseTap(response.notification.request.content.data);
    if (tap) cb(tap);
  });
  return () => sub.remove();
}

export async function consumeColdStartTap(): Promise<AlertTap | null> {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response) return null;
  await Notifications.clearLastNotificationResponseAsync();
  return parseTap(response.notification.request.content.data);
}
```

If `typecheck` rejects `Constants.expoConfig?.extra?.eas?.projectId` typing, keep the `as string | undefined` cast; do not use `any`.

- [ ] **Step 6: Run to verify pass, then verify**

Run: `npx jest src/features/alerts/__tests__/push.test.ts` → PASS.
Run: `npm run verify` → green (`git checkout tsconfig.json` if lint rewrote it).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json app.json scripts/make-icons.mjs assets/notification-icon.png src/features/alerts/push.ts src/features/alerts/__tests__/push.test.ts src/test-utils/notificationsMock.ts jest.setup.ts
git commit -m "feat(alerts): notifications dependencies, config and native boundary"
```

---

### Task 9: API client, registration, logout unregister

**Files:**
- Create: `src/features/alerts/options.ts`, `src/features/alerts/api.ts`, `src/features/alerts/registration.ts`
- Modify: `src/auth/AuthProvider.tsx` (`logout`)
- Test: `src/features/alerts/__tests__/registration.test.ts`, extend `src/auth/__tests__/` with one logout test

**Interfaces:**
- Consumes: `@/features/alerts/push` (Task 8); `getApiConfig` from `@/shared/apiConfig`.
- Produces:
  - `options.ts`: `type AlertScope = "watchlist" | "all"`; `type Threshold = 5 | 10 | 15 | 20 | null`; `interface AlertPreferences { enabled: boolean; scope: AlertScope; rise_threshold: Threshold; fall_threshold: Threshold }`; `DEFAULT_PREFERENCES: AlertPreferences` (`false, "watchlist", 10, 10`); `THRESHOLD_CHOICES = [null, 5, 10, 15, 20] as const`; `thresholdLabel(t: Threshold): string` (`null` → `"Off"`, n → `String(n)`); `SCOPE_OPTIONS = [{ value: "watchlist", label: "Watchlist & holdings" }, { value: "all", label: "All stocks" }]`.
  - `api.ts`: `fetchAlertPreferences(): Promise<AlertPreferences>`, `saveAlertPreferences(p): Promise<AlertPreferences>`, `registerDevice(token, platform): Promise<void>`, `unregisterDevice(token): Promise<void>`.
  - `registration.ts` (token remembered in `expo-secure-store`): `PUSH_TOKEN_KEY = "egx.push.token"`; `type EnableResult = { ok: true } | { ok: false; reason: "expo-go" | "denied" | "unavailable" | "network" }`; `enableAlertsOnDevice(): Promise<EnableResult>`; `syncRegistration(): Promise<void>`; `unregisterOnLogout(): Promise<void>`.

- [ ] **Step 1: Write the failing tests**

`src/features/alerts/__tests__/registration.test.ts`:
```ts
import * as SecureStore from "expo-secure-store";

import { fetchCalls, mockFetch, mockFetchNetworkError } from "@/test-utils/fetch";
import { configureApi } from "@/shared/apiConfig";
import * as push from "../push";
import { enableAlertsOnDevice, PUSH_TOKEN_KEY, syncRegistration, unregisterOnLogout } from "../registration";

jest.mock("../push", () => ({
  isExpoGo: jest.fn(() => false),
  configureNotifications: jest.fn(),
  requestPermission: jest.fn(),
  permissionStatus: jest.fn(),
  getPushToken: jest.fn(),
  devicePlatform: jest.fn(() => "android"),
}));
const P = push as jest.Mocked<typeof push>;

beforeEach(() => {
  configureApi({ baseUrl: "https://api.test/api", getToken: () => "jwt", onUnauthorized: () => {} });
  jest.clearAllMocks();
  P.isExpoGo.mockReturnValue(false);
});

describe("enableAlertsOnDevice", () => {
  it("refuses in Expo Go without touching permissions", async () => {
    P.isExpoGo.mockReturnValue(true);
    await expect(enableAlertsOnDevice()).resolves.toEqual({ ok: false, reason: "expo-go" });
    expect(P.requestPermission).not.toHaveBeenCalled();
  });

  it("reports denied permission", async () => {
    P.requestPermission.mockResolvedValue("denied");
    await expect(enableAlertsOnDevice()).resolves.toEqual({ ok: false, reason: "denied" });
  });

  it("reports unavailable when there is no token (simulator / no project id)", async () => {
    P.requestPermission.mockResolvedValue("granted");
    P.getPushToken.mockResolvedValue(null);
    await expect(enableAlertsOnDevice()).resolves.toEqual({ ok: false, reason: "unavailable" });
  });

  it("registers the token and remembers it", async () => {
    P.requestPermission.mockResolvedValue("granted");
    P.getPushToken.mockResolvedValue("ExponentPushToken[abc]");
    mockFetch("POST", "/push/devices", { token: "ExponentPushToken[abc]" }, 201);
    await expect(enableAlertsOnDevice()).resolves.toEqual({ ok: true });
    const [call] = fetchCalls().filter((c) => c.url.endsWith("/push/devices"));
    expect(call.body).toEqual({ token: "ExponentPushToken[abc]", platform: "android" });
    await expect(SecureStore.getItemAsync(PUSH_TOKEN_KEY)).resolves.toBe("ExponentPushToken[abc]");
  });

  it("reports network when registration fails", async () => {
    P.requestPermission.mockResolvedValue("granted");
    P.getPushToken.mockResolvedValue("ExponentPushToken[abc]");
    mockFetchNetworkError("POST", "/push/devices");
    await expect(enableAlertsOnDevice()).resolves.toEqual({ ok: false, reason: "network" });
  });
});

describe("syncRegistration", () => {
  it("re-registers when alerts are on and permission is granted", async () => {
    mockFetch("GET", "/alerts/preferences", { enabled: true, scope: "all", rise_threshold: 10, fall_threshold: 10 });
    mockFetch("POST", "/push/devices", {}, 201);
    P.permissionStatus.mockResolvedValue("granted");
    P.getPushToken.mockResolvedValue("ExponentPushToken[abc]");
    await syncRegistration();
    expect(fetchCalls().some((c) => c.method === "POST" && c.url.endsWith("/push/devices"))).toBe(true);
  });

  it("does nothing when alerts are off", async () => {
    mockFetch("GET", "/alerts/preferences", { enabled: false, scope: "watchlist", rise_threshold: 10, fall_threshold: 10 });
    await syncRegistration();
    expect(P.getPushToken).not.toHaveBeenCalled();
  });

  it("swallows every failure", async () => {
    mockFetchNetworkError("GET", "/alerts/preferences");
    await expect(syncRegistration()).resolves.toBeUndefined();
  });
});

describe("unregisterOnLogout", () => {
  it("deletes the remembered token and forgets it", async () => {
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, "ExponentPushToken[abc]");
    mockFetch("DELETE", "/push/devices", { deleted: true });
    await unregisterOnLogout();
    const [call] = fetchCalls().filter((c) => c.method === "DELETE");
    expect(call.url).toContain("token=ExponentPushToken%5Babc%5D");
    await expect(SecureStore.getItemAsync(PUSH_TOKEN_KEY)).resolves.toBeNull();
  });

  it("is silent when nothing was registered or the call fails", async () => {
    await expect(unregisterOnLogout()).resolves.toBeUndefined();
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, "ExponentPushToken[abc]");
    mockFetchNetworkError("DELETE", "/push/devices");
    await expect(unregisterOnLogout()).resolves.toBeUndefined();
  });
});
```

`jest.setup.ts` already calls `installFetchMock()` and resets the in-memory `expo-secure-store` mock before every test. The token is kept in **SecureStore, not AsyncStorage**: AsyncStorage is not mocked globally, and `AuthProvider` (rendered by many tests) will import this module. Before writing, open `src/test-utils/fetch.ts` to confirm `Call.body` is the parsed JSON. Adjust ONLY test plumbing to match the helpers — never the behaviour asserted.

- [ ] **Step 2: Run to verify failure**

Run: `npx jest src/features/alerts/__tests__/registration.test.ts`
Expected: FAIL — cannot find module `../registration`.

- [ ] **Step 3: Implement**

`src/features/alerts/options.ts`:
```ts
export type AlertScope = "watchlist" | "all";
export type Threshold = 5 | 10 | 15 | 20 | null;

export interface AlertPreferences {
  enabled: boolean;
  scope: AlertScope;
  rise_threshold: Threshold;
  fall_threshold: Threshold;
}

export const DEFAULT_PREFERENCES: AlertPreferences = {
  enabled: false,
  scope: "watchlist",
  rise_threshold: 10,
  fall_threshold: 10,
};

/** Points on the 0–100 score. null = that direction is off. */
export const THRESHOLD_CHOICES = [null, 5, 10, 15, 20] as const;

export function thresholdLabel(t: Threshold): string {
  return t === null ? "Off" : String(t);
}

export const SCOPE_OPTIONS: { value: AlertScope; label: string }[] = [
  { value: "watchlist", label: "Watchlist & holdings" },
  { value: "all", label: "All stocks" },
];
```

`src/features/alerts/api.ts`:
```ts
/**
 * Alerts endpoints. Mobile-only (the web has no push), so they live here rather
 * than in the generated src/shared/api.ts — but they read the same configured
 * base URL, token and 401 handler through getApiConfig().
 */
import { getApiConfig } from "@/shared/apiConfig";

import type { AlertPreferences } from "./options";

const TIMEOUT_MS = 10000;

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const { baseUrl, getToken, onUnauthorized } = getApiConfig();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    if (res.status === 401) onUnauthorized();
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.detail || `Request failed: ${res.status}`);
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

export function fetchAlertPreferences(): Promise<AlertPreferences> {
  return call("GET", "/alerts/preferences");
}

export function saveAlertPreferences(p: AlertPreferences): Promise<AlertPreferences> {
  return call("PUT", "/alerts/preferences", p);
}

export async function registerDevice(token: string, platform: "ios" | "android"): Promise<void> {
  await call("POST", "/push/devices", { token, platform });
}

export async function unregisterDevice(token: string): Promise<void> {
  await call("DELETE", `/push/devices?token=${encodeURIComponent(token)}`);
}
```

`src/features/alerts/registration.ts`:
```ts
/**
 * Getting this phone's push token to the backend, and taking it back on logout.
 * Every failure here is quiet: alerts are a convenience, and nothing about
 * them may block signing in, signing out, or opening the app.
 */
import * as SecureStore from "expo-secure-store";

import { fetchAlertPreferences, registerDevice, unregisterDevice } from "./api";
import { configureNotifications, devicePlatform, getPushToken, isExpoGo, permissionStatus, requestPermission } from "./push";

export const PUSH_TOKEN_KEY = "egx.push.token";

export type EnableResult = { ok: true } | { ok: false; reason: "expo-go" | "denied" | "unavailable" | "network" };

async function registerToken(): Promise<EnableResult> {
  let token: string | null;
  try {
    token = await getPushToken();
  } catch {
    return { ok: false, reason: "network" };
  }
  if (!token) return { ok: false, reason: "unavailable" };
  try {
    await registerDevice(token, devicePlatform());
  } catch {
    return { ok: false, reason: "network" };
  }
  try {
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
  } catch {
    // Unregister-on-logout becomes best effort; the server still prunes dead tokens.
  }
  return { ok: true };
}

/** Called when the user turns alerts ON. Asks the OS, then registers. */
export async function enableAlertsOnDevice(): Promise<EnableResult> {
  if (isExpoGo()) return { ok: false, reason: "expo-go" };
  configureNotifications();
  if ((await requestPermission()) !== "granted") return { ok: false, reason: "denied" };
  return registerToken();
}

/** On app start while signed in: tokens rotate, and last_seen should move. */
export async function syncRegistration(): Promise<void> {
  try {
    if (isExpoGo()) return;
    configureNotifications();
    const prefs = await fetchAlertPreferences();
    if (!prefs.enabled) return;
    if ((await permissionStatus()) !== "granted") return;
    await registerToken();
  } catch {
    // Quiet by design.
  }
}

/** Before the session is cleared, so the DELETE still carries the token. */
export async function unregisterOnLogout(): Promise<void> {
  try {
    const token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
    if (!token) return;
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
    await unregisterDevice(token);
  } catch {
    // Quiet by design: logout must never fail because of push.
  }
}
```

Note the local delete happens BEFORE the server DELETE so a failed call still forgets the token locally (the success test asserts the stored token is gone; the failure test asserts only that logout resolves).

`src/auth/AuthProvider.tsx` — change `logout`:
```ts
  const logout = useCallback(async () => {
    // Before clearSession: the DELETE needs the bearer token. Bounded, because
    // a dead network must not hold the user on a screen they asked to leave.
    await Promise.race([unregisterOnLogout(), new Promise((r) => setTimeout(r, 3000))]);
    await clearSession();
    setUser(null);
    setError(null);
  }, []);
```
with `import { unregisterOnLogout } from "@/features/alerts/registration";`.

Add a test to the existing AuthProvider test file in `src/auth/__tests__/` (open it first and follow its setup): mock `@/features/alerts/registration` with `unregisterOnLogout: jest.fn().mockResolvedValue(undefined)`, sign in, call `logout`, assert `unregisterOnLogout` was called and the user is signed out.

- [ ] **Step 4: Run to verify pass, then verify**

Run: `npx jest src/features/alerts src/auth` → PASS.
Run: `npm run verify` → green.

- [ ] **Step 5: Commit**

```bash
git add src/features/alerts src/auth
git commit -m "feat(alerts): preferences API client, device registration, unregister on logout"
```

---

### Task 10: Alerts screen, route, header bell

**Files:**
- Create: `src/features/alerts/AlertsScreen.tsx`, `src/features/alerts/AlertsHeaderButton.tsx`, `src/app/alerts.tsx`
- Modify: `src/lib/links.ts` (`routes.alerts = "/alerts"`), `src/navigation/RootNavigator.tsx`, `src/app/(tabs)/_layout.tsx`
- Test: `src/features/alerts/__tests__/AlertsScreen.test.tsx`, `src/features/alerts/__tests__/AlertsHeaderButton.test.tsx`

**Interfaces:**
- Consumes: `fetchAlertPreferences`, `saveAlertPreferences` (api), `enableAlertsOnDevice`, `EnableResult` (registration), `isExpoGo` (push), options (Task 9); UI kit `Screen`, `Card`, `AppText`, `SegmentedControl`, `ErrorState`, `IconButton`.
- Produces: route `/alerts` (title "Score alerts"); `AlertsHeaderButton` (bell, `accessibilityLabel="Score alerts"`).

Screen behaviour:
- Loads preferences (`fetchAlertPreferences`); loading → `CardSkeleton`; error → `ErrorState` with retry.
- Expo Go → a `Card` with "Alerts need the installed app build. They can't be delivered in Expo Go." and every control disabled (no switch handler runs).
- Master `Switch` (`accessibilityLabel="Score alerts"`). Turning ON: call `enableAlertsOnDevice()`; on `{ok:false}` keep it OFF, save nothing, show the message for the reason:
  - `denied`: "Notifications are blocked for Borsa Compass. Allow them in your phone's Settings, then try again."
  - `unavailable`: "This device can't receive push notifications."
  - `network`: "Couldn't reach the server. Try again."
  - `expo-go`: the Expo Go message above.
  On `{ok:true}`: `saveAlertPreferences({...prefs, enabled: true})`.
- Turning OFF: `saveAlertPreferences({...prefs, enabled: false})` (the token stays registered; the server ignores disabled users).
- Scope `SegmentedControl` (`SCOPE_OPTIONS`), "Notify when a score rises by" and "…falls by" `SegmentedControl`s over `THRESHOLD_CHOICES` (values as strings: `"off"`, `"5"`, …; map with `thresholdLabel`). Each change saves immediately; on save failure revert to the last saved value and show "Couldn't save. Try again."
- Controls other than the master switch are disabled (opacity 50%, presses ignored) while alerts are off.
- Footer copy, always visible: "Scores move with price and volume. A change in score is information, not advice." and "Points are on the 0–100 score. Alerts arrive while the market is open, at most once per stock and direction per day, and never between 22:00 and 08:00."

- [ ] **Step 1: Write the failing tests**

`src/features/alerts/__tests__/AlertsScreen.test.tsx`:
```tsx
import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { configureApi } from "@/shared/apiConfig";
import { renderScreen } from "@/test-utils/renderScreen";
import { fetchCalls, mockFetch } from "@/test-utils/fetch";
import * as push from "../push";
import * as registration from "../registration";
import { AlertsScreen } from "../AlertsScreen";

jest.mock("../push", () => ({ isExpoGo: jest.fn(() => false) }));
jest.mock("../registration", () => ({ enableAlertsOnDevice: jest.fn() }));
const P = push as jest.Mocked<typeof push>;
const R = registration as jest.Mocked<typeof registration>;

const OFF = { enabled: false, scope: "watchlist", rise_threshold: 10, fall_threshold: 10 };
const ON = { ...OFF, enabled: true };

function puts() {
  return fetchCalls().filter((c) => c.method === "PUT" && c.url.endsWith("/alerts/preferences"));
}

beforeEach(() => {
  jest.clearAllMocks();
  P.isExpoGo.mockReturnValue(false);
  // AuthProvider (which normally configures the client) is not mounted here.
  configureApi({ baseUrl: "https://api.test/api", getToken: () => "jwt", onUnauthorized: () => {} });
});

it("turning alerts on asks the device, then saves enabled", async () => {
  mockFetch("GET", "/alerts/preferences", OFF);
  mockFetch("PUT", "/alerts/preferences", ON);
  R.enableAlertsOnDevice.mockResolvedValue({ ok: true });
  await renderScreen(<AlertsScreen />);
  fireEvent(await screen.findByLabelText("Score alerts"), "valueChange", true);
  await waitFor(() => expect(puts()).toHaveLength(1));
  expect(puts()[0].body).toEqual(ON);
});

it("a denied permission leaves alerts off, saves nothing, and says how to fix it", async () => {
  mockFetch("GET", "/alerts/preferences", OFF);
  R.enableAlertsOnDevice.mockResolvedValue({ ok: false, reason: "denied" });
  await renderScreen(<AlertsScreen />);
  fireEvent(await screen.findByLabelText("Score alerts"), "valueChange", true);
  expect(await screen.findByText(/blocked for Borsa Compass/)).toBeTruthy();
  expect(screen.getByLabelText("Score alerts").props.value).toBe(false);
  expect(puts()).toHaveLength(0);
});

it("changing the rise threshold saves it", async () => {
  mockFetch("GET", "/alerts/preferences", ON);
  mockFetch("PUT", "/alerts/preferences", { ...ON, rise_threshold: 5 });
  await renderScreen(<AlertsScreen />);
  fireEvent.press(await screen.findByLabelText("Rises by 5"));
  await waitFor(() => expect(puts()[0]?.body).toEqual({ ...ON, rise_threshold: 5 }));
});

it("turning a direction off sends null", async () => {
  mockFetch("GET", "/alerts/preferences", ON);
  mockFetch("PUT", "/alerts/preferences", { ...ON, fall_threshold: null });
  await renderScreen(<AlertsScreen />);
  fireEvent.press(await screen.findByLabelText("Falls by Off"));
  await waitFor(() => expect(puts()[0]?.body).toEqual({ ...ON, fall_threshold: null }));
});

it("a failed save reverts the control", async () => {
  mockFetch("GET", "/alerts/preferences", ON);
  mockFetch("PUT", "/alerts/preferences", { detail: "boom" }, 500);
  await renderScreen(<AlertsScreen />);
  fireEvent.press(await screen.findByLabelText("All stocks"));
  expect(await screen.findByText("Couldn't save. Try again.")).toBeTruthy();
  expect(screen.getByLabelText("Watchlist & holdings").props.accessibilityState.selected).toBe(true);
});

it("in Expo Go the screen explains and disables everything", async () => {
  P.isExpoGo.mockReturnValue(true);
  mockFetch("GET", "/alerts/preferences", OFF);
  await renderScreen(<AlertsScreen />);
  expect(await screen.findByText(/installed app build/)).toBeTruthy();
  expect(screen.getByLabelText("Score alerts").props.disabled).toBe(true);
});

it("states that a score change is not advice", async () => {
  mockFetch("GET", "/alerts/preferences", OFF);
  await renderScreen(<AlertsScreen />);
  expect(await screen.findByText(/information, not advice/)).toBeTruthy();
});
```

`renderScreen(ui)` wraps RNTL `render` with `TestSafeArea` only (no data providers). Check how `SegmentedControl` exposes labels — the threshold controls need DISTINCT accessibility labels ("Rises by 5", "Falls by Off"), so add an optional `accessibilityLabelPrefix?: string` prop to `src/ui/SegmentedControl.tsx` (label = `${prefix} ${o.label}` when set; existing callers unchanged) and add a test for it in `src/ui/__tests__/`.

`src/features/alerts/__tests__/AlertsHeaderButton.test.tsx`:
```tsx
import { fireEvent, render, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { routes } from "@/lib/links";
import { AlertsHeaderButton } from "../AlertsHeaderButton";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));

it("opens the alerts screen", async () => {
  await render(<AlertsHeaderButton />);
  await fireEvent.press(screen.getByLabelText("Score alerts"));
  expect(router.push).toHaveBeenCalledWith(routes.alerts);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx jest src/features/alerts`
Expected: FAIL — cannot find `../AlertsScreen` / `../AlertsHeaderButton`.

- [ ] **Step 3: Implement**

`src/lib/links.ts`: add `alerts: "/alerts",` to `routes`.

`src/features/alerts/AlertsHeaderButton.tsx`:
```tsx
/** Alerts are an account setting, like Users and Log out — a header button, not a tab. */
import { router } from "expo-router";

import { routes } from "@/lib/links";
import { IconButton } from "@/ui";

export function AlertsHeaderButton() {
  return <IconButton icon="notifications-outline" accessibilityLabel="Score alerts" onPress={() => router.push(routes.alerts)} />;
}
```

`src/app/(tabs)/_layout.tsx`: render `<AlertsHeaderButton />` first inside the `headerRight` row (before `<AdminHeaderButton />`).

`src/app/alerts.tsx`:
```tsx
import { AlertsScreen } from "@/features/alerts/AlertsScreen";

export default function AlertsRoute() {
  return <AlertsScreen />;
}
```

`src/navigation/RootNavigator.tsx`: inside the authenticated guard, after `calibration`: `<Stack.Screen name="alerts" options={{ ...header, title: "Score alerts" }} />`.

`src/features/alerts/AlertsScreen.tsx`:
```tsx
/**
 * Score alerts: whether, for which stocks, and how big a move. Every control
 * saves immediately; a failed save puts the control back. Turning alerts on is
 * the moment we ask the OS for permission — never earlier.
 */
import { useCallback, useEffect, useState } from "react";
import { Switch, View } from "react-native";

import { V } from "@/shared/learnVisuals";
import { AppText, Card, CardSkeleton, ErrorState, Screen, SegmentedControl } from "@/ui";

import { fetchAlertPreferences, saveAlertPreferences } from "./api";
import { type AlertPreferences, DEFAULT_PREFERENCES, SCOPE_OPTIONS, THRESHOLD_CHOICES, type Threshold, thresholdLabel } from "./options";
import { isExpoGo } from "./push";
import { enableAlertsOnDevice, type EnableResult } from "./registration";

const EXPO_GO = "Alerts need the installed app build. They can't be delivered in Expo Go.";
const REASONS: Record<Exclude<EnableResult, { ok: true }>["reason"], string> = {
  denied: "Notifications are blocked for Borsa Compass. Allow them in your phone's Settings, then try again.",
  unavailable: "This device can't receive push notifications.",
  network: "Couldn't reach the server. Try again.",
  "expo-go": EXPO_GO,
};
const SAVE_FAILED = "Couldn't save. Try again.";

const thresholdOptions = THRESHOLD_CHOICES.map((t) => ({ value: t === null ? "off" : String(t), label: thresholdLabel(t) }));
const toThreshold = (v: string): Threshold => (v === "off" ? null : (Number(v) as Threshold));
const fromThreshold = (t: Threshold): string => (t === null ? "off" : String(t));

export function AlertsScreen() {
  const expoGo = isExpoGo();
  const [prefs, setPrefs] = useState<AlertPreferences | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setPrefs(await fetchAlertPreferences());
    } catch {
      setLoadError("Couldn't load your alert settings.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(
    async (next: AlertPreferences) => {
      const previous = prefs ?? DEFAULT_PREFERENCES;
      setPrefs(next);
      setNotice(null);
      try {
        setPrefs(await saveAlertPreferences(next));
      } catch {
        setPrefs(previous);
        setNotice(SAVE_FAILED);
      }
    },
    [prefs]
  );

  const toggle = useCallback(
    async (on: boolean) => {
      if (!prefs || busy) return;
      setNotice(null);
      if (!on) return save({ ...prefs, enabled: false });
      setBusy(true);
      try {
        const result = await enableAlertsOnDevice();
        if (!result.ok) {
          setNotice(REASONS[result.reason]);
          return;
        }
        await save({ ...prefs, enabled: true });
      } finally {
        setBusy(false);
      }
    },
    [prefs, busy, save]
  );

  if (loadError) {
    return (
      <Screen edges={[]}>
        <View className="pt-4">
          <ErrorState message={loadError} onRetry={() => void load()} />
        </View>
      </Screen>
    );
  }
  if (!prefs) {
    return (
      <Screen edges={[]}>
        <View className="pt-4">
          <CardSkeleton />
        </View>
      </Screen>
    );
  }

  const controlsOff = expoGo || !prefs.enabled;
  return (
    <Screen edges={[]}>
      <View className="gap-4 pt-4">
        {expoGo ? (
          <Card>
            <AppText className="text-sm text-white/70">{EXPO_GO}</AppText>
          </Card>
        ) : null}

        <Card>
          <View className="min-h-[44px] flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <AppText className="font-sans-semibold text-white">Score alerts</AppText>
              <AppText className="text-xs text-white/50">A push when a score moves a lot in one session.</AppText>
            </View>
            <Switch
              accessibilityLabel="Score alerts"
              value={prefs.enabled}
              disabled={expoGo || busy}
              onValueChange={(v) => void toggle(v)}
              trackColor={{ true: V.accent, false: "rgba(255,255,255,0.15)" }}
            />
          </View>
          {notice ? <AppText className="mt-2 text-xs text-loss">{notice}</AppText> : null}
        </Card>

        <View className={`gap-4 ${controlsOff ? "opacity-50" : ""}`} pointerEvents={controlsOff ? "none" : "auto"}>
          <View className="gap-2">
            <AppText className="text-sm text-white/70">Which stocks</AppText>
            <SegmentedControl options={SCOPE_OPTIONS} value={prefs.scope} onChange={(scope) => void save({ ...prefs, scope })} />
          </View>
          <View className="gap-2">
            <AppText className="text-sm text-white/70">Notify when a score rises by (points)</AppText>
            <SegmentedControl
              accessibilityLabelPrefix="Rises by"
              options={thresholdOptions}
              value={fromThreshold(prefs.rise_threshold)}
              onChange={(v) => void save({ ...prefs, rise_threshold: toThreshold(v) })}
            />
          </View>
          <View className="gap-2">
            <AppText className="text-sm text-white/70">Notify when a score falls by (points)</AppText>
            <SegmentedControl
              accessibilityLabelPrefix="Falls by"
              options={thresholdOptions}
              value={fromThreshold(prefs.fall_threshold)}
              onChange={(v) => void save({ ...prefs, fall_threshold: toThreshold(v) })}
            />
          </View>
        </View>

        <View className="gap-2">
          <AppText className="text-xs text-white/50">Scores move with price and volume. A change in score is information, not advice.</AppText>
          <AppText className="text-xs text-white/40">
            Points are on the 0–100 score. Alerts arrive while the market is open, at most once per stock and direction per day, and never
            between 22:00 and 08:00.
          </AppText>
        </View>
      </View>
    </Screen>
  );
}
```

Check against the UI kit before finalising: `CardSkeleton` is exported from `@/ui` (it is, via `Skeletons`); `Card` accepts children; the mobile CLAUDE.md says screens under a stack header pass `edges={[]}` and must not add their own `px-4` (Screen already does). If `pointerEvents` as a View prop is flagged deprecated by lint/typecheck on RN 0.86, use `style={{ pointerEvents: ... }}` instead.

- [ ] **Step 4: Run to verify pass, then verify**

Run: `npx jest src/features/alerts src/ui` → PASS.
Run: `npm run verify` → green.

- [ ] **Step 5: Commit**

```bash
git add src/features/alerts src/app/alerts.tsx src/lib/links.ts src/navigation/RootNavigator.tsx "src/app/(tabs)/_layout.tsx" src/ui
git commit -m "feat(alerts): score alerts screen, route and header button"
```

---

### Task 11: Tap routing and boot registration

**Files:**
- Create: `src/features/alerts/NotificationRouter.tsx`
- Modify: `src/navigation/RootNavigator.tsx`
- Test: `src/features/alerts/__tests__/NotificationRouter.test.tsx`

**Interfaces:**
- Consumes: `onAlertTap`, `consumeColdStartTap`, `configureNotifications`, `isExpoGo` (push); `syncRegistration` (registration); `stockHref`, `routes` (links).
- Produces: `<NotificationRouter />` — renders `null`; mounted only while authenticated.

Behaviour: on mount, unless Expo Go: `configureNotifications()`; `void syncRegistration()`; subscribe `onAlertTap(go)`; `consumeColdStartTap().then(t => t && go(t))`. `go({symbol})`: `symbol === "*"` → `router.push(routes.dashboard)`; else `router.push(stockHref(symbol))`. Unsubscribe on unmount. In Expo Go do nothing.

- [ ] **Step 1: Write the failing test**

```tsx
import { render } from "@testing-library/react-native";
import { router } from "expo-router";

import { routes, stockHref } from "@/lib/links";
import * as push from "../push";
import * as registration from "../registration";
import { NotificationRouter } from "../NotificationRouter";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.mock("../push", () => ({
  isExpoGo: jest.fn(() => false),
  configureNotifications: jest.fn(),
  onAlertTap: jest.fn(),
  consumeColdStartTap: jest.fn(),
}));
jest.mock("../registration", () => ({ syncRegistration: jest.fn().mockResolvedValue(undefined) }));
const P = push as jest.Mocked<typeof push>;

let tap: ((t: { symbol: string }) => void) | undefined;
const unsubscribe = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  P.isExpoGo.mockReturnValue(false);
  P.onAlertTap.mockImplementation((cb) => {
    tap = cb;
    return unsubscribe;
  });
  P.consumeColdStartTap.mockResolvedValue(null);
});

it("a tapped alert opens that stock", async () => {
  await render(<NotificationRouter />);
  tap?.({ symbol: "COMI" });
  expect(router.push).toHaveBeenCalledWith(stockHref("COMI"));
});

it("the daily summary opens the dashboard", async () => {
  await render(<NotificationRouter />);
  tap?.({ symbol: "*" });
  expect(router.push).toHaveBeenCalledWith(routes.dashboard);
});

it("a cold-start tap is routed once", async () => {
  P.consumeColdStartTap.mockResolvedValue({ symbol: "FWRY" });
  await render(<NotificationRouter />);
  await new Promise((r) => setImmediate(r));
  expect(router.push).toHaveBeenCalledWith(stockHref("FWRY"));
  expect(router.push).toHaveBeenCalledTimes(1);
});

it("re-registers on boot and unsubscribes on unmount", async () => {
  const view = await render(<NotificationRouter />);
  expect(registration.syncRegistration).toHaveBeenCalled();
  view.unmount();
  expect(unsubscribe).toHaveBeenCalled();
});

it("does nothing in Expo Go", async () => {
  P.isExpoGo.mockReturnValue(true);
  await render(<NotificationRouter />);
  expect(P.onAlertTap).not.toHaveBeenCalled();
  expect(registration.syncRegistration).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx jest src/features/alerts/__tests__/NotificationRouter.test.tsx`
Expected: FAIL — cannot find `../NotificationRouter`.

- [ ] **Step 3: Implement**

`src/features/alerts/NotificationRouter.tsx`:
```tsx
/**
 * Turns a tapped score alert into navigation, and refreshes this phone's push
 * registration once per signed-in app start. Renders nothing.
 */
import { router } from "expo-router";
import { useEffect } from "react";

import { routes, stockHref } from "@/lib/links";

import { type AlertTap, configureNotifications, consumeColdStartTap, isExpoGo, onAlertTap } from "./push";
import { syncRegistration } from "./registration";

function go({ symbol }: AlertTap): void {
  router.push(symbol === "*" ? routes.dashboard : stockHref(symbol));
}

export function NotificationRouter() {
  useEffect(() => {
    if (isExpoGo()) return;
    configureNotifications();
    void syncRegistration();
    const unsubscribe = onAlertTap(go);
    let active = true;
    void consumeColdStartTap()
      .then((t) => {
        if (active && t) go(t);
      })
      .catch(() => {});
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
  return null;
}
```

`src/navigation/RootNavigator.tsx`: return a fragment: the existing `<Stack>…</Stack>` followed by `{isAuthenticated ? <NotificationRouter /> : null}`.

- [ ] **Step 4: Run to verify pass, then verify**

Run: `npx jest src/features/alerts src/navigation src/__tests__/routes` → PASS.
Run: `npm run verify` → green.

- [ ] **Step 5: Commit**

```bash
git add src/features/alerts/NotificationRouter.tsx src/features/alerts/__tests__/NotificationRouter.test.tsx src/navigation/RootNavigator.tsx
git commit -m "feat(alerts): route tapped alerts and refresh registration on start"
```

---

### Task 12: Docs and the user's setup checklist

**Files:**
- Modify: `egx-api-mobile/CLAUDE.md`, `egx-api-mobile/docs/release.md`, `egx-api-mobile/docs/superpowers/specs/2026-10-11-score-alerts-design.md`

- [ ] **Step 1: Mobile CLAUDE.md**

- Replace the rule line `- Everything must run in **Expo Go** (no custom native modules).` with:
  `- Everything must RUN in **Expo Go**. The one exception is remote push (score alerts): Expo Go cannot receive it, so \`src/features/alerts\` checks \`isExpoGo()\` and renders disabled there. No other custom native modules.`
- Add a `## Score alerts` section: files in `src/features/alerts/` (`push.ts` is the only file importing expo-notifications/expo-device; `api.ts` is mobile-only and uses `getApiConfig`; `registration.ts`; `AlertsScreen`; `NotificationRouter` mounted in `RootNavigator` while signed in); SecureStore key `egx.push.token`; route `/alerts` from the bell header button; copy rule (no buy/sell/opportunity/risk/recommend; "information, not advice"); testing in a dev build only (`eas build --profile development`); jest mocks `src/test-utils/notificationsMock.ts` loaded from `jest.setup.ts`.
- Add `notification-icon.png` to the `npm run icons` description.

- [ ] **Step 2: docs/release.md — "Push notifications setup" section** (user-only steps, in order):
1. `npx eas-cli@latest init` → commits `extra.eas.projectId` into `app.json` (required by `getExpoPushTokenAsync`).
2. Android: create a free Firebase project → add an Android app with package `com.markbotros.borsacompass` → download `google-services.json` to the repo root → add `"googleServicesFile": "./google-services.json"` under `expo.android` in `app.json` → in Firebase project settings → Service accounts → generate a private key → `npx eas-cli@latest credentials` → Android → production → Google Service Account → "Push Notifications (FCM V1)" → upload the key.
3. iOS: Apple Developer Program membership → `npx eas-cli@latest credentials` → iOS → Push Notifications key (let EAS generate it).
4. `npx eas-cli@latest build --profile development --platform android` (and/or ios), install, sign in, open the bell → turn alerts on.
5. Send yourself a test push: `curl -H "Content-Type: application/json" -X POST https://exp.host/--/api/v2/push/send -d '{"to":"<token from the push_devices table>","title":"Test","body":"Hello","data":{"type":"score_alert","symbol":"COMI"}}'` — tapping it must open COMI.
6. cron-job.org: add a job `POST <API>/api/cron/risk_snapshot` with header `X-Cron-Secret`, every minute, Sun–Thu, 10:00–15:30, timezone Africa/Cairo.

- [ ] **Step 3: Spec** — in section 3 "Open item 0", append: `**Resolved 2026-10-11 10:42 Cairo:** the daily bar for COMI, ETEL and FWRY was already dated 2026-10-11 with partial volume — the feed serves the in-progress bar, so alerts fire intraday.` In section 6 change `DELETE /api/push/devices/{token}` to `DELETE /api/push/devices?token=…`. In section 7 replace "Android `googleServicesFile`" with "Android `googleServicesFile` (added by the user with the Firebase file; see docs/release.md)".

- [ ] **Step 4: Verify and commit**

Run: `npm run verify` → green.
```bash
git add CLAUDE.md docs/release.md docs/superpowers/specs/2026-10-11-score-alerts-design.md
git commit -m "docs(alerts): Expo Go exception, push setup steps, spec resolutions"
```

---

## Done when

- Backend full suite green in tmux (`~/logs/egx-be-tests.log`), including the auth-gate sweep over the 5 new routes.
- `npm run verify` green in mobile.
- `egx-api-be/CLAUDE.md` and `egx-api-fe/CLAUDE.md` byte-identical.
- Nothing pushed; branches `score-alerts` ready for the finishing step.
