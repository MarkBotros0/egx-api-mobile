# Plan 3 — Market Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill the five market route shells Plan 1 created — Dashboard, Stock detail, Compare, News and the Dividend calendar — with native screens that apply the web app's rules unchanged, so a user can browse the EGX end to end on a phone.

**Architecture:** Every behaviour that lives inline in a web page file (market clock, card state machine, filters and sorts, chart-data builders, level/zone wording, compare validation, news ageing, calendar maths) is ported into **pure, tested functions in `src/features/market/logic/`**. Screens and cards in `src/features/market/` are thin React Native renderings of that logic over the shared API client (`@/shared/api`), the Plan 1 UI kit (`@/ui`) and providers, and the Plan 2 chart components (`@/charts`, same props as the web). Route files in `src/app/` only read params and mount a screen.

**Tech Stack:** Expo SDK 57 (React Native 0.86, React 19.2), Expo Router (`src/app`), NativeWind 4.2.7, TypeScript 6, `react-native-svg` (installed by Plan 2), Jest + `jest-expo` + `@testing-library/react-native` v14.

**Spec:** `docs/superpowers/plans/2026-10-10-00-roadmap.md` (binding contract) and the web product guide `../egx-api-fe/CLAUDE.md` (sections *Dashboard*, *Stock Detail*, *Compare*, *GET /api/news*, *GET /api/dividend_history, GET /api/dividend_calendar*, *Frontend Components*, *Styling*). Web sources ported: `../egx-api-fe/src/app/page.tsx`, `stock/[symbol]/page.tsx`, `compare/page.tsx`, `news/page.tsx`, `dividends/page.tsx`, and `components/{StockCard,Watchlist,IndexFilter,SectorFilter,MarketRegimeCard,StatsPanel,ScoreBreakdown,ScoreWeightsModal,KeyLevelsCard,EntryExitCard,ForecastCard,RiskGradeCard,DividendHistoryCard,PEFreshnessBanner,NewsList,LoadingSkeleton,LearnTooltip}.tsx`.

## Global Constraints

Everything in the roadmap applies. The lines below are the ones this plan leans on, copied from it, plus the decisions this plan makes.

- Work in `/home/mark/projects/egx-api/egx-api-mobile`. Plans 1 and 2 must be merged first.
- Routes live in `src/app/` and contain **no tests and no components** — a route file reads params and mounts one screen from `@/features/market/`.
- Tests live in a `__tests__/` folder beside the code, named `*.test.ts(x)`. Route tests live in `src/__tests__/routes/`. **Test helpers never live inside a `__tests__/` folder** (Jest would run them as suites); they live in `src/features/market/testing/`.
- Import across folders with `@/…` (`@/shared/api`, `@/ui`, `@/charts`, `@/providers/watchlist`, `@/lib/links`); relative imports only within one folder.
- **Never edit `src/shared/`.** Pure logic that is still inline in a web *page* file is ported into `src/features/market/logic/` with tests (see *Notes for later* at the end for what should move into `egx-api-fe/src/app/lib` one day).
- Add dependencies only with `npx expo install`. **This plan adds no dependency.**
- `gain` green / `loss` red mean a real direction in the data, never decoration. Risk bands use `RISK_BAND_COLOR` (cool→hot), never gain/loss. News, dividends, oversold breadth and low-confidence zones are neutral.
- Score labels are CONDITION words (`Very Weak … Very Strong`); never Buy/Sell. The composite-score disclaimer is shown where the web shows it (`ScoreBreakdown`).
- Fonts are families: `font-sans`, `font-sans-medium`, `font-sans-semibold`, `font-sans-bold`, `font-mono`, `font-mono-semibold`. Never `font-semibold`/`font-bold` alone. Web `font-mono text-sm font-semibold` → `font-mono-semibold text-sm`.
- No hover states. Touch targets at least 44pt (`min-h-[44px]`). Drop every `md:`/`lg:` branch; keep the unprefixed (mobile) web layout.
- Colours in JS come from `@/shared/theme` (`COLORS.gain`, `COLORS.loss`, `COLORS.accent`) or `@/shared/riskBands`; in `className` use the registered names (`text-gain`, `bg-accent/10`, `bg-charcoal-dark`). The overlay pill colours are the one exception: they are copied from the web *page* (`OVERLAYS` in `stock/[symbol]/page.tsx`) into `logic/stockDetail.ts` because they label lines Plan 2's `PriceChart` draws with the same literals.
- Navigation uses `router.push(...)` from `expo-router` with the `@/lib/links` helpers (`routes.compare`, `routes.dividends`, `routes.calibration`, `learnHref(id)`, `stockHref(symbol)`). Card → stock navigation with an interval uses `stockDetailHref` (Task 1), an object `Href`.
- **Refresh:** pull-to-refresh replaces the web Refresh button and must call `fetchDashboard({ fresh: true })`, exactly like the web refresh (it adds `?fresh=<ms>`). Pull-to-refresh on the other screens re-requests their data and keeps the old data on screen until the new data lands.
- **Date input decision:** Compare uses a dependency-free `TextField` with strict `YYYY-MM-DD` validation (`isIsoDate`) plus 3M / 6M / 1Y preset pills. No picker: `@react-native-community/datetimepicker` would be a new dependency, and the presets cover the common ranges with one tap.
- **Weights slider decision:** the web `<input type="range" min=0 max=50 step=5>` becomes a −/+ stepper (`stepWeight`, snaps to multiples of 5, clamps 0–50). No slider dependency.
- **Lint and React 19 hooks rules:** data hooks avoid synchronous `setState` in effects (results are keyed, see `useKeyedFetch`). Where a port must keep the web's effect ordering (`useLiveUpgrade`'s reset effect), and only if `npx expo lint` flags `react-hooks/set-state-in-effect`, add a single-line `// eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors the web reset ordering, see upgradedRef` above that call. Do not restructure the effect.
- Every task ends with `npm run verify` green (= `check:shared` + `tsc --noEmit` + `expo lint` + `jest`) and a commit whose message ends with:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01XDkAB7UCK8WyT267W5ZxNV
  ```
- Long runs (`npx expo start`, a full `jest` run over 2 minutes) go in tmux: `mkdir -p ~/logs && tmux new -d -s egx-mobile-<task> "<cmd> 2>&1 | tee ~/logs/egx-mobile-<task>.log"`.

### Contract assumptions about Plans 1 and 2 (not spelled out in the roadmap)

These are the only places this plan guesses. Each is isolated in one file so a mismatch is a one-file fix.

1. **Fetch mock** (`@/test-utils/fetch`, Plan 1 Task 4): `mockFetchHandler(method, path, (url: string, init?) => { status, body } | Promise<…>)` registers a reply for one method + exact path after the API base (query ignored); the newest registration wins; an unmatched request throws (no 404 fallback). `global.fetch` is a fresh `jest.fn()` per test. Only `src/features/market/testing/api.ts` (Task 3) calls it.
2. **`renderWithProviders(ui)`** (`@/test-utils/render`) mounts SafeAreaProvider + Auth (already signed in, no network needed for auth) + ScoreWeights + Tickers + Watchlist providers and returns the RNTL render result (tests `await` it, which is harmless if it is synchronous).
3. **Plan 1's providers do not need a live router** — feature tests replace `expo-router` with `src/features/market/testing/expoRouterMock.tsx`.
4. **`stockHref(symbol)`, `learnHref(id)` and `routes.*` return values accepted by `router.push`** (string or `Href`).
5. **`@/charts`** exports `PriceChart`, `VolumeChart`, `IndicatorPanel`, `CompareChart`, `CompositeGauge`, `scoreColor`, `Sparkline` with the web props, and **`Sparkline` colours itself by its own first-vs-last value** (the web `StockCard`/`Watchlist` rule — the line is coloured by the move it draws, not by the one-bar change). `react-native-svg` is installed (Plan 2).
6. **Plan 2 has no outcome-cone chart** (ForecastCard's Recharts `AreaChart` is not in the roadmap's chart table), so Task 9 draws it here with `react-native-svg` and a pure `coneGeometry` function.
7. **UI kit specifics:** `Pill` renders its `label` as text and is pressable through it; `IconButton` exposes `accessibilityLabel`; `TextField` forwards `placeholder`/`value`/`onChangeText`/`testID` to its `TextInput`; `Sheet` renders `title` and `children` when `visible`; `AppText` accepts `style` and `numberOfLines`. Screens render their own retry button (`Button label="Retry"`) rather than relying on `ErrorState`'s button label.

## Review Focus

The five input classes or failure modes most likely to bite a person, none of which the web tests exercise; each has a pinning test in the task named.

1. **The dashboard snapshot request fails or the nightly job never ran** → the grid must still fill from the live upgrade instead of sitting on "loading" (Task 4, `fills cards from the live upgrade when the snapshot fails`).
2. **Pull-to-refresh** → must hit the network with `fresh`, must keep the current cards on screen while it runs (never blank the grid), and must clear the spinner when it lands (Task 4, `refresh asks for fresh data and keeps cards visible`).
3. **Half-typed or impossible dates on Compare** (`2026-1`, `2026-02-30`, start after end) → Compare stays disabled with a message and sends no request (Task 11, `does not request with an invalid range`).
4. **A self-fetching stock card's endpoint fails** (risk 404 for an unmeasured symbol, Yahoo timeout on dividend history, `/pe` down) → the stock page must render everything else with no error wall (Task 9 and Task 7 failure tests).
5. **The app sits in the background** → the one-second "…ago" clock must stop ticking and resync on return, and a bare `YYYY-MM-DD` bar date must never slip a day in a timezone west of UTC (Task 2 `useNow` background test; Task 1 `sessionLabel` parses the string, never `new Date()`).

---

## File Structure

```
src/features/market/
  links.ts                       stockDetailHref(symbol, interval?) → Href
  logic/                         PURE functions, no React
    marketClock.ts               sessionLabel, isTodaysSession, agoLabel, isEgxOpen, cardStamp, changeIntervalNote
    format.ts                    changeText, pctText, formatVolume, coarse, formatPE, dayMonth, pct
    cards.ts                     CardState/CardData, snapshot → cards, live-upgrade state transitions
    dashboardFilters.ts          INDICES/SECTORS/SORTS, filter, feed split, dividend filter, sort, paging
    regime.ts                    regimePosition, breadthTone, positiveRateSplit
    stockDetail.ts               INTERVALS/BAR_COUNTS/OVERLAYS, chart-data builders, latestNonNull, atrPercent, compositeCallouts
    levels.ts                    formatLevelAge, levelReading, zoneTone
    freshness.ts                 peStaleDays, riskAgoLabel
    weights.ts                   stepWeight, rawTotal
    cone.ts                      coneGeometry (outcome-band SVG paths)
    compare.ts                   isIsoDate, ranges, suggestions, add symbol, series
    news.ts                      relativeAge, isFresh, sourceName, newsCaveats, yourStocksEmptyNote
    dividendCalendar.ts          month grid maths, indexing, listing
    __tests__/*.test.ts
  hooks/
    useNow.ts                    1 s clock, paused while the app is backgrounded
    useKeyedFetch.ts             fetch keyed by inputs; loading / refreshing / reload without setState-in-effect
    useDashboardSnapshot.ts      /api/dashboard → cards + noFeed + pull-to-refresh
    useLiveUpgrade.ts            bounded live re-scoring of visible + watched cards
    __tests__/*.test.ts(x)
  testing/                       test helpers (NOT tests)
    fixtures.ts, api.ts, expoRouterMock.tsx, chartsMock.tsx
  StockCard.tsx  WatchlistPanel.tsx  MarketRegimeCard.tsx
  IndexFilter.tsx  SectorFilter.tsx  DashboardControls.tsx  DashboardScreen.tsx
  RefreshableScroll.tsx  ChartControls.tsx
  StatsPanel.tsx  KeyLevelsCard.tsx  EntryExitCard.tsx  PEFreshnessBanner.tsx
  ScoreBreakdown.tsx  ScoreWeightsSheet.tsx  CompositeCard.tsx
  RiskGradeCard.tsx  DividendHistoryCard.tsx  ForecastCard.tsx  OutcomeCone.tsx
  StockDetailScreen.tsx  CompareScreen.tsx  NewsList.tsx  NewsScreen.tsx  DividendCalendarScreen.tsx
  __tests__/*.test.tsx
src/app/(tabs)/index.tsx  src/app/(tabs)/news.tsx  src/app/stock/[symbol].tsx  src/app/compare.tsx  src/app/dividends.tsx   (replace Plan 1 shells)
src/__tests__/routes/market-routes.test.tsx
```

Web → mobile translations decided once, here:

| Web | Mobile |
|---|---|
| `LearnTooltip` | `LearnTerm` (`@/ui`) |
| `Link href="/stock/X?interval=Y"` | `router.push(stockDetailHref(X, Y))` |
| `<a target=_blank>` (news) | `Linking.openURL(url)` |
| `<select>` (sector, calendar month/year) | `PillRow` of `Pill`s; calendar month via ‹ › buttons |
| Dashboard "Load More" | `FlatList` `onEndReached` **plus** a footer "Load more (N remaining)" button (screen-reader reachable) |
| Dashboard right sidebar (market condition, watchlist) | top of the list (`ListHeaderComponent`) — an infinite list has no reachable bottom |
| Sticky search / sticky stock header (`position: sticky`, `backdrop-blur`) | a fixed `View` above the scroll container |
| `title=` hover hints (sort, interval) | a muted caption under the row when that option is active |
| Overlay pill tooltips | long-press a pill → `Sheet` with the explanation |
| `localStorage` "Score: On/Off" | not persisted (session state only) — deliberate, no storage dependency |
| `document.visibilitychange` | `AppState` in `useNow` |
| `ResponsiveContainer` widths | `onLayout` (charts own this per the roadmap; `OutcomeCone` does it itself) |

---

### Task 1: Pure dashboard logic — clock, formatting, links, card states, filters

**Files:**
- Create: `src/features/market/logic/marketClock.ts`
- Create: `src/features/market/logic/format.ts`
- Create: `src/features/market/links.ts`
- Create: `src/features/market/logic/cards.ts`
- Create: `src/features/market/logic/dashboardFilters.ts`
- Create: `src/features/market/testing/fixtures.ts`
- Test: `src/features/market/logic/__tests__/marketClock.test.ts`
- Test: `src/features/market/logic/__tests__/format.test.ts`
- Test: `src/features/market/__tests__/links.test.ts`
- Test: `src/features/market/logic/__tests__/cards.test.ts`
- Test: `src/features/market/logic/__tests__/dashboardFilters.test.ts`

**Interfaces:**
- Consumes: `@/shared/api` (`DashboardRow`, `DashboardResponse`, `CompositeBatchResponse`), `@/shared/types` (`Ticker`, `CompositeSignal`, `PEData`), `expo-router` (`Href` type).
- Produces:
  - `marketClock.ts`: `sessionLabel(iso?: string|null): string|null`, `localDateKey(d: Date): string`, `isTodaysSession(barDate?: string|null, now?: Date): boolean`, `agoLabel(at: number|undefined, now: number): string|null`, `isEgxOpen(nowMs: number): boolean`, `cardStamp(s: StampInput): string|null`, `changeIntervalNote(changeInterval?: string): string|null`.
  - `format.ts`: `changeText(change?: number, changePct?: number): string`, `pctText(changePct?: number): string`, `formatVolume(v: number): string`, `coarse(v: number): string`, `formatPE(pe: Pick<PEData,"pe_ratio"|"fetched_at">): string`, `dayMonth(iso: string): string`, `pct(n: number): \`${number}%\``, `MONTHS_ABBR`.
  - `links.ts`: `stockDetailHref(symbol: string, interval?: string): Href`.
  - `cards.ts`: `CardState`, `CardData`, `CardMap`, `WatchlistPrice`, `UpgradeBook`, `cardsFromSnapshot(rows) → { cards, noFeed }`, `mergeSnapshot(prev, next)`, `demoteLive(prev)`, `applyBatchChunk(prev, partial, fetchedAt) → { cards, upgraded }`, `upgradeCandidates(symbols, book)`, `retryableSymbols(errors, book)`, `upgradeQueue(visible, watchlist, tickers)`, `watchlistPriceData(cards)`.
  - `dashboardFilters.ts`: `INDICES`, `SECTORS`, `ALL_SECTORS`, `SORTS`, `SortKey`, `SORT_EXPLANATIONS`, `COMPOSITE_INTERVALS`, `CompositeInterval`, `TickerFilter`, `filterTickers`, `splitByFeed`, `filterDividendPayers`, `sortTickers`, `pageSlice`.
  - `testing/fixtures.ts`: `TICKERS`, `makeDashboardRow`, `makeDashboard`, `DASHBOARD`, `batch`.

- [ ] **Step 1: Write the failing clock and format tests**

`src/features/market/logic/__tests__/marketClock.test.ts`:

```ts
import {
  agoLabel,
  cardStamp,
  changeIntervalNote,
  isEgxOpen,
  isTodaysSession,
  localDateKey,
  sessionLabel,
} from "../marketClock";

describe("sessionLabel", () => {
  it("formats a bare ISO date as day + short month", () => {
    expect(sessionLabel("2026-09-02")).toBe("2 Sep");
  });
  it("reads the date part of a timestamp without shifting the day", () => {
    expect(sessionLabel("2026-12-31T22:33:28Z")).toBe("31 Dec");
  });
  it("returns null for empty or malformed input", () => {
    expect(sessionLabel(null)).toBeNull();
    expect(sessionLabel(undefined)).toBeNull();
    expect(sessionLabel("")).toBeNull();
    expect(sessionLabel("Sep 2")).toBeNull();
    expect(sessionLabel("2026-13-01")).toBeNull();
  });
});

describe("isTodaysSession", () => {
  const now = new Date(2026, 8, 3, 11, 0); // 3 Sep 2026, local time
  it("is true for today's local date", () => {
    expect(localDateKey(now)).toBe("2026-09-03");
    expect(isTodaysSession("2026-09-03", now)).toBe(true);
  });
  it("is false for a past session and for no date", () => {
    expect(isTodaysSession("2026-09-02", now)).toBe(false);
    expect(isTodaysSession(null, now)).toBe(false);
  });
  it("compares only the date part", () => {
    expect(isTodaysSession("2026-09-03T00:00:00Z", now)).toBe(true);
  });
});

describe("agoLabel", () => {
  const now = 1_800_000_000_000;
  it("is null without a fetch time", () => {
    expect(agoLabel(undefined, now)).toBeNull();
  });
  it("steps up its unit as the age grows", () => {
    expect(agoLabel(now - 14_000, now)).toBe("14s ago");
    expect(agoLabel(now - (3 * 60 + 14) * 1000, now)).toBe("3m 14s ago");
    expect(agoLabel(now - (18 * 3600 + 22 * 60) * 1000, now)).toBe("18h 22m ago");
    expect(agoLabel(now - 3 * 86_400_000, now)).toBe("3d ago");
  });
  it("never shows a negative age", () => {
    expect(agoLabel(now + 5000, now)).toBe("0s ago");
  });
});

describe("isEgxOpen (Sun–Thu, 10:00–14:30 Cairo)", () => {
  it.each([
    ["2026-10-11T07:00:00Z", true], // Sun 10:00 Cairo, summer time (UTC+3)
    ["2026-10-11T06:59:00Z", false], // Sun 09:59
    ["2026-10-11T11:30:00Z", true], // Sun 14:30, the bell itself
    ["2026-10-11T11:31:00Z", false], // Sun 14:31
    ["2026-12-13T12:30:00Z", true], // Sun 14:30 Cairo in winter (UTC+2)
    ["2026-12-13T12:31:00Z", false],
    ["2026-10-09T09:00:00Z", false], // Friday
    ["2026-10-10T09:00:00Z", false], // Saturday
  ])("%s → open=%s", (iso, open) => {
    expect(isEgxOpen(Date.parse(iso))).toBe(open);
  });

  it("claims open when the engine cannot resolve Cairo time", () => {
    const spy = jest.spyOn(Intl, "DateTimeFormat").mockImplementation(() => {
      throw new RangeError("no time zone data");
    });
    expect(isEgxOpen(Date.parse("2026-10-10T09:00:00Z"))).toBe(true);
    spy.mockRestore();
  });
});

describe("cardStamp", () => {
  it("calls a past session a close and appends the fetch age", () => {
    expect(
      cardStamp({ asOf: "2 Sep", isToday: false, fetchedAgo: "14s ago", marketClosed: false })
    ).toBe("2 Sep close · 14s ago");
  });
  it("does not call today's moving bar a close while the market is open", () => {
    expect(
      cardStamp({ asOf: "3 Sep", isToday: true, fetchedAgo: "14s ago", marketClosed: false })
    ).toBe("3 Sep · 14s ago");
  });
  it("replaces the climbing age with Market closed once the bell has rung", () => {
    expect(
      cardStamp({ asOf: "3 Sep", isToday: true, fetchedAgo: "2h 5m ago", marketClosed: true })
    ).toBe("3 Sep close · Market closed");
    expect(
      cardStamp({ asOf: null, isToday: false, fetchedAgo: null, marketClosed: true })
    ).toBe("Market closed");
  });
  it("is null when there is nothing to say", () => {
    expect(
      cardStamp({ asOf: null, isToday: false, fetchedAgo: null, marketClosed: false })
    ).toBeNull();
  });
  it("shows the session alone when there is no fetch time", () => {
    expect(
      cardStamp({ asOf: "2 Sep", isToday: false, fetchedAgo: null, marketClosed: false })
    ).toBe("2 Sep close");
  });
});

describe("changeIntervalNote", () => {
  it("says what a non-daily change is measured against", () => {
    expect(changeIntervalNote("Weekly")).toBe("vs last week");
    expect(changeIntervalNote("Monthly")).toBe("vs last month");
    expect(changeIntervalNote("Daily")).toBeNull();
    expect(changeIntervalNote(undefined)).toBeNull();
  });
});
```

`src/features/market/logic/__tests__/format.test.ts`:

```ts
import { changeText, coarse, dayMonth, formatPE, formatVolume, pct, pctText } from "../format";

describe("changeText", () => {
  it("signs both figures from the percentage", () => {
    expect(changeText(1.2, 1.48)).toBe("+1.20 (+1.48%)");
    expect(changeText(-0.9, -1.47)).toBe("-0.90 (-1.47%)");
    expect(changeText(0, 0)).toBe("+0.00 (+0.00%)");
  });
});

describe("pctText", () => {
  it("formats a signed percentage", () => {
    expect(pctText(1.5)).toBe("+1.50%");
    expect(pctText(-1.47)).toBe("-1.47%");
  });
});

describe("formatVolume", () => {
  it("abbreviates millions and thousands", () => {
    expect(formatVolume(2_500_000)).toBe("2.5M");
    expect(formatVolume(12_345)).toBe("12K");
    expect(formatVolume(950)).toBe("950");
  });
});

describe("coarse", () => {
  it("rounds to the precision the measurement supports", () => {
    expect(coarse(1234.4)).toBe("1234");
    expect(coarse(96.44)).toBe("96.4");
    expect(coarse(-12.34)).toBe("-12.3");
    expect(coarse(7.4)).toBe("7.40");
    expect(coarse(Number.NaN)).toBe("—");
  });
});

describe("formatPE", () => {
  it("adds the fetch date when there is one", () => {
    expect(formatPE({ pe_ratio: 9.14, fetched_at: "2026-09-01T03:00:00Z" })).toBe(
      "9.1 · as of 2026-09-01"
    );
    expect(formatPE({ pe_ratio: 9.14, fetched_at: "" })).toBe("9.1");
    expect(formatPE({ pe_ratio: null, fetched_at: "" })).toBe("—");
  });
});

describe("dayMonth", () => {
  it("turns an ISO date into day + month", () => {
    expect(dayMonth("2026-04-07")).toBe("7 Apr");
  });
  it("passes through what it cannot read", () => {
    expect(dayMonth("bad")).toBe("bad");
    expect(dayMonth("2026-13-07")).toBe("2026-13-07");
  });
});

describe("pct", () => {
  it("builds a percentage dimension", () => {
    expect(pct(42)).toBe("42%");
  });
});
```

`src/features/market/__tests__/links.test.ts`:

```ts
import { stockDetailHref } from "../links";

describe("stockDetailHref", () => {
  it("opens the stock on the interval its card was scored on", () => {
    expect(stockDetailHref("COMI", "Weekly")).toEqual({
      pathname: "/stock/[symbol]",
      params: { symbol: "COMI", interval: "Weekly" },
    });
  });
  it("omits the interval when there is none", () => {
    expect(stockDetailHref("COMI")).toEqual({
      pathname: "/stock/[symbol]",
      params: { symbol: "COMI" },
    });
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx jest src/features/market/logic/__tests__/marketClock.test.ts src/features/market/logic/__tests__/format.test.ts src/features/market/__tests__/links.test.ts`
Expected: FAIL — `Cannot find module '../marketClock'` (and `../format`, `../links`).

- [ ] **Step 3: Implement the clock, formatting and links**

`src/features/market/logic/format.ts`:

```ts
import type { PEData } from "@/shared/types";

export const MONTHS_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/**
 * "+1.20 (+1.48%)". Both signs come from the PERCENTAGE, as on the web card,
 * so the price change and its percent can never disagree about direction.
 */
export function changeText(change: number | undefined, changePct: number | undefined): string {
  const sign = (changePct ?? 0) >= 0 ? "+" : "";
  return `${sign}${change?.toFixed(2) ?? "--"} (${sign}${changePct?.toFixed(2) ?? "--"}%)`;
}

/** "+1.50%" — the watchlist row's single figure. */
export function pctText(changePct: number | undefined): string {
  const value = changePct ?? 0;
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function formatVolume(v: number): string {
  if (v >= 1e6) return (v / 1e6).toFixed(1) + "M";
  if (v >= 1e3) return (v / 1e3).toFixed(0) + "K";
  return v.toString();
}

/** Round to the precision the measurement supports — never more (ForecastCard). */
export function coarse(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 100) return value.toFixed(0);
  if (abs >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

export function formatPE(pe: Pick<PEData, "pe_ratio" | "fetched_at">): string {
  if (pe.pe_ratio == null) return "—";
  const base = pe.pe_ratio.toFixed(1);
  return pe.fetched_at ? `${base} · as of ${pe.fetched_at.slice(0, 10)}` : base;
}

/** "2026-04-07" → "7 Apr". Parsed from the string, never through `new Date()`. */
export function dayMonth(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return iso;
  return `${day} ${MONTHS_ABBR[month - 1]}`;
}

/** A percentage width for a React Native style. */
export function pct(n: number): `${number}%` {
  return `${n}%`;
}
```

`src/features/market/logic/marketClock.ts`:

```ts
import { dayMonth } from "./format";

/**
 * Clock and session labels for the dashboard cards, ported from the inline
 * helpers in egx-api-fe/src/app/page.tsx. See that file for the history behind
 * each rule; the short version is in each docstring.
 */

/**
 * "2026-09-02" → "2 Sep" — the SESSION the price came from, not a clock time.
 * Read from the string: `new Date("2026-09-02")` is UTC midnight, which is the
 * previous day anywhere west of Greenwich.
 */
export function sessionLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const m = /^\d{4}-\d{2}-\d{2}/.exec(iso);
  if (!m) return null;
  const label = dayMonth(m[0]);
  return label === m[0] ? null : label;
}

export function localDateKey(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * Is this bar today's session? Decides whether the card may call the price a
 * "close" — today's bar is still moving while the EGX is open. Compared on the
 * date string for the same timezone reason as `sessionLabel`.
 */
export function isTodaysSession(barDate: string | null | undefined, now: Date = new Date()): boolean {
  if (!barDate) return false;
  return barDate.slice(0, 10) === localDateKey(now);
}

/** Epoch ms → "14s ago" / "3m 14s ago" / "18h 22m ago" / "3d ago". */
export function agoLabel(at: number | undefined, now: number): string | null {
  if (!at) return null;
  const secs = Math.max(0, Math.round((now - at) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ${secs % 60}s ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/**
 * Is the EGX open right now? Sun–Thu, 10:00–14:30 Africa/Cairo, read through
 * Intl so it is right from any device timezone and across Egypt's DST.
 *
 * If this JS engine cannot resolve Cairo time it answers OPEN: the card then
 * shows its real "…ago" age, which is always true, rather than a "Market
 * closed" that might be false.
 */
export function isEgxOpen(nowMs: number): boolean {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Africa/Cairo",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date(nowMs));
  } catch {
    return true;
  }
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = get("weekday");
  if (!weekday) return true;
  if (weekday === "Fri" || weekday === "Sat") return false;
  let hour = parseInt(get("hour"), 10);
  if (hour === 24) hour = 0; // some engines emit "24" for midnight
  const minutes = hour * 60 + parseInt(get("minute"), 10);
  if (Number.isNaN(minutes)) return true;
  return minutes >= 600 && minutes <= 870;
}

export interface StampInput {
  asOf: string | null;
  isToday: boolean;
  fetchedAgo: string | null;
  marketClosed: boolean;
}

/**
 * The card's under-price line. Names the SESSION ("2 Sep"), appends "close"
 * only for a completed bar, then either the fetch age or — while the market is
 * shut — a static "Market closed", because an age that climbs all weekend
 * reads as staleness that isn't real.
 */
export function cardStamp({ asOf, isToday, fetchedAgo, marketClosed }: StampInput): string | null {
  if (!asOf && !fetchedAgo && !marketClosed) return null;
  let out = asOf ?? "";
  if (asOf && (!isToday || marketClosed)) out += " close";
  if (marketClosed) {
    out += `${asOf ? " · " : ""}Market closed`;
  } else if (fetchedAgo) {
    out += `${asOf ? " · " : ""}${fetchedAgo}`;
  }
  return out;
}

/** A one-bar change on Weekly/Monthly is not today's move — say so. */
export function changeIntervalNote(changeInterval?: string): string | null {
  if (!changeInterval || changeInterval === "Daily") return null;
  return changeInterval === "Weekly" ? "vs last week" : "vs last month";
}
```

`src/features/market/links.ts`:

```ts
import type { Href } from "expo-router";

/**
 * The stock page, opened on the interval its dashboard card was scored on —
 * the web card's `/stock/X?interval=Y`. An object Href so typed routes accept
 * the query param.
 */
export function stockDetailHref(symbol: string, interval?: string): Href {
  return {
    pathname: "/stock/[symbol]",
    params: interval ? { symbol, interval } : { symbol },
  } as Href;
}
```

- [ ] **Step 4: Run them to verify they pass**

Run: `npx jest src/features/market/logic/__tests__/marketClock.test.ts src/features/market/logic/__tests__/format.test.ts src/features/market/__tests__/links.test.ts`
Expected: PASS — 3 suites, all tests green.

- [ ] **Step 5: Write the fixtures and the failing card/filter tests**

`src/features/market/testing/fixtures.ts` (grows in later tasks; this is its first content):

```ts
import type { CompositeBatchResponse, DashboardResponse, DashboardRow } from "@/shared/api";
import type { Ticker } from "@/shared/types";

/** Test data shared by every market test. Not a test file. */

export const TICKERS: Ticker[] = [
  { symbol: "COMI", name: "Commercial International Bank", sector: "Banking", index: "EGX30" },
  { symbol: "TMGH", name: "Talaat Moustafa Group", sector: "Real Estate", index: "EGX30" },
  { symbol: "ETEL", name: "Telecom Egypt", sector: "Telecommunications", index: "EGX30" },
  { symbol: "ABUK", name: "Abu Qir Fertilizers", sector: "Basic Materials", index: "EGX30" },
  { symbol: "MEGM", name: "Middle East Glass", sector: "Industrials", index: "EGX70" },
  { symbol: "ACGC", name: "Arab Cotton Ginning", sector: "Consumer Goods", index: "EGX70" },
];

export function makeDashboardRow(symbol: string, o: Partial<DashboardRow> = {}): DashboardRow {
  return {
    symbol,
    available: true,
    score: 55,
    signal: "Neutral",
    price: 10,
    change: 0.1,
    change_pct: 1,
    sparkline: [9, 9.5, 10],
    measured_at: "2026-09-02T20:33:28Z",
    scored_at: "2026-09-02T20:35:00Z",
    last_bar_date: "2026-09-02",
    tradeable: true,
    sigma_63_ann_pct: 30,
    risk_band: "average",
    risk_band_label: "Average",
    dividend_yield: 0,
    dividend_ex_date_recent: null,
    ...o,
  };
}

export function makeDashboard(rows: DashboardRow[]): DashboardResponse {
  return {
    rows,
    n_symbols: rows.length,
    n_available: rows.filter((r) => r.available).length,
    oldest_measurement: null,
    newest_measurement: null,
  };
}

const NO_FEED: Partial<DashboardRow> = {
  available: false, price: null, change: null, change_pct: null, score: null,
  signal: null, sparkline: [], risk_band: null, risk_band_label: null,
};

export const DASHBOARD = makeDashboard([
  makeDashboardRow("COMI", {
    score: 72, signal: "Strong", price: 82.5, change: 1.2, change_pct: 1.48,
    sigma_63_ann_pct: 22, risk_band: "calm", risk_band_label: "Calm",
    dividend_yield: 3.2, dividend_ex_date_recent: "2026-04-07",
  }),
  makeDashboardRow("TMGH", {
    score: 41, signal: "Neutral", price: 60.1, change: -0.9, change_pct: -1.47,
    sigma_63_ann_pct: 48, risk_band: "jumpy", risk_band_label: "Jumpy",
  }),
  makeDashboardRow("ETEL", {
    score: 63, signal: "Strong", price: 38, change: 0.2, change_pct: 0.53,
    sigma_63_ann_pct: 30, dividend_yield: 5.1, dividend_ex_date_recent: "2026-05-20",
  }),
  makeDashboardRow("ABUK", {
    score: null, signal: null, price: 55, change: 0, change_pct: 0,
    sigma_63_ann_pct: null, risk_band: null, risk_band_label: null, dividend_yield: null,
  }),
  makeDashboardRow("MEGM", NO_FEED),
  makeDashboardRow("ACGC", NO_FEED),
]);

export function batch(
  scores: CompositeBatchResponse["scores"],
  errors: CompositeBatchResponse["errors"] = []
): CompositeBatchResponse {
  return { scores, errors };
}
```

`src/features/market/logic/__tests__/cards.test.ts`:

```ts
import { batch, DASHBOARD, makeDashboardRow, TICKERS } from "@/features/market/testing/fixtures";
import {
  applyBatchChunk,
  cardsFromSnapshot,
  demoteLive,
  mergeSnapshot,
  retryableSymbols,
  upgradeCandidates,
  upgradeQueue,
  watchlistPriceData,
  type CardMap,
} from "../cards";

describe("cardsFromSnapshot", () => {
  it("maps rows to stale cards and collects symbols with no feed", () => {
    const { cards, noFeed } = cardsFromSnapshot(DASHBOARD.rows);
    expect(cards.COMI).toMatchObject({
      price: 82.5, change: 1.2, changePct: 1.48, score: 72, signal: "Strong",
      sigma: 22, riskBand: "calm", riskBandLabel: "Calm", barDate: "2026-09-02",
      dividendYield: 3.2, dividendExDate: "2026-04-07", state: "stale",
      fetchedAt: Date.parse("2026-09-02T20:33:28Z"),
    });
    expect(cards.MEGM.state).toBe("unavailable");
    expect(cards.MEGM.price).toBeUndefined();
    expect([...noFeed].sort()).toEqual(["ACGC", "MEGM"]);
  });

  it("keys cards by upper-case symbol", () => {
    const { cards } = cardsFromSnapshot([makeDashboardRow("comi")]);
    expect(Object.keys(cards)).toEqual(["COMI"]);
  });
});

describe("mergeSnapshot", () => {
  it("never pushes a live card back to a snapshot value", () => {
    const prev: CardMap = { COMI: { state: "live", price: 90 }, TMGH: { state: "stale", price: 1 } };
    const next: CardMap = { COMI: { state: "stale", price: 82.5 }, TMGH: { state: "stale", price: 60 } };
    const merged = mergeSnapshot(prev, next);
    expect(merged.COMI).toEqual({ state: "live", price: 90 });
    expect(merged.TMGH.price).toBe(60);
  });
});

describe("demoteLive", () => {
  it("turns live cards stale and leaves the rest alone", () => {
    const out = demoteLive({ A: { state: "live", price: 1 }, B: { state: "failed" } });
    expect(out.A).toEqual({ state: "stale", price: 1 });
    expect(out.B).toEqual({ state: "failed" });
  });
});

describe("applyBatchChunk", () => {
  const prev = cardsFromSnapshot(DASHBOARD.rows).cards;

  it("upgrades a card to live, keeping its snapshot risk band", () => {
    const { cards, upgraded } = applyBatchChunk(
      prev,
      batch({ COMI: { score: 80, signal: "Very Strong", price: 83, change: 1.7, change_pct: 2.1, last_bar_date: "2026-09-03" } }),
      123
    );
    expect(upgraded).toEqual(["COMI"]);
    expect(cards.COMI).toMatchObject({
      score: 80, signal: "Very Strong", price: 83, changePct: 2.1, barDate: "2026-09-03",
      riskBand: "calm", sigma: 22, fetchedAt: 123, state: "live",
    });
  });

  it("keeps the old price when the live entry has none", () => {
    const { cards } = applyBatchChunk(prev, batch({ COMI: { score: 70, signal: "Strong" } }), 1);
    expect(cards.COMI.price).toBe(82.5);
  });

  it("only fails a card that has nothing to show", () => {
    const { cards } = applyBatchChunk(
      prev,
      batch({}, [{ symbol: "COMI", error: "timeout" }, { symbol: "NEWX", error: "timeout" }]),
      1
    );
    expect(cards.COMI.state).toBe("stale");
    expect(cards.NEWX.state).toBe("failed");
  });
});

describe("upgradeCandidates", () => {
  it("skips no-feed, in-flight, already-upgraded and exhausted symbols", () => {
    const out = upgradeCandidates(["COMI", "MEGM", "TMGH", "ETEL", "ABUK"], {
      noFeed: new Set(["MEGM"]),
      inFlight: new Set(["TMGH"]),
      upgraded: new Set(["ETEL"]),
      attempts: new Map([["ABUK", 3]]),
      maxAttempts: 3,
    });
    expect(out).toEqual(["COMI"]);
  });
});

describe("retryableSymbols", () => {
  it("retries failed symbols that still have attempts left", () => {
    expect(
      retryableSymbols(
        [{ symbol: "comi", error: "x" }, { symbol: "MEGM", error: "x" }, { symbol: "ABUK", error: "x" }],
        { noFeed: new Set(["MEGM"]), attempts: new Map([["COMI", 1], ["ABUK", 3]]), maxAttempts: 3 }
      )
    ).toEqual(["COMI"]);
  });
});

describe("upgradeQueue", () => {
  it("queues the visible page then watched stocks, once each", () => {
    const visible = TICKERS.slice(0, 2); // COMI, TMGH
    expect(upgradeQueue(visible, ["tmgh", "ETEL", "NOPE"], TICKERS)).toEqual(["COMI", "TMGH", "ETEL"]);
  });
});

describe("watchlistPriceData", () => {
  it("skips cards with no price and fills missing fields with zeros", () => {
    const out = watchlistPriceData({ A: { state: "stale", price: 5 }, B: { state: "loading" } });
    expect(out).toEqual({ A: { price: 5, change: 0, changePct: 0, sparkline: [] } });
  });
});
```

`src/features/market/logic/__tests__/dashboardFilters.test.ts`:

```ts
import { DASHBOARD, TICKERS } from "@/features/market/testing/fixtures";
import { cardsFromSnapshot } from "../cards";
import {
  filterDividendPayers,
  filterTickers,
  pageSlice,
  sortTickers,
  splitByFeed,
} from "../dashboardFilters";

const { cards } = cardsFromSnapshot(DASHBOARD.rows);
const symbols = (ts: { symbol: string }[]) => ts.map((t) => t.symbol);

describe("filterTickers", () => {
  const base = { index: "All", sector: "All Sectors", search: "" };
  it("filters by index, sector and search together", () => {
    expect(symbols(filterTickers(TICKERS, { ...base, index: "EGX30" }))).toEqual(["COMI", "TMGH", "ETEL", "ABUK"]);
    expect(symbols(filterTickers(TICKERS, base))).toHaveLength(6);
    expect(symbols(filterTickers(TICKERS, { ...base, sector: "Banking" }))).toEqual(["COMI"]);
    expect(symbols(filterTickers(TICKERS, { ...base, search: "telecom" }))).toEqual(["ETEL"]);
    expect(symbols(filterTickers(TICKERS, { ...base, search: "comi " }))).toEqual(["COMI"]);
    expect(filterTickers(TICKERS, { index: "EGX70", sector: "Banking", search: "" })).toEqual([]);
  });
});

describe("splitByFeed", () => {
  it("moves no-feed listings out of the grid without dropping them", () => {
    const { quoted, unquoted } = splitByFeed(TICKERS, new Set(["MEGM", "ACGC"]));
    expect(symbols(quoted)).toEqual(["COMI", "TMGH", "ETEL", "ABUK"]);
    expect(symbols(unquoted)).toEqual(["MEGM", "ACGC"]);
  });
});

describe("filterDividendPayers", () => {
  it("keeps only a yield above zero; zero and unknown are excluded", () => {
    expect(symbols(filterDividendPayers(TICKERS.slice(0, 4), cards, true))).toEqual(["COMI", "ETEL"]);
    expect(filterDividendPayers(TICKERS, cards, false)).toBe(TICKERS);
  });
});

describe("sortTickers", () => {
  const quoted = TICKERS.slice(0, 4); // COMI, TMGH, ETEL, ABUK
  it("leaves Default alone", () => {
    expect(sortTickers(quoted, cards, "Default")).toBe(quoted);
  });
  it("sorts Score high→low and sinks unmeasured stocks", () => {
    expect(symbols(sortTickers(quoted, cards, "Score"))).toEqual(["COMI", "ETEL", "TMGH", "ABUK"]);
  });
  it("sorts Change high→low", () => {
    expect(symbols(sortTickers(quoted, cards, "Change"))).toEqual(["COMI", "ETEL", "ABUK", "TMGH"]);
  });
  it("sorts Risk calmest first", () => {
    expect(symbols(sortTickers(quoted, cards, "Risk"))).toEqual(["COMI", "ETEL", "TMGH", "ABUK"]);
  });
  it("sorts Recently paid newest ex-date first, non-payers alphabetically last", () => {
    expect(symbols(sortTickers(quoted, cards, "Recently paid"))).toEqual(["ETEL", "COMI", "ABUK", "TMGH"]);
  });
});

describe("pageSlice", () => {
  const items = Array.from({ length: 30 }, (_, i) => i);
  it("reveals pages of the given size and counts what remains", () => {
    expect(pageSlice(items, 1, 24)).toEqual({ visible: items.slice(0, 24), hasMore: true, remaining: 6 });
    expect(pageSlice(items, 2, 24)).toEqual({ visible: items, hasMore: false, remaining: 0 });
  });
});
```

- [ ] **Step 6: Run them to verify they fail**

Run: `npx jest src/features/market/logic/__tests__/cards.test.ts src/features/market/logic/__tests__/dashboardFilters.test.ts`
Expected: FAIL — `Cannot find module '../cards'` and `'../dashboardFilters'`.

- [ ] **Step 7: Implement the card state machine and the filters**

`src/features/market/logic/cards.ts`:

```ts
import type { CompositeBatchResponse, DashboardRow } from "@/shared/api";
import type { CompositeSignal, Ticker } from "@/shared/types";

/**
 * What a dashboard card knows about its own data (web StockCard `CardState`).
 * "--" used to mean three different things; these keep them apart.
 */
export type CardState = "loading" | "live" | "stale" | "unavailable" | "failed";

export interface CardData {
  price?: number;
  change?: number;
  changePct?: number;
  sparkline?: number[];
  score?: number | null;
  signal?: CompositeSignal | null;
  state: CardState;
  /** Past 63-day volatility, for the Risk sort. Snapshot only. */
  sigma?: number | null;
  /** Calm..Wild band. Snapshot only — the live upgrade carries it through. */
  riskBand?: string | null;
  riskBandLabel?: string | null;
  /** The SESSION this price came from ("2026-09-02"), per card. */
  barDate?: string | null;
  /** When THESE figures were fetched, epoch ms (snapshot clock or the moment a live upgrade landed). */
  fetchedAt?: number;
  /** 0 = pays nothing (real); null = unknown. */
  dividendYield?: number | null;
  dividendExDate?: string | null;
}

export type CardMap = Record<string, CardData>;

export interface WatchlistPrice {
  price: number;
  change: number;
  changePct: number;
  sparkline: number[];
}

export interface UpgradeBook {
  noFeed: ReadonlySet<string>;
  inFlight: ReadonlySet<string>;
  upgraded: ReadonlySet<string>;
  attempts: ReadonlyMap<string, number>;
  maxAttempts: number;
}

/** Step 1 — the snapshot: one request, the whole universe, as "stale" cards. */
export function cardsFromSnapshot(rows: DashboardRow[]): { cards: CardMap; noFeed: Set<string> } {
  const cards: CardMap = {};
  const noFeed = new Set<string>();
  for (const row of rows) {
    const sym = row.symbol.toUpperCase();
    if (!row.available) noFeed.add(sym);
    cards[sym] = {
      price: row.price ?? undefined,
      change: row.change ?? undefined,
      changePct: row.change_pct ?? undefined,
      sparkline: row.sparkline,
      score: row.score,
      signal: row.signal,
      sigma: row.sigma_63_ann_pct,
      riskBand: row.risk_band,
      riskBandLabel: row.risk_band_label,
      barDate: row.last_bar_date,
      fetchedAt: row.measured_at ? Date.parse(row.measured_at) : undefined,
      dividendYield: row.dividend_yield,
      dividendExDate: row.dividend_ex_date_recent,
      state: row.available ? "stale" : "unavailable",
    };
  }
  return { cards, noFeed };
}

/** Merge, never replace: a live upgrade that already landed must not go back to stale. */
export function mergeSnapshot(prev: CardMap, next: CardMap): CardMap {
  const merged: CardMap = { ...next };
  for (const [sym, existing] of Object.entries(prev)) {
    if (existing.state === "live") merged[sym] = existing;
  }
  return merged;
}

/** Weights/interval/refresh change what a score MEANS: demote live → stale, never drop. */
export function demoteLive(prev: CardMap): CardMap {
  const next: CardMap = {};
  for (const [sym, c] of Object.entries(prev)) {
    next[sym] = c.state === "live" ? { ...c, state: "stale" } : c;
  }
  return next;
}

/**
 * Step 2 — fold one live batch chunk into the cards. A card that already holds
 * snapshot figures keeps them on error; only a card with nothing to show fails.
 */
export function applyBatchChunk(
  prev: CardMap,
  partial: CompositeBatchResponse,
  fetchedAt: number
): { cards: CardMap; upgraded: string[] } {
  const next: CardMap = { ...prev };
  const upgraded: string[] = [];
  for (const [sym, entry] of Object.entries(partial.scores)) {
    const key = sym.toUpperCase();
    const existing = next[key];
    upgraded.push(key);
    next[key] = {
      ...existing,
      score: entry.score,
      signal: entry.signal,
      price: entry.price ?? existing?.price,
      change: entry.change ?? existing?.change,
      changePct: entry.change_pct ?? existing?.changePct,
      sparkline: entry.sparkline ?? existing?.sparkline,
      barDate: entry.last_bar_date ?? existing?.barDate,
      fetchedAt,
      state: "live",
    };
  }
  for (const { symbol } of partial.errors) {
    const key = symbol.toUpperCase();
    const existing = next[key];
    if (!existing || existing.price === undefined) {
      next[key] = { ...existing, state: "failed" };
    }
  }
  return { cards: next, upgraded };
}

/** Which of these symbols may be requested live right now. */
export function upgradeCandidates(symbols: string[], book: UpgradeBook): string[] {
  return symbols.filter((s) => {
    const sym = s.toUpperCase();
    if (book.noFeed.has(sym)) return false;
    if (book.inFlight.has(sym)) return false;
    if (book.upgraded.has(sym)) return false;
    return (book.attempts.get(sym) ?? 0) < book.maxAttempts;
  });
}

/** Symbols worth one delayed retry: they timed out upstream and have attempts left. */
export function retryableSymbols(
  errors: { symbol: string }[],
  book: Pick<UpgradeBook, "noFeed" | "attempts" | "maxAttempts">
): string[] {
  return errors
    .map((e) => e.symbol.toUpperCase())
    .filter((s) => !book.noFeed.has(s) && (book.attempts.get(s) ?? 0) < book.maxAttempts);
}

/** The visible page, then watched stocks that exist, each once. */
export function upgradeQueue(visible: Ticker[], watchlist: string[], tickers: Ticker[]): string[] {
  const bySym = new Map(tickers.map((t) => [t.symbol.toUpperCase(), t]));
  const watched = watchlist
    .map((s) => bySym.get(s.toUpperCase()))
    .filter((t): t is Ticker => !!t);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of [...visible, ...watched]) {
    const sym = t.symbol.toUpperCase();
    if (seen.has(sym)) continue;
    seen.add(sym);
    out.push(t.symbol);
  }
  return out;
}

/** The watchlist panel's price shape. */
export function watchlistPriceData(cards: CardMap): Record<string, WatchlistPrice> {
  const out: Record<string, WatchlistPrice> = {};
  for (const [sym, c] of Object.entries(cards)) {
    if (c.price === undefined) continue;
    out[sym] = {
      price: c.price,
      change: c.change ?? 0,
      changePct: c.changePct ?? 0,
      sparkline: c.sparkline ?? [],
    };
  }
  return out;
}
```

`src/features/market/logic/dashboardFilters.ts`:

```ts
import type { Ticker } from "@/shared/types";
import type { CardMap } from "./cards";

export const INDICES = ["EGX30", "EGX70", "EGX100", "NILEX", "All"] as const;

export const ALL_SECTORS = "All Sectors";
export const SECTORS = [
  ALL_SECTORS, "Banking", "Real Estate", "Financial Services", "Industrials",
  "Consumer Goods", "Basic Materials", "Healthcare", "Technology", "Energy",
  "Telecommunications",
] as const;

export const SORTS = ["Default", "Score", "Change", "Risk", "Recently paid"] as const;
export type SortKey = (typeof SORTS)[number];

/** The web shows these as hover titles; the phone shows them under the row. */
export const SORT_EXPLANATIONS: Partial<Record<SortKey, string>> = {
  Risk: "Calmest first, by past 63-day volatility — the app's strongest measured signal. It predicts how much a stock moves and how deep a hole to expect, never which way it goes.",
  Score: "Highest composite first. The score describes present condition; it does not predict price.",
};

export const COMPOSITE_INTERVALS = ["Daily", "Weekly", "Monthly"] as const;
export type CompositeInterval = (typeof COMPOSITE_INTERVALS)[number];

export interface TickerFilter {
  index: string;
  sector: string;
  search: string;
}

/** Index, sector, then symbol/name search. The search is trimmed — phone keyboards add trailing spaces. */
export function filterTickers(tickers: Ticker[], f: TickerFilter): Ticker[] {
  let result = tickers;
  if (f.index !== "All") result = result.filter((t) => t.index === f.index);
  if (f.sector !== ALL_SECTORS) result = result.filter((t) => t.sector === f.sector);
  const q = f.search.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (t) => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)
    );
  }
  return result;
}

/** No-feed listings move out of the grid (still counted, still findable), never hidden. */
export function splitByFeed(
  tickers: Ticker[],
  noFeed: ReadonlySet<string>
): { quoted: Ticker[]; unquoted: Ticker[] } {
  const quoted: Ticker[] = [];
  const unquoted: Ticker[] = [];
  for (const t of tickers) (noFeed.has(t.symbol.toUpperCase()) ? unquoted : quoted).push(t);
  return { quoted, unquoted };
}

/** "Pays a dividend": yield strictly above 0. 0 means pays nothing; null means unknown. */
export function filterDividendPayers(tickers: Ticker[], cards: CardMap, on: boolean): Ticker[] {
  if (!on) return tickers;
  return tickers.filter((t) => {
    const dy = cards[t.symbol.toUpperCase()]?.dividendYield;
    return dy != null && dy > 0;
  });
}

/**
 * Sort by a card figure. Unmeasured stocks SINK whichever way the sort runs —
 * treating a missing value as 0 would rank them as the worst on the exchange.
 */
export function sortTickers(tickers: Ticker[], cards: CardMap, sort: SortKey): Ticker[] {
  if (sort === "Default") return tickers;
  const val = (t: Ticker): number | null => {
    const c = cards[t.symbol.toUpperCase()];
    if (!c) return null;
    switch (sort) {
      case "Score":
        return c.score ?? null;
      case "Change":
        return c.changePct ?? null;
      case "Recently paid": {
        if (!c.dividendExDate) return null;
        const ms = Date.parse(c.dividendExDate);
        return Number.isNaN(ms) ? null : ms;
      }
      case "Risk":
        return c.sigma ?? null;
      default:
        return null;
    }
  };
  const dir = sort === "Risk" ? 1 : -1;
  return [...tickers].sort((a, b) => {
    const av = val(a);
    const bv = val(b);
    if (av === null && bv === null) return a.symbol.localeCompare(b.symbol);
    if (av === null) return 1;
    if (bv === null) return -1;
    return (av - bv) * dir;
  });
}

export function pageSlice<T>(
  items: T[],
  page: number,
  perPage: number
): { visible: T[]; hasMore: boolean; remaining: number } {
  const visible = items.slice(0, page * perPage);
  return { visible, hasMore: visible.length < items.length, remaining: items.length - visible.length };
}
```

- [ ] **Step 8: Run them to verify they pass**

Run: `npx jest src/features/market`
Expected: PASS — 5 suites (`marketClock`, `format`, `links`, `cards`, `dashboardFilters`).

- [ ] **Step 9: Verify the whole project**

Run: `npm run verify`
Expected: exits 0 — shared check OK, `tsc` no errors, lint no errors, all Jest suites pass.

- [ ] **Step 10: Commit**

```bash
git add src/features/market
git commit -m "feat(market): port dashboard clock, card states and filters as pure logic

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XDkAB7UCK8WyT267W5ZxNV"
```

---

### Task 2: Shared hooks — `useNow` and `useKeyedFetch`

**Files:**
- Create: `src/features/market/hooks/useNow.ts`
- Create: `src/features/market/hooks/useKeyedFetch.ts`
- Test: `src/features/market/hooks/__tests__/useNow.test.ts`
- Test: `src/features/market/hooks/__tests__/useKeyedFetch.test.ts`

**Interfaces:**
- Consumes: `react-native` `AppState`.
- Produces:
  - `useNow(intervalMs?: number): number` — epoch ms, ticking every `intervalMs` (default 1000) while the app is active; stops when backgrounded; resyncs on return.
  - `useKeyedFetch<T>(key: string, fetcher: () => Promise<T>): KeyedFetchState<T>` where `KeyedFetchState<T> = { data: T|null; error: string|null; loading: boolean; refreshing: boolean; refresh(): void; reload(): void }`. A new `key` shows `loading` (data null). `refresh()` re-requests and keeps the previous data with `refreshing: true` (pull-to-refresh). `reload()` re-requests from a blank `loading` state (Retry).

- [ ] **Step 1: Write the failing tests**

`src/features/market/hooks/__tests__/useNow.test.ts`:

```ts
import { act, renderHook } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";
import { useNow } from "../useNow";

describe("useNow", () => {
  let listener: ((s: AppStateStatus) => void) | null = null;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type, fn) => {
      listener = fn as (s: AppStateStatus) => void;
      return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    listener = null;
  });

  it("ticks once a second while active", () => {
    const { result } = renderHook(() => useNow(1000));
    const start = result.current;
    act(() => jest.advanceTimersByTime(3000));
    expect(result.current - start).toBe(3000);
  });

  it("stops in the background and resyncs on return", () => {
    const { result } = renderHook(() => useNow(1000));
    act(() => listener?.("background"));
    const paused = result.current;
    act(() => jest.advanceTimersByTime(10_000));
    expect(result.current).toBe(paused);
    act(() => listener?.("active"));
    expect(result.current - paused).toBe(10_000);
  });
});
```

`src/features/market/hooks/__tests__/useKeyedFetch.test.ts`:

```ts
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useKeyedFetch } from "../useKeyedFetch";

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useKeyedFetch", () => {
  it("loads, then shows the data", async () => {
    const { result } = renderHook(() => useKeyedFetch("a", () => Promise.resolve(42)));
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    await waitFor(() => expect(result.current.data).toBe(42));
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("reports the error message", async () => {
    const { result } = renderHook(() => useKeyedFetch("a", () => Promise.reject(new Error("Request failed: 500"))));
    await waitFor(() => expect(result.current.error).toBe("Request failed: 500"));
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
  });

  it("goes back to loading when the key changes", async () => {
    const fetcher = jest.fn((k: string) => Promise.resolve(k));
    const { result, rerender } = renderHook(({ k }) => useKeyedFetch(k, () => fetcher(k)), {
      initialProps: { k: "Daily" },
    });
    await waitFor(() => expect(result.current.data).toBe("Daily"));
    rerender({ k: "Weekly" });
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    await waitFor(() => expect(result.current.data).toBe("Weekly"));
  });

  it("keeps the old data on screen while a refresh runs", async () => {
    const second = deferred<number>();
    const fetcher = jest.fn().mockResolvedValueOnce(1).mockReturnValueOnce(second.promise);
    const { result } = renderHook(() => useKeyedFetch("a", fetcher));
    await waitFor(() => expect(result.current.data).toBe(1));
    act(() => result.current.refresh());
    expect(result.current.refreshing).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe(1);
    await act(async () => second.resolve(2));
    expect(result.current.data).toBe(2);
    expect(result.current.refreshing).toBe(false);
  });

  it("reload starts from a blank loading state", async () => {
    const fetcher = jest.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce(7);
    const { result } = renderHook(() => useKeyedFetch("a", fetcher));
    await waitFor(() => expect(result.current.error).toBe("boom"));
    act(() => result.current.reload());
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
    await waitFor(() => expect(result.current.data).toBe(7));
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx jest src/features/market/hooks`
Expected: FAIL — `Cannot find module '../useNow'` and `'../useKeyedFetch'`.

- [ ] **Step 3: Implement the hooks**

`src/features/market/hooks/useNow.ts`:

```ts
import { useEffect, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

/**
 * One clock for a whole screen (the dashboard's "14s ago" labels). Paused while
 * the app is in the background — a phone in a pocket should not re-render a
 * grid every second — and resynced the moment it returns, so the first frame
 * back is right. The web version listens to `visibilitychange`.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      setNow(Date.now());
      id ??= setInterval(() => setNow(Date.now()), intervalMs);
    };
    const stop = () => {
      if (id) clearInterval(id);
      id = null;
    };
    const onChange = (state: AppStateStatus) =>
      state === "background" || state === "inactive" ? stop() : start();

    onChange(AppState.currentState);
    const sub = AppState.addEventListener("change", onChange);
    return () => {
      stop();
      sub.remove();
    };
  }, [intervalMs]);

  return now;
}
```

`src/features/market/hooks/useKeyedFetch.ts`:

```ts
import { useCallback, useEffect, useState } from "react";

interface Settled<T> {
  key: string;
  data: T | null;
  error: string | null;
}

export interface KeyedFetchState<T> {
  data: T | null;
  error: string | null;
  /** No result for the current inputs yet, and nothing to show meanwhile. */
  loading: boolean;
  /** A pull-to-refresh is running; `data` still holds the previous result. */
  refreshing: boolean;
  /** Pull-to-refresh: re-request, keep the old data on screen until the new lands. */
  refresh: () => void;
  /** Retry: re-request from a blank loading state. */
  reload: () => void;
}

/**
 * Fetch keyed by its inputs. The result remembers which key it answers, so a
 * response for old inputs can never paint over new ones, and "loading" is
 * derived rather than set inside an effect.
 *
 * `key` must name everything `fetcher` reads.
 */
export function useKeyedFetch<T>(baseKey: string, fetcher: () => Promise<T>): KeyedFetchState<T> {
  const [nonce, setNonce] = useState(0);
  const [pullKey, setPullKey] = useState<string | null>(null);
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const key = `${baseKey}#${nonce}`;

  useEffect(() => {
    let alive = true;
    fetcher()
      .then((data) => {
        if (alive) setSettled({ key, data, error: null });
      })
      .catch((e: unknown) => {
        if (alive) {
          setSettled({ key, data: null, error: e instanceof Error ? e.message : "Request failed" });
        }
      });
    return () => {
      alive = false;
    };
    // `key` names everything the fetcher reads; listing `fetcher` (a new
    // closure every render) would refetch on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = settled && settled.key === key ? settled : null;
  const pulling = !current && pullKey === key;

  const refresh = useCallback(() => {
    setPullKey(`${baseKey}#${nonce + 1}`);
    setNonce((n) => n + 1);
  }, [baseKey, nonce]);

  const reload = useCallback(() => {
    setPullKey(null);
    setNonce((n) => n + 1);
  }, []);

  return {
    data: current ? current.data : pulling ? (settled?.data ?? null) : null,
    error: current ? current.error : null,
    loading: !current && !pulling,
    refreshing: pulling,
    refresh,
    reload,
  };
}
```

- [ ] **Step 4: Run them to verify they pass**

Run: `npx jest src/features/market/hooks`
Expected: PASS — 2 suites, 7 tests.

- [ ] **Step 5: Verify and commit**

Run: `npm run verify`
Expected: exits 0.

```bash
git add src/features/market/hooks
git commit -m "feat(market): add useNow (AppState-paused clock) and useKeyedFetch

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XDkAB7UCK8WyT267W5ZxNV"
```

---
### Task 3: Dashboard cards — StockCard, WatchlistPanel, MarketRegimeCard (+ test harness)

**Files:**
- Create: `src/features/market/testing/api.ts`
- Create: `src/features/market/testing/expoRouterMock.tsx`
- Create: `src/features/market/testing/chartsMock.tsx`
- Modify: `src/features/market/testing/fixtures.ts` (append `REGIME`)
- Create: `src/features/market/logic/regime.ts`
- Create: `src/features/market/StockCard.tsx`
- Create: `src/features/market/WatchlistPanel.tsx`
- Create: `src/features/market/MarketRegimeCard.tsx`
- Test: `src/features/market/logic/__tests__/regime.test.ts`
- Test: `src/features/market/__tests__/StockCard.test.tsx`
- Test: `src/features/market/__tests__/WatchlistPanel.test.tsx`
- Test: `src/features/market/__tests__/MarketRegimeCard.test.tsx`

**Interfaces:**
- Consumes: Task 1 (`CardState`, `changeText`, `pctText`, `pct`, `cardStamp`, `changeIntervalNote`, `stockDetailHref`, `WatchlistPrice`, fixtures), Task 2 (`useKeyedFetch`), `@/test-utils/fetch` (`mockFetch`, see assumption 1), `@/test-utils/render` (`renderWithProviders`), `@/ui` (`AppText`, `IconButton`, `LearnTerm`), `@/charts` (`Sparkline`, `scoreColor`), `@/providers/watchlist` (`useWatchlist`), `@/shared/api` (`fetchMarketRegime`, `MarketRegime`, `MarketBreadth`), `@/shared/riskBands` (`RISK_BAND_COLOR`), `@/shared/theme` (`COLORS`), `@/lib/links` (`stockHref`, `learnHref`).
- Produces:
  - `testing/api.ts`: `mockMarketApi(routes?: Record<string, Route>): FetchMock`, `reply(status, body?)`, `fail(status?, detail?)`, `requestsTo(fetchMock, path, method?): URL[]`, `Reply` class. Default routes: `/tickers`, `/watchlist` (GET/POST/DELETE), `/settings`, `/market_regime`, `/dashboard`, `/analysis` (batch → empty).
  - `testing/expoRouterMock.tsx`: `router` (`push`/`replace`/`back`/`navigate` are `jest.fn`), `useRouter`, `useLocalSearchParams`, `Link`, `Stack`, `Tabs`, `Redirect`, `Slot`, `useSegments`, `usePathname`.
  - `testing/chartsMock.tsx`: stubs for every `@/charts` export, `chartRender` (jest.fn called `(name, props)` on each render), `lastChartProps(name)`.
  - `logic/regime.ts`: `regimePosition(mean?: number|null): number|null`, `breadthTone(pctAbove: number): "gain"|"loss"|"neutral"`, `positiveRateSplit(rate: number): { positive: number; other: number }`.
  - `StockCard(props: StockCardProps)` — the web props, plus nothing; testID `stockcard-<SYMBOL>`.
  - `WatchlistPanel(props: { tickers?: Ticker[]; priceData?: Record<string, WatchlistPrice> })`.
  - `MarketRegimeCard()` — self-fetching; renders nothing on failure.

- [ ] **Step 1: Create the test harness (helpers, not tests)**

`src/features/market/testing/api.ts`:

```ts
import { mockFetchHandler } from "@/test-utils/fetch";
import { DEFAULT_WEIGHTS, FALLBACK_WEIGHT_PRESETS } from "@/shared/constants";
import { batch, DASHBOARD, REGIME, TICKERS } from "./fixtures";

/**
 * The ONE place market tests touch the Plan 1 fetch mock. Routes are keyed by
 * the path after the API base ("/dashboard"). A route is a JSON body, a
 * `Reply` (status + body), or a function `(url, init) => either`.
 */
export class Reply {
  constructor(
    public readonly status: number,
    public readonly body: unknown
  ) {}
}

export const reply = (status: number, body: unknown = {}) => new Reply(status, body);

/** A failing response; the shared client throws `Error(detail)`. */
export const fail = (status = 500, detail = "Request failed") => reply(status, { detail });

export type Route = unknown;
type FetchMock = jest.Mock;

const DEFAULTS: Record<string, Route> = {
  "/tickers": TICKERS,
  "/watchlist": (_url: URL, init?: RequestInit) => {
    if (init?.method === "POST") return { symbol: "X", added_at: "2026-10-10T00:00:00Z" };
    if (init?.method === "DELETE") return { deleted: "X" };
    return { symbols: [] };
  },
  "/settings": (_url: URL, init?: RequestInit) => {
    const sent = init?.method === "PUT" ? JSON.parse(String(init.body)).weights : {};
    const weights = { ...DEFAULT_WEIGHTS, ...sent };
    return { weights, raw: weights, presets: FALLBACK_WEIGHT_PRESETS };
  },
  "/market_regime": REGIME,
  "/dashboard": DASHBOARD,
  "/analysis": batch({}),
};

async function resolveRoute(route: Route, url: URL, init?: RequestInit) {
  const value =
    typeof route === "function"
      ? await (route as (u: URL, i?: RequestInit) => unknown)(url, init)
      : route;
  return value instanceof Reply
    ? { status: value.status, body: value.body }
    : { status: 200, body: value };
}

export function mockMarketApi(routes: Record<string, Route> = {}): FetchMock {
  const table = { ...DEFAULTS, ...routes };
  // Plan 1's mockFetchHandler matches one method + exact path (query ignored);
  // the newest registration wins, so these override renderWithProviders' defaults.
  for (const [path, route] of Object.entries(table)) {
    for (const method of ["GET", "POST", "PUT", "DELETE"]) {
      mockFetchHandler(method, path, (url, init) => resolveRoute(route, new URL(url), init));
    }
  }
  // jest.setup.ts installs a fresh jest.fn() as global.fetch before every test.
  return global.fetch as jest.Mock;
}

/** Every request made to `path` with `method`, as parsed URLs, oldest first. */
export function requestsTo(fetchMock: FetchMock, path: string, method = "GET"): URL[] {
  return fetchMock.mock.calls
    .filter(([, init]) => (((init as RequestInit | undefined)?.method ?? "GET").toUpperCase() === method))
    .map(([input]) => new URL(String(input), "http://localhost"))
    .filter((u) => u.pathname.endsWith(path));
}
```

`src/features/market/testing/expoRouterMock.tsx`:

```tsx
import { jest } from "@jest/globals";
import type { ReactNode } from "react";

/**
 * Stand-in for `expo-router` in feature tests (screens are rendered outside a
 * navigator). Use with:
 *   jest.mock("expo-router", () => require("@/features/market/testing/expoRouterMock"));
 */
export const router = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  navigate: jest.fn(),
  canGoBack: jest.fn(() => true),
};
export const useRouter = () => router;
export const useLocalSearchParams = jest.fn(() => ({}));
export const useGlobalSearchParams = jest.fn(() => ({}));
export const useSegments = () => [] as string[];
export const usePathname = () => "/";
export const useFocusEffect = () => undefined;

export function Link({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}
export function Redirect() {
  return null;
}
export function Slot() {
  return null;
}
export const Stack = Object.assign(() => null, {
  Screen: () => null,
  Protected: ({ children }: { children?: ReactNode }) => <>{children}</>,
});
export const Tabs = Object.assign(() => null, { Screen: () => null });
```

`src/features/market/testing/chartsMock.tsx`:

```tsx
import { jest } from "@jest/globals";
import { Text } from "react-native";

/**
 * Stand-in for `@/charts` in screen tests. Each stub records its props through
 * `chartRender` so a test can assert what a screen passed to a chart. Use with:
 *   jest.mock("@/charts", () => require("@/features/market/testing/chartsMock"));
 */
export const chartRender = jest.fn<(name: string, props: Record<string, unknown>) => void>();

export function lastChartProps(name: string): Record<string, unknown> | undefined {
  const calls = chartRender.mock.calls.filter(([n]) => n === name);
  return calls.length ? calls[calls.length - 1][1] : undefined;
}

function stub(name: string) {
  function ChartStub(props: Record<string, unknown>) {
    chartRender(name, props);
    return <Text testID={`chart-${name}`}>{name}</Text>;
  }
  ChartStub.displayName = name;
  return ChartStub;
}

export const PriceChart = stub("PriceChart");
export const VolumeChart = stub("VolumeChart");
export const IndicatorPanel = stub("IndicatorPanel");
export const CompareChart = stub("CompareChart");
export const CompositeGauge = stub("CompositeGauge");
export const Sparkline = stub("Sparkline");
export const MonteCarloChart = stub("MonteCarloChart");
export const CorrelationHeatmap = stub("CorrelationHeatmap");

export function scoreColor(score: number): string {
  return score >= 60 ? "#00ff88" : score >= 40 ? "#4488ff" : "#ff3355";
}
```

Append to `src/features/market/testing/fixtures.ts`:

```ts
import type { MarketRegime } from "@/shared/api";

export const REGIME: MarketRegime = {
  mean_score: 52.3,
  n_symbols: 61,
  band: "mixed",
  label: "Mixed",
  summary: "About half the market is in good technical shape.",
  horizon_days: 63,
  hist_median_3m_pct: 2.1,
  hist_positive_rate: 0.58,
  observations: 140,
  association_rho: 0.12,
  association_t: 1.1,
  association_n: 140,
  association_significant: false,
  universe_size: 79,
  breadth: {
    n_symbols: 70,
    enough_data: true,
    pct_above_sma200: 62,
    pct_oversold: 9,
    mean_rsi: 51,
    evidence: {
      horizon_days: 63,
      strongest_leg: "pct_oversold",
      strongest_rho: -0.19,
      strongest_t: -2.44,
      significant_at_project_bar: false,
      note: "",
    },
  },
};
```

(Move the new `import type { MarketRegime }` line up into the import block at the top of the file.)

- [ ] **Step 2: Write the failing tests**

`src/features/market/logic/__tests__/regime.test.ts`:

```ts
import { breadthTone, positiveRateSplit, regimePosition } from "../regime";

describe("regimePosition", () => {
  it("places the mean on the 35–60 range it has historically occupied", () => {
    expect(regimePosition(35)).toBe(0);
    expect(regimePosition(47.5)).toBe(50);
    expect(regimePosition(60)).toBe(100);
  });
  it("clamps outside the range and is null without a reading", () => {
    expect(regimePosition(20)).toBe(0);
    expect(regimePosition(70)).toBe(100);
    expect(regimePosition(null)).toBeNull();
  });
});

describe("breadthTone", () => {
  it("only claims a direction outside the 45–55 neutral middle", () => {
    expect(breadthTone(55)).toBe("gain");
    expect(breadthTone(54.9)).toBe("neutral");
    expect(breadthTone(50)).toBe("neutral");
    expect(breadthTone(45)).toBe("loss");
  });
});

describe("positiveRateSplit", () => {
  it("states both sides of the rate", () => {
    expect(positiveRateSplit(0.58)).toEqual({ positive: 58, other: 42 });
  });
});
```

`src/features/market/__tests__/StockCard.test.tsx`:

```tsx
import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { renderWithProviders } from "@/test-utils/render";
import { stockDetailHref } from "../links";
import { StockCard } from "../StockCard";
import { mockMarketApi } from "../testing/api";

jest.mock("expo-router", () => require("@/features/market/testing/expoRouterMock"));
jest.mock("@/charts", () => require("@/features/market/testing/chartsMock"));

const base = { symbol: "COMI", name: "Commercial International Bank", sector: "Banking" };

beforeEach(() => {
  jest.clearAllMocks();
  mockMarketApi();
});

it("shows a live price with its session and fetch age", async () => {
  await renderWithProviders(
    <StockCard {...base} price={82.5} change={1.2} changePct={1.48} state="live" asOf="2 Sep" fetchedAgo="14s ago" />
  );
  expect(screen.getByText("82.50")).toBeTruthy();
  expect(screen.getByText("+1.20 (+1.48%)")).toBeTruthy();
  expect(screen.getByText("2 Sep close · 14s ago")).toBeTruthy();
});

it("says Market closed instead of a climbing age", async () => {
  await renderWithProviders(
    <StockCard {...base} price={82.5} change={1.2} changePct={1.48} state="stale" asOf="3 Sep" isToday fetchedAgo="2h 5m ago" marketClosed />
  );
  expect(screen.getByText("3 Sep close · Market closed")).toBeTruthy();
});

it("shows the score number when given", async () => {
  await renderWithProviders(
    <StockCard {...base} price={1} changePct={0} compositeScore={72.4} compositeSignal="Strong" />
  );
  expect(screen.getByText("72")).toBeTruthy();
  expect(screen.queryByText("Banking")).toBeNull();
});

it("shows the sector when there is no score", async () => {
  await renderWithProviders(<StockCard {...base} price={1} changePct={0} compositeScore={null} />);
  expect(screen.getByText("Banking")).toBeTruthy();
});

it("shows the risk band as a word beside its dot", async () => {
  await renderWithProviders(
    <StockCard {...base} price={1} changePct={0} riskBand="calm" riskBandLabel="Calm" />
  );
  expect(screen.getByText("Calm")).toBeTruthy();
});

it("hides the risk band on a card with no feed", async () => {
  await renderWithProviders(<StockCard {...base} state="unavailable" riskBand="calm" riskBandLabel="Calm" />);
  expect(screen.queryByText("Calm")).toBeNull();
  expect(screen.getByText("No price feed")).toBeTruthy();
});

it("says which bar a non-daily change covers", async () => {
  await renderWithProviders(<StockCard {...base} price={1} change={0.1} changePct={2} changeInterval="Weekly" />);
  expect(screen.getByText("vs last week")).toBeTruthy();
});

it("shows a skeleton while loading", async () => {
  await renderWithProviders(<StockCard {...base} state="loading" />);
  expect(screen.getByTestId("stockcard-loading")).toBeTruthy();
});

it("retries a failed card without navigating", async () => {
  const onRetry = jest.fn();
  await renderWithProviders(<StockCard {...base} state="failed" onRetry={onRetry} />);
  fireEvent.press(screen.getByText("Couldn't load — retry"));
  expect(onRetry).toHaveBeenCalledTimes(1);
  expect(router.push).not.toHaveBeenCalled();
});

it("opens the stock on the card's interval", async () => {
  await renderWithProviders(<StockCard {...base} price={1} changePct={0} interval="Weekly" />);
  fireEvent.press(screen.getByTestId("stockcard-COMI"));
  expect(router.push).toHaveBeenCalledWith(stockDetailHref("COMI", "Weekly"));
});
```

`src/features/market/__tests__/WatchlistPanel.test.tsx`:

```tsx
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { stockHref } from "@/lib/links";
import { renderWithProviders } from "@/test-utils/render";
import { mockMarketApi, requestsTo } from "../testing/api";
import { TICKERS } from "../testing/fixtures";
import { WatchlistPanel } from "../WatchlistPanel";

jest.mock("expo-router", () => require("@/features/market/testing/expoRouterMock"));
jest.mock("@/charts", () => require("@/features/market/testing/chartsMock"));

const watched = (init?: RequestInit) =>
  init?.method === "DELETE" ? { deleted: "COMI" } : { symbols: ["COMI"] };

beforeEach(() => jest.clearAllMocks());

it("lists watched stocks with their name and price", async () => {
  mockMarketApi({ "/watchlist": (_u: URL, init?: RequestInit) => watched(init) });
  await renderWithProviders(
    <WatchlistPanel
      tickers={TICKERS}
      priceData={{ COMI: { price: 82.5, change: 1.2, changePct: 1.48, sparkline: [80, 82.5] } }}
    />
  );
  expect(await screen.findByText("COMI")).toBeTruthy();
  expect(screen.getByText("Commercial International Bank")).toBeTruthy();
  expect(screen.getByText("82.50")).toBeTruthy();
  expect(screen.getByText("+1.48%")).toBeTruthy();
});

it("opens a watched stock", async () => {
  mockMarketApi({ "/watchlist": (_u: URL, init?: RequestInit) => watched(init) });
  await renderWithProviders(<WatchlistPanel tickers={TICKERS} />);
  fireEvent.press(await screen.findByText("COMI"));
  expect(router.push).toHaveBeenCalledWith(stockHref("COMI"));
});

it("removes a stock and calls the API", async () => {
  const fetchMock = mockMarketApi({ "/watchlist": (_u: URL, init?: RequestInit) => watched(init) });
  await renderWithProviders(<WatchlistPanel tickers={TICKERS} />);
  fireEvent.press(await screen.findByLabelText("Remove COMI from watchlist"));
  await waitFor(() => expect(requestsTo(fetchMock, "/watchlist", "DELETE")).toHaveLength(1));
  expect(requestsTo(fetchMock, "/watchlist", "DELETE")[0].searchParams.get("symbol")).toBe("COMI");
  expect(await screen.findByText(/Your watchlist is empty/)).toBeTruthy();
});
```

`src/features/market/__tests__/MarketRegimeCard.test.tsx`:

```tsx
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { learnHref } from "@/lib/links";
import { renderWithProviders } from "@/test-utils/render";
import { MarketRegimeCard } from "../MarketRegimeCard";
import { fail, mockMarketApi } from "../testing/api";
import { REGIME } from "../testing/fixtures";

jest.mock("expo-router", () => require("@/features/market/testing/expoRouterMock"));

beforeEach(() => jest.clearAllMocks());

it("shows the reading, its history and breadth", async () => {
  mockMarketApi();
  await renderWithProviders(<MarketRegimeCard />);
  expect(await screen.findByText("Mixed")).toBeTruthy();
  expect(screen.getByText("52.3")).toBeTruthy();
  expect(screen.getByText("avg of 61 / 79")).toBeTruthy();
  expect(screen.getByText(/were positive 58% of the time — and negative or flat the other 42%/)).toBeTruthy();
  expect(screen.getByText(/does not clear the usual significance bar/)).toBeTruthy();
  expect(screen.getByText("62% above their 200-day average")).toBeTruthy();
  expect(screen.getByText(/On EGX history that has leaned the wrong way/)).toBeTruthy();
});

it("says breadth is still filling in when there are too few stocks", async () => {
  mockMarketApi({
    "/market_regime": { ...REGIME, breadth: { n_symbols: 9, enough_data: false } },
  });
  await renderWithProviders(<MarketRegimeCard />);
  expect(await screen.findByText(/Needs at least 15 measured stocks; 9 are in/)).toBeTruthy();
});

it("links to the Learn concept", async () => {
  mockMarketApi();
  await renderWithProviders(<MarketRegimeCard />);
  fireEvent.press(await screen.findByText("What does this mean? →"));
  expect(router.push).toHaveBeenCalledWith(learnHref("market_condition"));
});

it("renders nothing when the reading fails", async () => {
  mockMarketApi({ "/market_regime": fail(500) });
  await renderWithProviders(<MarketRegimeCard />);
  await waitFor(() => expect(screen.queryByTestId("regime-skeleton")).toBeNull());
  expect(screen.queryByText("Market Condition")).toBeNull();
});
```

- [ ] **Step 3: Run them to verify they fail**

Run: `npx jest src/features/market/logic/__tests__/regime.test.ts src/features/market/__tests__/StockCard.test.tsx src/features/market/__tests__/WatchlistPanel.test.tsx src/features/market/__tests__/MarketRegimeCard.test.tsx`
Expected: FAIL — `Cannot find module '../regime'`, `'../StockCard'`, `'../WatchlistPanel'`, `'../MarketRegimeCard'`.

- [ ] **Step 4: Implement the regime logic and the three components**

`src/features/market/logic/regime.ts`:

```ts
/** Position of the market mean on the 35–60 range it has historically occupied (0–100). */
export function regimePosition(mean: number | null | undefined): number | null {
  if (mean == null) return null;
  return Math.max(0, Math.min(100, ((mean - 35) / 25) * 100));
}

export type BreadthTone = "gain" | "loss" | "neutral";

/**
 * "% above the 200-day average" is a real direction, but only outside a
 * neutral middle — at 50% the market is evenly split and painting it green
 * (or 49.9% red) would claim a direction the reading does not have.
 */
export function breadthTone(pctAbove: number): BreadthTone {
  if (pctAbove >= 55) return "gain";
  if (pctAbove <= 45) return "loss";
  return "neutral";
}

/** Both sides of a rate — readers misjudge which event a probability refers to otherwise. */
export function positiveRateSplit(rate: number): { positive: number; other: number } {
  const positive = Math.round(rate * 100);
  return { positive, other: 100 - positive };
}
```

`src/features/market/StockCard.tsx`:

```tsx
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Sparkline, scoreColor } from "@/charts";
import { RISK_BAND_COLOR } from "@/shared/riskBands";
import { COLORS } from "@/shared/theme";
import type { CompositeSignal } from "@/shared/types";
import { AppText } from "@/ui";
import { stockDetailHref } from "./links";
import type { CardState } from "./logic/cards";
import { changeText } from "./logic/format";
import { cardStamp, changeIntervalNote } from "./logic/marketClock";

export interface StockCardProps {
  symbol: string;
  name: string;
  price?: number;
  change?: number;
  changePct?: number;
  sparklineData?: number[];
  sector?: string;
  compositeSignal?: CompositeSignal | null;
  /** 0-100 composite — the number, never a Buy/Hold word. */
  compositeScore?: number | null;
  /** Calm..Wild: how much it moves, never which way. */
  riskBand?: string | null;
  riskBandLabel?: string | null;
  interval?: string;
  /** The bar the change covers — a month-over-month move on "Monthly". */
  changeInterval?: string;
  state?: CardState;
  /** The session this price belongs to, e.g. "2 Sep". */
  asOf?: string | null;
  /** `asOf` is today's (possibly still trading) session. */
  isToday?: boolean;
  /** "14s ago" — ticks live. */
  fetchedAgo?: string | null;
  /** The EGX is shut: show a static "Market closed" instead of a climbing age. */
  marketClosed?: boolean;
  onRetry?: () => void;
}

/** Port of web `StockCard` — five states, score, risk dot, session stamp, sparkline. */
export function StockCard({
  symbol,
  name,
  price,
  change,
  changePct,
  sparklineData,
  sector,
  compositeSignal,
  compositeScore,
  riskBand,
  riskBandLabel,
  interval,
  changeInterval,
  state = "live",
  asOf,
  isToday = false,
  fetchedAgo,
  marketClosed = false,
  onRetry,
}: StockCardProps) {
  const isPositive = (changePct ?? 0) >= 0;
  const changeColor = isPositive ? COLORS.gain : COLORS.loss;
  // A listed company the feed does not quote keeps its card, muted — this is
  // information about the feed, not a fault the reader can act on.
  const muted = state === "unavailable";
  const stamp = cardStamp({
    asOf: asOf ?? null,
    isToday,
    fetchedAgo: fetchedAgo ?? null,
    marketClosed,
  });
  const intervalNote = changeIntervalNote(changeInterval);
  const band = riskBand && state !== "unavailable" ? riskBand : null;

  let body;
  if (price !== undefined) {
    body = (
      <>
        <AppText className="font-mono-semibold text-lg text-white">{price.toFixed(2)}</AppText>
        <AppText className="font-mono text-xs" style={{ color: changeColor }}>
          {changeText(change, changePct)}
        </AppText>
        {intervalNote && (
          <AppText className="mt-0.5 text-[9px] uppercase tracking-wide text-white/30">{intervalNote}</AppText>
        )}
        {stamp && (
          <AppText className="mt-0.5 text-[9px] uppercase tracking-wide text-white/25">{stamp}</AppText>
        )}
      </>
    );
  } else if (state === "loading") {
    body = (
      <View testID="stockcard-loading" className="gap-1.5 py-1">
        <View className="h-5 w-16 rounded bg-white/10" />
        <View className="h-3 w-12 rounded bg-white/5" />
      </View>
    );
  } else if (state === "unavailable") {
    body = (
      <>
        <AppText className="text-xs text-white/35">No price feed</AppText>
        <AppText className="mt-0.5 text-[9px] text-white/25">Not quoted by the data source</AppText>
      </>
    );
  } else if (state === "failed" && onRetry) {
    // A nested Pressable takes the touch, so retrying never opens the stock.
    body = (
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        className="min-h-[44px] justify-center self-start rounded-md border border-white/10 px-2.5"
      >
        <AppText className="text-[11px] text-white/50">Couldn&apos;t load — retry</AppText>
      </Pressable>
    );
  } else {
    body = <AppText className="font-mono text-sm text-white/30">--</AppText>;
  }

  return (
    <Pressable
      testID={`stockcard-${symbol}`}
      accessibilityRole="link"
      accessibilityLabel={`${symbol}, ${name}`}
      onPress={() => router.push(stockDetailHref(symbol, interval))}
      className={`rounded-xl border border-white/5 p-4 ${muted ? "bg-white/[0.01] opacity-60" : "bg-white/[0.03]"}`}
    >
      <View className="flex-row items-start justify-between gap-2">
        <View className="min-w-0 flex-1">
          <AppText className="font-mono-semibold text-sm text-white">{symbol}</AppText>
          <AppText numberOfLines={1} className="mt-0.5 text-xs text-white/40">
            {name}
          </AppText>
        </View>
        {/* Score (condition) above risk (movement): two axes, stacked. */}
        <View className="shrink-0 items-end gap-1">
          {compositeScore != null ? (
            <View
              className="items-center"
              accessibilityLabel={`Score ${compositeScore.toFixed(0)} of 100${compositeSignal ? `, ${compositeSignal}` : ""}`}
            >
              <AppText className="font-mono-semibold text-lg" style={{ color: scoreColor(compositeScore) }}>
                {compositeScore.toFixed(0)}
              </AppText>
              <AppText className="text-[8px] uppercase tracking-wider text-white/30">score</AppText>
            </View>
          ) : sector ? (
            <View className="rounded-full bg-accent/10 px-2 py-0.5">
              <AppText className="text-[10px] text-accent/70">{sector}</AppText>
            </View>
          ) : null}
          {band && (
            <View
              className="flex-row items-center gap-1"
              accessibilityLabel={`Risk: ${riskBandLabel ?? band} — how much it moves, not which way`}
            >
              <View
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: RISK_BAND_COLOR[band] ?? COLORS.accent }}
              />
              <AppText className="text-[9px] uppercase tracking-wider text-white/40">
                {riskBandLabel ?? band}
              </AppText>
            </View>
          )}
        </View>
      </View>

      <View className="mt-3 flex-row items-end justify-between gap-2">
        <View className="flex-1">{body}</View>
        {sparklineData && sparklineData.length > 1 && (
          <Sparkline values={sparklineData} width={64} height={32} />
        )}
      </View>
    </Pressable>
  );
}
```

`src/features/market/WatchlistPanel.tsx`:

```tsx
import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Sparkline } from "@/charts";
import { stockHref } from "@/lib/links";
import { useWatchlist } from "@/providers/watchlist";
import { COLORS } from "@/shared/theme";
import type { Ticker } from "@/shared/types";
import { AppText, IconButton } from "@/ui";
import type { WatchlistPrice } from "./logic/cards";
import { pctText } from "./logic/format";

interface WatchlistPanelProps {
  tickers?: Ticker[];
  priceData?: Record<string, WatchlistPrice>;
}

function WatchlistRow({
  symbol,
  name,
  price,
  changePct,
  sparkline,
  onRemove,
}: {
  symbol: string;
  name?: string;
  price?: number;
  changePct?: number;
  sparkline?: number[];
  onRemove: () => void;
}) {
  const color = (changePct ?? 0) >= 0 ? COLORS.gain : COLORS.loss;
  return (
    <View className="flex-row items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] pl-3">
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push(stockHref(symbol))}
        className="min-h-[44px] flex-1 flex-row items-center gap-3 py-2.5"
      >
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-2">
            <AppText className="font-mono-semibold text-sm text-white">{symbol}</AppText>
            {price !== undefined && (
              <AppText className="font-mono text-[11px]" style={{ color }}>
                {pctText(changePct)}
              </AppText>
            )}
          </View>
          {name && (
            <AppText numberOfLines={1} className="text-[11px] text-white/40">
              {name}
            </AppText>
          )}
        </View>
        {sparkline && sparkline.length > 1 && <Sparkline values={sparkline} width={56} height={28} />}
        {price !== undefined ? (
          <AppText className="font-mono-semibold text-sm text-white">{price.toFixed(2)}</AppText>
        ) : (
          <AppText className="font-mono text-xs text-white/30">--</AppText>
        )}
      </Pressable>
      <IconButton
        icon="trash-outline"
        tone="danger"
        accessibilityLabel={`Remove ${symbol} from watchlist`}
        onPress={onRemove}
      />
    </View>
  );
}

/** Port of the web `WatchlistPanel` (the dashboard sidebar). */
export function WatchlistPanel({ tickers, priceData }: WatchlistPanelProps) {
  const { symbols, loading, remove } = useWatchlist();
  const byCode = useMemo(() => {
    const m = new Map<string, Ticker>();
    for (const t of tickers ?? []) m.set(t.symbol.toUpperCase(), t);
    return m;
  }, [tickers]);

  const header = (
    <View className="mb-3 flex-row items-center justify-between">
      <AppText className="font-sans-semibold text-sm text-white">Watchlist</AppText>
      {symbols.length > 0 && (
        <View className="rounded-full bg-white/5 px-2 py-0.5">
          <AppText className="font-sans-medium text-[10px] text-white/50">{symbols.length}</AppText>
        </View>
      )}
    </View>
  );

  if (loading && !symbols.length) {
    return (
      <View className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
        {header}
        <AppText className="text-xs text-white/30">Loading...</AppText>
      </View>
    );
  }

  if (!symbols.length) {
    return (
      <View className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
        {header}
        <AppText className="text-xs leading-relaxed text-white/40">
          Your watchlist is empty. Tap Watch on any stock page to track it here.
        </AppText>
      </View>
    );
  }

  return (
    <View className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      {header}
      <View className="gap-2">
        {symbols.map((sym) => {
          const pd = priceData?.[sym.toUpperCase()];
          return (
            <WatchlistRow
              key={sym}
              symbol={sym}
              name={byCode.get(sym.toUpperCase())?.name}
              price={pd?.price}
              changePct={pd?.changePct}
              sparkline={pd?.sparkline}
              onRemove={() => remove(sym)}
            />
          );
        })}
      </View>
    </View>
  );
}
```

`src/features/market/MarketRegimeCard.tsx`:

```tsx
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { learnHref } from "@/lib/links";
import { fetchMarketRegime, type MarketBreadth } from "@/shared/api";
import { AppText, LearnTerm } from "@/ui";
import { useKeyedFetch } from "./hooks/useKeyedFetch";
import { pct } from "./logic/format";
import { breadthTone, positiveRateSplit, regimePosition } from "./logic/regime";

/**
 * The market-condition reading — the app's only forecast-shaped surface, every
 * claim read from the payload. Breadth sits INSIDE it (web `BreadthStrip`):
 * two competing market cards invite picking whichever agrees with you.
 */

const TONE: Record<string, { ring: string; text: string; bar: string }> = {
  weak: { ring: "border-loss/25", text: "text-loss", bar: "bg-loss" },
  mixed: { ring: "border-accent/25", text: "text-accent", bar: "bg-accent" },
  broad: { ring: "border-gain/25", text: "text-gain", bar: "bg-gain" },
};
const NEUTRAL = { ring: "border-white/10", text: "text-white/50", bar: "bg-white/20" };
const BREADTH_FILL = { gain: "bg-gain", loss: "bg-loss", neutral: "bg-white/30" } as const;

const REGIME_EXPLANATION =
  "The average composite score across EGX30 and EGX70 constituents — a reading of how broadly healthy the market is right now, NOT a call on any single stock. Its link to the market's next three months was measured and is weak enough that it does not pass a significance test, so read it as context about today, not as a forecast.";

const BREADTH_EXPLANATION =
  "How many shares are participating, rather than how the index looks. Measured from last night's risk snapshot, so it stays current even when nothing else has been refreshed. Its link to the next three months is weak and does not clear this app's evidence bar — read it as a description of today, not a forecast.";

function BreadthStrip({ breadth }: { breadth: MarketBreadth }) {
  const title = (
    <LearnTerm term="Market breadth" explanation={BREADTH_EXPLANATION}>
      Market breadth
    </LearnTerm>
  );

  if (!breadth.enough_data || breadth.pct_above_sma200 == null) {
    return (
      <View className="mt-3 border-t border-white/5 pt-3">
        {title}
        <AppText className="mt-1 text-[11px] leading-relaxed text-white/40">
          {`Needs at least 15 measured stocks; ${breadth.n_symbols} are in last night's snapshot so far. It fills in as the nightly risk job works through the market.`}
        </AppText>
      </View>
    );
  }

  const above = breadth.pct_above_sma200;
  const ev = breadth.evidence;
  return (
    <View className="mt-3 border-t border-white/5 pt-3">
      <View className="flex-row items-baseline justify-between gap-2">
        {title}
        <AppText className="text-[10px] text-white/30">{`${breadth.n_symbols} tradeable stocks`}</AppText>
      </View>
      <View className="relative mt-2 h-2 w-full overflow-hidden rounded-full bg-white/5">
        <View
          className={`absolute bottom-0 left-0 top-0 opacity-70 ${BREADTH_FILL[breadthTone(above)]}`}
          style={{ width: pct(Math.max(0, Math.min(100, above))) }}
        />
        <View className="absolute bottom-0 top-0 w-px bg-white/25" style={{ left: "50%" }} />
      </View>
      <View className="mt-1.5 flex-row items-baseline justify-between gap-2">
        <AppText className="text-xs text-white/70">{`${above}% above their 200-day average`}</AppText>
        {breadth.mean_rsi != null && (
          <AppText className="text-[10px] text-white/30">{`avg RSI ${breadth.mean_rsi}`}</AppText>
        )}
      </View>
      {breadth.pct_oversold != null && breadth.pct_oversold > 0 && (
        // Stated, never coloured: more oversold shares measured WORSE forward returns.
        <AppText className="mt-2 text-[10px] leading-relaxed text-white/40">
          {`${breadth.pct_oversold}% are oversold (RSI under 30). On EGX history that has leaned the wrong way — periods with more oversold shares were followed by weaker returns, not a bounce`}
          {ev
            ? ` (rank correlation ${ev.strongest_rho.toFixed(2)}, t ${ev.strongest_t.toFixed(2)}${ev.significant_at_project_bar === false ? ", still too weak to act on" : ""})`
            : ""}
          .
        </AppText>
      )}
    </View>
  );
}

export function MarketRegimeCard() {
  const { data, error, loading } = useKeyedFetch("market-regime", fetchMarketRegime);

  if (error) return null;
  if (loading || !data) {
    return (
      <View testID="regime-skeleton" className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <View className="h-3 w-32 rounded bg-white/10" />
        <View className="mt-3 h-6 w-40 rounded bg-white/10" />
      </View>
    );
  }

  const tone = (data.band && TONE[data.band]) || NEUTRAL;
  const pos = regimePosition(data.mean_score);
  const split = data.hist_positive_rate != null ? positiveRateSplit(data.hist_positive_rate) : null;

  return (
    <View className={`rounded-xl border bg-white/[0.02] p-4 ${tone.ring}`}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <LearnTerm term="Market Condition" explanation={REGIME_EXPLANATION}>
            Market Condition
          </LearnTerm>
          <AppText className={`mt-1 font-sans-semibold text-lg ${tone.text}`}>{data.label}</AppText>
        </View>
        {data.mean_score != null && (
          <View className="items-end">
            <AppText className="font-mono-semibold text-2xl text-white">{data.mean_score.toFixed(1)}</AppText>
            <AppText className="text-[10px] text-white/30">
              {`avg of ${data.n_symbols}${data.universe_size ? ` / ${data.universe_size}` : ""}`}
            </AppText>
          </View>
        )}
      </View>

      {pos != null && (
        <View className="mt-3">
          <View className="relative h-1.5 w-full rounded-full bg-white/5">
            <View
              className={`absolute top-0 h-1.5 w-1.5 rounded-full ${tone.bar}`}
              style={{ left: pct(pos), marginLeft: -3 }}
            />
          </View>
          <View className="mt-1 flex-row justify-between">
            <AppText className="text-[9px] text-white/25">weak</AppText>
            <AppText className="text-[9px] text-white/25">broad</AppText>
          </View>
        </View>
      )}

      <AppText className="mt-3 text-xs leading-relaxed text-white/60">{data.summary}</AppText>

      {data.band && split && (
        <AppText className="mt-2 text-[10px] leading-relaxed text-white/35">
          {`Historically, from this level the EGX30's next ${data.horizon_days} trading days had a median of ${data.hist_median_3m_pct != null && data.hist_median_3m_pct > 0 ? "+" : ""}${data.hist_median_3m_pct}% and were positive ${split.positive}% of the time — and negative or flat the other ${split.other}%${data.observations ? ` (${data.observations} readings)` : ""}.`}
          {data.association_rho != null
            ? ` The link behind this is weak: rank correlation +${data.association_rho.toFixed(2)}${data.association_t != null ? `, t ${data.association_t.toFixed(2)}` : ""} across ${data.association_n} overlapping readings${data.association_significant === false ? ", which does not clear the usual significance bar" : ""}. Treat it as context, never a prediction.`
            : ""}
        </AppText>
      )}

      {data.stale && (
        <AppText className="mt-2 text-[10px] text-white/30">
          {`Showing the last complete reading${data.observed_at ? ` from ${data.observed_at.slice(0, 10)}` : ""}. Only ${data.n_symbols_now ?? 0} stocks are scored right now — browse the dashboard to refresh it.`}
        </AppText>
      )}

      {data.breadth && <BreadthStrip breadth={data.breadth} />}

      <Pressable
        accessibilityRole="link"
        onPress={() => router.push(learnHref("market_condition"))}
        className="mt-1 min-h-[44px] justify-center"
      >
        <AppText className="text-[11px] text-accent/70">What does this mean? →</AppText>
      </Pressable>
    </View>
  );
}
```

- [ ] **Step 5: Run them to verify they pass**

Run: `npx jest src/features/market/logic/__tests__/regime.test.ts src/features/market/__tests__/StockCard.test.tsx src/features/market/__tests__/WatchlistPanel.test.tsx src/features/market/__tests__/MarketRegimeCard.test.tsx`
Expected: PASS — 4 suites. If `WatchlistPanel`/`MarketRegimeCard` fail with an unmatched-route or 404 error, the `mockFetch` signature differs from assumption 1: adapt `testing/api.ts` only, then re-run.

- [ ] **Step 6: Verify and commit**

Run: `npm run verify`
Expected: exits 0.

```bash
git add src/features/market
git commit -m "feat(market): StockCard, WatchlistPanel and MarketRegimeCard with test harness

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XDkAB7UCK8WyT267W5ZxNV"
```

---

### Task 4: Dashboard data hooks — snapshot, live upgrade, refresh

**Files:**
- Create: `src/features/market/hooks/useDashboardSnapshot.ts`
- Create: `src/features/market/hooks/useLiveUpgrade.ts`
- Test: `src/features/market/hooks/__tests__/dashboardData.test.tsx`

**Interfaces:**
- Consumes: Task 1 `cards.ts` (`cardsFromSnapshot`, `mergeSnapshot`, `demoteLive`, `applyBatchChunk`, `upgradeCandidates`, `retryableSymbols`, `CardMap`), `CompositeInterval`; `@/shared/api` (`fetchDashboard`, `fetchCompositeBatch`); `@/shared/constants` (`COMPOSITE_MAX_ATTEMPTS`, `COMPOSITE_RETRY_DELAY_MS`); Task 3 harness.
- Produces:
  - `useDashboardSnapshot(weightsVersion: number): { cards: CardMap; setCards: Dispatch<SetStateAction<CardMap>>; noFeed: ReadonlySet<string>; snapshotLoaded: boolean; refreshKey: number; refreshing: boolean; refresh: () => void }` — `refresh()` re-fetches with `{ fresh: true }` and keeps cards on screen.
  - `useLiveUpgrade(o: { symbols: string[]; enabled: boolean; snapshotLoaded: boolean; noFeed: ReadonlySet<string>; interval: CompositeInterval; weightsVersion: number; refreshKey: number; setCards: Dispatch<SetStateAction<CardMap>> }): { upgrade: (symbols: string[]) => void }`.

- [ ] **Step 1: Write the failing tests**

`src/features/market/hooks/__tests__/dashboardData.test.tsx`:

```tsx
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Pressable, Text, View } from "react-native";
import { COMPOSITE_RETRY_DELAY_MS } from "@/shared/constants";
import type { DashboardResponse } from "@/shared/api";
import { renderWithProviders } from "@/test-utils/render";
import type { CompositeInterval } from "../../logic/dashboardFilters";
import { fail, mockMarketApi, requestsTo } from "../../testing/api";
import { batch, DASHBOARD, makeDashboard, makeDashboardRow } from "../../testing/fixtures";
import { useDashboardSnapshot } from "../useDashboardSnapshot";
import { useLiveUpgrade } from "../useLiveUpgrade";

function Harness({ symbols, interval = "Daily" }: { symbols: string[]; interval?: CompositeInterval }) {
  const snap = useDashboardSnapshot(0);
  const { upgrade } = useLiveUpgrade({
    symbols,
    enabled: true,
    snapshotLoaded: snap.snapshotLoaded,
    noFeed: snap.noFeed,
    interval,
    weightsVersion: 0,
    refreshKey: snap.refreshKey,
    setCards: snap.setCards,
  });
  return (
    <View>
      {Object.entries(snap.cards).map(([sym, c]) => (
        <Text key={sym} testID={`card-${sym}`}>{`${c.state}:${c.score ?? "-"}:${c.price ?? "-"}`}</Text>
      ))}
      <Text testID="refreshing">{String(snap.refreshing)}</Text>
      <Pressable testID="refresh" onPress={snap.refresh} />
      <Pressable testID="retry" onPress={() => upgrade(["COMI"])} />
    </View>
  );
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => (resolve = res));
  return { promise, resolve };
}

afterEach(() => jest.useRealTimers());

it("paints the snapshot as stale cards and marks no-feed symbols", async () => {
  mockMarketApi();
  await renderWithProviders(<Harness symbols={[]} />);
  expect((await screen.findByTestId("card-COMI")).props.children).toBe("stale:72:82.5");
  expect(screen.getByTestId("card-MEGM").props.children).toBe("unavailable:-:-");
});

it("upgrades symbols live and never requests a no-feed symbol", async () => {
  const fetchMock = mockMarketApi({
    "/analysis": batch({ COMI: { score: 80, signal: "Very Strong", price: 83 } }),
  });
  await renderWithProviders(<Harness symbols={["COMI", "MEGM", "TMGH"]} />);
  await waitFor(() => expect(screen.getByTestId("card-COMI").props.children).toBe("live:80:83"));
  const asked = requestsTo(fetchMock, "/analysis").flatMap((u) => (u.searchParams.get("symbols") ?? "").split(","));
  expect(asked).toEqual(expect.arrayContaining(["COMI", "TMGH"]));
  expect(asked).not.toContain("MEGM");
  expect(requestsTo(fetchMock, "/analysis")[0].searchParams.get("interval")).toBe("Daily");
});

it("fills cards from the live upgrade when the snapshot fails", async () => {
  mockMarketApi({
    "/dashboard": fail(500),
    "/analysis": batch({ COMI: { score: 66, signal: "Strong", price: 80 } }),
  });
  await renderWithProviders(<Harness symbols={["COMI"]} />);
  await waitFor(() => expect(screen.getByTestId("card-COMI").props.children).toBe("live:66:80"));
});

it("refresh asks for fresh data and keeps cards visible", async () => {
  const second = deferred<DashboardResponse>();
  let calls = 0;
  const fetchMock = mockMarketApi({
    "/dashboard": () => (++calls === 1 ? DASHBOARD : second.promise),
  });
  await renderWithProviders(<Harness symbols={[]} />);
  await screen.findByTestId("card-COMI");

  fireEvent.press(screen.getByTestId("refresh"));
  expect(screen.getByTestId("refreshing").props.children).toBe("true");
  await waitFor(() => expect(requestsTo(fetchMock, "/dashboard")).toHaveLength(2));
  const [first, fresh] = requestsTo(fetchMock, "/dashboard");
  expect(first.searchParams.has("fresh")).toBe(false);
  expect(fresh.searchParams.has("fresh")).toBe(true);
  // Never blank: the old figures stay until the new ones land.
  expect(screen.getByTestId("card-COMI").props.children).toBe("stale:72:82.5");

  await act(async () => second.resolve(makeDashboard([makeDashboardRow("COMI", { price: 90, score: 70 })])));
  expect(screen.getByTestId("card-COMI").props.children).toBe("stale:70:90");
  expect(screen.getByTestId("refreshing").props.children).toBe("false");
});

it("retries a timed-out symbol once after the delay", async () => {
  jest.useFakeTimers();
  let calls = 0;
  mockMarketApi({
    "/dashboard": makeDashboard([]),
    "/analysis": () =>
      ++calls === 1
        ? batch({}, [{ symbol: "COMI", error: "upstream timeout" }])
        : batch({ COMI: { score: 61, signal: "Strong", price: 70 } }),
  });
  await renderWithProviders(<Harness symbols={["COMI"]} />);
  await waitFor(() => expect(screen.getByTestId("card-COMI").props.children).toBe("failed:-:-"));
  await act(async () => {
    jest.advanceTimersByTime(COMPOSITE_RETRY_DELAY_MS);
  });
  await waitFor(() => expect(screen.getByTestId("card-COMI").props.children).toBe("live:61:70"));
});

it("asks for the selected interval", async () => {
  const fetchMock = mockMarketApi();
  await renderWithProviders(<Harness symbols={["COMI"]} interval="Weekly" />);
  await waitFor(() => expect(requestsTo(fetchMock, "/analysis").length).toBeGreaterThan(0));
  expect(requestsTo(fetchMock, "/analysis")[0].searchParams.get("interval")).toBe("Weekly");
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx jest src/features/market/hooks/__tests__/dashboardData.test.tsx`
Expected: FAIL — `Cannot find module '../useDashboardSnapshot'`.

- [ ] **Step 3: Implement the hooks**

`src/features/market/hooks/useDashboardSnapshot.ts`:

```ts
import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { fetchDashboard } from "@/shared/api";
import { cardsFromSnapshot, mergeSnapshot, type CardMap } from "../logic/cards";

export interface DashboardSnapshot {
  cards: CardMap;
  setCards: Dispatch<SetStateAction<CardMap>>;
  noFeed: ReadonlySet<string>;
  snapshotLoaded: boolean;
  refreshKey: number;
  refreshing: boolean;
  refresh: () => void;
}

/**
 * Step 1 — the snapshot: one request for the whole universe, no upstream fetch.
 * It is an accelerator, not a dependency: if it fails (or the nightly job has
 * never run) `snapshotLoaded` still turns true and the live upgrade fills the
 * grid on its own.
 *
 * `refresh()` is pull-to-refresh. `refreshKey > 0` sends `fresh`, exactly like
 * the web Refresh button, so the request bypasses any cached copy.
 */
export function useDashboardSnapshot(weightsVersion: number): DashboardSnapshot {
  const [cards, setCards] = useState<CardMap>({});
  const [noFeed, setNoFeed] = useState<ReadonlySet<string>>(() => new Set<string>());
  const [snapshotLoaded, setSnapshotLoaded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchDashboard({ fresh: refreshKey > 0 })
      .then((res) => {
        if (cancelled) return;
        const { cards: next, noFeed: dead } = cardsFromSnapshot(res.rows);
        setCards((prev) => mergeSnapshot(prev, next));
        setNoFeed(dead);
      })
      .catch(() => {
        // Accelerator, not dependency — the live path still fills the grid.
      })
      .finally(() => {
        if (!cancelled) {
          setSnapshotLoaded(true);
          setRefreshing(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [weightsVersion, refreshKey]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
  }, []);

  return { cards, setCards, noFeed, snapshotLoaded, refreshKey, refreshing, refresh };
}
```

`src/features/market/hooks/useLiveUpgrade.ts`:

```ts
import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { fetchCompositeBatch } from "@/shared/api";
import { COMPOSITE_MAX_ATTEMPTS, COMPOSITE_RETRY_DELAY_MS } from "@/shared/constants";
import {
  applyBatchChunk,
  demoteLive,
  retryableSymbols,
  upgradeCandidates,
  type CardMap,
} from "../logic/cards";
import type { CompositeInterval } from "../logic/dashboardFilters";

interface LiveUpgradeOptions {
  /** Visible page + watched stocks, in order (see `upgradeQueue`). */
  symbols: string[];
  /** The "Score: On" toggle. */
  enabled: boolean;
  snapshotLoaded: boolean;
  noFeed: ReadonlySet<string>;
  interval: CompositeInterval;
  weightsVersion: number;
  refreshKey: number;
  setCards: Dispatch<SetStateAction<CardMap>>;
}

/**
 * Step 2 — upgrade the visible page (and the watchlist) to live figures in
 * the background, at the shared client's bounded concurrency, never for a
 * symbol the feed refuses. Port of the web dashboard's `upgrade` callback.
 *
 * `upgradedRef` is a ref, not `cards[sym].state === "live"`: the reset effect
 * only SCHEDULES the demotion, so reading state here would see every symbol
 * as still live in the same commit and fetch nothing (the dead-Refresh bug).
 */
export function useLiveUpgrade(o: LiveUpgradeOptions): { upgrade: (symbols: string[]) => void } {
  const { setCards, interval, noFeed } = o;
  const inFlightRef = useRef(new Set<string>());
  const attemptsRef = useRef(new Map<string, number>());
  const upgradedRef = useRef(new Set<string>());
  const runIdRef = useRef(0);

  // Weights, interval and refresh change what a score MEANS: start a new run,
  // demote live → stale (never drop). Declared BEFORE the upgrade effect so it
  // runs first in the same commit.
  useEffect(() => {
    runIdRef.current += 1;
    inFlightRef.current = new Set();
    attemptsRef.current = new Map();
    upgradedRef.current = new Set();
    setCards(demoteLive);
  }, [o.weightsVersion, o.refreshKey, interval, setCards]);

  const upgrade = useCallback(
    (symbols: string[]) => {
      const runId = runIdRef.current;
      const toFetch = upgradeCandidates(symbols, {
        noFeed,
        inFlight: inFlightRef.current,
        upgraded: upgradedRef.current,
        attempts: attemptsRef.current,
        maxAttempts: COMPOSITE_MAX_ATTEMPTS,
      });
      if (!toFetch.length) return;

      for (const s of toFetch) {
        const sym = s.toUpperCase();
        inFlightRef.current.add(sym);
        attemptsRef.current.set(sym, (attemptsRef.current.get(sym) ?? 0) + 1);
      }

      fetchCompositeBatch(toFetch, interval, {
        isCancelled: () => runIdRef.current !== runId,
        onChunk: (partial) => {
          setCards((prev) => {
            const { cards, upgraded } = applyBatchChunk(prev, partial, Date.now());
            for (const sym of upgraded) upgradedRef.current.add(sym);
            return cards;
          });
        },
      })
        .then((res) => {
          if (runIdRef.current !== runId) return;
          // Upstream timeouts often self-cache moments later, so one delayed
          // retry usually lands — bounded by COMPOSITE_MAX_ATTEMPTS.
          const retry = retryableSymbols(res.errors, {
            noFeed,
            attempts: attemptsRef.current,
            maxAttempts: COMPOSITE_MAX_ATTEMPTS,
          });
          if (retry.length) {
            setTimeout(() => {
              if (runIdRef.current === runId) upgrade(retry);
            }, COMPOSITE_RETRY_DELAY_MS);
          }
        })
        .finally(() => {
          for (const s of toFetch) inFlightRef.current.delete(s.toUpperCase());
        });
    },
    [interval, noFeed, setCards]
  );

  const symbolsKey = o.symbols.join(",");
  useEffect(() => {
    if (!o.enabled) return;
    // Wait for the snapshot so `noFeed` is known — otherwise the first pass
    // spends its budget on symbols the feed never answers.
    if (!o.snapshotLoaded) return;
    upgrade(o.symbols);
    // `upgrade` and `o.symbols` are read through `symbolsKey`/`interval`;
    // listing them would re-run this on every arriving chunk.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey, o.weightsVersion, o.refreshKey, o.enabled, interval, o.snapshotLoaded]);

  return { upgrade };
}
```

- [ ] **Step 4: Run them to verify they pass**

Run: `npx jest src/features/market/hooks/__tests__/dashboardData.test.tsx`
Expected: PASS — 6 tests.

- [ ] **Step 5: Verify and commit**

Run: `npm run verify`
Expected: exits 0. (If lint reports `react-hooks/set-state-in-effect` on `setCards(demoteLive)`, apply the one-line disable from Global Constraints and re-run.)

```bash
git add src/features/market/hooks
git commit -m "feat(market): dashboard snapshot + bounded live upgrade hooks with fresh refresh

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XDkAB7UCK8WyT267W5ZxNV"
```

---

### Task 5: Dashboard screen and route

**Files:**
- Create: `src/features/market/IndexFilter.tsx`
- Create: `src/features/market/SectorFilter.tsx`
- Create: `src/features/market/DashboardControls.tsx`
- Create: `src/features/market/DashboardScreen.tsx`
- Modify (replace contents): `src/app/(tabs)/index.tsx`
- Test: `src/features/market/__tests__/DashboardScreen.test.tsx`

**Interfaces:**
- Consumes: Tasks 1–4; `@/providers/tickers` (`useTickers`), `@/providers/scoreWeights` (`useScoreWeights().version`), `@/providers/watchlist`; `@/ui` (`Screen`, `AppText`, `TextField`, `IconButton`, `Pill`, `PillRow`, `LearnTerm`, `Button`, `CardSkeleton`, `EmptyState`); `@/shared/constants` (`CARDS_PER_PAGE`); `@/lib/links` (`routes`).
- Produces: `DashboardScreen()`; `IndexFilter({ selected, onChange })`; `SectorFilter({ selected, onChange })`; `DashboardControls(props: DashboardControlsProps)`. testIDs: `dashboard-list`, `dashboard-refresh`, `dashboard-search`, `stockcard-<SYM>`.

- [ ] **Step 1: Write the failing screen test**

`src/features/market/__tests__/DashboardScreen.test.tsx`:

```tsx
import { fireEvent, screen, waitFor, within } from "@testing-library/react-native";
import { router } from "expo-router";
import { routes } from "@/lib/links";
import { renderWithProviders } from "@/test-utils/render";
import { DashboardScreen } from "../DashboardScreen";
import { mockMarketApi, requestsTo, type Route } from "../testing/api";
import { batch, makeDashboard, makeDashboardRow } from "../testing/fixtures";

jest.mock("expo-router", () => require("@/features/market/testing/expoRouterMock"));
jest.mock("@/charts", () => require("@/features/market/testing/chartsMock"));

beforeEach(() => jest.clearAllMocks());

async function renderDashboard(routesOverride: Record<string, Route> = {}) {
  const fetchMock = mockMarketApi(routesOverride);
  await renderWithProviders(<DashboardScreen />);
  const card = await screen.findByTestId("stockcard-COMI");
  await within(card).findByText("82.50"); // snapshot landed
  return fetchMock;
}

const cardOrder = () => screen.getAllByTestId(/^stockcard-[A-Z0-9]+$/).map((el) => el.props.testID);

it("shows the EGX30 grid from the snapshot", async () => {
  await renderDashboard();
  expect(screen.getByText("4 stocks")).toBeTruthy();
  expect(within(screen.getByTestId("stockcard-COMI")).getByText("72")).toBeTruthy();
  expect(screen.queryByTestId("stockcard-MEGM")).toBeNull();
});

it("moves listings without a feed below the grid, still findable", async () => {
  await renderDashboard();
  fireEvent.press(screen.getByText("All"));
  expect(await screen.findByText("4 stocks · 2 without a price feed")).toBeTruthy();
  fireEvent.press(screen.getByText(/^No feed data \(2\)/));
  expect(within(await screen.findByTestId("stockcard-MEGM")).getByText("No price feed")).toBeTruthy();
});

it("filters by search text", async () => {
  await renderDashboard();
  fireEvent.changeText(screen.getByPlaceholderText("Filter by name or symbol..."), "telecom");
  await waitFor(() => expect(screen.queryByTestId("stockcard-COMI")).toBeNull());
  expect(screen.getByTestId("stockcard-ETEL")).toBeTruthy();
});

it("sorts by score and explains what the score is", async () => {
  await renderDashboard();
  fireEvent.press(screen.getByText("Score"));
  await waitFor(() =>
    expect(cardOrder()).toEqual(["stockcard-COMI", "stockcard-ETEL", "stockcard-TMGH", "stockcard-ABUK"])
  );
  expect(screen.getByText(/does not predict price/)).toBeTruthy();
});

it("filters to dividend payers", async () => {
  await renderDashboard();
  fireEvent.press(screen.getByText("Pays a dividend"));
  await waitFor(() => expect(cardOrder()).toEqual(["stockcard-COMI", "stockcard-ETEL"]));
});

it("turns scores off and shows the sector instead", async () => {
  await renderDashboard();
  fireEvent.press(screen.getByText("Score: On"));
  const card = screen.getByTestId("stockcard-COMI");
  expect(await within(card).findByText("Banking")).toBeTruthy();
  expect(within(card).queryByText("72")).toBeNull();
});

it("warns and re-scores on a non-daily interval", async () => {
  const fetchMock = await renderDashboard();
  fireEvent.press(screen.getByText("Weekly"));
  expect(screen.getByText("Showing weekly scores — trend context, not entry timing")).toBeTruthy();
  await waitFor(() =>
    expect(requestsTo(fetchMock, "/analysis").some((u) => u.searchParams.get("interval") === "Weekly")).toBe(true)
  );
});

it("pull-to-refresh asks for fresh prices", async () => {
  const fetchMock = await renderDashboard();
  fireEvent(screen.getByTestId("dashboard-refresh"), "refresh");
  await waitFor(() =>
    expect(requestsTo(fetchMock, "/dashboard").some((u) => u.searchParams.has("fresh"))).toBe(true)
  );
});

it("upgrades visible cards to live scores", async () => {
  await renderDashboard({
    "/analysis": (url: URL) =>
      (url.searchParams.get("symbols") ?? "").includes("COMI")
        ? batch({ COMI: { score: 81, signal: "Very Strong", price: 84 } })
        : batch({}),
  });
  expect(await within(screen.getByTestId("stockcard-COMI")).findByText("81")).toBeTruthy();
});

it("loads more cards from the footer", async () => {
  const many = Array.from({ length: 30 }, (_, i) => ({
    symbol: `S${String(i).padStart(2, "0")}`,
    name: `Stock ${i}`,
    sector: "Banking",
    index: "EGX30",
  }));
  mockMarketApi({
    "/tickers": many,
    "/dashboard": makeDashboard(many.map((t) => makeDashboardRow(t.symbol))),
  });
  await renderWithProviders(<DashboardScreen />);
  fireEvent.press(await screen.findByText("Load more (6 remaining)"));
  await waitFor(() => expect(screen.queryByText(/Load more/)).toBeNull());
});

it("opens Compare and the dividend calendar from the header", async () => {
  await renderDashboard();
  fireEvent.press(screen.getByLabelText("Compare stocks"));
  expect(router.push).toHaveBeenCalledWith(routes.compare);
  fireEvent.press(screen.getByLabelText("Dividend calendar"));
  expect(router.push).toHaveBeenCalledWith(routes.dividends);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest src/features/market/__tests__/DashboardScreen.test.tsx`
Expected: FAIL — `Cannot find module '../DashboardScreen'`.

- [ ] **Step 3: Implement the filters, controls, screen and route**

`src/features/market/IndexFilter.tsx`:

```tsx
import { Pill, PillRow } from "@/ui";
import { INDICES } from "./logic/dashboardFilters";

export function IndexFilter({ selected, onChange }: { selected: string; onChange: (index: string) => void }) {
  return (
    <PillRow>
      {INDICES.map((idx) => (
        <Pill key={idx} label={idx} active={selected === idx} onPress={() => onChange(idx)} />
      ))}
    </PillRow>
  );
}
```

`src/features/market/SectorFilter.tsx`:

```tsx
import { Pill, PillRow } from "@/ui";
import { SECTORS } from "./logic/dashboardFilters";

/** The web `<select>` becomes a scrolling pill row — one tap, no picker sheet. */
export function SectorFilter({ selected, onChange }: { selected: string; onChange: (sector: string) => void }) {
  return (
    <PillRow>
      {SECTORS.map((s) => (
        <Pill key={s} label={s} active={selected === s} onPress={() => onChange(s)} />
      ))}
    </PillRow>
  );
}
```

`src/features/market/DashboardControls.tsx`:

```tsx
import { View } from "react-native";
import { AppText, LearnTerm, Pill, PillRow } from "@/ui";
import { IndexFilter } from "./IndexFilter";
import {
  COMPOSITE_INTERVALS,
  SORT_EXPLANATIONS,
  SORTS,
  type CompositeInterval,
  type SortKey,
} from "./logic/dashboardFilters";
import { SectorFilter } from "./SectorFilter";

const DIVIDEND_EXPLANATION =
  "Shows only stocks that currently pay a cash dividend (a yield above zero, from the fundamentals feed). A dividend is evidence a company generates real cash — but with the policy rate near 19%, no EGX yield competes as income on its own. Pair it with the 'Recently paid' sort to see who paid most recently.";

const SCORE_EXPLANATION =
  "Turns on the 0-100 composite score on each card. The number tells you more than a Buy/Hold word does: 61 and 79 are very different setups. Scores are computed on DAILY bars, the timeframe every entry zone, stop-loss and portfolio alert is built on, and they match the gauge on the stock page exactly. You can switch to Weekly or Monthly for trend context; that resets to Daily next time you open the app.";

export interface DashboardControlsProps {
  index: string;
  onIndex: (v: string) => void;
  sector: string;
  onSector: (v: string) => void;
  quotedCount: number;
  unquotedCount: number;
  sort: SortKey;
  onSort: (v: SortKey) => void;
  dividendOnly: boolean;
  onToggleDividend: () => void;
  showComposite: boolean;
  onToggleComposite: () => void;
  interval: CompositeInterval;
  onInterval: (v: CompositeInterval) => void;
}

export function DashboardControls(p: DashboardControlsProps) {
  const sortNote = SORT_EXPLANATIONS[p.sort];
  return (
    <View className="gap-3">
      <IndexFilter selected={p.index} onChange={p.onIndex} />
      <SectorFilter selected={p.sector} onChange={p.onSector} />
      {/* Truthful about what the feed covers rather than quietly shrinking. */}
      <AppText className="text-xs text-white/30">
        {`${p.quotedCount} stocks`}
        {p.unquotedCount > 0 ? (
          <AppText className="text-xs text-white/20">{` · ${p.unquotedCount} without a price feed`}</AppText>
        ) : null}
      </AppText>

      <View className="gap-1">
        <PillRow>
          {SORTS.map((s) => (
            <Pill key={s} label={s} active={p.sort === s} onPress={() => p.onSort(s)} />
          ))}
        </PillRow>
        {sortNote && <AppText className="text-[11px] leading-relaxed text-white/40">{sortNote}</AppText>}
      </View>

      <View className="flex-row flex-wrap items-center gap-2">
        <Pill label="Pays a dividend" active={p.dividendOnly} onPress={p.onToggleDividend} />
        <LearnTerm term="Pays a dividend" explanation={DIVIDEND_EXPLANATION}>
          What is this?
        </LearnTerm>
      </View>

      <View className="gap-1">
        <PillRow>
          <Pill label={`Score: ${p.showComposite ? "On" : "Off"}`} active={p.showComposite} onPress={p.onToggleComposite} />
          {p.showComposite &&
            COMPOSITE_INTERVALS.map((iv) => (
              <Pill key={iv} label={iv} active={p.interval === iv} onPress={() => p.onInterval(iv)} />
            ))}
        </PillRow>
        <LearnTerm term="Score" explanation={SCORE_EXPLANATION}>
          About the score
        </LearnTerm>
        {/* Say plainly when the grid is NOT on the primary view. */}
        {p.showComposite && p.interval !== "Daily" && (
          <AppText className="text-[11px] text-[#ffaa00]">
            {`Showing ${p.interval.toLowerCase()} scores — trend context, not entry timing`}
          </AppText>
        )}
      </View>
    </View>
  );
}
```

`src/features/market/DashboardScreen.tsx`:

```tsx
import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, useWindowDimensions, View } from "react-native";
import { router } from "expo-router";
import { routes } from "@/lib/links";
import { useScoreWeights } from "@/providers/scoreWeights";
import { useTickers } from "@/providers/tickers";
import { useWatchlist } from "@/providers/watchlist";
import { CARDS_PER_PAGE } from "@/shared/constants";
import { COLORS } from "@/shared/theme";
import type { Ticker } from "@/shared/types";
import { AppText, Button, CardSkeleton, EmptyState, IconButton, Screen, TextField } from "@/ui";
import { DashboardControls } from "./DashboardControls";
import { useDashboardSnapshot } from "./hooks/useDashboardSnapshot";
import { useLiveUpgrade } from "./hooks/useLiveUpgrade";
import { useNow } from "./hooks/useNow";
import { upgradeQueue, watchlistPriceData } from "./logic/cards";
import {
  ALL_SECTORS,
  filterDividendPayers,
  filterTickers,
  pageSlice,
  sortTickers,
  splitByFeed,
  type CompositeInterval,
  type SortKey,
} from "./logic/dashboardFilters";
import { agoLabel, isEgxOpen, isTodaysSession, sessionLabel } from "./logic/marketClock";
import { MarketRegimeCard } from "./MarketRegimeCard";
import { StockCard } from "./StockCard";
import { WatchlistPanel } from "./WatchlistPanel";

/**
 * Port of the web dashboard (`egx-api-fe/src/app/page.tsx`).
 * - Pull-to-refresh replaces the Refresh button and sends `fresh`.
 * - "Load More" becomes FlatList `onEndReached` + a footer button.
 * - The sidebar (market condition, watchlist) sits above the grid.
 * - The search field is pinned above the list (the web's sticky bar).
 */
export function DashboardScreen() {
  const { tickers, loading } = useTickers();
  const { version: weightsVersion } = useScoreWeights();
  const { symbols: watchlistSymbols } = useWatchlist();
  const now = useNow();
  const { width } = useWindowDimensions();
  const columns = width >= 400 ? 2 : 1; // the web's min-[400px]:grid-cols-2

  const [index, setIndex] = useState("EGX30");
  const [sector, setSector] = useState<string>(ALL_SECTORS);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("Default");
  const [dividendOnly, setDividendOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [showComposite, setShowComposite] = useState(true);
  const [compositeInterval, setCompositeInterval] = useState<CompositeInterval>("Daily");
  const [showNoFeed, setShowNoFeed] = useState(false);

  // Any filter change returns to page 1 (the web did this in an effect).
  function resetting<T>(set: (v: T) => void) {
    return (v: T) => {
      set(v);
      setPage(1);
    };
  }

  const snap = useDashboardSnapshot(weightsVersion);
  const filtered = useMemo(
    () => filterTickers(tickers, { index, sector, search }),
    [tickers, index, sector, search]
  );
  const { quoted, unquoted } = useMemo(() => splitByFeed(filtered, snap.noFeed), [filtered, snap.noFeed]);
  const payers = useMemo(
    () => filterDividendPayers(quoted, snap.cards, dividendOnly),
    [quoted, snap.cards, dividendOnly]
  );
  const sorted = useMemo(() => sortTickers(payers, snap.cards, sort), [payers, snap.cards, sort]);
  const { visible, hasMore, remaining } = pageSlice(sorted, page, CARDS_PER_PAGE);

  const { upgrade } = useLiveUpgrade({
    symbols: upgradeQueue(visible, watchlistSymbols, tickers),
    enabled: showComposite,
    snapshotLoaded: snap.snapshotLoaded,
    noFeed: snap.noFeed,
    interval: compositeInterval,
    weightsVersion,
    refreshKey: snap.refreshKey,
    setCards: snap.setCards,
  });

  const priceData = useMemo(() => watchlistPriceData(snap.cards), [snap.cards]);
  // One clock reading for the whole grid, so every card flips together.
  const marketClosed = !isEgxOpen(now);
  const today = new Date(now);
  const extra = useMemo(
    () => ({ cards: snap.cards, now, showComposite, compositeInterval }),
    [snap.cards, now, showComposite, compositeInterval]
  );
  const loadMore = () => {
    if (hasMore) setPage((p) => p + 1);
  };

  const renderCard = (t: Ticker) => {
    const c = snap.cards[t.symbol.toUpperCase()];
    return (
      <StockCard
        symbol={t.symbol}
        name={t.name}
        sector={t.sector}
        price={c?.price}
        change={c?.change}
        changePct={c?.changePct}
        sparklineData={c?.sparkline}
        compositeScore={showComposite ? (c?.score ?? null) : null}
        compositeSignal={showComposite ? (c?.signal ?? null) : null}
        // Independent of the score toggle: a different axis (movement).
        riskBand={c?.riskBand}
        riskBandLabel={c?.riskBandLabel}
        interval={showComposite ? compositeInterval : undefined}
        changeInterval={showComposite ? compositeInterval : "Daily"}
        state={c?.state ?? "loading"}
        asOf={sessionLabel(c?.barDate)}
        isToday={isTodaysSession(c?.barDate, today)}
        fetchedAgo={agoLabel(c?.fetchedAt, now)}
        marketClosed={marketClosed}
        onRetry={() => upgrade([t.symbol])}
      />
    );
  };

  const header = (
    <View className="gap-4 px-1.5 pb-3">
      <MarketRegimeCard />
      <WatchlistPanel tickers={tickers} priceData={priceData} />
      <DashboardControls
        index={index}
        onIndex={resetting(setIndex)}
        sector={sector}
        onSector={resetting(setSector)}
        quotedCount={quoted.length}
        unquotedCount={unquoted.length}
        sort={sort}
        onSort={resetting(setSort)}
        dividendOnly={dividendOnly}
        onToggleDividend={() => resetting(setDividendOnly)(!dividendOnly)}
        showComposite={showComposite}
        onToggleComposite={() => setShowComposite((v) => !v)}
        interval={compositeInterval}
        onInterval={setCompositeInterval}
      />
    </View>
  );

  const footer = (
    <View className="gap-4 px-1.5 pt-3">
      {hasMore && (
        <Button label={`Load more (${remaining} remaining)`} variant="secondary" onPress={loadMore} />
      )}
      {/* Listed, not quoted: collapsed rather than removed, so a reader
          searching for one finds it and is told why it has no price. */}
      {!loading && unquoted.length > 0 && (
        <View className="border-t border-white/5 pt-4">
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showNoFeed }}
            onPress={() => setShowNoFeed((v) => !v)}
            className="min-h-[44px] flex-row items-center justify-between gap-2"
          >
            <AppText className="flex-1 text-sm text-white/40">
              {`No feed data (${unquoted.length})`}
              <AppText className="text-xs text-white/25">{"  listed, but not quoted by the data source"}</AppText>
            </AppText>
            <AppText className="text-xs text-white/40">{showNoFeed ? "Hide" : "Show"}</AppText>
          </Pressable>
          {showNoFeed && (
            <View className="mt-3 gap-3">
              {unquoted.map((t) => (
                <View key={t.symbol}>{renderCard(t)}</View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );

  return (
    <Screen scroll={false} edges={["top"]}>
      <View className="gap-3 border-b border-white/5 bg-charcoal-dark px-4 pb-3 pt-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <AppText className="font-sans-bold text-2xl text-white">EGX Market Overview</AppText>
            <AppText className="mt-1 text-sm text-white/40">
              Tap any card for detailed analysis. Pull down to refresh prices.
            </AppText>
          </View>
          <View className="flex-row gap-2">
            <IconButton icon="swap-horizontal" accessibilityLabel="Compare stocks" onPress={() => router.push(routes.compare)} />
            <IconButton icon="calendar-outline" accessibilityLabel="Dividend calendar" onPress={() => router.push(routes.dividends)} />
          </View>
        </View>
        <TextField
          label="Search"
          testID="dashboard-search"
          placeholder="Filter by name or symbol..."
          value={search}
          onChangeText={resetting(setSearch)}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <FlatList
        key={`cols-${columns}`}
        testID="dashboard-list"
        data={loading ? [] : visible}
        numColumns={columns}
        keyExtractor={(t) => t.symbol}
        extraData={extra}
        renderItem={({ item }) => (
          <View style={{ width: columns === 2 ? "50%" : "100%" }} className="p-1.5">
            {renderCard(item)}
          </View>
        )}
        contentContainerClassName="px-2.5 pb-8 pt-3"
        ListHeaderComponent={header}
        ListEmptyComponent={
          loading ? (
            <View className="gap-3 px-1.5">
              {Array.from({ length: 6 }, (_, i) => (
                <CardSkeleton key={i} />
              ))}
            </View>
          ) : (
            <View className="px-1.5">
              <EmptyState title="No stocks found matching your filters." />
            </View>
          )
        }
        ListFooterComponent={footer}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            testID="dashboard-refresh"
            refreshing={snap.refreshing}
            onRefresh={snap.refresh}
            tintColor={COLORS.accent}
            colors={[COLORS.accent]}
          />
        }
      />
    </Screen>
  );
}
```

`src/app/(tabs)/index.tsx` (replace the Plan 1 shell entirely):

```tsx
import { DashboardScreen } from "@/features/market/DashboardScreen";

export default function DashboardRoute() {
  return <DashboardScreen />;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx jest src/features/market/__tests__/DashboardScreen.test.tsx`
Expected: PASS — 11 tests.

- [ ] **Step 5: Verify and commit**

Run: `npm run verify`
Expected: exits 0.

```bash
git add src/features/market src/app/\(tabs\)/index.tsx
git commit -m "feat(market): dashboard screen with filters, sorts, paging and pull-to-refresh

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XDkAB7UCK8WyT267W5ZxNV"
```

---
### Task 6: Stock-detail pure logic — chart data, overlays, levels, tones, weights, cone

**Files:**
- Create: `src/features/market/logic/stockDetail.ts`
- Create: `src/features/market/logic/levels.ts`
- Create: `src/features/market/logic/statTones.ts`
- Create: `src/features/market/logic/freshness.ts`
- Create: `src/features/market/logic/weights.ts`
- Create: `src/features/market/logic/cone.ts`
- Modify: `src/features/market/testing/fixtures.ts` (append analysis fixtures)
- Test: `src/features/market/logic/__tests__/stockDetail.test.ts`
- Test: `src/features/market/logic/__tests__/levels.test.ts`
- Test: `src/features/market/logic/__tests__/statTones.test.ts`
- Test: `src/features/market/logic/__tests__/freshness.test.ts`
- Test: `src/features/market/logic/__tests__/weights.test.ts`
- Test: `src/features/market/logic/__tests__/cone.test.ts`

**Interfaces:**
- Consumes: `@/shared/types` (`AnalysisResponse`, `NearestLevel`, `ZoneConfidence`, `ScoreWeights`, `StockOutcomeBand`, …), `@/shared/constants` (`peColor`, `DY_SUSPICIOUS_MIN`, `DEFAULT_WEIGHTS`).
- Produces:
  - `stockDetail.ts`: `INTERVALS`, `ChartInterval`, `BAR_COUNTS`, `BarCount`, `DEFAULT_BARS`, `parseInterval(q?: string|string[]): ChartInterval`, `OVERLAYS` (`{key,label,color}[]`), `OverlayKey`, `OverlayState`, `DEFAULT_OVERLAYS`, `overlayExplanation(key, label): string`, `PricePoint`, `VolumePoint`, `IndicatorPoint`, `buildPriceChartData(d)`, `buildVolumeChartData(d)`, `buildIndicatorData(d)`, `latestNonNull(values?)`, `atrPercent(atr, price?)`, `Callout`, `CalloutTone`, `compositeCallouts(d)`.
  - `levels.ts`: `formatLevelAge(barsAgo: number): string`, `levelReading(kind, level, currentPrice): LevelReading`, `zoneTone(kind, confidence): ZoneTone`.
  - `statTones.ts`: `rsiClass`, `betaClass`, `signedClass`, `peClass`, `dividendYieldClass` (each `(n: number) => string` className).
  - `freshness.ts`: `PE_STALE_AFTER_HOURS`, `peStaleDays(iso, nowMs): number|null`, `riskAgoLabel(iso, nowMs): string|null`.
  - `weights.ts`: `WEIGHT_MIN`, `WEIGHT_MAX`, `WEIGHT_STEP`, `stepWeight(raw, direction: 1|-1): number`, `rawTotal(w: ScoreWeights): number`.
  - `cone.ts`: `ConeGeometry`, `coneGeometry(band, width, height, pad?): ConeGeometry|null`.
  - fixtures: `makeAnalysis(o?)`, `KEY_LEVELS`, `ENTRY_EXIT`, `FORECAST`.

- [ ] **Step 1: Append the analysis fixtures**

Add to the import block of `src/features/market/testing/fixtures.ts`:

```ts
import type {
  AnalysisResponse,
  CategoryScore,
  DivergenceInfo,
  EntryExit,
  ForecastCalibration,
  KeyLevels,
  StockForecast,
} from "@/shared/types";
```

Append to the file:

```ts
const cat = (score: number | null, reasons: string[] = []): CategoryScore => ({
  score,
  weight: 12.5,
  effective_weight: score === null ? 0 : 14.3,
  weighted_contribution: 0,
  reasons,
});

const noDivergence = (): DivergenceInfo => ({
  bullish: false, bearish: false, hidden_bullish: false, hidden_bearish: false, detail: null,
});

export const KEY_LEVELS: KeyLevels = {
  current_price: 82.5,
  nearest_support: { price: 80, distance_pct: -3.03, strength: 3, bars_ago: 4 },
  nearest_resistance: { price: 85, distance_pct: 3.03, strength: 1, bars_ago: 63 },
  room_to_support_pct: 3.03,
  room_to_resistance_pct: 3.03,
  clear_air_above: false,
};

export const ENTRY_EXIT: EntryExit = {
  entry_zone: {
    active: true,
    confidence: "high",
    price_range: { low: 80, high: 81.5 },
    suggested_stop_loss: 77.3,
    reasons: ["Tested support at 80.00 (3 touches)", "RSI 48 — not overbought"],
  },
  exit_zone: { active: false, confidence: null, price_range: null, reasons: [] },
};

const CAL: ForecastCalibration = {
  fitted_at: "2026-09-01", n_observations: 48210, universe: "EGX", sigma_window: 63, fit_horizon_days: 21,
};

export const FORECAST: StockForecast = {
  expected_move: {
    daily_pct: 1.8, weekly_pct: 4.1, monthly_pct: 8.3,
    daily_coverage_pct: 79, weekly_coverage_pct: 76.2, monthly_coverage_pct: 72.9,
    method: "egx_sigma", calibration: CAL,
  },
  outcome_band: {
    days: 2,
    current_price: 100,
    method: "egx_quantiles",
    calibration: CAL,
    bands: [
      { coverage_pct: 50, z: 0.67, lo: [95, 90], hi: [105, 110], outside_pct: 50 },
      { coverage_pct: 90, z: 1.64, lo: [90, 80], hi: [110, 120], outside_pct: 10 },
    ],
    endpoint: { coverage_pct: 90, lo: 80, hi: 120 },
  },
};

export function makeAnalysis(o: Partial<AnalysisResponse> = {}): AnalysisResponse {
  const nulls = [null, null, null];
  return {
    symbol: "COMI",
    interval: "Daily",
    bars: 200,
    ohlcv: {
      dates: ["2026-09-01", "2026-09-02", "2026-09-03"],
      open: [80, 81, 82],
      high: [81, 82, 83.5],
      low: [79, 80, 81],
      close: [81, 81.3, 82.5],
      volume: [1_000_000, 1_200_000, 1_500_000],
    },
    indicators: {
      sma_20: [null, 81, 82], sma_50: nulls, sma_200: nulls, ema_12: [80, 81, 82], ema_26: nulls,
      rsi: [null, 55, 62.4], macd_line: [0.1, 0.2, 0.3], macd_signal: [0.1, 0.1, 0.2],
      macd_histogram: [0, 0.1, 0.1], bollinger_upper: [85, 86, 87], bollinger_middle: [80, 81, 82],
      bollinger_lower: [75, 76, 77], daily_returns: [null, 0.01, 0.02], volatility: [null, 0.018, 0.021],
      cumulative_returns: [0, 0.01, 0.031], atr: [null, 1.8, 2.06], obv: [100, 200, 300],
      stochastic_k: [50, 60, 70], stochastic_d: [50, 55, 60], adx: nulls, plus_di: nulls,
      minus_di: nulls, mfi: nulls,
    },
    stats: {
      current_price: 82.5, previous_close: 81.3, change: 1.2, change_pct: 1.48,
      high_52w: 90, low_52w: 60, avg_volume: 1_250_000,
    },
    beta: 1.12,
    support_resistance: {
      supports: [{ price: 80, strength: 3 }, { price: 78, strength: 2 }, { price: 75, strength: 1 }, { price: 70, strength: 1 }],
      resistances: [{ price: 85, strength: 2 }],
    },
    fibonacci: { high: 90, low: 60, levels: { "0.382": 78.5, "0.5": 75, "0.618": 71.5 } },
    crossovers: { golden_cross: "2026-08-20", death_cross: null, current_signal: "golden_cross", days_since_cross: 12 },
    composite_score: {
      score: 72,
      signal: "Strong",
      categories: {
        trend: cat(80, ["Price above SMA 50", "ADX 28 — trending"]),
        momentum: cat(65),
        volume: cat(55),
        volatility: cat(60),
        divergence: cat(null),
        quality: cat(70),
        risk_adjusted: cat(50),
        relative_strength: cat(75),
      },
      weights: {},
      macro_adjustment: null,
      macro_context: null,
    },
    divergences: { rsi: noDivergence(), macd: noDivergence() },
    volume_price: { classification: "normal", price_change_pct: 1.48, volume_ratio: 1.1 },
    multi_timeframe: { daily_trend: "up", weekly_trend: "up", aligned: true, alignment_score: 1 },
    bb_squeeze: false,
    key_levels: KEY_LEVELS,
    entry_exit: ENTRY_EXIT,
    trendlines: {
      support: { values: [null, 80.5, 81], anchors: [], direction: "up", slope_pct_per_bar: 0.3 },
      resistance: null,
    },
    pe: {
      company_name: "Commercial International Bank", pe_ratio: 9.14, dividend_yield: 3.2,
      loss_making: false, fetched_at: "2026-09-01T03:00:00Z",
    },
    forecast: FORECAST,
    ...o,
  };
}
```

- [ ] **Step 2: Write the failing tests**

`src/features/market/logic/__tests__/stockDetail.test.ts`:

```ts
import { makeAnalysis } from "@/features/market/testing/fixtures";
import {
  atrPercent,
  buildIndicatorData,
  buildPriceChartData,
  buildVolumeChartData,
  compositeCallouts,
  DEFAULT_OVERLAYS,
  latestNonNull,
  overlayExplanation,
  parseInterval,
} from "../stockDetail";

describe("parseInterval", () => {
  it("accepts the three intervals and falls back to Daily", () => {
    expect(parseInterval("Weekly")).toBe("Weekly");
    expect(parseInterval(["Monthly", "x"])).toBe("Monthly");
    expect(parseInterval("Hourly")).toBe("Daily");
    expect(parseInterval(undefined)).toBe("Daily");
  });
});

describe("overlays", () => {
  it("starts with SMA 20 and Trendlines on", () => {
    expect(DEFAULT_OVERLAYS).toEqual({
      sma20: true, sma50: false, sma200: false, ema12: false, ema26: false, bollinger: false, trendlines: true,
    });
  });
  it("explains each overlay", () => {
    expect(overlayExplanation("sma50", "SMA 50")).toContain("(50-day)");
    expect(overlayExplanation("ema12", "EMA 12")).toContain("Exponential Moving Average (12-day)");
    expect(overlayExplanation("sma200", "SMA 200")).toContain("Golden Cross");
    expect(overlayExplanation("trendlines", "Trendlines")).toContain("three pivot lows");
    expect(overlayExplanation("bollinger", "Bollinger")).toContain("volatility");
  });
});

describe("chart data builders", () => {
  const d = makeAnalysis();
  it("aligns prices, overlays and trendlines by bar", () => {
    const p = buildPriceChartData(d);
    expect(p).toHaveLength(3);
    expect(p[0]).toMatchObject({ date: "2026-09-01", close: 81, sma_20: null, trend_support: null, trend_resistance: null });
    expect(p[2]).toMatchObject({ close: 82.5, sma_20: 82, ema_12: 82, bollinger_upper: 87, trend_support: 81 });
  });
  it("gives each volume bar its previous close", () => {
    const v = buildVolumeChartData(d);
    expect(v[0].prevClose).toBeUndefined();
    expect(v[2]).toMatchObject({ volume: 1_500_000, close: 82.5, prevClose: 81.3 });
  });
  it("collects the oscillators", () => {
    expect(buildIndicatorData(d)[2]).toMatchObject({ rsi: 62.4, macd_line: 0.3, stochastic_k: 70, obv: 300 });
  });
});

describe("latestNonNull and atrPercent", () => {
  it("reads the newest real value", () => {
    expect(latestNonNull([1, 2, null])).toBe(2);
    expect(latestNonNull([null, null])).toBeNull();
    expect(latestNonNull(undefined)).toBeNull();
  });
  it("expresses ATR as a percent of price to one decimal", () => {
    expect(atrPercent(2.06, 82.5)).toBe(2.5);
    expect(atrPercent(null, 82.5)).toBeNull();
    expect(atrPercent(2, undefined)).toBeNull();
  });
});

describe("compositeCallouts", () => {
  it("names alignment, divergences and squeezes, in direction colours", () => {
    const d = makeAnalysis({
      divergences: {
        rsi: { bullish: true, bearish: false, hidden_bullish: false, hidden_bearish: false, detail: null },
        macd: { bullish: false, bearish: true, hidden_bullish: false, hidden_bearish: false, detail: null },
      },
      bb_squeeze: true,
    });
    expect(compositeCallouts(d)).toEqual([
      { key: "rsi-bull", label: "🔄 RSI bullish divergence", tone: "gain" },
      { key: "macd-bear", label: "🔄 MACD bearish divergence", tone: "loss" },
      { key: "aligned", label: "✅ Daily + Weekly aligned (up)", tone: "accent" },
      { key: "squeeze", label: "🔔 Bollinger squeeze — breakout likely", tone: "accent" },
    ]);
  });
  it("flags mixed timeframes but not a sideways one", () => {
    const mixed = makeAnalysis({ multi_timeframe: { daily_trend: "up", weekly_trend: "down", aligned: false, alignment_score: 0 } });
    expect(compositeCallouts(mixed)).toEqual([
      { key: "mixed", label: "⚠️ Daily up vs Weekly down — mixed signals", tone: "neutral" },
    ]);
    const sideways = makeAnalysis({ multi_timeframe: { daily_trend: "sideways", weekly_trend: "down", aligned: false, alignment_score: 0 } });
    expect(compositeCallouts(sideways)).toEqual([]);
  });
});
```

`src/features/market/logic/__tests__/levels.test.ts`:

```ts
import { formatLevelAge, levelReading, zoneTone } from "../levels";

describe("formatLevelAge", () => {
  it("says how old a level is in plain words", () => {
    expect(formatLevelAge(1)).toBe("touched today");
    expect(formatLevelAge(4)).toBe("4 days ago");
    expect(formatLevelAge(15)).toBe("~3 weeks ago");
    expect(formatLevelAge(63)).toBe("~3 months ago");
    expect(formatLevelAge(300)).toBe("over a year ago");
  });
});

describe("levelReading", () => {
  it("describes an intact support below price", () => {
    expect(levelReading("support", { price: 80, distance_pct: -3.03, strength: 3, bars_ago: 4 }, 82.5)).toEqual({
      label: "Nearest Support",
      priceText: "80.00 EGP",
      brokenThrough: false,
      directionText: "3.0% below current",
      strengthText: "Tested 3x · 4 days ago",
    });
  });
  it("calls a one-touch level weak and a crossed level broken", () => {
    const r = levelReading("resistance", { price: 80, distance_pct: -3.03, strength: 1, bars_ago: null }, 82.5);
    expect(r.brokenThrough).toBe(true);
    expect(r.directionText).toBe("3.0% below current — broken");
    expect(r.strengthText).toBe("Touched once — weak level");
    const s = levelReading("support", { price: 85, distance_pct: 3.03, strength: 2 }, 82.5);
    expect(s.directionText).toBe("3.0% above current — broken");
  });
});

describe("zoneTone", () => {
  it("colours a strong entry gain and a strong exit loss — never green on a sell cue", () => {
    expect(zoneTone("entry", "high")).toMatchObject({ strong: true, textClass: "text-gain" });
    expect(zoneTone("exit", "high")).toMatchObject({ strong: true, textClass: "text-loss" });
    expect(zoneTone("exit", "high").badge).toEqual({ label: "High confidence", boxClass: "bg-loss/20 border-loss/30", textClass: "text-loss" });
    expect(zoneTone("exit", "medium").badge?.textClass).toBe("text-[#ffaa00]");
  });
  it("keeps a low-confidence zone neutral", () => {
    expect(zoneTone("entry", "low")).toMatchObject({ strong: false, textClass: "text-white/70", boxClass: "border-white/10 bg-white/[0.02]" });
    expect(zoneTone("exit", null).badge).toBeNull();
  });
});
```

`src/features/market/logic/__tests__/statTones.test.ts`:

```ts
import { betaClass, dividendYieldClass, peClass, rsiClass, signedClass } from "../statTones";

it("colours RSI only at the extremes", () => {
  expect(rsiClass(75)).toBe("text-loss");
  expect(rsiClass(25)).toBe("text-gain");
  expect(rsiClass(50)).toBe("text-white");
});

it("colours beta by magnitude, so a big negative beta is not 'calm'", () => {
  expect(betaClass(-2.1)).toBe("text-loss");
  expect(betaClass(1.31)).toBe("text-loss");
  expect(betaClass(-0.5)).toBe("text-accent");
  expect(betaClass(0.5)).toBe("text-gain");
  expect(betaClass(1)).toBe("text-white");
});

it("uses the shared P/E bands and flags a suspicious yield", () => {
  expect(peClass(2)).toBe("text-white/60");
  expect(peClass(5)).toBe("text-gain");
  expect(peClass(10)).toBe("text-white");
  expect(peClass(30)).toBe("text-loss");
  expect(dividendYieldClass(15)).toBe("text-loss");
  expect(dividendYieldClass(3)).toBe("text-white");
});

it("colours a signed figure by its sign", () => {
  expect(signedClass(0)).toBe("text-gain");
  expect(signedClass(-0.01)).toBe("text-loss");
});
```

`src/features/market/logic/__tests__/freshness.test.ts`:

```ts
import { peStaleDays, riskAgoLabel } from "../freshness";

const now = Date.parse("2026-10-10T12:00:00Z");
const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();

describe("peStaleDays", () => {
  it("is null while the feed is under 48 hours old", () => {
    expect(peStaleDays(hoursAgo(47), now)).toBeNull();
    expect(peStaleDays(null, now)).toBeNull();
    expect(peStaleDays("garbage", now)).toBeNull();
  });
  it("counts whole days once stale", () => {
    expect(peStaleDays(hoursAgo(48), now)).toBe(2);
    expect(peStaleDays(hoursAgo(84), now)).toBe(3);
  });
});

describe("riskAgoLabel", () => {
  it("says when the grade was measured", () => {
    expect(riskAgoLabel(hoursAgo(0.5), now)).toBe("just now");
    expect(riskAgoLabel(hoursAgo(5), now)).toBe("5h ago");
    expect(riskAgoLabel(hoursAgo(26), now)).toBe("yesterday");
    expect(riskAgoLabel(hoursAgo(72), now)).toBe("3 days ago");
    expect(riskAgoLabel(undefined, now)).toBeNull();
  });
});
```

`src/features/market/logic/__tests__/weights.test.ts`:

```ts
import { DEFAULT_WEIGHTS } from "@/shared/constants";
import { rawTotal, stepWeight } from "../weights";

describe("stepWeight (the slider's 0–50, step 5)", () => {
  it("snaps to the next multiple of 5 in the pressed direction", () => {
    expect(stepWeight(18, 1)).toBe(20);
    expect(stepWeight(18, -1)).toBe(15);
    expect(stepWeight(20, 1)).toBe(25);
    expect(stepWeight(20, -1)).toBe(15);
  });
  it("clamps to 0–50", () => {
    expect(stepWeight(50, 1)).toBe(50);
    expect(stepWeight(0, -1)).toBe(0);
    expect(stepWeight(2, -1)).toBe(0);
  });
});

it("totals the raw weights", () => {
  expect(rawTotal(DEFAULT_WEIGHTS)).toBe(100);
});
```

`src/features/market/logic/__tests__/cone.test.ts`:

```ts
import { FORECAST } from "@/features/market/testing/fixtures";
import { coneGeometry } from "../cone";

const band = FORECAST.outcome_band!;

it("draws each band as a closed path from today's price", () => {
  const g = coneGeometry(band, 104, 48, 4);
  expect(g).toEqual({
    outer: "M4.0,24.0 L52.0,14.0 L100.0,4.0 L100.0,44.0 L52.0,34.0 L4.0,24.0 Z",
    inner: "M4.0,24.0 L52.0,19.0 L100.0,14.0 L100.0,34.0 L52.0,29.0 L4.0,24.0 Z",
    refY: 24,
    min: 80,
    max: 120,
  });
});

it("draws nothing before it has a width or without bands", () => {
  expect(coneGeometry(band, 0, 48)).toBeNull();
  expect(coneGeometry({ ...band, bands: [] }, 104, 48)).toBeNull();
});
```

- [ ] **Step 3: Run them to verify they fail**

Run: `npx jest src/features/market/logic`
Expected: FAIL — `Cannot find module '../stockDetail'` (and `../levels`, `../statTones`, `../freshness`, `../weights`, `../cone`); the Task 1 suites still pass.

- [ ] **Step 4: Implement the logic modules**

`src/features/market/logic/stockDetail.ts`:

```ts
import type { AnalysisResponse } from "@/shared/types";

export const INTERVALS = ["Daily", "Weekly", "Monthly"] as const;
export type ChartInterval = (typeof INTERVALS)[number];

export const BAR_COUNTS = [60, 100, 200, 500] as const;
export type BarCount = (typeof BAR_COUNTS)[number];
export const DEFAULT_BARS: BarCount = 200;

/** `?interval=` from a dashboard card. Daily is the fallback and the normal case. */
export function parseInterval(q: string | string[] | undefined): ChartInterval {
  const v = Array.isArray(q) ? q[0] : q;
  return (INTERVALS as readonly string[]).includes(v ?? "") ? (v as ChartInterval) : "Daily";
}

/**
 * Chart-only overlays (copied from the web stock page). They draw a line and
 * change nothing else. Trendlines is neutral on purpose: its lines are
 * support-green and resistance-red, so the pill must not claim a side.
 */
export const OVERLAYS = [
  { key: "sma20", label: "SMA 20", color: "#ffaa00" },
  { key: "sma50", label: "SMA 50", color: "#ff6600" },
  { key: "sma200", label: "SMA 200", color: "#ff0066" },
  { key: "ema12", label: "EMA 12", color: "#00ccff" },
  { key: "ema26", label: "EMA 26", color: "#cc00ff" },
  { key: "bollinger", label: "Bollinger", color: "#4488ff" },
  { key: "trendlines", label: "Trendlines", color: "#d8dce8" },
] as const;

export type OverlayKey = (typeof OVERLAYS)[number]["key"];
export type OverlayState = Record<OverlayKey, boolean>;

export const DEFAULT_OVERLAYS: OverlayState = {
  sma20: true,
  sma50: false,
  sma200: false,
  ema12: false,
  ema26: false,
  bollinger: false,
  trendlines: true,
};

export function overlayExplanation(key: OverlayKey, label: string): string {
  if (key === "trendlines") {
    return "A straight line through the last three pivot lows (green, support) and the last three pivot highs (red, resistance), extended to today — the lines a chartist draws by hand. Drawn only when the pivots line up in one direction and price has respected the line; a choppy stock gets none. A pivot needs 20 bars after it, so the newest anchor is always about a month old.";
  }
  if (key === "sma200") {
    return "200-day SMA — the most important long-term trend indicator. Used for Golden Cross / Death Cross signals.";
  }
  if (key.startsWith("sma")) {
    return `Simple Moving Average (${label.split(" ")[1]}-day). Shows the average price over the period. Price above SMA = bullish trend.`;
  }
  if (key.startsWith("ema")) {
    return `Exponential Moving Average (${label.split(" ")[1]}-day). Like SMA but reacts faster to recent price changes.`;
  }
  return "Bollinger Bands show volatility. When bands squeeze = big move coming. Price at upper band = possibly overbought.";
}

/** Structurally identical to the web `PriceChart` data point (Plan 2 keeps the props). */
export interface PricePoint {
  date: string;
  close: number;
  open: number;
  high: number;
  low: number;
  sma_20?: number | null;
  sma_50?: number | null;
  sma_200?: number | null;
  ema_12?: number | null;
  ema_26?: number | null;
  bollinger_upper?: number | null;
  bollinger_middle?: number | null;
  bollinger_lower?: number | null;
  trend_support?: number | null;
  trend_resistance?: number | null;
}

export interface VolumePoint {
  date: string;
  volume: number;
  close: number;
  open: number;
  /** Bars are coloured close-vs-previous-close. */
  prevClose?: number;
}

export interface IndicatorPoint {
  date: string;
  rsi?: number | null;
  macd_line?: number | null;
  macd_signal?: number | null;
  macd_histogram?: number | null;
  stochastic_k?: number | null;
  stochastic_d?: number | null;
  obv?: number | null;
}

export function buildPriceChartData(d: AnalysisResponse): PricePoint[] {
  return d.ohlcv.dates.map((date, i) => ({
    date,
    close: d.ohlcv.close[i],
    open: d.ohlcv.open[i],
    high: d.ohlcv.high[i],
    low: d.ohlcv.low[i],
    sma_20: d.indicators.sma_20[i],
    sma_50: d.indicators.sma_50[i],
    sma_200: d.indicators.sma_200[i],
    ema_12: d.indicators.ema_12[i],
    ema_26: d.indicators.ema_26[i],
    bollinger_upper: d.indicators.bollinger_upper[i],
    bollinger_middle: d.indicators.bollinger_middle[i],
    bollinger_lower: d.indicators.bollinger_lower[i],
    trend_support: d.trendlines?.support?.values[i] ?? null,
    trend_resistance: d.trendlines?.resistance?.values[i] ?? null,
  }));
}

export function buildVolumeChartData(d: AnalysisResponse): VolumePoint[] {
  return d.ohlcv.dates.map((date, i) => ({
    date,
    volume: d.ohlcv.volume[i],
    close: d.ohlcv.close[i],
    open: d.ohlcv.open[i],
    prevClose: i > 0 ? d.ohlcv.close[i - 1] : undefined,
  }));
}

export function buildIndicatorData(d: AnalysisResponse): IndicatorPoint[] {
  return d.ohlcv.dates.map((date, i) => ({
    date,
    rsi: d.indicators.rsi[i],
    macd_line: d.indicators.macd_line[i],
    macd_signal: d.indicators.macd_signal[i],
    macd_histogram: d.indicators.macd_histogram[i],
    stochastic_k: d.indicators.stochastic_k[i],
    stochastic_d: d.indicators.stochastic_d[i],
    obv: d.indicators.obv[i],
  }));
}

export function latestNonNull(values: (number | null)[] | undefined): number | null {
  if (!values) return null;
  for (let i = values.length - 1; i >= 0; i--) {
    const v = values[i];
    if (v != null) return v;
  }
  return null;
}

export function atrPercent(atr: number | null, price: number | undefined): number | null {
  if (!atr || !price) return null;
  return Math.round((atr / price) * 1000) / 10;
}

export type CalloutTone = "gain" | "loss" | "accent" | "neutral";
export interface Callout {
  key: string;
  label: string;
  tone: CalloutTone;
}

/** The pills under the composite card (divergences, timeframe alignment, squeeze). */
export function compositeCallouts(
  d: Pick<AnalysisResponse, "divergences" | "multi_timeframe" | "bb_squeeze">
): Callout[] {
  const out: Callout[] = [];
  if (d.divergences?.rsi?.bullish) out.push({ key: "rsi-bull", label: "🔄 RSI bullish divergence", tone: "gain" });
  if (d.divergences?.rsi?.bearish) out.push({ key: "rsi-bear", label: "🔄 RSI bearish divergence", tone: "loss" });
  if (d.divergences?.macd?.bullish) out.push({ key: "macd-bull", label: "🔄 MACD bullish divergence", tone: "gain" });
  if (d.divergences?.macd?.bearish) out.push({ key: "macd-bear", label: "🔄 MACD bearish divergence", tone: "loss" });
  const mt = d.multi_timeframe;
  if (mt?.aligned) {
    out.push({ key: "aligned", label: `✅ Daily + Weekly aligned (${mt.daily_trend})`, tone: "accent" });
  } else if (mt && mt.daily_trend !== "sideways" && mt.weekly_trend !== "sideways") {
    out.push({
      key: "mixed",
      label: `⚠️ Daily ${mt.daily_trend} vs Weekly ${mt.weekly_trend} — mixed signals`,
      tone: "neutral",
    });
  }
  if (d.bb_squeeze) out.push({ key: "squeeze", label: "🔔 Bollinger squeeze — breakout likely", tone: "accent" });
  return out;
}
```

`src/features/market/logic/levels.ts`:

```ts
import type { NearestLevel, ZoneConfidence } from "@/shared/types";

/** A level from last week and one from last spring are not equally relevant. */
export function formatLevelAge(barsAgo: number): string {
  if (barsAgo <= 1) return "touched today";
  if (barsAgo < 10) return `${barsAgo} days ago`;
  if (barsAgo < 42) return `~${Math.round(barsAgo / 5)} weeks ago`;
  const months = Math.round(barsAgo / 21);
  return months >= 12 ? "over a year ago" : `~${months} months ago`;
}

export interface LevelReading {
  label: string;
  priceText: string;
  /** Price has crossed the level (a support above price, a resistance below it). */
  brokenThrough: boolean;
  directionText: string;
  strengthText: string;
}

export function levelReading(
  kind: "support" | "resistance",
  level: NearestLevel,
  currentPrice: number
): LevelReading {
  const isSupport = kind === "support";
  const abs = Math.abs(level.distance_pct).toFixed(1);
  const brokenThrough = isSupport ? level.price > currentPrice : level.price < currentPrice;
  const side = level.price > currentPrice ? "above" : "below";
  // Strength 1 is a single pivot — one bounce. "Tested" would overstate it.
  const strength = level.strength >= 2 ? `Tested ${level.strength}x` : "Touched once — weak level";
  return {
    label: isSupport ? "Nearest Support" : "Nearest Resistance",
    priceText: `${level.price.toFixed(2)} EGP`,
    brokenThrough,
    directionText: `${abs}% ${side} current${brokenThrough ? " — broken" : ""}`,
    strengthText: level.bars_ago != null ? `${strength} · ${formatLevelAge(level.bars_ago)}` : strength,
  };
}

export interface ZoneTone {
  /** high/medium: a real cue. low: a bare hint, rendered neutral. */
  strong: boolean;
  textClass: string;
  boxClass: string;
  badge: { label: string; boxClass: string; textClass: string } | null;
}

/** Confidence badges take the tone of their ZONE: green must never label a sell cue. */
const BADGES: Record<"entry" | "exit", Record<ZoneConfidence, { label: string; boxClass: string; textClass: string }>> = {
  entry: {
    high: { label: "High confidence", boxClass: "bg-gain/20 border-gain/30", textClass: "text-gain" },
    medium: { label: "Medium confidence", boxClass: "bg-accent/20 border-accent/30", textClass: "text-accent" },
    low: { label: "Low confidence", boxClass: "bg-white/10 border-white/10", textClass: "text-white/60" },
  },
  exit: {
    high: { label: "High confidence", boxClass: "bg-loss/20 border-loss/30", textClass: "text-loss" },
    medium: { label: "Medium confidence", boxClass: "bg-[#ffaa00]/20 border-[#ffaa00]/30", textClass: "text-[#ffaa00]" },
    low: { label: "Low confidence", boxClass: "bg-white/10 border-white/10", textClass: "text-white/60" },
  },
};

export function zoneTone(kind: "entry" | "exit", confidence: ZoneConfidence | null): ZoneTone {
  const strong = confidence === "high" || confidence === "medium";
  const isEntry = kind === "entry";
  return {
    strong,
    textClass: !strong ? "text-white/70" : isEntry ? "text-gain" : "text-loss",
    boxClass: !strong
      ? "border-white/10 bg-white/[0.02]"
      : isEntry
        ? "border-gain/20 bg-gain/[0.04]"
        : "border-loss/20 bg-loss/[0.04]",
    badge: confidence ? BADGES[kind][confidence] : null,
  };
}
```

`src/features/market/logic/statTones.ts`:

```ts
import { DY_SUSPICIOUS_MIN, peColor } from "@/shared/constants";

/** RSI > 70 overbought, < 30 oversold (StatsPanel). */
export function rsiClass(rsi: number): string {
  if (rsi > 70) return "text-loss";
  if (rsi < 30) return "text-gain";
  return "text-white";
}

/** Volatility is magnitude: a beta of -2.10 is twice as volatile as the index. */
export function betaClass(beta: number): string {
  if (Math.abs(beta) > 1.3) return "text-loss";
  if (beta < 0) return "text-accent";
  if (beta < 0.8) return "text-gain";
  return "text-white";
}

export function signedClass(v: number): string {
  return v >= 0 ? "text-gain" : "text-loss";
}

/** The shared EGX-median P/E bands (`peColor`), neutral in the middle. */
export function peClass(pe: number): string {
  return peColor(pe) ?? "text-white";
}

export function dividendYieldClass(dy: number): string {
  return dy >= DY_SUSPICIOUS_MIN ? "text-loss" : "text-white";
}
```

`src/features/market/logic/freshness.ts`:

```ts
export const PE_STALE_AFTER_HOURS = 48;

/** Whole days since the P/E feed last succeeded, or null while it is fresh (PEFreshnessBanner). */
export function peStaleDays(iso: string | null | undefined, nowMs: number): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const hours = (nowMs - t) / 36e5;
  if (hours < PE_STALE_AFTER_HOURS) return null;
  return Math.floor(hours / 24);
}

/** "Measured 5h ago" on the risk grade (RiskGradeCard's own agoLabel). */
export function riskAgoLabel(iso: string | null | undefined, nowMs: number): string | null {
  if (!iso) return null;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return null;
  const hours = (nowMs - then) / 36e5;
  if (hours < 1) return "just now";
  if (hours < 24) return `${Math.round(hours)}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}
```

`src/features/market/logic/weights.ts`:

```ts
import type { ScoreWeights } from "@/shared/types";

export const WEIGHT_MIN = 0;
export const WEIGHT_MAX = 50;
export const WEIGHT_STEP = 5;

/**
 * The −/+ stepper that replaces the web range slider (0–50, step 5). Snaps to
 * the next multiple of 5 in the pressed direction, so an API value like 18
 * moves to 20 or 15, exactly as a slider would settle.
 */
export function stepWeight(raw: number, direction: 1 | -1): number {
  const steps =
    direction > 0 ? Math.floor(raw / WEIGHT_STEP) + 1 : Math.ceil(raw / WEIGHT_STEP) - 1;
  return Math.min(WEIGHT_MAX, Math.max(WEIGHT_MIN, steps * WEIGHT_STEP));
}

export function rawTotal(w: ScoreWeights): number {
  return (Object.keys(w) as (keyof ScoreWeights)[]).reduce((s, k) => s + (w[k] || 0), 0);
}
```

`src/features/market/logic/cone.ts`:

```ts
import type { StockOutcomeBand } from "@/shared/types";

export interface ConeGeometry {
  outer: string;
  inner: string;
  /** y of today's price — the dashed reference line. */
  refY: number;
  min: number;
  max: number;
}

const f = (n: number) => n.toFixed(1);

/**
 * SVG paths for the outcome cone (web ForecastCard's stacked Recharts areas).
 * Day 0 is today's price; each band is a closed polygon: its `hi` edge left to
 * right, then its `lo` edge back. There is deliberately no median line.
 */
export function coneGeometry(
  band: StockOutcomeBand,
  width: number,
  height: number,
  pad = 4
): ConeGeometry | null {
  const { bands, current_price, days } = band;
  if (!bands.length || days < 1 || width <= pad * 2 || height <= pad * 2) return null;
  const inner = bands[0];
  const outer = bands[bands.length - 1];
  const edge = (values: number[]) => [current_price, ...values.slice(0, days)];

  const all = [...edge(outer.lo), ...edge(outer.hi), ...edge(inner.lo), ...edge(inner.hi)].filter(Number.isFinite);
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / days) * (width - pad * 2);
  const y = (v: number) => pad + ((max - v) / span) * (height - pad * 2);

  const path = (upper: number[], lower: number[]) => {
    const top = upper.map((v, i) => `${i === 0 ? "M" : "L"}${f(x(i))},${f(y(v))}`);
    const bottom = lower
      .map((v, i) => [i, v] as const)
      .reverse()
      .map(([i, v]) => `L${f(x(i))},${f(y(v))}`);
    return `${top.join(" ")} ${bottom.join(" ")} Z`;
  };

  return {
    outer: path(edge(outer.hi), edge(outer.lo)),
    inner: path(edge(inner.hi), edge(inner.lo)),
    refY: y(current_price),
    min,
    max,
  };
}
```

- [ ] **Step 5: Run them to verify they pass**

Run: `npx jest src/features/market/logic`
Expected: PASS — 11 suites (4 from Task 1, `regime` from Task 3, 6 new).

- [ ] **Step 6: Verify and commit**

Run: `npm run verify`
Expected: exits 0.

```bash
git add src/features/market
git commit -m "feat(market): stock-detail pure logic (chart data, overlays, levels, tones, weights, cone)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XDkAB7UCK8WyT267W5ZxNV"
```

---

### Task 7: Stock cards I — StatsPanel, KeyLevelsCard, EntryExitCard, PEFreshnessBanner

**Files:**
- Create: `src/features/market/StatsPanel.tsx`
- Create: `src/features/market/KeyLevelsCard.tsx`
- Create: `src/features/market/EntryExitCard.tsx`
- Create: `src/features/market/PEFreshnessBanner.tsx`
- Modify: `src/features/market/testing/api.ts` (default `/pe` route)
- Test: `src/features/market/__tests__/StockCards.test.tsx`

**Interfaces:**
- Consumes: Task 6 (`levelReading`, `zoneTone`, `rsiClass`, `betaClass`, `signedClass`, `peClass`, `dividendYieldClass`, `peStaleDays`, fixtures), Task 1 (`changeText`, `formatVolume`, `formatPE`), Task 2 (`useKeyedFetch`, `useNow`), `@/shared/api` (`fetchPEFeedStatus`), `@/shared/constants` (`T_BILL_RATE_PCT`), `@/ui` (`AppText`, `LearnTerm`), `@/lib/links` (`learnHref`).
- Produces: `StatsPanel(props: StatsPanelProps)` (web props: `stats, latestRsi, latestVolatility, cumulativeReturn, beta, atr, atrPct, crossovers, pe`), `KeyLevelsCard({ keyLevels })`, `EntryExitCard({ entryExit })`, `PEFreshnessBanner()`.

- [ ] **Step 1: Add the default `/pe` route**

In `src/features/market/testing/api.ts`, add to `DEFAULTS` (after `"/analysis"`):

```ts
  "/pe": () => ({ last_successful_fetch: new Date().toISOString(), last_attempt_status: "ok" }),
```

- [ ] **Step 2: Write the failing tests**

`src/features/market/__tests__/StockCards.test.tsx`:

```tsx
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { learnHref } from "@/lib/links";
import { renderWithProviders } from "@/test-utils/render";
import { EntryExitCard } from "../EntryExitCard";
import { KeyLevelsCard } from "../KeyLevelsCard";
import { PEFreshnessBanner } from "../PEFreshnessBanner";
import { StatsPanel } from "../StatsPanel";
import { fail, mockMarketApi, requestsTo } from "../testing/api";
import { ENTRY_EXIT, KEY_LEVELS, makeAnalysis } from "../testing/fixtures";

jest.mock("expo-router", () => require("@/features/market/testing/expoRouterMock"));

const d = makeAnalysis();

beforeEach(() => jest.clearAllMocks());

describe("StatsPanel", () => {
  it("shows the key statistics with the crossover badge", async () => {
    mockMarketApi();
    await renderWithProviders(
      <StatsPanel
        stats={d.stats}
        latestRsi={62.4}
        latestVolatility={0.021}
        cumulativeReturn={0.031}
        beta={1.12}
        atr={2.06}
        atrPct={2.5}
        crossovers={d.crossovers}
        pe={d.pe}
      />
    );
    expect(screen.getByText("Golden Cross Active (12d ago)")).toBeTruthy();
    expect(screen.getByText("82.50 EGP")).toBeTruthy();
    expect(screen.getByText("+1.20 (+1.48%)")).toBeTruthy();
    expect(screen.getByText("1.3M")).toBeTruthy();
    expect(screen.getByText("62.4")).toBeTruthy();
    expect(screen.getByText("2.10%")).toBeTruthy();
    expect(screen.getByText("3.10%")).toBeTruthy();
    expect(screen.getByText("1.12")).toBeTruthy();
    expect(screen.getByText("2.06 (2.5%)")).toBeTruthy();
    expect(screen.getByText("9.1 · as of 2026-09-01")).toBeTruthy();
    expect(screen.getByText("3.20%")).toBeTruthy();
  });

  it("says loss-making instead of a P/E", async () => {
    mockMarketApi();
    await renderWithProviders(
      <StatsPanel stats={d.stats} pe={{ ...d.pe!, pe_ratio: null, loss_making: true }} />
    );
    expect(screen.getByText("Loss-making")).toBeTruthy();
    expect(screen.queryByText(/as of 2026/)).toBeNull();
  });
});

describe("KeyLevelsCard", () => {
  it("shows the nearest levels with strength and age", async () => {
    mockMarketApi();
    await renderWithProviders(<KeyLevelsCard keyLevels={KEY_LEVELS} />);
    expect(screen.getByText("85.00 EGP")).toBeTruthy();
    expect(screen.getByText("Touched once — weak level · ~3 months ago")).toBeTruthy();
    expect(screen.getByText("3.0% above current")).toBeTruthy();
    expect(screen.getByText("80.00 EGP")).toBeTruthy();
    expect(screen.getByText("Tested 3x · 4 days ago")).toBeTruthy();
    expect(screen.getByText("3.0% below current")).toBeTruthy();
  });

  it("names clear air instead of a stale resistance", async () => {
    mockMarketApi();
    await renderWithProviders(<KeyLevelsCard keyLevels={{ ...KEY_LEVELS, clear_air_above: true }} />);
    expect(screen.getByText("No resistance above")).toBeTruthy();
    expect(screen.queryByText("85.00 EGP")).toBeNull();
  });

  it("renders nothing without levels", async () => {
    mockMarketApi();
    await renderWithProviders(<KeyLevelsCard keyLevels={null} />);
    expect(screen.queryByText("Key Levels")).toBeNull();
  });
});

describe("EntryExitCard", () => {
  it("shows an active entry zone with confidence and stop-loss", async () => {
    mockMarketApi();
    await renderWithProviders(<EntryExitCard entryExit={ENTRY_EXIT} />);
    expect(screen.getByText("80.00 – 81.50 EGP")).toBeTruthy();
    expect(screen.getByText("High confidence")).toBeTruthy();
    expect(screen.getByText("77.30 EGP")).toBeTruthy();
    expect(screen.getByText("• RSI 48 — not overbought")).toBeTruthy();
  });

  // The neutral colour itself is pinned by `zoneTone` in levels.test.ts.
  it("renders a low-confidence exit as a hint", async () => {
    mockMarketApi();
    await renderWithProviders(
      <EntryExitCard
        entryExit={{
          entry_zone: { ...ENTRY_EXIT.entry_zone, active: false },
          exit_zone: { active: true, confidence: "low", price_range: { low: 90, high: 92 }, reasons: [] },
        }}
      />
    );
    expect(screen.getByText("90.00 – 92.00 EGP")).toBeTruthy();
    expect(screen.getByText("Low confidence")).toBeTruthy();
  });

  it("explains when no zone is active and links to Learn", async () => {
    mockMarketApi();
    await renderWithProviders(
      <EntryExitCard
        entryExit={{ entry_zone: { ...ENTRY_EXIT.entry_zone, active: false }, exit_zone: ENTRY_EXIT.exit_zone }}
      />
    );
    expect(screen.getByText(/No active entry or exit zone right now/)).toBeTruthy();
    fireEvent.press(screen.getByText("Learn more →"));
    expect(router.push).toHaveBeenCalledWith(learnHref("entry_exit_zones"));
  });
});

describe("PEFreshnessBanner", () => {
  it("warns when the P/E feed is stale", async () => {
    mockMarketApi({
      "/pe": {
        last_successful_fetch: new Date(Date.now() - 84 * 3_600_000).toISOString(),
        last_attempt_status: "timeout",
      },
    });
    await renderWithProviders(<PEFreshnessBanner />);
    expect(
      await screen.findByText(
        "P/E data last updated 3 days ago — the EGX feed may be temporarily unavailable. Last attempt: timeout."
      )
    ).toBeTruthy();
  });

  it("stays silent when fresh or when the status call fails", async () => {
    const fetchMock = mockMarketApi({ "/pe": fail(503) });
    await renderWithProviders(<PEFreshnessBanner />);
    await waitFor(() => expect(requestsTo(fetchMock, "/pe")).toHaveLength(1));
    expect(screen.queryByText(/P\/E data last updated/)).toBeNull();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx jest src/features/market/__tests__/StockCards.test.tsx`
Expected: FAIL — `Cannot find module '../EntryExitCard'`.

- [ ] **Step 4: Implement the four components**

`src/features/market/StatsPanel.tsx`:

```tsx
import { View } from "react-native";
import { T_BILL_RATE_PCT } from "@/shared/constants";
import type { AnalysisStats, CrossoverInfo, PEData } from "@/shared/types";
import { AppText, LearnTerm } from "@/ui";
import { changeText, formatPE, formatVolume } from "./logic/format";
import { betaClass, dividendYieldClass, peClass, rsiClass, signedClass } from "./logic/statTones";

export interface StatsPanelProps {
  stats: AnalysisStats;
  latestRsi?: number | null;
  latestVolatility?: number | null;
  cumulativeReturn?: number | null;
  beta?: number | null;
  atr?: number | null;
  atrPct?: number | null;
  crossovers?: CrossoverInfo | null;
  pe?: PEData | null;
}

function StatRow({
  label,
  value,
  tooltip,
  valueClass = "text-white",
}: {
  label: string;
  value: string;
  tooltip?: { term: string; explanation: string };
  valueClass?: string;
}) {
  return (
    <View className="min-h-[36px] flex-row items-center justify-between gap-3 border-b border-white/5 py-2">
      {tooltip ? (
        <LearnTerm term={tooltip.term} explanation={tooltip.explanation}>
          {label}
        </LearnTerm>
      ) : (
        <AppText className="text-xs text-white/50">{label}</AppText>
      )}
      <AppText className={`font-mono text-xs ${valueClass}`}>{value}</AppText>
    </View>
  );
}

/** Port of web `StatsPanel` — Key Statistics, first on the phone. */
export function StatsPanel({
  stats,
  latestRsi,
  latestVolatility,
  cumulativeReturn,
  beta,
  atr,
  atrPct,
  crossovers,
  pe,
}: StatsPanelProps) {
  const golden = crossovers?.current_signal === "golden_cross";
  return (
    <View className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <AppText className="mb-3 font-sans-medium text-sm text-white/70">Key Statistics</AppText>

      {crossovers?.current_signal && (
        <View className={`mb-3 rounded-lg border px-3 py-2 ${golden ? "border-gain/20 bg-gain/10" : "border-loss/20 bg-loss/10"}`}>
          <AppText className={`text-center font-sans-semibold text-xs ${golden ? "text-gain" : "text-loss"}`}>
            {`${golden ? "Golden Cross Active" : "Death Cross Active"}${crossovers.days_since_cross != null ? ` (${crossovers.days_since_cross}d ago)` : ""}`}
          </AppText>
        </View>
      )}

      <StatRow label="Current Price" value={`${stats.current_price.toFixed(2)} EGP`} />
      <StatRow label="Change" value={changeText(stats.change, stats.change_pct)} valueClass={signedClass(stats.change_pct)} />
      <StatRow
        label="52W High"
        value={stats.high_52w.toFixed(2)}
        tooltip={{ term: "52-Week High", explanation: "The highest price reached in the last 252 trading days (~1 year), including intraday highs. This window is fixed — changing the chart's bar count doesn't change it. Stocks near their 52-week high have strong momentum but may face resistance." }}
      />
      <StatRow
        label="52W Low"
        value={stats.low_52w.toFixed(2)}
        tooltip={{ term: "52-Week Low", explanation: "The lowest price reached in the last year, including intraday lows. Stocks near their 52-week low may be undervalued or may have fundamental problems — investigate before buying." }}
      />
      <StatRow
        label="Avg Volume (20d)"
        value={formatVolume(stats.avg_volume)}
        tooltip={{ term: "Average Volume", explanation: "The average number of shares traded per day over the last 20 days. Higher volume = more liquid (easier to buy/sell). Low volume stocks can be hard to exit quickly." }}
      />
      {latestRsi != null && (
        <StatRow
          label="RSI (14)"
          value={latestRsi.toFixed(1)}
          valueClass={rsiClass(latestRsi)}
          tooltip={{ term: "RSI", explanation: "Relative Strength Index. 0-100 scale. >70 = overbought, <30 = oversold. Helps gauge if a stock has moved too far too fast." }}
        />
      )}
      {latestVolatility != null && (
        <StatRow
          label="Volatility (20d daily)"
          value={`${(latestVolatility * 100).toFixed(2)}%`}
          tooltip={{ term: "Volatility (daily)", explanation: "A typical ONE-DAY move, measured as the standard deviation of daily returns over the last 20 days. The Risk-Adjusted category in the score breakdown quotes an ANNUALIZED figure instead — roughly this number times 16 — so the two look very different for the same stock. High volatility = more risk but also more potential reward." }}
        />
      )}
      {cumulativeReturn != null && (
        <StatRow
          label="Cumulative Return"
          value={`${(cumulativeReturn * 100).toFixed(2)}%`}
          valueClass={signedClass(cumulativeReturn)}
          tooltip={{ term: "Cumulative Return", explanation: "Total return since the first data point in the chart. Shows how much you would have gained or lost if you held from the beginning." }}
        />
      )}
      {beta != null && (
        <StatRow
          label="Beta"
          value={beta.toFixed(2)}
          valueClass={betaClass(beta)}
          tooltip={{ term: "Beta vs EGX30", explanation: "Measures how much this stock moves relative to the EGX30 index. Beta > 1 = more volatile than market. Beta < 1 = less volatile. Beta = 1 = moves with the market. A negative beta means it tends to move in the OPPOSITE direction to the index — its size still tells you how big those moves are." }}
        />
      )}
      {atr != null && (
        <StatRow
          label="ATR (14)"
          value={`${atr.toFixed(2)}${atrPct != null ? ` (${atrPct}%)` : ""}`}
          tooltip={{ term: "ATR — Average True Range", explanation: "Measures average daily price movement. Use it to set stop-losses: this app places them 1.5x ATR below the nearest support level, far enough that normal daily noise won't stop you out. The Entry Zone card shows the exact figure." }}
        />
      )}
      {pe?.loss_making && (
        <StatRow
          label="Earnings"
          value="Loss-making"
          valueClass="text-loss"
          tooltip={{ term: "Loss-making", explanation: "The company reported negative earnings over the last twelve months, so there is no meaningful P/E to quote. Valuation has to lean on trend and relative strength instead." }}
        />
      )}
      {pe && pe.pe_ratio != null && (
        <StatRow
          label="P/E Ratio"
          value={formatPE(pe)}
          valueClass={peClass(pe.pe_ratio)}
          tooltip={{ term: "P/E Ratio", explanation: "Price-to-Earnings: how many EGP investors pay for every 1 EGP of annual profit. Judge it against the EGX median of about 12, not against global markets — under 8 is genuinely cheap here, over 25 is expensive. Below 3 is a warning, not a bargain: it usually means one-off earnings or a collapsed share price." }}
        />
      )}
      {pe && pe.dividend_yield != null && pe.dividend_yield > 0 && (
        <StatRow
          label="Dividend Yield"
          value={`${pe.dividend_yield.toFixed(2)}%`}
          valueClass={dividendYieldClass(pe.dividend_yield)}
          tooltip={{ term: "Dividend Yield", explanation: `Annual dividends as a percentage of the current share price. The EGX median is about 3%. Read a healthy yield as evidence the company generates real cash, not as income — even 8% loses to the ~${T_BILL_RATE_PCT}% policy rate. Above 15% is a red flag: usually a one-off special dividend or a share price that has collapsed.` }}
        />
      )}
    </View>
  );
}
```

`src/features/market/KeyLevelsCard.tsx`:

```tsx
import { View } from "react-native";
import type { KeyLevels, NearestLevel } from "@/shared/types";
import { AppText, LearnTerm } from "@/ui";
import { levelReading } from "./logic/levels";

function LevelRow({ kind, level, currentPrice }: { kind: "support" | "resistance"; level: NearestLevel | null; currentPrice: number }) {
  const label = kind === "support" ? "Nearest Support" : "Nearest Resistance";
  if (!level) {
    return (
      <View className="flex-row items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
        <AppText className="text-[11px] uppercase tracking-wider text-white/40">{label}</AppText>
        <AppText className="text-xs text-white/30">—</AppText>
      </View>
    );
  }
  const r = levelReading(kind, level, currentPrice);
  return (
    <View
      className={`gap-1 rounded-lg border px-3 py-2 ${r.brokenThrough ? "border-yellow-400/20 bg-yellow-400/[0.04]" : "border-white/5 bg-white/[0.02]"}`}
    >
      <AppText className="text-[11px] uppercase tracking-wider text-white/40">{r.label}</AppText>
      <AppText className={`font-mono-semibold text-sm ${kind === "support" ? "text-gain" : "text-loss"}`}>{r.priceText}</AppText>
      <AppText className="text-[10px] text-white/40">{r.strengthText}</AppText>
      <AppText className="font-mono text-xs text-white/60">{r.directionText}</AppText>
    </View>
  );
}

/** Port of web `KeyLevelsCard`. */
export function KeyLevelsCard({ keyLevels }: { keyLevels: KeyLevels | null | undefined }) {
  if (!keyLevels) return null;
  const { current_price, nearest_support, nearest_resistance } = keyLevels;

  return (
    <View className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <View className="mb-3 flex-row items-center justify-between">
        <LearnTerm
          term="Key Levels"
          explanation="Support and resistance are price zones where the stock has previously bounced (support) or stalled (resistance). Two caveats worth knowing: a level marked 'touched once' is a single bounce, not a proven floor; and levels need about a month of trading either side of them to be detected, so anything formed in the last few weeks will not appear here yet. Use them as reference points, not guarantees."
        >
          Key Levels
        </LearnTerm>
        <AppText className="font-mono text-[10px] text-white/30">{`${current_price.toFixed(2)} EGP`}</AppText>
      </View>

      <View className="gap-3">
        {keyLevels.clear_air_above ? (
          // With nothing overhead the fallback "resistance" is a level the
          // stock cleared long ago; the headline is that there is no ceiling.
          <View className="rounded-lg border border-gain/20 bg-gain/[0.05] px-3 py-2.5">
            <AppText className="text-[11px] uppercase tracking-wider text-white/40">Overhead</AppText>
            <AppText className="font-mono-semibold text-sm text-gain">No resistance above</AppText>
            <AppText className="mt-1 text-[10px] leading-relaxed text-white/40">
              Trading above every level in its recent history — no prior ceiling. Also means there is no chart-based target above, so set one from your own plan and trail your stop up.
            </AppText>
          </View>
        ) : (
          <LevelRow kind="resistance" level={nearest_resistance} currentPrice={current_price} />
        )}

        <View className="flex-row items-center gap-2">
          <View className="h-px flex-1 border-t border-dashed border-white/10" />
          <AppText className="font-mono text-[10px] text-white/50">{current_price.toFixed(2)}</AppText>
          <View className="h-px flex-1 border-t border-dashed border-white/10" />
        </View>

        <LevelRow kind="support" level={nearest_support} currentPrice={current_price} />
      </View>
    </View>
  );
}
```

`src/features/market/EntryExitCard.tsx`:

```tsx
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { learnHref } from "@/lib/links";
import type { EntryExit, ZoneConfidence } from "@/shared/types";
import { AppText, LearnTerm } from "@/ui";
import { zoneTone } from "./logic/levels";

function ZoneBlock({
  kind,
  confidence,
  priceRange,
  suggestedStopLoss,
  reasons,
}: {
  kind: "entry" | "exit";
  confidence: ZoneConfidence | null;
  priceRange: { low: number; high: number } | null;
  suggestedStopLoss: number | null;
  reasons: string[];
}) {
  const tone = zoneTone(kind, confidence);
  const isEntry = kind === "entry";
  return (
    <View className={`rounded-lg border px-3 py-3 ${tone.boxClass}`}>
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1 flex-row items-center gap-2">
          <AppText className={`font-mono-semibold text-lg ${tone.textClass}`}>{isEntry ? "$" : "!"}</AppText>
          <View className="flex-1">
            <AppText className="text-[11px] uppercase tracking-wider text-white/50">{isEntry ? "Entry Zone" : "Exit Zone"}</AppText>
            {priceRange && (
              <AppText className={`font-mono-semibold text-sm ${tone.textClass}`}>
                {`${priceRange.low.toFixed(2)} – ${priceRange.high.toFixed(2)} EGP`}
              </AppText>
            )}
          </View>
        </View>
        {tone.badge && (
          <View className={`rounded-full border px-2 py-0.5 ${tone.badge.boxClass}`}>
            <AppText className={`font-sans-medium text-[10px] ${tone.badge.textClass}`}>{tone.badge.label}</AppText>
          </View>
        )}
      </View>
      {suggestedStopLoss != null && (
        <View className="mt-2 flex-row items-center justify-between border-t border-white/5 pt-2">
          <AppText className="text-[11px] text-white/50">Suggested stop-loss</AppText>
          <AppText className="font-mono text-xs text-white/80">{`${suggestedStopLoss.toFixed(2)} EGP`}</AppText>
        </View>
      )}
      {reasons.length > 0 && (
        <View className="mt-2 gap-0.5">
          {reasons.map((r, i) => (
            <AppText key={i} className="text-[11px] leading-relaxed text-white/60">{`• ${r}`}</AppText>
          ))}
        </View>
      )}
    </View>
  );
}

/** Port of web `EntryExitCard`. */
export function EntryExitCard({ entryExit }: { entryExit: EntryExit | null | undefined }) {
  if (!entryExit) return null;
  const { entry_zone, exit_zone } = entryExit;
  const anyActive = entry_zone.active || exit_zone.active;

  return (
    <View className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <View className="mb-3 flex-row items-center justify-between">
        <LearnTerm
          term="Entry / Exit Zones"
          explanation="Entry zones combine a tested support level with non-overbought momentum — a beginner-friendly way to time a buy. Exit zones combine resistance with overbought momentum — a cue to trim or tighten your stop-loss."
        >
          Entry / Exit Zones
        </LearnTerm>
        <Pressable accessibilityRole="link" onPress={() => router.push(learnHref("entry_exit_zones"))} className="min-h-[44px] justify-center">
          <AppText className="text-[11px] text-accent/70">Learn more →</AppText>
        </Pressable>
      </View>

      {!anyActive ? (
        <View className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-3 py-4">
          <AppText className="text-center text-xs text-white/50">
            No active entry or exit zone right now — price is sitting between support and resistance without momentum confirmation either way.
          </AppText>
        </View>
      ) : (
        <View className="gap-3">
          {entry_zone.active && (
            <ZoneBlock
              kind="entry"
              confidence={entry_zone.confidence}
              priceRange={entry_zone.price_range}
              suggestedStopLoss={entry_zone.suggested_stop_loss}
              reasons={entry_zone.reasons}
            />
          )}
          {exit_zone.active && (
            <ZoneBlock
              kind="exit"
              confidence={exit_zone.confidence}
              priceRange={exit_zone.price_range}
              suggestedStopLoss={null}
              reasons={exit_zone.reasons}
            />
          )}
        </View>
      )}
    </View>
  );
}
```

`src/features/market/PEFreshnessBanner.tsx`:

```tsx
import { View } from "react-native";
import { fetchPEFeedStatus } from "@/shared/api";
import { AppText } from "@/ui";
import { useKeyedFetch } from "./hooks/useKeyedFetch";
import { useNow } from "./hooks/useNow";
import { peStaleDays } from "./logic/freshness";

/** Best-effort: silent on failure, never blocks the page. */
export function PEFreshnessBanner() {
  const { data } = useKeyedFetch("pe-status", fetchPEFeedStatus);
  const now = useNow(60_000);
  const days = peStaleDays(data?.last_successful_fetch, now);
  if (days == null) return null;
  const attempt =
    data?.last_attempt_status && data.last_attempt_status !== "ok"
      ? ` Last attempt: ${data.last_attempt_status}.`
      : "";
  return (
    <View className="rounded-lg border border-amber-400/30 bg-amber-400/[0.06] px-3 py-2">
      <AppText className="text-xs text-amber-200/80">
        {`P/E data last updated ${days} day${days === 1 ? "" : "s"} ago — the EGX feed may be temporarily unavailable.${attempt}`}
      </AppText>
    </View>
  );
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npx jest src/features/market/__tests__/StockCards.test.tsx`
Expected: PASS — 10 tests.

- [ ] **Step 6: Verify and commit**

Run: `npm run verify`
Expected: exits 0.

```bash
git add src/features/market
git commit -m "feat(market): StatsPanel, KeyLevelsCard, EntryExitCard and PE freshness banner

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XDkAB7UCK8WyT267W5ZxNV"
```

---

### Task 8: Score — ScoreBreakdown, ScoreWeightsSheet, CompositeCard

**Files:**
- Create: `src/features/market/ScoreWeightsSheet.tsx`
- Create: `src/features/market/ScoreBreakdown.tsx`
- Create: `src/features/market/CompositeCard.tsx`
- Test: `src/features/market/__tests__/Score.test.tsx`

**Interfaces:**
- Consumes: Task 6 (`stepWeight`, `rawTotal`, `Callout`, `ChartInterval`), `@/providers/scoreWeights` (`useScoreWeights`, `normalizeWeights`), `@/charts` (`CompositeGauge`, `scoreColor`), `@/ui` (`Sheet`, `Button`, `IconButton`, `Pill`, `AppText`), `@/shared/types` (`CompositeScore`, `ScoreWeights`).
- Produces: `ScoreWeightsSheet({ open, onClose, onSaved? })`; `ScoreBreakdown({ composite, onWeightsChanged? })`; `CompositeCard({ composite, interval, callouts })`.

- [ ] **Step 1: Write the failing tests**

`src/features/market/__tests__/Score.test.tsx`:

```tsx
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils/render";
import { CompositeCard } from "../CompositeCard";
import { ScoreBreakdown } from "../ScoreBreakdown";
import { ScoreWeightsSheet } from "../ScoreWeightsSheet";
import { mockMarketApi, requestsTo } from "../testing/api";
import { makeAnalysis } from "../testing/fixtures";

jest.mock("expo-router", () => require("@/features/market/testing/expoRouterMock"));
jest.mock("@/charts", () => require("@/features/market/testing/chartsMock"));

const composite = makeAnalysis().composite_score;

beforeEach(() => jest.clearAllMocks());

describe("ScoreBreakdown", () => {
  it("lists categories with the weight each actually carried", async () => {
    mockMarketApi();
    await renderWithProviders(<ScoreBreakdown composite={composite} />);
    expect(screen.getByText("Trend")).toBeTruthy();
    expect(screen.getAllByText("14% weight").length).toBe(7);
    expect(screen.getByText("excluded — not enough data")).toBeTruthy();
    expect(screen.getByText("—")).toBeTruthy();
    expect(screen.getByText(/It is not a forecast/)).toBeTruthy();
  });

  it("expands a category to show its reasons", async () => {
    mockMarketApi();
    await renderWithProviders(<ScoreBreakdown composite={composite} />);
    expect(screen.queryByText("Price above SMA 50")).toBeNull();
    fireEvent.press(screen.getByText("Trend"));
    expect(screen.getByText("• Price above SMA 50")).toBeTruthy();
    fireEvent.press(screen.getByText("Momentum"));
    expect(screen.getByText("No notable signals in this category.")).toBeTruthy();
  });

  it("shows a macro adjustment when there is one", async () => {
    mockMarketApi();
    await renderWithProviders(
      <ScoreBreakdown composite={{ ...composite, macro_adjustment: 1.5, macro_context: "EGX30 uptrend" }} />
    );
    expect(screen.getByText("Macro adjustment: +1.5")).toBeTruthy();
    expect(screen.getByText("EGX30 uptrend")).toBeTruthy();
  });

  it("opens the weights sheet", async () => {
    mockMarketApi();
    await renderWithProviders(<ScoreBreakdown composite={composite} />);
    fireEvent.press(screen.getByLabelText("Adjust weights"));
    expect(await screen.findByText("Composite Score Weights")).toBeTruthy();
  });
});

describe("ScoreWeightsSheet", () => {
  it("steps a weight and saves it", async () => {
    const fetchMock = mockMarketApi();
    const onClose = jest.fn();
    await renderWithProviders(<ScoreWeightsSheet open onClose={onClose} />);
    await waitFor(() => expect(requestsTo(fetchMock, "/settings")).toHaveLength(1));
    expect(await screen.findByText("raw 18")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Increase Trend weight"));
    expect(screen.getByText("raw 20")).toBeTruthy();
    fireEvent.press(screen.getByText("Save"));
    await waitFor(() => expect(requestsTo(fetchMock, "/settings", "PUT")).toHaveLength(1));
    const putInit = fetchMock.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === "PUT")?.[1] as RequestInit;
    expect(JSON.parse(String(putInit.body)).weights.trend).toBe(20);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("cancel throws the draft away", async () => {
    mockMarketApi();
    const onClose = jest.fn();
    await renderWithProviders(<ScoreWeightsSheet open onClose={onClose} />);
    fireEvent.press(await screen.findByLabelText("Increase Trend weight"));
    expect(screen.getByText("raw 20")).toBeTruthy();
    fireEvent.press(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
    expect(await screen.findByText("raw 18")).toBeTruthy();
  });

  it("shows the advanced categories on request", async () => {
    mockMarketApi();
    await renderWithProviders(<ScoreWeightsSheet open onClose={jest.fn()} />);
    expect(screen.queryByText("Divergence")).toBeNull();
    fireEvent.press(screen.getByText("Show advanced categories"));
    expect(screen.getByText("Divergence")).toBeTruthy();
    expect(screen.getByText("Beginner Safe")).toBeTruthy();
  });
});

describe("CompositeCard", () => {
  it("names the condition, the timeframe and the callouts", async () => {
    mockMarketApi();
    await renderWithProviders(
      <CompositeCard
        composite={composite}
        interval="Weekly"
        callouts={[{ key: "aligned", label: "✅ Daily + Weekly aligned (up)", tone: "accent" }]}
      />
    );
    expect(screen.getByText("Technical Condition")).toBeTruthy();
    expect(screen.getByText("Strong")).toBeTruthy();
    expect(screen.getByText("on weekly bars")).toBeTruthy();
    expect(screen.getByText("Daily is the primary view for timing")).toBeTruthy();
    expect(screen.getByText("✅ Daily + Weekly aligned (up)")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest src/features/market/__tests__/Score.test.tsx`
Expected: FAIL — `Cannot find module '../CompositeCard'`.

- [ ] **Step 3: Implement the three components**

`src/features/market/ScoreWeightsSheet.tsx`:

```tsx
import { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { normalizeWeights, useScoreWeights } from "@/providers/scoreWeights";
import type { ScoreWeights } from "@/shared/types";
import { AppText, Button, IconButton, Pill, Sheet } from "@/ui";
import { pct } from "./logic/format";
import { rawTotal, stepWeight, WEIGHT_MAX, WEIGHT_MIN } from "./logic/weights";

const CATEGORY_META: Record<keyof ScoreWeights, { label: string; description: string }> = {
  trend: { label: "Trend", description: "Moving averages, golden/death crosses, and ADX trend strength." },
  momentum: { label: "Momentum", description: "RSI, MACD histogram direction, and Stochastic." },
  volume: { label: "Volume", description: "OBV vs price, Money Flow Index (MFI), volume-price confirmation, and whether the stock is liquid enough to actually trade." },
  volatility: { label: "Volatility", description: "Bollinger Band position and squeeze detection." },
  divergence: { label: "Divergence", description: "RSI and MACD divergences — reversal signals." },
  quality: { label: "Quality", description: "Trend consistency, multi-timeframe alignment, distance from the 52-week high, plus valuation: P/E and dividend yield versus the EGX median." },
  risk_adjusted: { label: "Risk-Adjusted", description: "Annualized return vs the Egyptian T-bill, volatility, and ATR context." },
  relative_strength: { label: "Rel. Strength", description: "Performance vs EGX30 over 30 days (leaders vs laggards)." },
};

const CORE_CATS: (keyof ScoreWeights)[] = ["trend", "momentum", "volume", "volatility"];
const ADVANCED_CATS: (keyof ScoreWeights)[] = ["divergence", "quality", "risk_adjusted", "relative_strength"];

const PRESET_LABELS: Record<string, string> = {
  beginner_safe: "Beginner Safe",
  balanced: "Balanced",
  trend_follower: "Trend Follower",
  reversal_hunter: "Reversal Hunter",
  income_defensive: "Income / Defensive",
};

function WeightStepper({
  cat,
  raw,
  normalized,
  onChange,
}: {
  cat: keyof ScoreWeights;
  raw: number;
  normalized: number;
  onChange: (v: number) => void;
}) {
  const meta = CATEGORY_META[cat];
  return (
    <View className="gap-1.5">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <AppText className="font-mono text-sm text-white">{meta.label}</AppText>
          <AppText className="text-[11px] leading-snug text-white/40">{meta.description}</AppText>
        </View>
        <View className="items-end">
          <AppText className="font-mono-semibold text-sm text-accent">{`${normalized.toFixed(0)}%`}</AppText>
          <AppText className="text-[10px] text-white/40">{`raw ${raw.toFixed(0)}`}</AppText>
        </View>
      </View>
      <View className="flex-row items-center gap-3">
        <IconButton
          icon="remove"
          accessibilityLabel={`Decrease ${meta.label} weight`}
          onPress={() => onChange(stepWeight(raw, -1))}
        />
        <View className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
          <View
            className="h-full rounded-full bg-accent"
            style={{ width: pct(((raw - WEIGHT_MIN) / (WEIGHT_MAX - WEIGHT_MIN)) * 100) }}
          />
        </View>
        <IconButton
          icon="add"
          accessibilityLabel={`Increase ${meta.label} weight`}
          onPress={() => onChange(stepWeight(raw, 1))}
        />
      </View>
    </View>
  );
}

/** Port of web `ScoreWeightsModal` as a bottom sheet; the range sliders become steppers. */
export function ScoreWeightsSheet({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { draft, presets, saving, updateDraftField, applyPreset, resetDraft, save } = useScoreWeights();
  const [localError, setLocalError] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const normalized = useMemo(() => normalizeWeights(draft), [draft]);
  const total = rawTotal(draft);

  const handleSave = async () => {
    setLocalError(null);
    try {
      await save();
      onSaved?.();
      onClose();
    } catch (e: unknown) {
      setLocalError(e instanceof Error ? e.message : "Failed to save");
    }
  };

  const handleCancel = () => {
    resetDraft();
    onClose();
  };

  const stepper = (cat: keyof ScoreWeights) => (
    <WeightStepper
      key={cat}
      cat={cat}
      raw={draft[cat] ?? 0}
      normalized={normalized[cat] ?? 0}
      onChange={(v) => updateDraftField(cat, v)}
    />
  );

  return (
    <Sheet visible={open} onClose={handleCancel} title="Composite Score Weights">
      <ScrollView contentContainerClassName="gap-5 pb-6">
        <AppText className="text-xs text-white/50">Tune how each category contributes to the 0-100 score.</AppText>

        <View className="gap-2">
          <AppText className="text-[11px] uppercase tracking-wider text-white/40">Presets</AppText>
          <View className="flex-row flex-wrap gap-2">
            {Object.keys(presets).map((name) => (
              <Pill key={name} label={PRESET_LABELS[name] ?? name.replace(/_/g, " ")} onPress={() => applyPreset(name)} />
            ))}
          </View>
        </View>

        <View className="gap-5">
          <AppText className="text-[11px] uppercase tracking-wider text-white/40">Core categories</AppText>
          {CORE_CATS.map(stepper)}
        </View>

        <Button
          label={`${advancedOpen ? "Hide" : "Show"} advanced categories`}
          variant="ghost"
          onPress={() => setAdvancedOpen((v) => !v)}
        />
        {advancedOpen && <View className="gap-5">{ADVANCED_CATS.map(stepper)}</View>}

        <AppText className="text-[11px] leading-relaxed text-white/40">
          {`Raw total: ${total.toFixed(0)}. Values are auto-normalized to sum to 100 on save — you don't need to do the math yourself.`}
        </AppText>
        {localError && <AppText className="text-xs text-loss">{localError}</AppText>}

        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button label="Cancel" variant="secondary" disabled={saving} onPress={handleCancel} />
          </View>
          <View className="flex-1">
            <Button label="Save" loading={saving} disabled={saving || total === 0} onPress={handleSave} />
          </View>
        </View>
      </ScrollView>
    </Sheet>
  );
}
```

`src/features/market/ScoreBreakdown.tsx`:

```tsx
import { useState } from "react";
import { Pressable, View } from "react-native";
import { scoreColor } from "@/charts";
import type { CompositeScore } from "@/shared/types";
import { AppText, IconButton } from "@/ui";
import { pct } from "./logic/format";
import { ScoreWeightsSheet } from "./ScoreWeightsSheet";

const CATEGORY_LABELS: Record<string, string> = {
  trend: "Trend",
  momentum: "Momentum",
  volume: "Volume",
  volatility: "Volatility",
  divergence: "Divergence",
  quality: "Quality",
  risk_adjusted: "Risk-Adjusted",
  relative_strength: "Rel. Strength",
};
const CATEGORY_ORDER = ["trend", "momentum", "volume", "volatility", "divergence", "quality", "risk_adjusted", "relative_strength"] as const;
const UNSCORED = "#4a4a5a";

/** Port of web `ScoreBreakdown`, including its measured-finding disclaimer. */
export function ScoreBreakdown({
  composite,
  onWeightsChanged,
}: {
  composite: CompositeScore;
  onWeightsChanged?: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <View className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-1">
          <AppText className="font-mono-semibold text-sm text-white">Score Breakdown</AppText>
          <AppText className="text-[11px] text-white/40">8 categories blended with your weights</AppText>
        </View>
        <IconButton icon="settings-outline" accessibilityLabel="Adjust weights" onPress={() => setSettingsOpen(true)} />
      </View>

      <View className="gap-2">
        {CATEGORY_ORDER.map((name) => {
          const c = composite.categories[name];
          if (!c) return null;
          const score = c.score;
          const isOpen = expanded === name;
          const color = score !== null ? scoreColor(score) : UNSCORED;
          const barPct = score !== null ? Math.max(0, Math.min(100, score)) : 0;
          return (
            <Pressable
              key={name}
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
              onPress={() => setExpanded(isOpen ? null : name)}
              className="min-h-[44px] rounded-lg border border-white/5 bg-white/[0.02] p-3"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1 flex-row flex-wrap items-baseline gap-2">
                  <AppText className="font-sans-medium text-xs text-white/90">{CATEGORY_LABELS[name]}</AppText>
                  {/* The weight it ACTUALLY carried — an excluded category's
                      weight is redistributed, so the configured one would not
                      reconcile with the gauge. */}
                  {score !== null ? (
                    <AppText className="text-xs text-white/40">{`${(c.effective_weight ?? c.weight).toFixed(0)}% weight`}</AppText>
                  ) : (
                    <AppText className="text-xs italic text-white/30">excluded — not enough data</AppText>
                  )}
                </View>
                <AppText className="font-mono-semibold text-xs" style={{ color }}>
                  {score !== null ? score.toFixed(0) : "—"}
                </AppText>
              </View>
              <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                <View className="h-full rounded-full" style={{ width: pct(barPct), backgroundColor: color }} />
              </View>
              {isOpen && c.reasons.length > 0 && (
                <View className="mt-3 gap-1.5">
                  {c.reasons.map((reason, i) => (
                    <AppText key={i} className="text-[11px] leading-relaxed text-white/60">{`• ${reason}`}</AppText>
                  ))}
                </View>
              )}
              {isOpen && c.reasons.length === 0 && (
                <AppText className="mt-2 text-[11px] italic text-white/40">No notable signals in this category.</AppText>
              )}
            </Pressable>
          );
        })}
      </View>

      {composite.macro_adjustment != null && composite.macro_adjustment !== 0 && (
        <View className="mt-3 flex-row items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
          <AppText className="text-[11px] text-white/70">
            {`Macro adjustment: ${composite.macro_adjustment > 0 ? "+" : ""}${composite.macro_adjustment.toFixed(1)}`}
          </AppText>
          {composite.macro_context && (
            <AppText numberOfLines={1} className="flex-1 text-right text-[11px] text-white/40">
              {composite.macro_context}
            </AppText>
          )}
        </View>
      )}

      <AppText className="mt-4 text-[10px] leading-relaxed text-white/30">
        This score describes a stock&apos;s current technical condition. It is not a forecast: tested across the EGX from 2007–2026, higher scores did not precede better returns than lower ones. Read the categories above for what is true today, and consider fundamentals, news and macro before trading.
      </AppText>

      <ScoreWeightsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} onSaved={onWeightsChanged} />
    </View>
  );
}
```

`src/features/market/CompositeCard.tsx`:

```tsx
import { View } from "react-native";
import { CompositeGauge, scoreColor } from "@/charts";
import type { CompositeScore } from "@/shared/types";
import { AppText } from "@/ui";
import type { Callout, CalloutTone, ChartInterval } from "./logic/stockDetail";
import { ScoreBreakdown } from "./ScoreBreakdown";

const CALLOUT_BOX: Record<CalloutTone, string> = {
  gain: "bg-gain/10",
  loss: "bg-loss/10",
  accent: "bg-accent/10",
  neutral: "bg-white/5",
};
const CALLOUT_TEXT: Record<CalloutTone, string> = {
  gain: "text-gain",
  loss: "text-loss",
  accent: "text-accent",
  neutral: "text-white/60",
};

/**
 * Gauge + condition word + breakdown + callout pills. "Technical Condition",
 * not "Signal": the score cannot rank stocks, so the label names what it
 * measures. The interval is stated on the score itself.
 */
export function CompositeCard({
  composite,
  interval,
  callouts,
}: {
  composite: CompositeScore;
  interval: ChartInterval;
  callouts: Callout[];
}) {
  return (
    <View className="gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <View className="items-center gap-1">
        <CompositeGauge score={composite.score} signal={composite.signal} size="lg" />
        <AppText className="mt-1 text-[10px] uppercase tracking-wider text-white/40">Technical Condition</AppText>
        <AppText className="font-mono-semibold text-base" style={{ color: scoreColor(composite.score) }}>
          {composite.signal}
        </AppText>
        <AppText className="text-[10px] text-white/30">{`on ${interval.toLowerCase()} bars`}</AppText>
        {interval !== "Daily" && (
          <AppText className="text-[10px] text-white/25">Daily is the primary view for timing</AppText>
        )}
      </View>

      <ScoreBreakdown composite={composite} />

      {callouts.length > 0 && (
        <View className="flex-row flex-wrap gap-2 border-t border-white/5 pt-4">
          {callouts.map((c) => (
            <View key={c.key} className={`rounded-full px-2.5 py-1 ${CALLOUT_BOX[c.tone]}`}>
              <AppText className={`text-[11px] ${CALLOUT_TEXT[c.tone]}`}>{c.label}</AppText>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx jest src/features/market/__tests__/Score.test.tsx`
Expected: PASS — 8 tests.

- [ ] **Step 5: Verify and commit**

Run: `npm run verify`
Expected: exits 0.

```bash
git add src/features/market
git commit -m "feat(market): score breakdown, weights sheet (stepper) and composite card

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XDkAB7UCK8WyT267W5ZxNV"
```

---
### Task 9: Self-fetching stock cards — RiskGradeCard, DividendHistoryCard, ForecastCard + OutcomeCone

**Files:**
- Create: `src/features/market/RiskGradeCard.tsx`
- Create: `src/features/market/DividendHistoryCard.tsx`
- Create: `src/features/market/OutcomeCone.tsx`
- Create: `src/features/market/ForecastCard.tsx`
- Modify: `src/features/market/testing/fixtures.ts` (append `RISK`, `DIVIDEND_HISTORY`)
- Modify: `src/features/market/testing/api.ts` (default `/risk`, `/dividend_history`)
- Test: `src/features/market/__tests__/SelfFetchingCards.test.tsx`

**Interfaces:**
- Consumes: Task 2 (`useKeyedFetch`, `useNow`), Task 6 (`coneGeometry`, `riskAgoLabel`, `FORECAST`), Task 1 (`coarse`, `dayMonth`), `@/shared/api` (`fetchRisk`, `RiskRow`, `RiskResponse`, `fetchDividendHistory`), `@/shared/riskBands` (`RISK_BAND_BLURB`, `RISK_BAND_COLOR`, `RISK_BAND_ORDER`), `@/shared/theme` (`COLORS`), `react-native-svg` (`Svg`, `Path`, `Line`), `@/lib/links` (`learnHref`, `routes`).
- Produces: `RiskGradeCard({ symbol })`, `DividendHistoryCard({ symbol })`, `ForecastCard({ forecast, symbol })`, `OutcomeCone({ data, symbol })`. Each self-fetching card degrades to nothing or an empty state — never an error wall.

- [ ] **Step 1: Append fixtures and default routes**

Add `import type { RiskResponse } from "@/shared/api";` and `DividendHistoryResponse` to the `@/shared/types` import in `src/features/market/testing/fixtures.ts`, then append:

```ts
export const RISK: RiskResponse = {
  data: [
    {
      symbol: "COMI",
      measured_at: "2026-09-02T21:00:00Z",
      sigma_63_ann_pct: 24.4,
      sigma_ewma_ann_pct: 23,
      beta: 1.05,
      turnover_egp: 120_000_000,
      traded_share: 1,
      last_price: 82.5,
      tradeable: true,
      pct_rank: 18.2,
      quintile: 1,
      band: "calm",
      band_label: "Calm",
      historical: { future_vol_ann_pct: 24.3, median_max_drawdown_pct: 11.6, p90_max_drawdown_pct: 21.2 },
    },
  ],
  n_symbols: 160,
  n_ranked: 140,
  oldest_measurement: "2026-09-02T21:00:00Z",
  calibration: {
    fitted_at: "2026-09-01", n_observations: 9120, n_symbols: 140, lookback_days: 63,
    forward_days: 126, vol_predicts_vol_ic: 0.56, vol_predicts_drawdown_ic: 0.43,
  },
};

export const DIVIDEND_HISTORY: DividendHistoryResponse = {
  symbol: "COMI",
  dividends: Array.from({ length: 12 }, (_, i) => ({
    ex_date: `${2026 - i}-04-07`,
    amount: 6 - i * 0.25,
    year: 2026 - i,
  })),
  cadence: { last_ex_date: "2026-04-07", typical_month: 4, typical_month_name: "April", payments_per_year: 1, count: 12 },
  status: "ok",
};
```

In `src/features/market/testing/api.ts`, import `DIVIDEND_HISTORY` from `./fixtures` and add to `DEFAULTS`:

```ts
  // An unmeasured symbol is a 404 — a normal state, the card renders nothing.
  "/risk": reply(404, { detail: "Not measured yet" }),
  "/dividend_history": DIVIDEND_HISTORY,
```

- [ ] **Step 2: Write the failing tests**

`src/features/market/__tests__/SelfFetchingCards.test.tsx`:

```tsx
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { learnHref, routes } from "@/lib/links";
import { renderWithProviders } from "@/test-utils/render";
import { DividendHistoryCard } from "../DividendHistoryCard";
import { ForecastCard } from "../ForecastCard";
import { RiskGradeCard } from "../RiskGradeCard";
import { fail, mockMarketApi } from "../testing/api";
import { DIVIDEND_HISTORY, FORECAST, RISK } from "../testing/fixtures";

jest.mock("expo-router", () => require("@/features/market/testing/expoRouterMock"));

beforeEach(() => jest.clearAllMocks());

describe("RiskGradeCard", () => {
  it("grades how much the stock moves, never which way", async () => {
    mockMarketApi({ "/risk": RISK });
    await renderWithProviders(<RiskGradeCard symbol="COMI" />);
    expect(await screen.findByText("moves least of the tradeable EGX names")).toBeTruthy();
    expect(screen.getByText("18th percentile of 140 tradeable stocks")).toBeTruthy();
    expect(screen.getByText("24%")).toBeTruthy();
    expect(screen.getByText("−12%")).toBeTruthy();
    expect(screen.getByText("−21%")).toBeTruthy();
    expect(screen.getByText("Its own swing: 24%/yr")).toBeTruthy();
    expect(screen.getByText("Beta 1.05")).toBeTruthy();
    expect(screen.getByText(/Measured on 9,120 past checks across 140 EGX stocks/)).toBeTruthy();
  });

  it("gives a thinly traded stock no grade", async () => {
    mockMarketApi({ "/risk": { ...RISK, data: [{ ...RISK.data[0], band: null, pct_rank: null, historical: undefined }] } });
    await renderWithProviders(<RiskGradeCard symbol="COMI" />);
    expect(await screen.findByText("Too thinly traded to grade")).toBeTruthy();
    expect(screen.getByText("Its own recent swing: 24%/yr")).toBeTruthy();
  });

  it("never shows another stock's row", async () => {
    mockMarketApi({ "/risk": RISK });
    await renderWithProviders(<RiskGradeCard symbol="TMGH" />);
    await waitFor(() => expect(screen.queryByTestId("risk-skeleton")).toBeNull());
    expect(screen.queryByText(/percentile/)).toBeNull();
  });

  it("renders nothing for an unmeasured symbol (404)", async () => {
    mockMarketApi();
    await renderWithProviders(<RiskGradeCard symbol="COMI" />);
    await waitFor(() => expect(screen.queryByTestId("risk-skeleton")).toBeNull());
    expect(screen.queryByText("Risk grade")).toBeNull();
  });
});

describe("DividendHistoryCard", () => {
  it("lists years and pages through all of them", async () => {
    mockMarketApi();
    await renderWithProviders(<DividendHistoryCard symbol="COMI" />);
    expect(await screen.findByText("2026")).toBeTruthy();
    expect(screen.getByText("6.00")).toBeTruthy();
    expect(screen.queryByText("2018")).toBeNull();
    fireEvent.press(screen.getByText("Show 4 more — 4 earlier"));
    expect(screen.getByText("2015")).toBeTruthy();
    fireEvent.press(screen.getByText("Show less"));
    expect(screen.queryByText("2015")).toBeNull();
    expect(screen.getByText(/Typically pays around April · last ex-date 7 Apr 2026/)).toBeTruthy();
  });

  it("says so when there is no history", async () => {
    mockMarketApi({ "/dividend_history": { ...DIVIDEND_HISTORY, dividends: [] } });
    await renderWithProviders(<DividendHistoryCard symbol="COMI" />);
    expect(await screen.findByText("No dividend history on record for this stock.")).toBeTruthy();
  });

  it("degrades to an empty state when the source times out", async () => {
    mockMarketApi({ "/dividend_history": fail(504, "timeout") });
    await renderWithProviders(<DividendHistoryCard symbol="COMI" />);
    expect(await screen.findByText("Dividend history is unavailable right now.")).toBeTruthy();
  });

  it("links to the dividend dates concept", async () => {
    mockMarketApi();
    await renderWithProviders(<DividendHistoryCard symbol="COMI" />);
    fireEvent.press(await screen.findByText("Learn more →"));
    expect(router.push).toHaveBeenCalledWith(learnHref("dividend_dates"));
  });
});

describe("ForecastCard", () => {
  it("shows typical moves with measured coverage and the outcome range", async () => {
    mockMarketApi();
    await renderWithProviders(<ForecastCard forecast={FORECAST} symbol="COMI" />);
    expect(screen.getByText("±1.8%")).toBeTruthy();
    expect(screen.getByText("79% land inside")).toBeTruthy();
    expect(screen.getByText("21% are bigger")).toBeTruthy();
    expect(screen.getByText("76% land inside")).toBeTruthy();
    expect(
      screen.getByText(/COMI has historically ended between 80\.0 and 120 EGP about 90% of the time — so roughly 10% of the time it ended outside/)
    ).toBeTruthy();
    expect(screen.getByText(/48,210 past checks, last fitted 2026-09-01/)).toBeTruthy();
  });

  it("draws the cone once it knows its width", async () => {
    mockMarketApi();
    await renderWithProviders(<ForecastCard forecast={FORECAST} symbol="COMI" />);
    expect(screen.queryByTestId("cone-svg")).toBeNull();
    fireEvent(screen.getByTestId("outcome-cone"), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 280, height: 160 } },
    });
    expect(screen.getByTestId("cone-svg")).toBeTruthy();
    expect(screen.getByText("120")).toBeTruthy();
    expect(screen.getByText("80.0")).toBeTruthy();
  });

  it("links to the calibration record", async () => {
    mockMarketApi();
    await renderWithProviders(<ForecastCard forecast={FORECAST} symbol="COMI" />);
    fireEvent.press(screen.getByText("See how often these ranges held →"));
    expect(router.push).toHaveBeenCalledWith(routes.calibration);
  });

  it("renders nothing without a forecast", async () => {
    mockMarketApi();
    await renderWithProviders(<ForecastCard forecast={null} symbol="COMI" />);
    expect(screen.queryByText("Typical moves & outcome range")).toBeNull();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx jest src/features/market/__tests__/SelfFetchingCards.test.tsx`
Expected: FAIL — `Cannot find module '../DividendHistoryCard'`.

- [ ] **Step 4: Implement the cards**

`src/features/market/RiskGradeCard.tsx`:

```tsx
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { learnHref } from "@/lib/links";
import { fetchRisk, type RiskResponse, type RiskRow } from "@/shared/api";
import { RISK_BAND_BLURB, RISK_BAND_COLOR, RISK_BAND_ORDER } from "@/shared/riskBands";
import { COLORS } from "@/shared/theme";
import { AppText, LearnTerm } from "@/ui";
import { useKeyedFetch } from "./hooks/useKeyedFetch";
import { useNow } from "./hooks/useNow";
import { riskAgoLabel } from "./logic/freshness";

/**
 * The per-stock risk grade — the strongest measured surface in the app. It
 * must never imply a return: every figure is about MOVEMENT and DRAWDOWN, in
 * the past tense. Colour is the shared cool→hot ramp, never gain/loss.
 */

function Tile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <View className="flex-1 rounded-lg bg-white/[0.03] px-2.5 py-2">
      <AppText className="text-[9px] leading-tight text-white/40">{label}</AppText>
      <AppText className="mt-0.5 font-mono-semibold text-sm text-white">{value}</AppText>
      <AppText className="mt-0.5 text-[9px] leading-tight text-white/30">{note}</AppText>
    </View>
  );
}

function Graded({ row, res, band, now }: { row: RiskRow; res: RiskResponse; band: NonNullable<RiskRow["band"]>; now: number }) {
  const color = RISK_BAND_COLOR[band] ?? COLORS.accent;
  const label = row.band_label ?? band;
  const hist = row.historical;
  const ago = riskAgoLabel(res.oldest_measurement ?? row.measured_at, now);
  return (
    <>
      <View className="flex-row items-center gap-3">
        <View className="rounded-lg px-3 py-1.5" style={{ backgroundColor: `${color}22` }}>
          <AppText className="font-sans-bold text-sm uppercase tracking-wide" style={{ color }}>
            {label}
          </AppText>
        </View>
        <View className="flex-1">
          <AppText className="text-[11px] leading-tight text-white/50">{RISK_BAND_BLURB[band]}</AppText>
          {res.n_ranked ? (
            <AppText className="text-[11px] leading-tight text-white/30">
              {`${Math.round(row.pct_rank ?? 0)}th percentile of ${res.n_ranked} tradeable stocks`}
            </AppText>
          ) : null}
        </View>
      </View>

      <View className="mt-4">
        <View className="flex-row gap-1">
          {RISK_BAND_ORDER.map((b) => (
            <View
              key={b}
              className="h-1.5 flex-1 rounded-full"
              style={{ backgroundColor: b === band ? RISK_BAND_COLOR[b] : "rgba(255,255,255,0.07)" }}
            />
          ))}
        </View>
        <View className="mt-1 flex-row justify-between">
          <AppText className="text-[9px] text-white/25">Calm</AppText>
          <AppText className="text-[9px] text-white/25">Wild</AppText>
        </View>
      </View>

      {hist && (
        <>
          <AppText className="mt-4 text-[11px] text-white/50">
            {`Stocks this ${label.toLowerCase()} have, over the following six months, historically:`}
          </AppText>
          <View className="mt-2 flex-row gap-2">
            <Tile label="Swung about" value={`${hist.future_vol_ann_pct.toFixed(0)}%`} note="a year" />
            <Tile label="Usual worst dip" value={`−${hist.median_max_drawdown_pct.toFixed(0)}%`} note="half were worse" />
            <Tile label="Rough-patch dip" value={`−${hist.p90_max_drawdown_pct.toFixed(0)}%`} note="1 in 10 were worse" />
          </View>
        </>
      )}

      <View className="mt-3 flex-row flex-wrap gap-x-3 gap-y-1">
        {row.sigma_63_ann_pct != null && (
          <AppText className="text-[10px] text-white/30">{`Its own swing: ${row.sigma_63_ann_pct.toFixed(0)}%/yr`}</AppText>
        )}
        {row.beta != null && <AppText className="text-[10px] text-white/30">{`Beta ${row.beta.toFixed(2)}`}</AppText>}
        {ago && <AppText className="text-[10px] text-white/30">{`Measured ${ago}`}</AppText>}
      </View>

      <AppText className="mt-2 text-[10px] leading-relaxed text-white/30">
        {`${res.calibration ? `Measured on ${res.calibration.n_observations.toLocaleString("en-US")} past checks across ${res.calibration.n_symbols} EGX stocks. ` : ""}These are past outcomes for stocks that moved like this one — not a promise about this one, and nothing here says whether the price goes up or down.`}
      </AppText>
    </>
  );
}

/** A symbol that failed the tradeable gate: raw measurement, NO band. */
function Ungraded({ row }: { row: RiskRow }) {
  return (
    <View className="rounded-lg bg-white/[0.03] px-3 py-3">
      <AppText className="font-sans-medium text-[11px] text-white/60">Too thinly traded to grade</AppText>
      <AppText className="mt-1 text-[10px] leading-relaxed text-white/35">
        This stock does not trade often or heavily enough to compare fairly against the rest of the market, so it gets no grade rather than a misleading one. Thin stocks are also the hardest to sell when you want to.
      </AppText>
      {row.sigma_63_ann_pct != null && (
        <AppText className="mt-2 font-mono text-[11px] text-white/50">
          {`Its own recent swing: ${row.sigma_63_ann_pct.toFixed(0)}%/yr`}
        </AppText>
      )}
    </View>
  );
}

export function RiskGradeCard({ symbol }: { symbol: string }) {
  const { data: res, error, loading } = useKeyedFetch(`risk:${symbol}`, () => fetchRisk(symbol));
  const now = useNow(60_000);

  // A 404 means "not measured yet" — normal while the snapshot walks the
  // universe, not an error worth a red box.
  if (error) return null;
  if (loading || !res) {
    return (
      <View testID="risk-skeleton" className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <View className="h-4 w-28 rounded bg-white/10" />
        <View className="mt-4 h-16 rounded bg-white/5" />
      </View>
    );
  }
  // Match on symbol, never position: an unfiltered response is sorted by rank.
  const wanted = symbol.trim().toUpperCase();
  const row = res.data?.find((r) => r.symbol === wanted);
  if (!row) return null;

  return (
    <View className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <View className="mb-3 flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <LearnTerm
            term="Risk grade"
            explanation="Where this stock sits against every tradeable EGX stock on how much it moves. Built from the last 63 days of price swings, which historically predicted the next six months' swings and drawdowns well. It says nothing about direction."
          >
            Risk grade
          </LearnTerm>
          <AppText className="mt-0.5 text-[11px] text-white/40">How much this moves — not which way.</AppText>
        </View>
        <Pressable accessibilityRole="link" onPress={() => router.push(learnHref("risk-management"))} className="min-h-[44px] justify-center">
          <AppText className="text-[11px] text-accent/70">Learn →</AppText>
        </Pressable>
      </View>
      {row.band ? <Graded row={row} res={res} band={row.band} now={now} /> : <Ungraded row={row} />}
    </View>
  );
}
```

`src/features/market/DividendHistoryCard.tsx`:

```tsx
import { useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { learnHref } from "@/lib/links";
import { fetchDividendHistory } from "@/shared/api";
import { AppText, Button, LearnTerm } from "@/ui";
import { useKeyedFetch } from "./hooks/useKeyedFetch";
import { dayMonth } from "./logic/format";

const PAGE = 8; // years shown before "Show more"

function Shell({ children }: { children: ReactNode }) {
  return (
    <View className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <View className="mb-3 flex-row items-center justify-between">
        <LearnTerm
          term="Dividend History"
          explanation="The cash coupons this company has paid shareholders, per share, over the years — with the ex-date (own the share before it to receive that coupon). Amounts are gross, as reported; Egypt's 5-10% withholding comes off before the cash reaches you. The EGX publishes no forward calendar, so any 'expected' date here is only an estimate from past years, never a promise."
        >
          Dividend History
        </LearnTerm>
        <Pressable accessibilityRole="link" onPress={() => router.push(learnHref("dividend_dates"))} className="min-h-[44px] justify-center">
          <AppText className="text-[11px] text-accent/70">Learn more →</AppText>
        </Pressable>
      </View>
      {children}
    </View>
  );
}

function Empty({ note }: { note: string }) {
  return (
    <Shell>
      <View className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-3 py-4">
        <AppText className="text-center text-xs text-white/50">{note}</AppText>
      </View>
    </Shell>
  );
}

/**
 * Self-fetching, so a slow Yahoo call can never hold up or fail the rest of
 * the stock page. No gain/loss colour: an amount carries no direction.
 */
export function DividendHistoryCard({ symbol }: { symbol: string }) {
  const { data, error, loading } = useKeyedFetch(`divhist:${symbol}`, () => fetchDividendHistory(symbol));
  const [shownCount, setShownCount] = useState(PAGE);

  if (loading) {
    return (
      <Shell>
        <View className="gap-2">
          <View className="h-4 w-full rounded bg-white/5" />
          <View className="h-4 w-4/5 rounded bg-white/5" />
          <View className="h-4 w-3/5 rounded bg-white/5" />
        </View>
      </Shell>
    );
  }
  if (error || !data || data.status === "unavailable") {
    return <Empty note="Dividend history is unavailable right now." />;
  }
  const { dividends, cadence } = data;
  if (dividends.length === 0) return <Empty note="No dividend history on record for this stock." />;

  const shown = dividends.slice(0, shownCount);
  const remaining = dividends.length - shown.length;
  const fullyExpanded = shownCount >= dividends.length;

  return (
    <Shell>
      <View className="gap-1.5">
        {shown.map((d) => (
          <View key={`${d.ex_date}-${d.amount}`} className="flex-row items-baseline justify-between gap-3 border-b border-white/[0.04] pb-1.5">
            <AppText className="font-mono text-xs text-white/40">{String(d.year)}</AppText>
            <View className="flex-1 flex-row items-baseline justify-end gap-1">
              <AppText className="font-mono-semibold text-sm text-white/90">{d.amount.toFixed(2)}</AppText>
              <AppText className="text-[10px] text-white/40">EGP</AppText>
            </View>
            <AppText className="w-16 text-right font-mono text-[11px] text-white/50">{dayMonth(d.ex_date)}</AppText>
          </View>
        ))}
      </View>

      {dividends.length > PAGE && (
        <View className="mt-2.5">
          <Button
            variant="secondary"
            label={fullyExpanded ? "Show less" : `Show ${Math.min(PAGE, remaining)} more — ${remaining} earlier`}
            onPress={() => setShownCount(fullyExpanded ? PAGE : Math.min(shownCount + PAGE, dividends.length))}
          />
        </View>
      )}

      {cadence.typical_month_name && (
        <AppText className="mt-3 border-t border-white/[0.06] pt-3 text-[11px] leading-relaxed text-white/45">
          {`Typically pays around ${cadence.typical_month_name}${cadence.payments_per_year && cadence.payments_per_year > 1 ? ` · ${cadence.payments_per_year}× a year` : ""}${cadence.last_ex_date ? ` · last ex-date ${dayMonth(cadence.last_ex_date)} ${cadence.last_ex_date.slice(0, 4)}` : ""}. `}
          <AppText className="text-[11px] text-white/30">Estimated from past years — the EGX sets no forward date.</AppText>
        </AppText>
      )}
    </Shell>
  );
}
```

`src/features/market/OutcomeCone.tsx`:

```tsx
import { useMemo, useState } from "react";
import { View } from "react-native";
import Svg, { Line, Path } from "react-native-svg";
import { COLORS } from "@/shared/theme";
import type { StockOutcomeBand } from "@/shared/types";
import { AppText } from "@/ui";
import { coneGeometry } from "./logic/cone";
import { coarse } from "./logic/format";

const HEIGHT = 160;

/**
 * The outcome cone, drawn with react-native-svg (Plan 2 has no cone chart).
 * Centred on today's price; no median line — that would be a price target
 * with a direction attached. Width comes from onLayout.
 */
export function OutcomeCone({ data, symbol }: { data: StockOutcomeBand; symbol: string }) {
  const [width, setWidth] = useState(0);
  const geo = useMemo(() => coneGeometry(data, width, HEIGHT), [data, width]);
  if (!data.bands.length) return null;
  const inner = data.bands[0];
  const outer = data.bands[data.bands.length - 1];
  const { endpoint } = data;

  return (
    <View className="gap-2">
      <AppText className="text-[11px] leading-relaxed text-white/50">
        {`Over the next ${data.days} trading days, ${symbol} has historically ended between ${coarse(endpoint.lo)} and ${coarse(endpoint.hi)} EGP about ${endpoint.coverage_pct}% of the time — so roughly ${100 - endpoint.coverage_pct}% of the time it ended outside, about as often below as above.`}
      </AppText>

      <View className="flex-row" style={{ height: HEIGHT }}>
        <View className="w-11 justify-between py-0.5">
          {geo && (
            <>
              <AppText className="font-mono text-[9px] text-white/30">{coarse(geo.max)}</AppText>
              <AppText className="font-mono text-[9px] text-white/30">{coarse(geo.min)}</AppText>
            </>
          )}
        </View>
        <View testID="outcome-cone" className="flex-1" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {geo && (
            <Svg testID="cone-svg" width={width} height={HEIGHT}>
              <Path d={geo.outer} fill={COLORS.accent} fillOpacity={0.1} />
              <Path d={geo.inner} fill={COLORS.accent} fillOpacity={0.18} />
              <Line x1={0} x2={width} y1={geo.refY} y2={geo.refY} stroke="white" strokeOpacity={0.3} strokeDasharray="3 3" />
            </Svg>
          )}
        </View>
      </View>

      <View className="flex-row justify-between pl-11">
        <AppText className="text-[9px] text-white/25">Today</AppText>
        <AppText className="text-[9px] text-white/25">{`Day +${data.days}`}</AppText>
      </View>

      <View className="flex-row items-center justify-center gap-4">
        <View className="flex-row items-center gap-1.5">
          <View className="h-2 w-3 rounded-sm bg-accent/30" />
          <AppText className="text-[9px] text-white/35">{`${inner.coverage_pct}% of outcomes`}</AppText>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className="h-2 w-3 rounded-sm bg-accent/10" />
          <AppText className="text-[9px] text-white/35">{`${outer.coverage_pct}% of outcomes`}</AppText>
        </View>
      </View>
    </View>
  );
}
```

`src/features/market/ForecastCard.tsx`:

```tsx
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { learnHref, routes } from "@/lib/links";
import type { StockForecast } from "@/shared/types";
import { AppText, LearnTerm } from "@/ui";
import { OutcomeCone } from "./OutcomeCone";

/**
 * Ranges, not predictions (web ForecastCard). Never renders a price target or
 * colours a direction; coverage percentages come from the payload, never typed in.
 */
function MoveTile({ label, value, coverage }: { label: string; value: number; coverage: number }) {
  const inside = Math.round(coverage);
  return (
    <View className="flex-1 rounded-lg bg-white/[0.03] px-3 py-2">
      <AppText className="text-[10px] text-white/40">{label}</AppText>
      <AppText className="mt-0.5 font-mono-semibold text-sm text-white">{`±${value.toFixed(1)}%`}</AppText>
      <AppText className="mt-0.5 text-[9px] leading-tight text-white/30">{`${inside}% land inside`}</AppText>
      <AppText className="text-[9px] leading-tight text-white/30">{`${100 - inside}% are bigger`}</AppText>
    </View>
  );
}

export function ForecastCard({ forecast, symbol }: { forecast: StockForecast | null | undefined; symbol: string }) {
  if (!forecast || (!forecast.expected_move && !forecast.outcome_band)) return null;
  const { expected_move, outcome_band } = forecast;

  return (
    <View className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <View className="mb-3 flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <LearnTerm
            term="Outcome range"
            explanation="How far this stock has typically travelled over a given stretch of time, fitted to the Egyptian market's own history. It says nothing about direction — the range is deliberately centred on today's price."
          >
            Typical moves &amp; outcome range
          </LearnTerm>
          <AppText className="mt-0.5 text-[11px] text-white/40">Ranges, not predictions. No direction is implied.</AppText>
        </View>
        <Pressable accessibilityRole="link" onPress={() => router.push(learnHref("expected_move"))} className="min-h-[44px] justify-center">
          <AppText className="text-[11px] text-accent/70">Learn →</AppText>
        </Pressable>
      </View>

      {expected_move && (
        <View className="mb-4 flex-row gap-2">
          <MoveTile label="Typical day" value={expected_move.daily_pct} coverage={expected_move.daily_coverage_pct} />
          <MoveTile label="Typical week" value={expected_move.weekly_pct} coverage={expected_move.weekly_coverage_pct} />
          <MoveTile label="Typical month" value={expected_move.monthly_pct} coverage={expected_move.monthly_coverage_pct} />
        </View>
      )}

      {outcome_band && <OutcomeCone data={outcome_band} symbol={symbol} />}

      <AppText className="mt-3 text-[10px] leading-relaxed text-white/30">
        {`Fitted to how Egyptian stocks have actually moved${outcome_band ? ` — ${outcome_band.calibration.n_observations.toLocaleString("en-US")} past checks, last fitted ${outcome_band.calibration.fitted_at}` : ""}. A range can still be wrong: news, a devaluation or a suspension can put the price outside it.`}
      </AppText>
      <Pressable accessibilityRole="link" onPress={() => router.push(routes.calibration)} className="min-h-[44px] justify-center">
        <AppText className="text-[11px] text-accent/60">See how often these ranges held →</AppText>
      </Pressable>
    </View>
  );
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npx jest src/features/market/__tests__/SelfFetchingCards.test.tsx`
Expected: PASS — 12 tests.

- [ ] **Step 6: Verify and commit**

Run: `npm run verify`
Expected: exits 0.

```bash
git add src/features/market
git commit -m "feat(market): risk grade, dividend history and forecast cards with SVG outcome cone

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XDkAB7UCK8WyT267W5ZxNV"
```

---

### Task 10: Stock detail screen and route

**Files:**
- Create: `src/features/market/RefreshableScroll.tsx`
- Create: `src/features/market/ChartControls.tsx`
- Create: `src/features/market/StockDetailScreen.tsx`
- Modify (replace contents): `src/app/stock/[symbol].tsx`
- Modify: `src/features/market/testing/api.ts` (`/analysis` default answers single-symbol requests)
- Test: `src/features/market/__tests__/StockDetailScreen.test.tsx`
- Test: `src/__tests__/routes/market-routes.test.tsx`

**Interfaces:**
- Consumes: Tasks 2, 6–9; `@/charts` (`PriceChart`, `VolumeChart`, `IndicatorPanel`); `@/shared/api` (`fetchAnalysis`); `@/shared/constants` (`SR_LEVELS_DISPLAYED`); `@/providers/watchlist`, `@/providers/scoreWeights`; `@/ui` (`Screen`, `AppText`, `Button`, `ChartSkeleton`, `LearnTerm`, `Pill`, `PillRow`, `Sheet`).
- Produces:
  - `RefreshableScroll({ testID?, refreshing?, onRefresh?, contentClassName?, children })` — a `ScrollView` whose `RefreshControl` has testID `<testID>-refresh`.
  - `IntervalBarsControls({ interval, bars, onInterval, onBars })`, `OverlayToggles({ value, onToggle })` (each chip has `accessibilityLabel="<label> overlay"`; long-press opens the explanation).
  - `StockDetailScreen({ symbol: string; initialInterval: ChartInterval })`.
  - Route `src/app/stock/[symbol].tsx` → upper-cases `symbol`, `parseInterval(interval)`, keys the screen by symbol, sets the header title.

- [ ] **Step 1: Make the default `/analysis` route answer single-symbol requests**

In `src/features/market/testing/api.ts`, import `makeAnalysis` from `./fixtures` and replace the `"/analysis": batch({}),` entry with:

```ts
  "/analysis": (url: URL) =>
    url.searchParams.get("mode") === "batch"
      ? batch({})
      : makeAnalysis({
          interval: url.searchParams.get("interval") ?? "Daily",
          bars: Number(url.searchParams.get("bars") ?? 200),
        }),
```

- [ ] **Step 2: Write the failing tests**

`src/features/market/__tests__/StockDetailScreen.test.tsx`:

```tsx
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils/render";
import type { ChartInterval } from "../logic/stockDetail";
import { StockDetailScreen } from "../StockDetailScreen";
import { fail, mockMarketApi, requestsTo, type Route } from "../testing/api";
import { lastChartProps } from "../testing/chartsMock";
import { makeAnalysis } from "../testing/fixtures";

jest.mock("expo-router", () => require("@/features/market/testing/expoRouterMock"));
jest.mock("@/charts", () => require("@/features/market/testing/chartsMock"));

beforeEach(() => jest.clearAllMocks());

async function renderStock(routes: Record<string, Route> = {}, initialInterval: ChartInterval = "Daily") {
  const fetchMock = mockMarketApi(routes);
  await renderWithProviders(<StockDetailScreen symbol="COMI" initialInterval={initialInterval} />);
  await screen.findByText("Technical Condition");
  return fetchMock;
}

const analysisCalls = (fetchMock: ReturnType<typeof mockMarketApi>) => requestsTo(fetchMock, "/analysis");

it("loads the analysis and names the company beside the ticker", async () => {
  const fetchMock = await renderStock();
  expect(screen.getByText("COMI")).toBeTruthy();
  expect(screen.getByText("Commercial International Bank")).toBeTruthy();
  expect(screen.getByText("Daily · 200 bars")).toBeTruthy();
  const [first] = analysisCalls(fetchMock);
  expect(first.searchParams.get("symbol")).toBe("COMI");
  expect(first.searchParams.get("interval")).toBe("Daily");
  expect(first.searchParams.get("bars")).toBe("200");
});

it("opens on the interval the dashboard card was scored on", async () => {
  const fetchMock = await renderStock({}, "Monthly");
  expect(analysisCalls(fetchMock)[0].searchParams.get("interval")).toBe("Monthly");
  expect(screen.getByText("on monthly bars")).toBeTruthy();
});

it("re-scores on another interval and says so", async () => {
  const fetchMock = await renderStock();
  fireEvent.press(screen.getByText("Weekly"));
  expect(await screen.findByText("on weekly bars")).toBeTruthy();
  expect(screen.getByText("Daily is the primary view for timing")).toBeTruthy();
  expect(analysisCalls(fetchMock).some((u) => u.searchParams.get("interval") === "Weekly")).toBe(true);
});

it("changes how much history it loads", async () => {
  await renderStock();
  fireEvent.press(screen.getByText("500"));
  expect(await screen.findByText("Daily · 500 bars")).toBeTruthy();
});

it("starts with SMA 20 and Trendlines on and toggles overlays", async () => {
  await renderStock();
  expect(lastChartProps("PriceChart")?.overlays).toMatchObject({ sma20: true, trendlines: true, sma50: false });
  expect(lastChartProps("PriceChart")?.supports).toHaveLength(3);
  fireEvent.press(screen.getByLabelText("SMA 50 overlay"));
  expect(lastChartProps("PriceChart")?.overlays).toMatchObject({ sma50: true });
});

it("explains an overlay on long-press", async () => {
  await renderStock();
  fireEvent(screen.getByLabelText("Trendlines overlay"), "longPress");
  expect(await screen.findByText(/three pivot lows/)).toBeTruthy();
});

it("keeps the indicator panel collapsed until asked", async () => {
  await renderStock();
  expect(screen.queryByTestId("chart-IndicatorPanel")).toBeNull();
  fireEvent.press(screen.getByText("Technical Indicators"));
  expect(screen.getByTestId("chart-IndicatorPanel")).toBeTruthy();
});

it("adds the stock to the watchlist", async () => {
  const fetchMock = await renderStock();
  fireEvent.press(screen.getByText("Watch"));
  expect(await screen.findByText("Watching")).toBeTruthy();
  await waitFor(() => expect(requestsTo(fetchMock, "/watchlist", "POST")).toHaveLength(1));
});

it("shows the error and retries", async () => {
  let calls = 0;
  mockMarketApi({ "/analysis": () => (++calls === 1 ? fail(500, "Symbol not found") : makeAnalysis()) });
  await renderWithProviders(<StockDetailScreen symbol="COMI" initialInterval="Daily" />);
  expect(await screen.findByText("Symbol not found")).toBeTruthy();
  fireEvent.press(screen.getByText("Retry"));
  expect(await screen.findByText("Technical Condition")).toBeTruthy();
});

it("pull-to-refresh refetches without blanking the page", async () => {
  const fetchMock = await renderStock();
  fireEvent(screen.getByTestId("stock-scroll-refresh"), "refresh");
  expect(screen.getByText("Technical Condition")).toBeTruthy();
  await waitFor(() => expect(analysisCalls(fetchMock)).toHaveLength(2));
});

it("refetches after the score weights are saved", async () => {
  const fetchMock = await renderStock();
  fireEvent.press(screen.getByLabelText("Adjust weights"));
  fireEvent.press(await screen.findByLabelText("Increase Trend weight"));
  fireEvent.press(screen.getByText("Save"));
  await waitFor(() => expect(analysisCalls(fetchMock)).toHaveLength(2));
});
```

`src/__tests__/routes/market-routes.test.tsx`:

```tsx
import { createElement } from "react";
import { Stack } from "expo-router";
import { renderRouter, screen } from "expo-router/testing-library";
import DashboardRoute from "@/app/(tabs)/index";
import StockRoute from "@/app/stock/[symbol]";

// Screens are replaced by stubs that print what the route passed them.
jest.mock("@/features/market/DashboardScreen", () => {
  const { createElement: h } = require("react");
  const { Text } = require("react-native");
  return { DashboardScreen: () => h(Text, null, "dashboard-screen") };
});
jest.mock("@/features/market/StockDetailScreen", () => {
  const { createElement: h } = require("react");
  const { Text } = require("react-native");
  return {
    StockDetailScreen: ({ symbol, initialInterval }: { symbol: string; initialInterval: string }) =>
      h(Text, null, `${symbol}|${initialInterval}`),
  };
});

const layout = () => createElement(Stack);

it("mounts the dashboard on the index route", async () => {
  renderRouter({ _layout: layout, index: DashboardRoute }, { initialUrl: "/" });
  expect(await screen.findByText("dashboard-screen")).toBeTruthy();
});

it("upper-cases the symbol and keeps a valid interval", async () => {
  renderRouter({ _layout: layout, "stock/[symbol]": StockRoute }, { initialUrl: "/stock/comi?interval=Weekly" });
  expect(await screen.findByText("COMI|Weekly")).toBeTruthy();
});

it("falls back to Daily for an unknown interval", async () => {
  renderRouter({ _layout: layout, "stock/[symbol]": StockRoute }, { initialUrl: "/stock/COMI?interval=Hourly" });
  expect(await screen.findByText("COMI|Daily")).toBeTruthy();
});
```

- [ ] **Step 3: Run them to verify they fail**

Run: `npx jest src/features/market/__tests__/StockDetailScreen.test.tsx src/__tests__/routes/market-routes.test.tsx`
Expected: FAIL — `Cannot find module '../StockDetailScreen'`; the route test fails because `src/app/stock/[symbol].tsx` still renders the Plan 1 shell (no `COMI|Weekly` text).

- [ ] **Step 4: Implement the scroll container, controls, screen and route**

`src/features/market/RefreshableScroll.tsx`:

```tsx
import type { ReactNode } from "react";
import { RefreshControl, ScrollView } from "react-native";
import { COLORS } from "@/shared/theme";

/** A ScrollView with optional pull-to-refresh; its RefreshControl is `<testID>-refresh`. */
export function RefreshableScroll({
  testID,
  refreshing = false,
  onRefresh,
  contentClassName,
  children,
}: {
  testID?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentClassName?: string;
  children: ReactNode;
}) {
  return (
    <ScrollView
      testID={testID}
      contentContainerClassName={contentClassName}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            testID={testID ? `${testID}-refresh` : undefined}
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
            colors={[COLORS.accent]}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}
```

`src/features/market/ChartControls.tsx`:

```tsx
import { useState } from "react";
import { Pressable, View } from "react-native";
import { AppText, LearnTerm, Pill, PillRow, Sheet } from "@/ui";
import {
  BAR_COUNTS,
  INTERVALS,
  OVERLAYS,
  overlayExplanation,
  type BarCount,
  type ChartInterval,
  type OverlayKey,
  type OverlayState,
} from "./logic/stockDetail";

const INTERVAL_EXPLANATION =
  "Changes the bar size, and with it every indicator and the composite score. A Daily RSI reads the last ~2 weeks of momentum; a Weekly RSI reads ~3 months. Both are valid — they answer different questions. Use Daily for timing an entry or exit, and Weekly or Monthly to check the bigger trend you're trading with or against. When they disagree, the longer timeframe sets the context and the shorter one sets the timing. Monthly has the least history to work with (a 200-month average needs 16 years), so some categories score from fewer inputs there.";
const HISTORY_EXPLANATION =
  "How many bars of history to load. It sets how far back every chart on this page goes, and the cumulative return in Key Statistics is measured over exactly this window. Indicators are always computed on a longer internal window, so a short setting here never makes SMA 200 or the composite score less accurate.";
const OVERLAYS_EXPLANATION =
  "Lines drawn on the price chart only. Turning one on or off changes nothing else on this page — not the composite score, not the statistics. Use them to see what the indicators behind the score actually look like against price.";

/** Interval + history: both refetch, and both change the score — they sit together. */
export function IntervalBarsControls({
  interval,
  bars,
  onInterval,
  onBars,
}: {
  interval: ChartInterval;
  bars: BarCount;
  onInterval: (v: ChartInterval) => void;
  onBars: (v: BarCount) => void;
}) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2">
        <LearnTerm term="Chart interval" explanation={INTERVAL_EXPLANATION}>
          Interval
        </LearnTerm>
        <PillRow>
          {INTERVALS.map((iv) => (
            <Pill key={iv} label={iv} active={interval === iv} onPress={() => onInterval(iv)} />
          ))}
        </PillRow>
      </View>
      <View className="flex-row items-center gap-2">
        <LearnTerm term="History" explanation={HISTORY_EXPLANATION}>
          History
        </LearnTerm>
        <PillRow>
          {BAR_COUNTS.map((b) => (
            <Pill key={b} label={String(b)} active={bars === b} onPress={() => onBars(b)} />
          ))}
        </PillRow>
      </View>
    </View>
  );
}

/** Chart-only overlays, attached to the chart they draw on. Long-press explains one. */
export function OverlayToggles({ value, onToggle }: { value: OverlayState; onToggle: (k: OverlayKey) => void }) {
  const [explain, setExplain] = useState<{ term: string; text: string } | null>(null);
  return (
    <View className="gap-1">
      <View className="flex-row items-center gap-2">
        <LearnTerm term="Chart overlays" explanation={OVERLAYS_EXPLANATION}>
          Overlays
        </LearnTerm>
        <AppText className="text-[10px] text-white/30">Long-press one to learn what it draws</AppText>
      </View>
      <PillRow>
        {OVERLAYS.map((o) => {
          const on = value[o.key];
          return (
            <Pressable
              key={o.key}
              accessibilityRole="switch"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${o.label} overlay`}
              onPress={() => onToggle(o.key)}
              onLongPress={() => setExplain({ term: o.label, text: overlayExplanation(o.key, o.label) })}
              className={`min-h-[44px] flex-row items-center gap-1.5 rounded-full px-3 ${on ? "bg-white/10" : ""}`}
            >
              <View className="h-2 w-2 rounded-full" style={{ backgroundColor: o.color, opacity: on ? 1 : 0.3 }} />
              <AppText
                className={`font-sans-medium text-[11px] ${on ? "" : "text-white/30"}`}
                style={on ? { color: o.color } : undefined}
              >
                {o.label}
              </AppText>
            </Pressable>
          );
        })}
      </PillRow>
      <Sheet visible={explain !== null} onClose={() => setExplain(null)} title={explain?.term}>
        <AppText className="text-sm leading-relaxed text-white/70">{explain?.text}</AppText>
      </Sheet>
    </View>
  );
}
```

`src/features/market/StockDetailScreen.tsx`:

```tsx
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { IndicatorPanel, PriceChart, VolumeChart } from "@/charts";
import { useScoreWeights } from "@/providers/scoreWeights";
import { useWatchlist } from "@/providers/watchlist";
import { fetchAnalysis } from "@/shared/api";
import { SR_LEVELS_DISPLAYED } from "@/shared/constants";
import { AppText, Button, ChartSkeleton, Screen } from "@/ui";
import { IntervalBarsControls, OverlayToggles } from "./ChartControls";
import { CompositeCard } from "./CompositeCard";
import { DividendHistoryCard } from "./DividendHistoryCard";
import { EntryExitCard } from "./EntryExitCard";
import { ForecastCard } from "./ForecastCard";
import { useKeyedFetch } from "./hooks/useKeyedFetch";
import { KeyLevelsCard } from "./KeyLevelsCard";
import {
  atrPercent,
  buildIndicatorData,
  buildPriceChartData,
  buildVolumeChartData,
  compositeCallouts,
  DEFAULT_BARS,
  DEFAULT_OVERLAYS,
  latestNonNull,
  type BarCount,
  type ChartInterval,
  type OverlayState,
} from "./logic/stockDetail";
import { PEFreshnessBanner } from "./PEFreshnessBanner";
import { RefreshableScroll } from "./RefreshableScroll";
import { RiskGradeCard } from "./RiskGradeCard";
import { StatsPanel } from "./StatsPanel";

export interface StockDetailScreenProps {
  symbol: string;
  initialInterval: ChartInterval;
}

/**
 * Port of web `stock/[symbol]/page.tsx`, mobile branch: Key Statistics first,
 * composite card, levels + zones, overlays attached to the price chart, volume,
 * collapsible indicators, then the self-fetching risk / forecast / dividend
 * cards. Re-fetches when interval, history or score weights change.
 */
export function StockDetailScreen({ symbol, initialInterval }: StockDetailScreenProps) {
  const { add, remove, has } = useWatchlist();
  const { version: weightsVersion } = useScoreWeights();
  const [interval, setChartInterval] = useState<ChartInterval>(initialInterval);
  const [bars, setBars] = useState<BarCount>(DEFAULT_BARS);
  const [overlays, setOverlays] = useState<OverlayState>(DEFAULT_OVERLAYS);
  const [showIndicators, setShowIndicators] = useState(false);

  const analysis = useKeyedFetch(`${symbol}|${interval}|${bars}|${weightsVersion}`, () =>
    fetchAnalysis(symbol, interval, bars)
  );
  const data = analysis.data;
  const priceData = useMemo(() => (data ? buildPriceChartData(data) : []), [data]);
  const volumeData = useMemo(() => (data ? buildVolumeChartData(data) : []), [data]);
  const indicatorData = useMemo(() => (data ? buildIndicatorData(data) : []), [data]);

  const latestAtr = latestNonNull(data?.indicators.atr);
  const isWatched = has(symbol);
  // Four opaque letters are not what a reader recognises; drop the name when it just echoes the symbol.
  const companyName =
    data?.pe?.company_name && data.pe.company_name.toUpperCase() !== symbol.toUpperCase()
      ? data.pe.company_name
      : null;

  return (
    <Screen scroll={false}>
      {/* The web's sticky header: a fixed bar above the scroll view. */}
      <View className="flex-row items-center justify-between gap-3 border-b border-white/5 bg-charcoal-dark px-4 py-3">
        <View className="min-w-0 flex-1">
          <View className="flex-row items-baseline gap-2">
            <AppText className="font-mono-semibold text-xl text-white">{symbol}</AppText>
            {companyName && (
              <AppText numberOfLines={1} className="flex-1 font-sans-medium text-sm text-white/70">
                {companyName}
              </AppText>
            )}
          </View>
          {data && <AppText className="mt-0.5 text-xs text-white/40">{`${data.interval} · ${data.bars} bars`}</AppText>}
        </View>
        <Button
          label={isWatched ? "Watching" : "Watch"}
          variant={isWatched ? "primary" : "secondary"}
          icon={isWatched ? "star" : "star-outline"}
          onPress={() => (isWatched ? remove(symbol) : add(symbol))}
        />
      </View>

      <RefreshableScroll
        testID="stock-scroll"
        refreshing={analysis.refreshing}
        onRefresh={analysis.refresh}
        contentClassName="gap-4 px-4 py-4 pb-10"
      >
        <IntervalBarsControls interval={interval} bars={bars} onInterval={setChartInterval} onBars={setBars} />

        {analysis.loading ? (
          <View className="gap-4">
            <ChartSkeleton height={320} />
            <ChartSkeleton height={120} />
          </View>
        ) : analysis.error ? (
          <View className="items-center gap-3 rounded-xl border border-loss/20 bg-loss/5 p-6">
            <AppText className="text-center text-sm text-loss">{analysis.error}</AppText>
            <Button label="Retry" variant="secondary" onPress={analysis.reload} />
          </View>
        ) : data ? (
          <>
            <PEFreshnessBanner />
            <StatsPanel
              stats={data.stats}
              latestRsi={latestNonNull(data.indicators.rsi)}
              latestVolatility={latestNonNull(data.indicators.volatility)}
              cumulativeReturn={latestNonNull(data.indicators.cumulative_returns)}
              beta={data.beta}
              atr={latestAtr}
              atrPct={atrPercent(latestAtr, data.stats.current_price)}
              crossovers={data.crossovers}
              pe={data.pe}
            />
            {data.composite_score && (
              <CompositeCard composite={data.composite_score} interval={interval} callouts={compositeCallouts(data)} />
            )}
            <KeyLevelsCard keyLevels={data.key_levels} />
            <EntryExitCard entryExit={data.entry_exit} />

            <View className="gap-2">
              <OverlayToggles value={overlays} onToggle={(k) => setOverlays((p) => ({ ...p, [k]: !p[k] }))} />
              <PriceChart
                data={priceData}
                overlays={overlays}
                supports={data.support_resistance?.supports?.slice(0, SR_LEVELS_DISPLAYED)}
                resistances={data.support_resistance?.resistances?.slice(0, SR_LEVELS_DISPLAYED)}
                fibonacci={data.fibonacci}
                trendlines={data.trendlines}
                height={320}
              />
            </View>
            <VolumeChart data={volumeData} />

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: showIndicators }}
              onPress={() => setShowIndicators((v) => !v)}
              className="min-h-[44px] flex-row items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
            >
              <AppText className="font-sans-medium text-sm text-white/70">Technical Indicators</AppText>
              <AppText className="text-xs text-white/40">{showIndicators ? "Hide" : "Show"}</AppText>
            </Pressable>
            {showIndicators && <IndicatorPanel data={indicatorData} />}

            <RiskGradeCard symbol={symbol} />
            <ForecastCard forecast={data.forecast} symbol={symbol} />
            <DividendHistoryCard symbol={symbol} />
          </>
        ) : null}
      </RefreshableScroll>
    </Screen>
  );
}
```

`src/app/stock/[symbol].tsx` (replace the Plan 1 shell entirely):

```tsx
import { Stack, useLocalSearchParams } from "expo-router";
import { parseInterval } from "@/features/market/logic/stockDetail";
import { StockDetailScreen } from "@/features/market/StockDetailScreen";

export default function StockRoute() {
  const params = useLocalSearchParams<{ symbol: string; interval?: string }>();
  const symbol = String(params.symbol ?? "").toUpperCase();
  return (
    <>
      <Stack.Screen options={{ title: symbol }} />
      {/* Keyed so moving to another stock starts from fresh state. */}
      <StockDetailScreen key={symbol} symbol={symbol} initialInterval={parseInterval(params.interval)} />
    </>
  );
}
```

- [ ] **Step 5: Run them to verify they pass**

Run: `npx jest src/features/market/__tests__/StockDetailScreen.test.tsx src/__tests__/routes/market-routes.test.tsx`
Expected: PASS — 11 + 3 tests.

- [ ] **Step 6: Verify and commit**

Run: `npm run verify`
Expected: exits 0.

```bash
git add src/features/market src/app/stock src/__tests__/routes/market-routes.test.tsx
git commit -m "feat(market): stock detail screen with interval/history, overlays and pull-to-refresh

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XDkAB7UCK8WyT267W5ZxNV"
```

---
### Task 11: Compare — logic, screen and route

**Files:**
- Create: `src/features/market/logic/compare.ts`
- Create: `src/features/market/CompareScreen.tsx`
- Modify (replace contents): `src/app/compare.tsx`
- Modify: `src/features/market/testing/fixtures.ts` (append `COMPARE`)
- Modify: `src/__tests__/routes/market-routes.test.tsx` (compare route)
- Test: `src/features/market/logic/__tests__/compare.test.ts`
- Test: `src/features/market/__tests__/CompareScreen.test.tsx`

**Interfaces:**
- Consumes: Task 1 (`localDateKey`), Task 10 (`RefreshableScroll`), `@/shared/api` (`fetchComparison`), `@/shared/constants` (`COMPARE_DEFAULT_LOOKBACK_MONTHS`, `COMPARE_SUGGESTIONS_LIMIT`, `MAX_COMPARE_SYMBOLS`, `MIN_COMPARE_SYMBOLS`), `@/providers/tickers`, `@/charts` (`CompareChart`), `@/ui`.
- Produces:
  - `compare.ts`: `isIsoDate(s): boolean`, `rangeEndingAt(now: Date, months: number): { start; end }`, `defaultCompareRange(now)`, `RANGE_PRESETS`, `compareRangeError(start, end): string|null`, `compareSuggestions(tickers, input, selected, limit?)`, `addCompareSymbol(selected, sym, max?)`, `canCompare(selected, start, end)`, `CompareSeries`, `buildCompareSeries(data, selected)`.
  - `CompareScreen()` — testIDs `compare-start`, `compare-end`, `suggestion-<SYM>`.

- [ ] **Step 1: Append the fixture and write the failing tests**

Append to `src/features/market/testing/fixtures.ts` (add `CompareResponse` to the `@/shared/types` import):

```ts
export const COMPARE: CompareResponse = {
  symbols: ["COMI", "TMGH"],
  dates: ["2026-04-12", "2026-10-08"],
  COMI: [100, 112.34],
  TMGH: [100, 95],
  stats: {
    COMI: { total_return: 12.34, volatility: 0.025, max_drawdown: -8.2 },
    TMGH: { total_return: -5, volatility: 0.031, max_drawdown: -14.1 },
  },
};
```

`src/features/market/logic/__tests__/compare.test.ts`:

```ts
import { COMPARE, TICKERS } from "@/features/market/testing/fixtures";
import {
  addCompareSymbol,
  buildCompareSeries,
  canCompare,
  compareRangeError,
  compareSuggestions,
  defaultCompareRange,
  isIsoDate,
  rangeEndingAt,
} from "../compare";

describe("isIsoDate", () => {
  it("accepts only real YYYY-MM-DD dates", () => {
    expect(isIsoDate("2026-12-01")).toBe(true);
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-1")).toBe(false);
    expect(isIsoDate("2026-2-03")).toBe(false);
    expect(isIsoDate("")).toBe(false);
  });
});

describe("ranges", () => {
  const now = new Date(2026, 9, 10);
  it("defaults to six months back, in local dates", () => {
    expect(defaultCompareRange(now)).toEqual({ start: "2026-04-10", end: "2026-10-10" });
  });
  it("builds the preset ranges", () => {
    expect(rangeEndingAt(now, 3)).toEqual({ start: "2026-07-10", end: "2026-10-10" });
    expect(rangeEndingAt(now, 12)).toEqual({ start: "2025-10-10", end: "2026-10-10" });
  });
});

describe("compareRangeError", () => {
  it.each([
    ["2026-1", "2026-10-10", "Start date must be YYYY-MM-DD"],
    ["2026-02-30", "2026-10-10", "Start date must be YYYY-MM-DD"],
    ["2026-04-10", "2026-10", "End date must be YYYY-MM-DD"],
    ["2026-10-11", "2026-10-10", "Start date must be on or before the end date"],
    ["2026-04-10", "2026-10-10", null],
  ])("%s → %s", (start, end, err) => {
    expect(compareRangeError(start, end)).toBe(err);
  });
});

describe("compareSuggestions", () => {
  it("matches symbol or name, skips selected, caps the list", () => {
    expect(compareSuggestions(TICKERS, "com", []).map((t) => t.symbol)).toEqual(["COMI", "ETEL"]);
    expect(compareSuggestions(TICKERS, "com", ["COMI"]).map((t) => t.symbol)).toEqual(["ETEL"]);
    expect(compareSuggestions(TICKERS, "a", [], 2)).toHaveLength(2);
    expect(compareSuggestions(TICKERS, "  ", [])).toEqual([]);
  });
});

describe("addCompareSymbol / canCompare", () => {
  it("adds once and stops at the maximum", () => {
    expect(addCompareSymbol(["COMI"], "TMGH")).toEqual(["COMI", "TMGH"]);
    expect(addCompareSymbol(["COMI"], "COMI")).toEqual(["COMI"]);
    expect(addCompareSymbol(["A", "B", "C", "D", "E"], "F")).toEqual(["A", "B", "C", "D", "E"]);
  });
  it("needs two stocks and a valid range", () => {
    expect(canCompare(["COMI"], "2026-04-10", "2026-10-10")).toBe(false);
    expect(canCompare(["COMI", "TMGH"], "2026-04-10", "2026-10-10")).toBe(true);
    expect(canCompare(["COMI", "TMGH"], "2026-4", "2026-10-10")).toBe(false);
  });
});

describe("buildCompareSeries", () => {
  it("keeps the selection order and skips symbols without data", () => {
    expect(buildCompareSeries(COMPARE, ["TMGH", "COMI", "NOPE"])).toEqual([
      { symbol: "TMGH", values: [100, 95] },
      { symbol: "COMI", values: [100, 112.34] },
    ]);
    expect(buildCompareSeries(null, ["COMI"])).toEqual([]);
  });
});
```

`src/features/market/__tests__/CompareScreen.test.tsx`:

```tsx
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils/render";
import { CompareScreen } from "../CompareScreen";
import { defaultCompareRange, rangeEndingAt } from "../logic/compare";
import { fail, mockMarketApi, requestsTo, type Route } from "../testing/api";
import { lastChartProps } from "../testing/chartsMock";
import { COMPARE } from "../testing/fixtures";

jest.mock("expo-router", () => require("@/features/market/testing/expoRouterMock"));
jest.mock("@/charts", () => require("@/features/market/testing/chartsMock"));

beforeEach(() => jest.clearAllMocks());

async function renderCompare(routes: Record<string, Route> = {}) {
  const fetchMock = mockMarketApi({ "/compare": COMPARE, ...routes });
  await renderWithProviders(<CompareScreen />);
  return fetchMock;
}

async function addSymbol(query: string, symbol: string) {
  fireEvent.changeText(screen.getByPlaceholderText("Add symbol..."), query);
  fireEvent.press(await screen.findByTestId(`suggestion-${symbol}`));
}

it("compares two stocks over the default six months", async () => {
  const fetchMock = await renderCompare();
  await addSymbol("comi", "COMI");
  await addSymbol("talaat", "TMGH");
  fireEvent.press(screen.getByText("Compare"));

  expect(await screen.findByText("+12.34%")).toBeTruthy();
  expect(screen.getByText("-5.00%")).toBeTruthy();
  expect(screen.getByText("2.50%")).toBeTruthy();
  expect(screen.getByText("-8.20%")).toBeTruthy();

  const [req] = requestsTo(fetchMock, "/compare");
  const range = defaultCompareRange(new Date());
  expect(req.searchParams.get("symbols")).toBe("COMI,TMGH");
  expect(req.searchParams.get("interval")).toBe("Daily");
  expect(req.searchParams.get("start")).toBe(range.start);
  expect(req.searchParams.get("end")).toBe(range.end);
  expect(lastChartProps("CompareChart")).toMatchObject({
    dates: COMPARE.dates,
    series: [
      { symbol: "COMI", values: [100, 112.34] },
      { symbol: "TMGH", values: [100, 95] },
    ],
  });
});

it("needs at least two stocks", async () => {
  const fetchMock = await renderCompare();
  await addSymbol("comi", "COMI");
  fireEvent.press(screen.getByText("Compare"));
  expect(requestsTo(fetchMock, "/compare")).toHaveLength(0);
  expect(screen.getByText("Select at least 2 stocks and tap Compare to see results.")).toBeTruthy();
});

it("does not request with an invalid range", async () => {
  const fetchMock = await renderCompare();
  await addSymbol("comi", "COMI");
  await addSymbol("talaat", "TMGH");
  fireEvent.changeText(screen.getByTestId("compare-start"), "2026-1");
  expect(screen.getByText("Start date must be YYYY-MM-DD")).toBeTruthy();
  fireEvent.press(screen.getByText("Compare"));
  fireEvent.changeText(screen.getByTestId("compare-start"), "2026-02-30");
  fireEvent.press(screen.getByText("Compare"));
  fireEvent.changeText(screen.getByTestId("compare-start"), "2099-01-01");
  expect(screen.getByText("Start date must be on or before the end date")).toBeTruthy();
  fireEvent.press(screen.getByText("Compare"));
  expect(requestsTo(fetchMock, "/compare")).toHaveLength(0);
});

it("fills the range from a preset", async () => {
  await renderCompare();
  fireEvent.press(screen.getByText("1Y"));
  expect(screen.getByTestId("compare-start").props.value).toBe(rangeEndingAt(new Date(), 12).start);
});

it("removes a chip and hides the input at five stocks", async () => {
  await renderCompare();
  for (const [q, s] of [["comi", "COMI"], ["tmgh", "TMGH"], ["etel", "ETEL"], ["abuk", "ABUK"]]) {
    await addSymbol(q, s);
  }
  fireEvent.press(screen.getByLabelText("Remove ETEL"));
  expect(screen.queryByLabelText("Remove ETEL")).toBeNull();
  await addSymbol("etel", "ETEL");
  await addSymbol("megm", "MEGM");
  expect(screen.queryByPlaceholderText("Add symbol...")).toBeNull();
});

it("shows the API error", async () => {
  await renderCompare({ "/compare": fail(500, "No data for range") });
  await addSymbol("comi", "COMI");
  await addSymbol("talaat", "TMGH");
  fireEvent.press(screen.getByText("Compare"));
  expect(await screen.findByText("No data for range")).toBeTruthy();
  await waitFor(() => expect(screen.queryByTestId("chart-CompareChart")).toBeNull());
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx jest src/features/market/logic/__tests__/compare.test.ts src/features/market/__tests__/CompareScreen.test.tsx`
Expected: FAIL — `Cannot find module '../compare'` and `'../CompareScreen'`.

- [ ] **Step 3: Implement the logic, screen and route**

`src/features/market/logic/compare.ts`:

```ts
import {
  COMPARE_DEFAULT_LOOKBACK_MONTHS,
  COMPARE_SUGGESTIONS_LIMIT,
  MAX_COMPARE_SYMBOLS,
  MIN_COMPARE_SYMBOLS,
} from "@/shared/constants";
import type { CompareResponse, Ticker } from "@/shared/types";
import { localDateKey } from "./marketClock";

/** Strict YYYY-MM-DD that names a real calendar day (the web used <input type="date">). */
export function isIsoDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/** `months` back from `now`, both ends as LOCAL dates. */
export function rangeEndingAt(now: Date, months: number): { start: string; end: string } {
  const d = new Date(now);
  d.setMonth(d.getMonth() - months);
  return { start: localDateKey(d), end: localDateKey(now) };
}

export function defaultCompareRange(now: Date) {
  return rangeEndingAt(now, COMPARE_DEFAULT_LOOKBACK_MONTHS);
}

/** One-tap ranges that make the typed date field bearable on a phone. */
export const RANGE_PRESETS = [
  { label: "3M", months: 3 },
  { label: "6M", months: 6 },
  { label: "1Y", months: 12 },
] as const;

export function compareRangeError(start: string, end: string): string | null {
  if (!isIsoDate(start)) return "Start date must be YYYY-MM-DD";
  if (!isIsoDate(end)) return "End date must be YYYY-MM-DD";
  if (start > end) return "Start date must be on or before the end date";
  return null;
}

export function compareSuggestions(
  tickers: Ticker[],
  input: string,
  selected: string[],
  limit: number = COMPARE_SUGGESTIONS_LIMIT
): Ticker[] {
  const q = input.trim().toLowerCase();
  if (!q) return [];
  return tickers
    .filter(
      (t) =>
        !selected.includes(t.symbol) &&
        (t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q))
    )
    .slice(0, limit);
}

export function addCompareSymbol(selected: string[], sym: string, max: number = MAX_COMPARE_SYMBOLS): string[] {
  if (selected.length >= max || selected.includes(sym)) return selected;
  return [...selected, sym];
}

export function canCompare(selected: string[], start: string, end: string): boolean {
  return selected.length >= MIN_COMPARE_SYMBOLS && compareRangeError(start, end) === null;
}

export interface CompareSeries {
  symbol: string;
  values: (number | null)[];
}

/** The chart's series, in selection order; a symbol the response lacks is skipped. */
export function buildCompareSeries(data: CompareResponse | null, selected: string[]): CompareSeries[] {
  if (!data) return [];
  return selected
    .filter((sym) => Array.isArray(data[sym]))
    .map((sym) => ({ symbol: sym, values: data[sym] as (number | null)[] }));
}
```

`src/features/market/CompareScreen.tsx`:

```tsx
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { CompareChart } from "@/charts";
import { useTickers } from "@/providers/tickers";
import { fetchComparison } from "@/shared/api";
import { MAX_COMPARE_SYMBOLS } from "@/shared/constants";
import type { CompareResponse } from "@/shared/types";
import { AppText, Button, ChartSkeleton, EmptyState, IconButton, LearnTerm, Pill, PillRow, Screen, TextField } from "@/ui";
import {
  addCompareSymbol,
  buildCompareSeries,
  canCompare,
  compareRangeError,
  compareSuggestions,
  defaultCompareRange,
  RANGE_PRESETS,
  rangeEndingAt,
} from "./logic/compare";
import { RefreshableScroll } from "./RefreshableScroll";

/** Port of web `compare/page.tsx`, mobile branch (stat cards, not the table). */
export function CompareScreen() {
  const { tickers } = useTickers();
  const [initial] = useState(() => defaultCompareRange(new Date()));
  const [selected, setSelected] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [data, setData] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestions = useMemo(() => compareSuggestions(tickers, input, selected), [tickers, input, selected]);
  const rangeError = compareRangeError(start, end);
  const ready = canCompare(selected, start, end);
  const series = useMemo(() => buildCompareSeries(data, selected), [data, selected]);

  const add = (sym: string) => {
    setSelected((prev) => addCompareSymbol(prev, sym));
    setInput("");
  };

  const compare = () => {
    if (!ready || loading) return;
    setLoading(true);
    setError(null);
    fetchComparison(selected, "Daily", start, end)
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Request failed"))
      .finally(() => setLoading(false));
  };

  const applyPreset = (months: number) => {
    const r = rangeEndingAt(new Date(), months);
    setStart(r.start);
    setEnd(r.end);
  };

  return (
    <Screen scroll={false}>
      <RefreshableScroll contentClassName="gap-4 p-4 pb-10">
        <AppText className="text-sm text-white/40">Select 2-5 stocks to compare their performance over time.</AppText>

        <View className="gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4">
          {selected.length > 0 && (
            <View className="flex-row flex-wrap gap-2">
              {selected.map((sym) => (
                <View key={sym} className="flex-row items-center gap-1 rounded-full border border-accent/20 bg-accent/10 pl-3">
                  <AppText className="font-mono text-xs text-accent">{sym}</AppText>
                  <IconButton icon="close" accessibilityLabel={`Remove ${sym}`} onPress={() => setSelected((p) => p.filter((s) => s !== sym))} />
                </View>
              ))}
            </View>
          )}

          {selected.length < MAX_COMPARE_SYMBOLS && (
            <View className="gap-1">
              <TextField
                label="Add symbol"
                placeholder="Add symbol..."
                value={input}
                onChangeText={setInput}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={() => suggestions[0] && add(suggestions[0].symbol)}
              />
              {suggestions.map((t) => (
                <Pressable
                  key={t.symbol}
                  testID={`suggestion-${t.symbol}`}
                  accessibilityRole="button"
                  onPress={() => add(t.symbol)}
                  className="min-h-[44px] flex-row items-center gap-2 rounded-lg px-3"
                >
                  <AppText className="font-mono text-xs text-white">{t.symbol}</AppText>
                  <AppText numberOfLines={1} className="flex-1 text-[11px] text-white/40">{t.name}</AppText>
                </Pressable>
              ))}
            </View>
          )}

          <View className="flex-row gap-3">
            <View className="flex-1">
              <TextField
                label="From"
                testID="compare-start"
                placeholder="YYYY-MM-DD"
                value={start}
                onChangeText={setStart}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
            </View>
            <View className="flex-1">
              <TextField
                label="To"
                testID="compare-end"
                placeholder="YYYY-MM-DD"
                value={end}
                onChangeText={setEnd}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
            </View>
          </View>
          {rangeError && <AppText className="text-xs text-loss">{rangeError}</AppText>}
          <PillRow>
            {RANGE_PRESETS.map((p) => (
              <Pill key={p.label} label={p.label} onPress={() => applyPreset(p.months)} />
            ))}
          </PillRow>

          <Button label="Compare" loading={loading} disabled={!ready || loading} onPress={compare} />
        </View>

        {error && (
          <View className="rounded-xl border border-loss/20 bg-loss/5 p-4">
            <AppText className="text-sm text-loss">{error}</AppText>
          </View>
        )}

        {loading ? (
          <ChartSkeleton height={300} />
        ) : data && !error ? (
          <View className="gap-4">
            <CompareChart dates={data.dates} series={series} height={300} />
            {data.stats && Object.keys(data.stats).length > 0 && (
              <View className="gap-3">
                <View className="flex-row flex-wrap gap-x-4 gap-y-1">
                  <LearnTerm term="Total Return" explanation="The total percentage gain or loss over the selected period. Calculated as (end_price / start_price - 1) * 100.">
                    Return
                  </LearnTerm>
                  <LearnTerm term="Volatility" explanation="Standard deviation of daily returns. Higher = more price swings = more risk. Lower = calmer price action.">
                    Volatility
                  </LearnTerm>
                  <LearnTerm term="Max Drawdown" explanation="The worst peak-to-trough decline during the period. If max drawdown is -20%, the stock fell 20% from its highest point. Shows the worst-case loss scenario.">
                    Max DD
                  </LearnTerm>
                </View>
                {Object.entries(data.stats).map(([sym, s]) => (
                  <View key={sym} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                    <AppText className="mb-2 font-mono text-sm text-white">{sym}</AppText>
                    <View className="flex-row gap-3">
                      <View className="flex-1">
                        <AppText className="text-xs text-white/40">Return</AppText>
                        <AppText className={`font-mono text-xs ${s.total_return >= 0 ? "text-gain" : "text-loss"}`}>
                          {`${s.total_return >= 0 ? "+" : ""}${s.total_return.toFixed(2)}%`}
                        </AppText>
                      </View>
                      <View className="flex-1">
                        <AppText className="text-xs text-white/40">Volatility</AppText>
                        <AppText className="font-mono text-xs text-white/60">{`${(s.volatility * 100).toFixed(2)}%`}</AppText>
                      </View>
                      <View className="flex-1">
                        <AppText className="text-xs text-white/40">Max DD</AppText>
                        <AppText className="font-mono text-xs text-loss">{`${s.max_drawdown.toFixed(2)}%`}</AppText>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : !error ? (
          <EmptyState title="Select at least 2 stocks and tap Compare to see results." />
        ) : null}
      </RefreshableScroll>
    </Screen>
  );
}
```

`src/app/compare.tsx` (replace the Plan 1 shell entirely):

```tsx
import { Stack } from "expo-router";
import { CompareScreen } from "@/features/market/CompareScreen";

export default function CompareRoute() {
  return (
    <>
      <Stack.Screen options={{ title: "Compare Stocks" }} />
      <CompareScreen />
    </>
  );
}
```

Add to `src/__tests__/routes/market-routes.test.tsx` — the import goes into the import block at the top, the mock and test at the bottom:

```tsx
import CompareRoute from "@/app/compare";
```

```tsx
jest.mock("@/features/market/CompareScreen", () => {
  const { createElement: h } = require("react");
  const { Text } = require("react-native");
  return { CompareScreen: () => h(Text, null, "compare-screen") };
});

it("mounts the compare screen", async () => {
  renderRouter({ _layout: layout, compare: CompareRoute }, { initialUrl: "/compare" });
  expect(await screen.findByText("compare-screen")).toBeTruthy();
});
```

- [ ] **Step 4: Run them to verify they pass**

Run: `npx jest src/features/market/logic/__tests__/compare.test.ts src/features/market/__tests__/CompareScreen.test.tsx src/__tests__/routes/market-routes.test.tsx`
Expected: PASS.

- [ ] **Step 5: Verify and commit**

Run: `npm run verify`
Expected: exits 0.

```bash
git add src/features/market src/app/compare.tsx src/__tests__/routes/market-routes.test.tsx
git commit -m "feat(market): compare screen with validated date fields and range presets

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XDkAB7UCK8WyT267W5ZxNV"
```

---

### Task 12: News — logic, list, screen and route

**Files:**
- Create: `src/features/market/logic/news.ts`
- Create: `src/features/market/NewsList.tsx`
- Create: `src/features/market/NewsScreen.tsx`
- Modify (replace contents): `src/app/(tabs)/news.tsx`
- Modify: `src/features/market/testing/fixtures.ts` (append `NEWS`)
- Modify: `src/__tests__/routes/market-routes.test.tsx` (news route)
- Test: `src/features/market/logic/__tests__/news.test.ts`
- Test: `src/features/market/__tests__/NewsScreen.test.tsx`

**Interfaces:**
- Consumes: Task 2 (`useKeyedFetch`, `useNow`), Task 10 (`RefreshableScroll`), `@/shared/api` (`fetchNews`), `@/shared/types` (`NewsItem`, `NewsResponse`, `NewsCoverage`), `react-native` `Linking`, `@expo/vector-icons` (`Ionicons`), `@/lib/links` (`stockHref`).
- Produces: `relativeAge(iso, now?)`, `isFresh(iso, now?)`, `sourceName(provider)`, `newsCaveats(data)`, `yourStocksEmptyNote(coverage)`; `NewsList({ title, items, emptyNote, now })`; `NewsScreen()` (testID `news-scroll`, refresh `news-scroll-refresh`).

- [ ] **Step 1: Append the fixture and write the failing tests**

Append to `src/features/market/testing/fixtures.ts` (add `NewsResponse` to the `@/shared/types` import):

```ts
const HOUR = 3_600_000;
const hoursAgoIso = (h: number) => new Date(Date.now() - h * HOUR).toISOString();

export const NEWS: NewsResponse = {
  your_stocks: [
    { id: "n1", title: "CIB posts record quarterly profit", provider: "reuters", published_at: hoursAgoIso(2), url: "https://www.tradingview.com/news/n1", symbols: ["COMI"] },
    { id: "n2", title: "Sodic signs facility with CIB", provider: "zawya", published_at: hoursAgoIso(72), url: "https://www.tradingview.com/news/n2", symbols: ["OCDI", "COMI"] },
  ],
  market: [
    { id: "m1", title: "EGX30 closes higher", provider: "lse", published_at: hoursAgoIso(30), url: "https://www.tradingview.com/news/m1", symbols: [] },
  ],
  coverage: {
    symbols_requested: 5,
    symbols_with_news: 3,
    symbols_without_news: ["ESRS", "EKHO"],
    symbols_over_cap: [],
    window_days: 30,
  },
  fetched_at: new Date().toISOString(),
  status: "partial",
};
```

`src/features/market/logic/__tests__/news.test.ts`:

```ts
import { NEWS } from "@/features/market/testing/fixtures";
import { isFresh, newsCaveats, relativeAge, sourceName, yourStocksEmptyNote } from "../news";

const now = new Date("2026-10-10T12:00:00Z");
const ago = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();

describe("relativeAge", () => {
  it("states every item's real age", () => {
    expect(relativeAge(ago(0.5), now)).toBe("just now");
    expect(relativeAge(ago(5), now)).toBe("5h ago");
    expect(relativeAge(ago(72), now)).toBe("3d ago");
    expect(relativeAge("not a date", now)).toBe("");
  });
});

describe("isFresh", () => {
  it("is true under a day old", () => {
    expect(isFresh(ago(23), now)).toBe(true);
    expect(isFresh(ago(25), now)).toBe(false);
  });
});

describe("sourceName", () => {
  it("title-cases slugs and keeps known acronyms", () => {
    expect(sourceName("dow-jones")).toBe("Dow Jones");
    expect(sourceName("lse")).toBe("LSE");
    expect(sourceName("reuters")).toBe("Reuters");
    expect(sourceName(null)).toBe("Wire");
  });
});

describe("newsCaveats", () => {
  it("keeps what is missing visible", () => {
    expect(newsCaveats(NEWS)).toEqual(["2 of your 5 stocks had no news (ESRS, EKHO)", "some sources timed out"]);
    expect(
      newsCaveats({ ...NEWS, status: "ok", coverage: { ...NEWS.coverage, symbols_without_news: [], symbols_over_cap: ["X", "Y"] } })
    ).toEqual(["2 more over the fetch limit"]);
  });
});

describe("yourStocksEmptyNote", () => {
  it("tells a new user how to get news, and an existing one that it was quiet", () => {
    expect(yourStocksEmptyNote({ ...NEWS.coverage, symbols_requested: 0 })).toBe(
      "Add a holding or watch a stock, and news about it shows up here."
    );
    expect(yourStocksEmptyNote(NEWS.coverage)).toBe(
      "Nothing in the last 30 days for the stocks you hold or watch."
    );
  });
});
```

`src/features/market/__tests__/NewsScreen.test.tsx`:

```tsx
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Linking } from "react-native";
import { router } from "expo-router";
import { stockHref } from "@/lib/links";
import { renderWithProviders } from "@/test-utils/render";
import { NewsScreen } from "../NewsScreen";
import { fail, mockMarketApi, requestsTo } from "../testing/api";
import { NEWS } from "../testing/fixtures";

jest.mock("expo-router", () => require("@/features/market/testing/expoRouterMock"));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Linking, "openURL").mockResolvedValue(true);
});

it("shows your stocks and the market, with sources, ages and caveats", async () => {
  mockMarketApi({ "/news": NEWS });
  await renderWithProviders(<NewsScreen />);
  expect(await screen.findByText("CIB posts record quarterly profit")).toBeTruthy();
  expect(screen.getByText("Your holdings and the market, last 30 days")).toBeTruthy();
  expect(screen.getByText("2 of your 5 stocks had no news (ESRS, EKHO) · some sources timed out")).toBeTruthy();
  expect(screen.getByText("Reuters")).toBeTruthy();
  expect(screen.getByText("LSE")).toBeTruthy();
  expect(screen.getByText("2h ago")).toBeTruthy();
  expect(screen.getByText("3d ago")).toBeTruthy();
  expect(screen.getByText("EGX30 closes higher")).toBeTruthy();
});

it("opens a headline off-app and a ticker in-app", async () => {
  mockMarketApi({ "/news": NEWS });
  await renderWithProviders(<NewsScreen />);
  fireEvent.press(await screen.findByText("CIB posts record quarterly profit"));
  expect(Linking.openURL).toHaveBeenCalledWith("https://www.tradingview.com/news/n1");
  fireEvent.press(screen.getByText("OCDI"));
  expect(router.push).toHaveBeenCalledWith(stockHref("OCDI"));
});

it("explains an empty section", async () => {
  mockMarketApi({
    "/news": { ...NEWS, your_stocks: [], coverage: { ...NEWS.coverage, symbols_requested: 0, symbols_without_news: [] }, status: "ok" },
  });
  await renderWithProviders(<NewsScreen />);
  expect(await screen.findByText("Add a holding or watch a stock, and news about it shows up here.")).toBeTruthy();
});

it("says when the feed did not load", async () => {
  mockMarketApi({ "/news": fail(502, "upstream down") });
  await renderWithProviders(<NewsScreen />);
  expect(await screen.findByText("The news feed didn't load.")).toBeTruthy();
  expect(screen.getByText("upstream down")).toBeTruthy();
});

it("pull-to-refresh fetches again", async () => {
  const fetchMock = mockMarketApi({ "/news": NEWS });
  await renderWithProviders(<NewsScreen />);
  await screen.findByText("CIB posts record quarterly profit");
  fireEvent(screen.getByTestId("news-scroll-refresh"), "refresh");
  await waitFor(() => expect(requestsTo(fetchMock, "/news")).toHaveLength(2));
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx jest src/features/market/logic/__tests__/news.test.ts src/features/market/__tests__/NewsScreen.test.tsx`
Expected: FAIL — `Cannot find module '../news'` and `'../NewsScreen'`.

- [ ] **Step 3: Implement the logic, list, screen and route**

`src/features/market/logic/news.ts`:

```ts
import type { NewsCoverage, NewsResponse } from "@/shared/types";

/** "3d ago" — every item states its real age; 3 and 29 days old are different facts. */
export function relativeAge(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const hours = Math.floor((now.getTime() - then) / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Under a day old — the feed's freshness dot. */
export function isFresh(iso: string, now: Date = new Date()): boolean {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return false;
  return now.getTime() - then < 24 * 3_600_000;
}

const ACRONYMS = new Set(["lse", "sec", "imf", "gdr", "pr"]);

/** "dow-jones" → "Dow Jones", "lse" → "LSE". */
export function sourceName(provider: string | null): string {
  if (!provider) return "Wire";
  return provider
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => (ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

/** What ISN'T here, kept visible rather than silently dropped. */
export function newsCaveats(data: NewsResponse): string[] {
  const { coverage } = data;
  const out: string[] = [];
  const quiet = coverage.symbols_without_news.length;
  if (quiet > 0) {
    out.push(
      `${quiet} of your ${coverage.symbols_requested} stocks had no news (${coverage.symbols_without_news.join(", ")})`
    );
  }
  const overCap = coverage.symbols_over_cap.length;
  if (overCap > 0) out.push(`${overCap} more over the fetch limit`);
  if (data.status === "partial") out.push("some sources timed out");
  return out;
}

export function yourStocksEmptyNote(coverage: NewsCoverage): string {
  return coverage.symbols_requested === 0
    ? "Add a holding or watch a stock, and news about it shows up here."
    : `Nothing in the last ${coverage.window_days} days for the stocks you hold or watch.`;
}
```

`src/features/market/NewsList.tsx`:

```tsx
import { Ionicons } from "@expo/vector-icons";
import { Linking, Pressable, View } from "react-native";
import { router } from "expo-router";
import { stockHref } from "@/lib/links";
import type { NewsItem } from "@/shared/types";
import { AppText } from "@/ui";
import { isFresh, relativeAge, sourceName } from "./logic/news";

/**
 * No gain/loss colour anywhere: a headline carries no direction and no
 * sentiment is computed. The monogram is monochrome for the same reason.
 */
function NewsCard({ item, now }: { item: NewsItem; now: Date }) {
  const name = sourceName(item.provider);
  return (
    <View className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
      <View className="flex-row items-center gap-2.5">
        <View className="h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.06]">
          <AppText className="font-mono-semibold text-[11px] text-white/70">{name.charAt(0).toUpperCase()}</AppText>
        </View>
        <AppText numberOfLines={1} className="flex-1 font-sans-medium text-[13px] text-white/70">{name}</AppText>
        <View className="flex-row items-center gap-1.5">
          {isFresh(item.published_at, now) && (
            <View accessibilityLabel="Published in the last 24 hours" className="h-1.5 w-1.5 rounded-full bg-accent" />
          )}
          <AppText className="font-mono text-[11px] text-white/40">{relativeAge(item.published_at, now)}</AppText>
        </View>
      </View>

      {/* The story lives on TradingView: it opens off-app, and says so. */}
      <Pressable
        accessibilityRole="link"
        accessibilityHint="Opens on tradingview.com"
        onPress={() => void Linking.openURL(item.url)}
        className="mt-2.5 min-h-[44px] flex-row items-start gap-2"
      >
        <AppText className="flex-1 font-sans-semibold text-[15px] leading-snug text-white/95">{item.title}</AppText>
        <Ionicons name="open-outline" size={14} color="rgba(255,255,255,0.3)" />
      </Pressable>

      {item.symbols.length > 0 && (
        <View className="mt-3 flex-row flex-wrap gap-2">
          {item.symbols.map((s) => (
            <Pressable
              key={s}
              accessibilityRole="link"
              onPress={() => router.push(stockHref(s))}
              className="min-h-[44px] justify-center rounded-lg bg-accent/10 px-3"
            >
              <AppText className="font-mono text-xs text-accent/90">{s}</AppText>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export function NewsList({ title, items, emptyNote, now }: { title: string; items: NewsItem[]; emptyNote: string; now: Date }) {
  return (
    <View className="mb-8">
      <View className="mb-3 flex-row items-baseline gap-2.5">
        <AppText className="font-sans-semibold text-lg text-white">{title}</AppText>
        <AppText className="font-mono text-xs text-white/35">{String(items.length)}</AppText>
      </View>
      {items.length === 0 ? (
        <View className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-5">
          <AppText className="text-sm leading-relaxed text-white/50">{emptyNote}</AppText>
        </View>
      ) : (
        <View className="gap-3">
          {items.map((item) => (
            <NewsCard key={item.id} item={item} now={now} />
          ))}
        </View>
      )}
    </View>
  );
}
```

`src/features/market/NewsScreen.tsx`:

```tsx
import { View } from "react-native";
import { fetchNews } from "@/shared/api";
import { AppText, CardSkeleton, Screen } from "@/ui";
import { useKeyedFetch } from "./hooks/useKeyedFetch";
import { useNow } from "./hooks/useNow";
import { newsCaveats, yourStocksEmptyNote } from "./logic/news";
import { NewsList } from "./NewsList";
import { RefreshableScroll } from "./RefreshableScroll";

/** Port of web `news/page.tsx`; pull-to-refresh re-requests the feed. */
export function NewsScreen() {
  const news = useKeyedFetch("news", fetchNews);
  const now = new Date(useNow(60_000));
  const data = news.data;

  return (
    <Screen scroll={false} edges={["top"]}>
      <RefreshableScroll testID="news-scroll" refreshing={news.refreshing} onRefresh={news.refresh} contentClassName="px-4 py-6 pb-10">
        <AppText className="font-sans-bold text-2xl text-white">News</AppText>

        {news.loading ? (
          <View className="mt-6 gap-3">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </View>
        ) : news.error ? (
          <View className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <AppText className="text-sm text-white/70">The news feed didn&apos;t load.</AppText>
            <AppText className="mt-1 text-xs text-white/40">{news.error}</AppText>
          </View>
        ) : data ? (
          <>
            <View className="mb-6 mt-1">
              <AppText className="text-xs text-white/40">
                {`Your holdings and the market, last ${data.coverage.window_days} days`}
              </AppText>
              {newsCaveats(data).length > 0 && (
                <AppText className="mt-1.5 text-[11px] leading-relaxed text-white/30">{newsCaveats(data).join(" · ")}</AppText>
              )}
            </View>
            <NewsList title="Your stocks" items={data.your_stocks} emptyNote={yourStocksEmptyNote(data.coverage)} now={now} />
            <NewsList
              title="Market"
              items={data.market}
              emptyNote={`No EGX30 news in the last ${data.coverage.window_days} days.`}
              now={now}
            />
          </>
        ) : null}
      </RefreshableScroll>
    </Screen>
  );
}
```

`src/app/(tabs)/news.tsx` (replace the Plan 1 shell entirely):

```tsx
import { NewsScreen } from "@/features/market/NewsScreen";

export default function NewsRoute() {
  return <NewsScreen />;
}
```

Add to `src/__tests__/routes/market-routes.test.tsx` (import at the top, mock and test at the bottom):

```tsx
import NewsRoute from "@/app/(tabs)/news";
```

```tsx
jest.mock("@/features/market/NewsScreen", () => {
  const { createElement: h } = require("react");
  const { Text } = require("react-native");
  return { NewsScreen: () => h(Text, null, "news-screen") };
});

it("mounts the news screen", async () => {
  renderRouter({ _layout: layout, news: NewsRoute }, { initialUrl: "/news" });
  expect(await screen.findByText("news-screen")).toBeTruthy();
});
```

- [ ] **Step 4: Run them to verify they pass**

Run: `npx jest src/features/market/logic/__tests__/news.test.ts src/features/market/__tests__/NewsScreen.test.tsx src/__tests__/routes/market-routes.test.tsx`
Expected: PASS.

- [ ] **Step 5: Verify and commit**

Run: `npm run verify`
Expected: exits 0.

```bash
git add src/features/market src/app/\(tabs\)/news.tsx src/__tests__/routes/market-routes.test.tsx
git commit -m "feat(market): news screen with source marks, ages, caveats and pull-to-refresh

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XDkAB7UCK8WyT267W5ZxNV"
```

---

### Task 13: Dividend calendar — logic, screen and route

**Files:**
- Create: `src/features/market/logic/dividendCalendar.ts`
- Create: `src/features/market/DividendCalendarScreen.tsx`
- Modify (replace contents): `src/app/dividends.tsx`
- Modify: `src/features/market/testing/fixtures.ts` (append `CALENDAR`)
- Modify: `src/__tests__/routes/market-routes.test.tsx` (dividends route)
- Test: `src/features/market/logic/__tests__/dividendCalendar.test.ts`
- Test: `src/features/market/__tests__/DividendCalendarScreen.test.tsx`

**Interfaces:**
- Consumes: Task 1 (`MONTHS_ABBR`), Task 2 (`useKeyedFetch`), Task 10 (`RefreshableScroll`), `@/shared/api` (`fetchDividendCalendar`), `@/shared/types` (`DividendCalendarStock`), `@/lib/links` (`stockHref`), `@/ui`.
- Produces: `MONTHS`, `WEEKDAYS`, `MonthView`, `firstWeekday(y, m)`, `daysInMonth(y, m)`, `monthCells(y, m)`, `isoDay(y, m, day)`, `shiftMonth(v, delta)`, `indexCalendar(stocks)`, `viewFromIso(iso)`, `listedFor(stocks, byDate, view, selectedDay)`, `monthTitle(v)`, `dayTitle(iso)`, `yearOptions(years, viewYear)`; `DividendCalendarScreen()` (day cells `day-YYYY-MM-DD`).

- [ ] **Step 1: Append the fixture and write the failing tests**

Append to `src/features/market/testing/fixtures.ts` (add `DividendCalendarResponse` to the `@/shared/types` import):

```ts
export const CALENDAR: DividendCalendarResponse = {
  stocks: [
    { symbol: "COMI", name: "Commercial International Bank", dividend_yield: 3.2, ex_date: "2026-04-07", amount: 6 },
    { symbol: "ETEL", name: "Telecom Egypt", dividend_yield: 5.1, ex_date: "2026-04-07", amount: 1.5 },
    { symbol: "SWDY", name: null, dividend_yield: null, ex_date: "2026-04-20", amount: 0.9 },
    { symbol: "ABUK", name: "ABUK", dividend_yield: 8.5, ex_date: "2025-05-11", amount: 12 },
  ],
  count: 4,
  as_of: "2026-10-09",
  status: "ok",
};
```

`src/features/market/logic/__tests__/dividendCalendar.test.ts`:

```ts
import { CALENDAR } from "@/features/market/testing/fixtures";
import {
  dayTitle,
  daysInMonth,
  firstWeekday,
  indexCalendar,
  listedFor,
  monthCells,
  monthTitle,
  shiftMonth,
  viewFromIso,
  yearOptions,
} from "../dividendCalendar";

describe("month maths", () => {
  it("knows where a month starts and how long it is", () => {
    expect(firstWeekday(2026, 8)).toBe(2); // 1 Sep 2026 is a Tuesday
    expect(daysInMonth(2026, 8)).toBe(30);
    expect(daysInMonth(2028, 1)).toBe(29);
  });
  it("lays out a Sunday-first grid", () => {
    const cells = monthCells(2026, 8);
    expect(cells).toHaveLength(32);
    expect(cells.slice(0, 3)).toEqual([null, null, 1]);
    expect(cells[cells.length - 1]).toBe(30);
  });
  it("pages across year boundaries", () => {
    expect(shiftMonth({ y: 2026, m: 0 }, -1)).toEqual({ y: 2025, m: 11 });
    expect(shiftMonth({ y: 2026, m: 11 }, 1)).toEqual({ y: 2027, m: 0 });
  });
});

describe("indexing and listing", () => {
  const { byDate, years, latest } = indexCalendar(CALENDAR.stocks);
  it("indexes ex-dates and finds the latest month", () => {
    expect(byDate.get("2026-04-07")?.map((s) => s.symbol)).toEqual(["COMI", "ETEL"]);
    expect(years).toEqual([2026, 2025]);
    expect(latest).toBe("2026-04-20");
    expect(viewFromIso(latest)).toEqual({ y: 2026, m: 3 });
    expect(viewFromIso("")).toBeNull();
  });
  it("lists a whole month newest first, or one selected day", () => {
    expect(listedFor(CALENDAR.stocks, byDate, { y: 2026, m: 3 }, null).map((s) => s.symbol)).toEqual(["SWDY", "COMI", "ETEL"]);
    expect(listedFor(CALENDAR.stocks, byDate, { y: 2026, m: 3 }, "2026-04-07").map((s) => s.symbol)).toEqual(["COMI", "ETEL"]);
    expect(listedFor(CALENDAR.stocks, byDate, { y: 2026, m: 2 }, null)).toEqual([]);
  });
});

describe("labels", () => {
  it("names months and days", () => {
    expect(monthTitle({ y: 2026, m: 3 })).toBe("April 2026");
    expect(dayTitle("2026-04-07")).toBe("7 Apr 2026");
  });
  it("always offers the viewed year", () => {
    expect(yearOptions([2026, 2025], 2024)).toEqual([2024, 2026, 2025]);
    expect(yearOptions([2026, 2025], 2025)).toEqual([2026, 2025]);
  });
});
```

`src/features/market/__tests__/DividendCalendarScreen.test.tsx`:

```tsx
import { fireEvent, screen, within } from "@testing-library/react-native";
import { router } from "expo-router";
import { stockHref } from "@/lib/links";
import { renderWithProviders } from "@/test-utils/render";
import { DividendCalendarScreen } from "../DividendCalendarScreen";
import { fail, mockMarketApi } from "../testing/api";
import { CALENDAR } from "../testing/fixtures";

jest.mock("expo-router", () => require("@/features/market/testing/expoRouterMock"));

beforeEach(() => jest.clearAllMocks());

async function renderCalendar() {
  mockMarketApi({ "/dividend_calendar": CALENDAR });
  await renderWithProviders(<DividendCalendarScreen />);
  await screen.findByText("April 2026");
}

it("opens on the latest month with data and lists its payers", async () => {
  await renderCalendar();
  expect(screen.getByText("4 EGX stocks with a dividend on record")).toBeTruthy();
  expect(screen.getByText("SWDY")).toBeTruthy();
  expect(screen.getByText("COMI")).toBeTruthy();
  expect(screen.getByText("Commercial International Bank")).toBeTruthy();
  expect(screen.getAllByText("ex-date 7 Apr 2026")).toHaveLength(2);
  expect(screen.getByText("6.00")).toBeTruthy();
  expect(screen.getByText("3.2%")).toBeTruthy();
  expect(within(screen.getByTestId("day-2026-04-07")).getByText("2")).toBeTruthy();
});

it("filters the list to a tapped day and back", async () => {
  await renderCalendar();
  fireEvent.press(screen.getByTestId("day-2026-04-07"));
  expect(screen.getByText("7 Apr 2026")).toBeTruthy();
  expect(screen.queryByText("SWDY")).toBeNull();
  fireEvent.press(screen.getByText("Show whole month"));
  expect(screen.getByText("SWDY")).toBeTruthy();
});

it("pages months and years", async () => {
  await renderCalendar();
  fireEvent.press(screen.getByLabelText("Previous month"));
  expect(screen.getByText("March 2026")).toBeTruthy();
  expect(screen.getByText("No dividends on record for March 2026.")).toBeTruthy();
  fireEvent.press(screen.getByText("2025"));
  fireEvent.press(screen.getByLabelText("Next month"));
  fireEvent.press(screen.getByLabelText("Next month"));
  expect(screen.getByText("May 2025")).toBeTruthy();
  // ABUK's stored name only echoes the symbol, so it is not repeated.
  expect(screen.getAllByText("ABUK")).toHaveLength(1);
  expect(screen.getByText("12.00")).toBeTruthy();
});

it("opens a payer's stock page", async () => {
  await renderCalendar();
  fireEvent.press(screen.getByText("COMI"));
  expect(router.push).toHaveBeenCalledWith(stockHref("COMI"));
});

it("says when the calendar did not load", async () => {
  mockMarketApi({ "/dividend_calendar": fail(500, "calendar down") });
  await renderWithProviders(<DividendCalendarScreen />);
  expect(await screen.findByText("The dividend calendar didn't load.")).toBeTruthy();
  expect(screen.getByText("calendar down")).toBeTruthy();
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx jest src/features/market/logic/__tests__/dividendCalendar.test.ts src/features/market/__tests__/DividendCalendarScreen.test.tsx`
Expected: FAIL — `Cannot find module '../dividendCalendar'` and `'../DividendCalendarScreen'`.

- [ ] **Step 3: Implement the logic, screen and route**

`src/features/market/logic/dividendCalendar.ts`:

```ts
import type { DividendCalendarStock } from "@/shared/types";
import { MONTHS_ABBR } from "./format";

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;
/** Sunday-first, EGX-appropriate. */
export const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

/** `m` is 0-based (0 = January). */
export interface MonthView {
  y: number;
  m: number;
}

/** Weekday (0 = Sun) of the 1st, timezone-safe via UTC. */
export function firstWeekday(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 1)).getUTCDay();
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

export function monthCells(y: number, m: number): (number | null)[] {
  return [
    ...Array<null>(firstWeekday(y, m)).fill(null),
    ...Array.from({ length: daysInMonth(y, m) }, (_, i) => i + 1),
  ];
}

export function isoDay(y: number, m: number, day: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function shiftMonth(v: MonthView, delta: number): MonthView {
  const d = new Date(Date.UTC(v.y, v.m + delta, 1));
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
}

export interface CalendarIndex {
  byDate: Map<string, DividendCalendarStock[]>;
  /** Newest first. */
  years: number[];
  /** Latest ex-date on record ("" when none). */
  latest: string;
}

export function indexCalendar(stocks: DividendCalendarStock[]): CalendarIndex {
  const byDate = new Map<string, DividendCalendarStock[]>();
  const yearSet = new Set<number>();
  let latest = "";
  for (const s of stocks) {
    const bucket = byDate.get(s.ex_date);
    if (bucket) bucket.push(s);
    else byDate.set(s.ex_date, [s]);
    yearSet.add(parseInt(s.ex_date.slice(0, 4), 10));
    if (s.ex_date > latest) latest = s.ex_date;
  }
  return { byDate, years: [...yearSet].sort((a, b) => b - a), latest };
}

export function viewFromIso(iso: string): MonthView | null {
  const m = /^(\d{4})-(\d{2})/.exec(iso);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]) - 1 };
}

/** The selected day's payers, else the whole month's, newest ex-date first. */
export function listedFor(
  stocks: DividendCalendarStock[],
  byDate: Map<string, DividendCalendarStock[]>,
  view: MonthView,
  selectedDay: string | null
): DividendCalendarStock[] {
  if (selectedDay) return byDate.get(selectedDay) ?? [];
  const prefix = `${view.y}-${String(view.m + 1).padStart(2, "0")}`;
  return stocks.filter((s) => s.ex_date.startsWith(prefix)).sort((a, b) => b.ex_date.localeCompare(a.ex_date));
}

export function monthTitle(v: MonthView): string {
  return `${MONTHS[v.m]} ${v.y}`;
}

/** "2026-04-07" → "7 Apr 2026". */
export function dayTitle(iso: string): string {
  return `${parseInt(iso.slice(8, 10), 10)} ${MONTHS_ABBR[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}`;
}

/** Years present in the data, guaranteeing the viewed year is selectable. */
export function yearOptions(years: number[], viewYear: number): number[] {
  return years.includes(viewYear) ? years : [viewYear, ...years];
}
```

`src/features/market/DividendCalendarScreen.tsx`:

```tsx
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { stockHref } from "@/lib/links";
import { fetchDividendCalendar } from "@/shared/api";
import { AppText, IconButton, Pill, PillRow, Screen, TableSkeleton } from "@/ui";
import { useKeyedFetch } from "./hooks/useKeyedFetch";
import {
  dayTitle,
  indexCalendar,
  isoDay,
  listedFor,
  monthCells,
  monthTitle,
  shiftMonth,
  viewFromIso,
  WEEKDAYS,
  yearOptions,
  type MonthView,
} from "./logic/dividendCalendar";
import { RefreshableScroll } from "./RefreshableScroll";

const CELL_WIDTH = "14.2857%"; // 7 columns

/**
 * Port of web `dividends/page.tsx`: a month grid paged by ‹ › and a year pill
 * row (the web's two <select>s), the selected day's payers beneath. These are
 * LAST-PAID ex-dates — the EGX publishes no forward calendar, and the banner
 * says so. Nothing is gain/loss coloured.
 */
export function DividendCalendarScreen() {
  const cal = useKeyedFetch("dividend-calendar", fetchDividendCalendar);
  const data = cal.data;
  const index = useMemo(() => indexCalendar(data?.stocks ?? []), [data]);
  const [picked, setPicked] = useState<MonthView | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  // Until the user pages, show the most recent month that has data.
  const view = picked ?? viewFromIso(index.latest);

  const go = (v: MonthView) => {
    setPicked(v);
    setSelectedDay(null);
  };

  let body;
  if (cal.loading) {
    body = <TableSkeleton rows={6} />;
  } else if (cal.error) {
    body = (
      <View className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <AppText className="text-sm text-white/70">The dividend calendar didn&apos;t load.</AppText>
        <AppText className="mt-1 text-xs text-white/40">{cal.error}</AppText>
      </View>
    );
  } else if (data && view) {
    const listed = listedFor(data.stocks, index.byDate, view, selectedDay);
    body = (
      <>
        <View className="flex-row items-center gap-2">
          <IconButton icon="chevron-back" accessibilityLabel="Previous month" onPress={() => go(shiftMonth(view, -1))} />
          <AppText className="flex-1 text-center font-sans-semibold text-base text-white">{monthTitle(view)}</AppText>
          <IconButton icon="chevron-forward" accessibilityLabel="Next month" onPress={() => go(shiftMonth(view, 1))} />
        </View>
        <PillRow>
          {yearOptions(index.years, view.y).map((yr) => (
            <Pill key={yr} label={String(yr)} active={yr === view.y} onPress={() => go({ y: yr, m: view.m })} />
          ))}
        </PillRow>

        <View className="rounded-xl border border-white/5 bg-white/[0.02] p-2">
          <View className="flex-row flex-wrap">
            {WEEKDAYS.map((w) => (
              <View key={w} style={{ width: CELL_WIDTH }} className="py-1">
                <AppText className="text-center font-sans-medium text-[10px] uppercase tracking-wider text-white/30">{w}</AppText>
              </View>
            ))}
            {monthCells(view.y, view.m).map((day, i) => {
              if (day === null) return <View key={`x${i}`} style={{ width: CELL_WIDTH }} />;
              const iso = isoDay(view.y, view.m, day);
              const hits = index.byDate.get(iso);
              const isSelected = selectedDay === iso;
              return (
                <View key={iso} style={{ width: CELL_WIDTH }} className="p-0.5">
                  <Pressable
                    testID={`day-${iso}`}
                    disabled={!hits}
                    accessibilityRole="button"
                    accessibilityLabel={hits ? `${day}, ${hits.length} ex-dividend` : String(day)}
                    accessibilityState={{ selected: isSelected, disabled: !hits }}
                    onPress={() => setSelectedDay(isSelected ? null : iso)}
                    className={`aspect-square items-center justify-center rounded-lg ${isSelected ? "bg-accent/20" : hits ? "bg-white/[0.06]" : ""}`}
                  >
                    <AppText className={`text-xs ${isSelected ? "text-accent" : hits ? "text-white/80" : "text-white/25"}`}>
                      {String(day)}
                    </AppText>
                    {hits && <AppText className="font-mono text-[9px] text-accent/80">{String(hits.length)}</AppText>}
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>

        <View className="mt-2 flex-row items-baseline gap-2.5">
          <AppText className="font-sans-semibold text-base text-white">
            {selectedDay ? dayTitle(selectedDay) : monthTitle(view)}
          </AppText>
          <AppText className="font-mono text-xs text-white/35">{String(listed.length)}</AppText>
          {selectedDay && (
            <Pressable onPress={() => setSelectedDay(null)} className="ml-auto min-h-[44px] justify-center">
              <AppText className="text-[11px] text-accent/70">Show whole month</AppText>
            </Pressable>
          )}
        </View>

        {listed.length === 0 ? (
          <View className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-5">
            <AppText className="text-sm text-white/50">{`No dividends on record for ${monthTitle(view)}.`}</AppText>
          </View>
        ) : (
          <View className="gap-2">
            {listed.map((s) => (
              <View key={s.symbol + s.ex_date} className="flex-row items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3">
                <Pressable
                  accessibilityRole="link"
                  onPress={() => router.push(stockHref(s.symbol))}
                  className="min-h-[44px] justify-center rounded-lg bg-accent/10 px-3"
                >
                  <AppText className="font-mono text-xs text-accent/90">{s.symbol}</AppText>
                </Pressable>
                <View className="min-w-0 flex-1">
                  {s.name && s.name.toUpperCase() !== s.symbol.toUpperCase() && (
                    <AppText numberOfLines={1} className="text-[13px] text-white/70">{s.name}</AppText>
                  )}
                  <AppText className="text-[11px] text-white/40">{`ex-date ${dayTitle(s.ex_date)}`}</AppText>
                </View>
                <View className="items-end">
                  <View className="flex-row items-baseline gap-1">
                    <AppText className="font-mono-semibold text-sm text-white/90">{s.amount != null ? s.amount.toFixed(2) : "—"}</AppText>
                    <AppText className="text-[10px] text-white/40">EGP</AppText>
                  </View>
                  {s.dividend_yield != null && s.dividend_yield > 0 && (
                    <AppText className="font-mono text-[11px] text-white/45">{`${s.dividend_yield.toFixed(1)}%`}</AppText>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </>
    );
  } else {
    body = (
      <View className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-5">
        <AppText className="text-sm text-white/50">No dividends on record yet.</AppText>
      </View>
    );
  }

  return (
    <Screen scroll={false}>
      <RefreshableScroll testID="dividends-scroll" refreshing={cal.refreshing} onRefresh={cal.refresh} contentClassName="gap-4 px-4 py-4 pb-10">
        {data && (
          <AppText className="text-xs text-white/40">
            {`${data.count} EGX ${data.count === 1 ? "stock" : "stocks"} with a dividend on record`}
          </AppText>
        )}
        <View className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
          <AppText className="text-[13px] leading-relaxed text-white/60">
            These are the most recent coupons on record — their ex-dates (own the share before it to get the coupon). The EGX publishes no forward calendar, so future dates aren&apos;t shown; most companies pay once, around April–May.
          </AppText>
        </View>
        {body}
      </RefreshableScroll>
    </Screen>
  );
}
```

`src/app/dividends.tsx` (replace the Plan 1 shell entirely):

```tsx
import { Stack } from "expo-router";
import { DividendCalendarScreen } from "@/features/market/DividendCalendarScreen";

export default function DividendsRoute() {
  return (
    <>
      <Stack.Screen options={{ title: "Dividend calendar" }} />
      <DividendCalendarScreen />
    </>
  );
}
```

Add to `src/__tests__/routes/market-routes.test.tsx` (import at the top, mock and test at the bottom):

```tsx
import DividendsRoute from "@/app/dividends";
```

```tsx
jest.mock("@/features/market/DividendCalendarScreen", () => {
  const { createElement: h } = require("react");
  const { Text } = require("react-native");
  return { DividendCalendarScreen: () => h(Text, null, "dividends-screen") };
});

it("mounts the dividend calendar", async () => {
  renderRouter({ _layout: layout, dividends: DividendsRoute }, { initialUrl: "/dividends" });
  expect(await screen.findByText("dividends-screen")).toBeTruthy();
});
```

- [ ] **Step 4: Run them to verify they pass**

Run: `npx jest src/features/market/logic/__tests__/dividendCalendar.test.ts src/features/market/__tests__/DividendCalendarScreen.test.tsx src/__tests__/routes/market-routes.test.tsx`
Expected: PASS.

- [ ] **Step 5: Verify and commit**

Run: `npm run verify`
Expected: exits 0.

```bash
git add src/features/market src/app/dividends.tsx src/__tests__/routes/market-routes.test.tsx
git commit -m "feat(market): dividend calendar month grid with day filter and year paging

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XDkAB7UCK8WyT267W5ZxNV"
```

---

### Task 14: Manual check in Expo Go

**Files:** none (verification only; fix-ups found here go in their own commits with a test that reproduces them first).

- [ ] **Step 1: Full verification**

Run: `mkdir -p ~/logs && tmux kill-session -t egx-mobile-verify 2>/dev/null; tmux new -d -s egx-mobile-verify "npm run verify 2>&1 | tee ~/logs/egx-mobile-verify.log"`
Then: `tail -n 30 ~/logs/egx-mobile-verify.log` until it finishes.
Expected: exits 0; the Jest summary shows every suite passing (all `src/features/market/**` suites and `src/__tests__/routes/market-routes.test.tsx`).

- [ ] **Step 2: Start Metro**

Run: `tmux kill-session -t egx-mobile-expo 2>/dev/null; tmux new -d -s egx-mobile-expo "npx expo start --tunnel 2>&1 | tee ~/logs/egx-mobile-expo.log"`
Then: `tmux capture-pane -pt egx-mobile-expo | tail -n 40` and scan the QR code with Expo Go (same LAN works without `--tunnel`). Tell the user the session name (`egx-mobile-expo`) and log path (`~/logs/egx-mobile-expo.log`).

- [ ] **Step 3: Walk the checklist on a real phone, signed in**

Dashboard
- [ ] Cards paint from the snapshot within a second or two, then scores/prices tick to live; "…ago" counts up every second.
- [ ] Outside 10:00–14:30 Cairo (or Fri/Sat) every card says "… close · Market closed" — confirms `Intl` + `Africa/Cairo` works on this device's Hermes.
- [ ] Background the app for 30 s and return: the ages jump straight to the right value (no frozen labels).
- [ ] Pull down: spinner shows, cards stay on screen, spinner stops; Metro/network log shows `/dashboard?fresh=…`.
- [ ] Index pills, sector pills, search (with a trailing space), Sort (Score/Change/Risk/Recently paid, unmeasured sink), "Pays a dividend", Score On/Off, Weekly/Monthly warning line — each behaves like the web.
- [ ] Scroll to the bottom of a long list ("All"): more cards load (onEndReached); the "Load more (N remaining)" button also works with VoiceOver/TalkBack.
- [ ] "No feed data (N)" expands and its cards say "No price feed".
- [ ] Risk dot shows Calm..Wild in the cool→hot colours, never on a no-feed card.
- [ ] Market Condition card and Watchlist sit above the filters; removing a watchlist row works; tapping a row opens the stock.
- [ ] Compare and calendar icons open their screens; on a ≥400pt-wide phone the grid is 2 columns, otherwise 1.

Stock detail (open from a card scored on Weekly)
- [ ] Opens on Weekly; header shows ticker + company name + "Weekly · 200 bars"; "on weekly bars / Daily is the primary view for timing".
- [ ] Interval and History pills refetch; Overlays: SMA 20 and Trendlines on by default; long-press explains; toggling changes only the chart.
- [ ] Watch / Watching toggles and the dashboard watchlist reflects it.
- [ ] Adjust weights → stepper → Save: page refetches with the new score; Cancel discards.
- [ ] Indicators collapse/expand; Risk grade (or nothing for an unmeasured symbol); Forecast tiles + cone drawn to width; Dividend history Show more / Show less; every Learn link lands on the right Learn concept.
- [ ] Pull-to-refresh keeps content visible; airplane mode → error box with a working Retry.

Compare
- [ ] Type a symbol, pick from suggestions, add up to five (input disappears at five), remove a chip.
- [ ] Type `2026-1` in From: message shows, Compare disabled; 3M/6M/1Y presets fill both fields; Compare draws the chart and three stat cards.

News
- [ ] Sections, source monograms, ages, fresh dots, caveat line; headline opens the browser; ticker chip opens the stock; pull-to-refresh works.

Dividend calendar
- [ ] Opens on the latest month with data; ‹ › page across a year boundary; year pills jump; tapping a day with a count filters the list; "Show whole month" resets; a payer chip opens the stock.

General
- [ ] No green/red on news, dividends, risk bands or oversold breadth; every tap target is comfortable (≥44pt); safe areas respected on a notched phone; no yellow-box warnings in Metro.

- [ ] **Step 4: Stop Metro and record the result**

Run: `tmux kill-session -t egx-mobile-expo`
If every box is ticked, no commit is needed. If a fix was required, it was committed in its own `fix(market): …` commit (with the roadmap trailer) after a failing test reproduced it.

---

## Notes for later — pure logic worth moving into `egx-api-fe/src/app/lib`

These were inline in web page/component files, so this plan ported them (with tests) instead of sharing them. Each is platform-neutral and would be a clean addition to `SHARED_FILES` once moved into the web lib (edit in `egx-api-fe`, commit there, `npm run sync:shared` here, delete the mobile copy):

- **`page.tsx`** → `isEgxOpen`, `sessionLabel` (mobile version parses the string — also fixes the web's `new Date("YYYY-MM-DD")` west-of-UTC day slip), `isTodaysSession`, `agoLabel`, the snapshot→card mapping and live-upgrade transitions (`cards.ts`), and the filter/sort/paging functions (`dashboardFilters.ts`). Best candidate: one `lib/dashboard.ts`.
- **`stock/[symbol]/page.tsx`** → `OVERLAYS`, `overlayExplanation`, the three chart-data builders, `latestNonNull`, `atrPercent`, and the callout rules (`stockDetail.ts`).
- **`KeyLevelsCard` / `EntryExitCard`** → `formatLevelAge`, the broken-through/direction wording, the zone confidence tones (`levels.ts`).
- **`StatsPanel`** → the RSI/beta tone rules (`statTones.ts`); `formatVolume` (also duplicated in `VolumeChart`).
- **`compare/page.tsx`** → suggestions/add/series (`compare.ts`).
- **`NewsList.tsx`** → `relativeAge`, `isFresh`, `sourceName` and the caveat assembly from `news/page.tsx` (`news.ts`).
- **`dividends/page.tsx` + `DividendHistoryCard`** → the month-grid maths and `dayMonth` (`dividendCalendar.ts`, `format.ts`).
- **`RiskGradeCard` / `PEFreshnessBanner`** → `riskAgoLabel`, `peStaleDays` (`freshness.ts`).
- **`MarketRegimeCard`** → `regimePosition`, `breadthTone` (`regime.ts`).

## Self-review (done while writing)

- **Spec coverage:** Dashboard (search, index/sector/dividend filters, five sorts, paging via `onEndReached` + footer, five card states, risk dot, `isEgxOpen` stamp, snapshot + bounded live upgrade + retry, pull-to-refresh with `fresh`, no-feed section, regime card + breadth, watchlist panel, Compare/Dividends entry points) → Tasks 1–5. Stock detail (interval/bars, overlays with Trendlines default on, StatsPanel, composite card + ScoreBreakdown + ScoreWeights sheet, KeyLevels, EntryExit, PE banner, Risk grade, Forecast + cone, Dividend history, collapsible indicators, weights-version refetch, watch toggle) → Tasks 6–10. Compare → 11. News → 12. Dividends → 13. Manual Expo Go checklist → 14. Date-field and slider decisions are stated in Global Constraints.
- **Placeholders:** none — every code step carries the full file or the exact lines to add; every run step has a command and expected result.
- **Type consistency:** `CardMap`/`CardData`/`CardState` (Task 1) are the only card types used in Tasks 3–5; `ChartInterval`/`BarCount`/`OverlayState` (Task 6) are the types used in Tasks 8 and 10; `useKeyedFetch` returns `{ data, error, loading, refreshing, refresh, reload }` everywhere; `RefreshableScroll`'s refresh testID is always `<testID>-refresh` (`stock-scroll-refresh`, `news-scroll-refresh`); `mockMarketApi`/`requestsTo`/`fail`/`reply` signatures match their uses.
- **Review Focus:** each of the five items has its pinning test in the named task (`dashboardData.test.tsx` snapshot-failure and refresh tests, `CompareScreen.test.tsx` invalid-range test, `SelfFetchingCards.test.tsx` + `StockCards.test.tsx` failure tests, `useNow.test.ts` background test and `marketClock.test.ts` `sessionLabel` tests).
