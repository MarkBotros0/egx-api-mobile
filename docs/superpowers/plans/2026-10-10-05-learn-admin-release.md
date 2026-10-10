# Plan 5 — Learn, Calibration, Admin, Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the web app's Learn path, Calibration page and Admin user management to the Expo app, then make it an installable, store-ready build ("EGX Analytics", dark, own icons, EAS profiles).

**Architecture:** The 1,916-line web curriculum is refactored **once, in `egx-api-fe`**, from JSX into pure data (`lib/curriculum.ts` + a small `VisualSpec` object format), so both apps render the *same* content file. The mobile app gets it through the existing `sync:shared` pipe and renders each `VisualSpec` with react-native-svg twins of the web diagrams. The Learn screen is one virtualised `FlatList` (sticky search/pill row, viewability-armed live charts, `concept` search-param deep links). Calibration and Admin are straight screen ports over the shared API client. Release work is config + generated assets + docs.

**Tech Stack:** Expo SDK 57, React Native 0.86, React 19.2, TypeScript 6, Expo Router (`src/app`), NativeWind 4.2.7, react-native-svg, `@react-native-async-storage/async-storage`, `@react-native-community/slider`, `expo-clipboard`, `expo-system-ui`, EAS Build; web side Next.js 14 + TypeScript 5.4. Tests: Jest (`jest-expo`) + `@testing-library/react-native` 14.

**Spec:** `docs/superpowers/plans/2026-10-10-00-roadmap.md` (binding contract) and the web product guide `../egx-api-fe/CLAUDE.md` (sections *Learn*, *GET /api/calibration*, *Auth, roles and user management*, */api/users*, *Frontend Components → Navbar*, *Forecast calibration* T-bill note). Read both before any task.

---

## Curriculum decision (read before Task 1)

**Chosen: (b) refactor the web curriculum into pure data in `egx-api-fe/src/app/lib/`, rendered by both apps.**

What the 1,916-line file actually contains: every text field of every concept (`title`, `definition`, `whyItMatters`, `howToUse`, `example`) is already a plain string or template literal. The only JSX is the `visual` field (70 of them) and one module `overview`, and those 89 elements use exactly 15 components (`MiniChart`, `ZoneScale`, `BarCompare`, `StepFlow`, `AllocationDonut`, `CorrelationGrid`, `ConeChart`, `LedgerRows`, `LiveChart`, `Stack`, five widgets) whose props are all serialisable (numbers, strings, arrays from the seeded `walk()`). So no rich-text node format is needed at all — a discriminated union `VisualSpec = { kind: "MiniChart", …props } | …` covers it exactly, and a mechanical TypeScript-compiler codemod can do the conversion with zero hand edits.

Why (b) over (a) a mechanical RN port:

1. **Two copies of 1,916 lines will drift, and drift here breaks a public contract.** Anchors are backend-chosen ids (`learn_concept`); a rename in one copy silently breaks deep links in that app only. With one file, `check:shared` fails the mobile build the moment the copies differ.
2. **The T-bill lesson.** The guide records that fixing `T_BILL_RATE_PCT` did not fix the app because six curriculum strings restated "25%". A forked curriculum doubles that surface; a shared one fixes both apps in one edit.
3. **The roadmap already forbids forking `lib/`** ("The mobile app must not fork them") and provides the sync/check mechanism — (b) uses it instead of inventing a second one.
4. **Risk to the web page is measurable, not guessed.** Task 1 captures the server-rendered markup of the whole `/learn` page before the refactor; Tasks 1 and 2 must reproduce it byte-for-byte (only React's generated `useId` values are normalised). Identical markup ⇒ visually unchanged page, every anchor id preserved.

Cost of (b): two tasks in the web repo and a `VisualSpec` renderer on each side (≈60 lines each). Cost of (a) would be ~1,900 lines of duplicated content plus the permanent drift risk above.

The same reasoning moves the widgets' formulas/verdict copy (`lib/learnWidgets.ts`) and the LiveChart variant mapping (`lib/learnLive.ts`) into shared code — "widgets import their formula, never restate it" now holds across both apps. Diagram *geometry* (padding, path maths) is rendering, so the mobile twins restate it from the web file rather than adding more web churn.

**Known content issue, NOT fixed by this plan (flag to the user):** concept `risk_adjusted_return` (`whyItMatters`) says *"In Egypt, a 20% stock return is actually a LOSS vs cash"* — true at the old 25% rate, false at today's `T_BILL_RATE_PCT = 19`. It is a restated number of exactly the kind the T-bill rule forbids. The refactor preserves it verbatim (the parity check requires that); fix it afterwards in `lib/curriculum.ts` with the user's wording.

---

## Global Constraints

Everything in `2026-10-10-00-roadmap.md` applies. The most-often-broken lines, verbatim or exact:

- Expo **SDK 57** (`expo ~57.0.27`), RN 0.86, React 19.2, TypeScript 6. Add deps with `npx expo install <pkg>` (dev: `npx expo install <pkg> -- --dev`), never bare `npm install`.
- Everything must run in **Expo Go** — no custom native modules. Plan 5's runtime deps (`@react-native-async-storage/async-storage`, `@react-native-community/slider`, `expo-clipboard`, `expo-system-ui`) are all in Expo Go. `@resvg/resvg-js` is a dev-only Node tool.
- Routes live in `src/app/` only; **no tests or components in `src/app/`**. Tests live in `__tests__/` beside the code, named `*.test.ts(x)`.
- Import across folders with `@/…` (`@/shared/learn`, `@/ui`, `@/features/learn/LearnScreen`); relative imports only within one folder.
- **Never edit `src/shared/`.** Change shared code in `../egx-api-fe/src/app/lib/`, commit there, `npm run sync:shared` here, commit here. Shared files: no JSX, `window`, `document`, `localStorage`, `next/*`, React.
- Fonts are families: `font-sans`, `font-sans-medium`, `font-sans-semibold`, `font-sans-bold`, `font-mono`, `font-mono-semibold`. Never `font-semibold`/`font-bold` alone.
- This plan's NativeWind translation rules (apply everywhere): `tracking-[Nem]` → px (`em × fontSize`, rounded to 0.5px); relative `leading-*` → explicit px (`leading-[21px]`); `space-y-N` → `gap-N` on a column; `divide-y` → per-row `border-b` except the last; `truncate` → `numberOfLines={1}`; `md:`/`lg:`/`hover:` variants dropped.
- **Never render `{cond && <X/>}` when `cond` can be a number or string** — RN throws "Text strings must be rendered within a <Text>". Use `cond ? <X/> : null`.
- Touch targets ≥ 44pt (`min-h-[44px]`, `h-11 w-11`, or `hitSlop`). Safe areas only via `Screen`/`react-native-safe-area-context`.
- Colours: hexes come from `@/shared/theme` `COLORS` or the shared Learn palette `V` (`@/shared/learnVisuals`) — never retyped. `gain`/`up` green and `loss`/`down` red mean a real direction in the data, never decoration.
- Learn: anchors are a public contract (9 hyphenated module ids, underscore concept ids, never rename/drop); illustrative series are seeded `walk()`, never `Math.random()`; gradient ids from `useId()`; **cards rest VISIBLE** (no animation may start a card hidden); widgets import their formula; search folds punctuation via `normalizeSearch` on query AND text; progress is per-device under key `egx.learn.progress`, keyed by `conceptKey()`, and a storage failure never breaks the page; LiveChart is ONE shared lazy `/api/analysis` fetch for COMI (Daily, 180 bars) that degrades silently to the static diagram.
- A curriculum string that states a number the app computes MUST interpolate the constant (`${T_BILL_RATE_PCT}`).
- Admin: role comes only from `AUTH_ADMINS` (no role picker); you cannot disable/delete **yourself** (UI explains "This is you"; the backend also refuses the last active admin — which, for the signed-in admin, is always "yourself"); a generated password is shown exactly once; the copy block is `Link: …\nUsername: …\nPassword: …` with the link from `EXPO_PUBLIC_FE_BASE_URL`.
- Admin is reached by a **button beside Log out in the tab header**, never a tab. The tab bar stays Dashboard / Portfolio / Learn / News for everyone.
- Bundle id / package `com.markbotros.egxanalytics` is a **proposal the user must confirm before the first store build** (it cannot change after publishing).
- Every task ends with `npm run verify` green, then a commit whose message ends with:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01XDkAB7UCK8WyT267W5ZxNV
  ```
  If `npm run verify` takes > 2 minutes, run it in tmux: `mkdir -p ~/logs && tmux kill-session -t egx-mobile-verify 2>/dev/null; tmux new -d -s egx-mobile-verify "npm run verify 2>&1 | tee ~/logs/egx-mobile-verify.log"` and tail the log.
- Web repo (`egx-api-fe`, default branch `master`): work on branch `learn-shared-curriculum`; the `/learn` page must stay visually identical (markup parity, Tasks 1–2). `egx-api-fe/CLAUDE.md` and `egx-api-be/CLAUDE.md` are identical — edit one, mirror the other, commit each repo separately. Do not push unless the user asks (`gh auth switch --hostname github.com --user MarkBotros0 && git push` when they do).

## Review Focus

1. **"Mark read" tapped before AsyncStorage finishes loading** — the stored progress must survive and the tap must count (naive code overwrites the stored set). Test: Task 7, "a toggle made before hydration is merged, not lost".
2. **Deep link to a MODULE id, or to a concept in a collapsed module, or while a search is active** (`RiskGradeCard` and Calibration link `risk-management`; the web hash router treats both namespaces the same) — the screen clears the search, reopens the module and scrolls there. Tests: Task 9.
3. **The same Learn link tapped twice** (e.g. two `rsi` advice links, Learn tab already mounted) — the second tap must scroll/flash again even though the param value is unchanged. Test: Task 9, "the same concept twice scrolls twice".
4. **A `learn_concept` id the app does not know** (newer backend than app) — the screen renders normally, nothing scrolls, no crash. Test: Task 9.
5. **Live data that is short, partially null, or has a marker on a missing bar** — the card keeps the static diagram (or draws without `NaN` geometry, which crashes native SVG rather than being ignored as in a browser). Tests: Task 4 "no NaN reaches the SVG" and Task 6 "short data keeps the diagram".

---

## Contract assumptions about Plans 1 and 2 (beyond the roadmap)

These are relied on below but not stated in the roadmap. Each is cheap to adapt if Plan 1/2 chose differently — adapt the import/name, keep the behaviour.

- **A1** `scripts/sync-shared.mjs` has a `SHARED_FILES` array of file names (e.g. `"constants.ts"`); Task 3 appends five names in the same spelling.
- **A2** Font family names registered by Plan 1's `useFonts` are the `@expo-google-fonts` keys `JetBrainsMono_400Regular` / `JetBrainsMono_600SemiBold` (needed as `fontFamily` strings for SVG `<Text>`, which cannot use a className).
- **A3** `COLORS` (`@/shared/theme`) has a `"charcoal-dark"` key (same names as the Tailwind tokens).
- **A4** `Screen` with `scroll={false}` renders its children in a `flex-1` container (the Learn list is its own scroller).
- **A5** `Sheet` renders its `title` and calls `onClose` on backdrop tap / Android back; `confirm` is exported from `@/ui` as a named function.
- **A6** `src/app/(tabs)/_layout.tsx` renders the log-out `IconButton` in `headerRight` (Plan 1 Task 7); Task 12 adds the admin button beside it. The admin route guard already exists in `src/navigation/RootNavigator.tsx` (Plan 1).
- **A7** `@/lib/env` exists with `apiBaseUrl()`; Task 11 adds `feBaseUrl()` beside it. `.env.example` exists.
- **A8** Jest is configured by Plan 1 for NativeWind classNames, Reanimated and safe-area. Screen tests in this plan **do not** use `renderWithProviders`/`mockFetch`: these screens need none of the data providers, so they mock the `@/shared/api` functions they call (still no network) and use a small `renderScreen` helper (Task 8) that only adds `SafeAreaProvider`. `render`/`fireEvent` are `await`ed so the tests work whether RNTL 14's are sync or async.
- **A9** `learnHref(id)` and `routes.admin` / `routes.dashboard` exist in `@/lib/links` (roadmap) — tests compare against the helper's output, never a hard-coded string.

---

## File Structure

### `egx-api-fe` (web, Tasks 1–2)

| File | Responsibility |
|---|---|
| Create `src/app/lib/learnVisuals.ts` | Palette `V`, every diagram's prop shape, the `VisualSpec` union, `specProps`, `walk`/`smaOf`/`extent`/`toPath` |
| Create `src/app/lib/learnWidgets.ts` | Calculator formulas + verdict copy (imports rules from `constants.ts`) |
| Create `src/app/lib/learnLive.ts` | `LIVE_SYMBOL/BARS/SHOWN`, `liveVisual(variant, data, caption)` |
| Create `src/app/lib/learn.ts` | `Concept`/`Module` types, `conceptKey`, `normalizeSearch`, `searchConcepts`, `LEVEL_LABEL`, `LEARN_PROGRESS_KEY` |
| Create `src/app/lib/curriculum.ts` | Generated by codemod from `learn/curriculum.tsx`, then hand-owned: `CURRICULUM`, `ALL_CONCEPTS`, `TOTAL_CONCEPTS` |
| Create `src/app/components/learn/LearnVisual.tsx` | Renders a `VisualSpec` with the existing web components |
| Modify `components/learn/visuals.tsx`, `widgets.tsx`, `LiveChart.tsx`, `ConceptCard.tsx`, `learn/LearnClient.tsx` | Consume the shared modules; markup unchanged |
| Delete `src/app/learn/curriculum.tsx` | Replaced by `lib/curriculum.ts` |
| Modify `CLAUDE.md` (+ mirror `../egx-api-be/CLAUDE.md`) | Document the shared Learn data |
| Temporary, never committed: `scripts/learn-markup.tsx`, `scripts/tsconfig.parity.json`, `scripts/curriculum-to-data.mjs` | Parity check + one-off codemod |

### `egx-api-mobile` (Tasks 3–14)

| File | Responsibility |
|---|---|
| Modify `scripts/sync-shared.mjs`; generated `src/shared/{learn,learnVisuals,learnWidgets,learnLive,curriculum}.ts` | Shared Learn data |
| `src/features/learn/visuals.tsx` | react-native-svg twins of the 8 web diagrams + `VisualFrame`, `pct`, `svgSafeId` |
| `src/features/learn/widgets.tsx` | 5 calculators on `@react-native-community/slider`; `snapToStep`, `splitHexAlpha` |
| `src/features/learn/liveData.ts` | The ONE shared COMI analysis promise |
| `src/features/learn/LiveChart.tsx` | Armed-by-viewability live chart, silent fallback |
| `src/features/learn/LearnVisual.tsx` | `VisualSpec` → component |
| `src/features/learn/progress.ts` | `useLearnProgress` over AsyncStorage, failure-proof, hydration-safe |
| `src/features/learn/useReduceMotion.ts` | OS reduce-motion flag |
| `src/features/learn/ConceptCard.tsx` | One concept card + flash ring |
| `src/features/learn/rows.ts` | Pure: flatten curriculum into list rows; resolve deep-link targets |
| `src/features/learn/LearnHeader.tsx` | Hero/progress, module pills, search field, sticky controls |
| `src/features/learn/ModuleHeader.tsx` | Collapsible module header |
| `src/features/learn/LearnScreen.tsx` | The list, search, viewability, deep links, back-to-top |
| `src/app/(tabs)/learn.tsx` | Route: reads `concept`, clears it after handling |
| `src/features/calibration/CalibrationScreen.tsx`, `src/app/calibration.tsx` | Accuracy record |
| `src/features/admin/{credentials.ts,UsersList.tsx,CreateUserSheet.tsx,PasswordRevealSheet.tsx,AdminScreen.tsx,AdminHeaderButton.tsx}`, `src/app/admin.tsx` | User management |
| Modify `src/lib/env.ts`, `.env.example` | `EXPO_PUBLIC_FE_BASE_URL` |
| Modify `src/app/(tabs)/_layout.tsx` | Admin header button (guard already in Plan 1 `RootNavigator`) |
| `src/test-utils/renderScreen.tsx` | Safe-area-only render helper |
| `scripts/make-icons.mjs`, `assets/*.png` | Icon set from the web logo |
| Modify `app.json`; create `eas.json` | Release config |
| `src/__tests__/release/config.test.ts` | Pins app.json / eas.json / asset sizes |
| `CLAUDE.md`, `docs/release.md` | Project guide; build + store steps |

---

## Task 1: Web — shared Learn primitives, markup parity baseline

**Repo:** `/home/mark/projects/egx-api/egx-api-fe`

**Files:**
- Create: `src/app/lib/learnVisuals.ts`, `src/app/lib/learnWidgets.ts`, `src/app/lib/learnLive.ts`
- Modify: `src/app/components/learn/visuals.tsx`, `src/app/components/learn/widgets.tsx` (full rewrite below), `src/app/components/learn/LiveChart.tsx` (full rewrite below)
- Temporary (not committed): `scripts/learn-markup.tsx`, `scripts/tsconfig.parity.json`

**Interfaces:**
- Consumes: `lib/constants.ts` (`STOP_LOSS_ATR_MULTIPLIER`, `T_BILL_RATE_PCT`, `scoreBand`, `SCORE_BAND_LABEL`, `ScoreBand`), `lib/types.ts` (`AnalysisResponse`).
- Produces (all later tasks, both repos):
  - `learnVisuals.ts`: `V`, `type Nums`, `VIEW_W = 320`, `LegendItem`, `ChartLine`, `ChartLevel`, `ChartMarker`, `ChartShade`, `ChartBand`, `MiniChartProps`, `Zone`, `ZoneMarker`, `ZoneScaleProps`, `CompareBar`, `BarCompareProps`, `FlowStep`, `StepFlowProps`, `DonutSlice`, `AllocationDonutProps`, `CorrelationGridProps`, `ConeChartProps`, `LedgerTone`, `LedgerRow`, `LedgerRowsProps`, `LiveVariant`, `WidgetKind`, `VisualSpec`, `specProps<T extends {kind:string}>(spec: T): Omit<T,"kind">`, `extent(sets: Nums[]): [number, number]`, `toPath(values: Nums, x, y): string`, `walk(n, seed, opts?): number[]`, `smaOf(values: number[], period: number): Nums`.
  - `learnWidgets.ts`: `ReadoutTone`, `ReadoutItem`, `readoutColor(t?)`, `egp(n)`, `RsiReading`, `RSI_READINGS`, `rsiReading(rsi)`, `RSI_STRIP_STOPS: {offset:number; color:string}[]` (offset in %), `STOP_LOSS_FORMULA`, `stopLossPlan(entry, support, atr): StopLossPlan`, `positionSizing(portfolio, weight, drop): PositionSizing`, `TBILL_CAPITAL`, `TBILL_TITLE`, `tBillRace(stockReturn, years): TBillRaceResult`, `BAND_COLOR`, `SCORE_BAND_SEGMENTS: {band; label; color; width}[]`, `scoreBandReading(score): {band; color; label}`, `SCORE_EXPLORER_NOTE`.
  - `learnLive.ts`: `LIVE_SYMBOL = "COMI"`, `LIVE_BARS = 180`, `LIVE_SHOWN = 110`, `LiveVisualSpec`, `liveVisual(variant: LiveVariant, d: AnalysisResponse, caption?: string): LiveVisualSpec | null`.

- [ ] **Step 1: Branch and confirm a clean tree**

```bash
cd /home/mark/projects/egx-api/egx-api-fe
git status --short
git switch -c learn-shared-curriculum
```
Expected: empty status, then `Switched to a new branch 'learn-shared-curriculum'`. If the tree is dirty, stop and ask the user.

- [ ] **Step 2: Write the parity script (the "test" for this refactor)**

`scripts/tsconfig.parity.json`:
```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": { "jsx": "react-jsx" }
}
```

`scripts/learn-markup.tsx`:
```tsx
/**
 * TEMPORARY parity check for the Learn data refactor. Never committed.
 *
 * Server-renders the whole /learn page and writes the markup to a file.
 * Run before and after the refactor; the two files must be identical.
 * Effects do not run in renderToStaticMarkup, so this is the complete
 * first-paint document: every card, every diagram, every anchor id.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import LearnClient from "../src/app/learn/LearnClient";

const out = process.argv[2];
if (!out) throw new Error("usage: learn-markup.tsx <out.html>");

// React's useId values depend on tree position, which a refactor may
// legitimately shift (LearnVisual adds a component layer). Normalise ONLY
// those generated ids: MiniChart's gradient ("mcR…") and the sliders'
// ":R…:" label ids. Anchor ids are left verbatim on purpose.
const html = renderToStaticMarkup(<LearnClient />)
  .replace(/\bmcR[0-9A-Za-z]*/g, "mcID")
  .replace(/:R[0-9A-Za-z]*:/g, ":ID:");

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
const cards = (html.match(/<article /g) ?? []).length;
console.log(`${html.length} chars, ${cards} concept cards`);
```

- [ ] **Step 3: Capture the baseline**

Run:
```bash
cd /home/mark/projects/egx-api/egx-api-fe
npx --yes tsx@4.20.3 --tsconfig scripts/tsconfig.parity.json scripts/learn-markup.tsx /tmp/egx-learn-parity/before.html
```
Expected: `<N> chars, 70 concept cards` (the card count equals `TOTAL_CONCEPTS`; if the curriculum has grown, the number differs — note it, it must stay the same after). If the import fails on a browser global, stop and report — do not edit app code to make the script run.

- [ ] **Step 4: Create `src/app/lib/learnVisuals.ts`**

```ts
/**
 * Learn diagrams as DATA — the palette, the prop shape of every diagram,
 * the `VisualSpec` format the curriculum is written in, and the seeded
 * series generators.
 *
 * Shared by the web app (rendered with inline SVG in
 * components/learn/visuals.tsx) and the mobile app (react-native-svg; this
 * file is copied into egx-api-mobile/src/shared by its sync script). Keep it
 * platform-neutral: no JSX, no DOM, no React.
 *
 * Colour rule: `up` (gain green) and `down` (loss red) mean a real direction
 * in the data. They are never used as decoration. The module hues carry
 * identity instead, so a green line on the Learn page means the same thing
 * it means on the stock page.
 */

// ---------------------------------------------------------------- palette

export const V = {
  up: "#00ff88",
  down: "#ff3355",
  accent: "#4488ff",
  gold: "#e8b04b",
  teal: "#2fd3c0",
  coral: "#ff7a59",
  violet: "#a68bff",
  grid: "rgba(255,255,255,0.05)",
  axis: "rgba(255,255,255,0.18)",
  ink: "rgba(255,255,255,0.45)",
  inkBright: "rgba(255,255,255,0.75)",
} as const;

export type Nums = (number | null)[];

/** Width of every diagram's viewBox. Renderers scale it to their container. */
export const VIEW_W = 320;

// ---------------------------------------------------------------- props

export interface LegendItem {
  color: string;
  label: string;
  dash?: boolean;
}
export interface ChartLine {
  values: Nums;
  color: string;
  width?: number;
  dash?: string;
  label?: string;
}
export interface ChartLevel {
  value: number;
  color: string;
  label?: string;
  dash?: string;
}
export interface ChartMarker {
  index: number;
  color: string;
  label?: string;
  /** Where the label sits relative to the point. */
  place?: "above" | "below";
}
export interface ChartShade {
  from: number;
  to: number;
  color: string;
  label?: string;
}
export interface ChartBand {
  upper: Nums;
  lower: Nums;
  color: string;
}

export interface MiniChartProps {
  series: number[];
  lines?: ChartLine[];
  band?: ChartBand;
  levels?: ChartLevel[];
  markers?: ChartMarker[];
  shades?: ChartShade[];
  height?: number;
  priceColor?: string;
  fill?: boolean;
  caption?: string;
  legend?: LegendItem[];
  /** Right gutter reserved for level labels. */
  labelPad?: number;
}

export interface Zone {
  from: number;
  to: number;
  color: string;
  label?: string;
}
export interface ZoneMarker {
  value: number;
  label: string;
  color?: string;
}
export interface ZoneScaleProps {
  zones: Zone[];
  markers: ZoneMarker[];
  min?: number;
  max?: number;
  ticks?: number[];
  unit?: string;
  caption?: string;
  height?: number;
}

export interface CompareBar {
  label: string;
  value: number;
  color: string;
  note?: string;
}
export interface BarCompareProps {
  bars: CompareBar[];
  unit?: string;
  caption?: string;
  baseline?: { value: number; label: string; color: string };
}

export interface FlowStep {
  title: string;
  text: string;
}
export interface StepFlowProps {
  steps: FlowStep[];
  accent?: string;
  caption?: string;
}

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}
export interface AllocationDonutProps {
  slices: DonutSlice[];
  centerLabel: string;
  centerSub?: string;
  caption?: string;
}

export interface CorrelationGridProps {
  labels: string[];
  matrix: number[][];
  caption?: string;
}

export interface ConeChartProps {
  days?: number;
  start?: number;
  drift?: number;
  vol?: number;
  caption?: string;
}

export type LedgerTone = "up" | "down" | "muted";
export interface LedgerRow {
  left: string;
  right: string;
  tone?: LedgerTone;
}
export interface LedgerRowsProps {
  rows: LedgerRow[];
  caption?: string;
}

// ---------------------------------------------------------------- spec

export type LiveVariant = "trend" | "bollinger" | "rsi" | "levels" | "score" | "volume";

export type WidgetKind =
  | "RsiPlayground"
  | "StopLossCalculator"
  | "PositionSizer"
  | "TBillRace"
  | "ScoreBandExplorer";

/**
 * One diagram, as data. The curriculum is written in these; each app has a
 * renderer (web: components/learn/LearnVisual.tsx, mobile:
 * src/features/learn/LearnVisual.tsx). A new kind needs a case in BOTH.
 */
export type VisualSpec =
  | ({ kind: "MiniChart" } & MiniChartProps)
  | ({ kind: "ZoneScale" } & ZoneScaleProps)
  | ({ kind: "BarCompare" } & BarCompareProps)
  | ({ kind: "StepFlow" } & StepFlowProps)
  | ({ kind: "AllocationDonut" } & AllocationDonutProps)
  | ({ kind: "CorrelationGrid" } & CorrelationGridProps)
  | ({ kind: "ConeChart" } & ConeChartProps)
  | ({ kind: "LedgerRows" } & LedgerRowsProps)
  | { kind: "Stack"; children: VisualSpec[] }
  | { kind: "LiveChart"; variant: LiveVariant; caption?: string; fallback: VisualSpec }
  | { kind: "RsiPlayground" }
  | { kind: "StopLossCalculator" }
  | { kind: "PositionSizer" }
  | { kind: "TBillRace" }
  | { kind: "ScoreBandExplorer" };

/** A spec's props without its `kind`, ready to spread onto the component. */
export function specProps<T extends { kind: string }>(spec: T): Omit<T, "kind"> {
  const { kind, ...props } = spec;
  void kind;
  return props;
}

// ---------------------------------------------------------------- geometry helpers

export function extent(sets: Nums[]): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const s of sets) {
    for (const v of s) {
      if (v === null || v === undefined || !Number.isFinite(v)) continue;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (min === max) return [min - 1, max + 1];
  return [min, max];
}

/** Straight-segment path that breaks across nulls, so leading NaNs leave a gap. */
export function toPath(
  values: Nums,
  x: (i: number) => number,
  y: (v: number) => number
): string {
  let d = "";
  let pen = false;
  values.forEach((v, i) => {
    if (v === null || v === undefined || !Number.isFinite(v)) {
      pen = false;
      return;
    }
    d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
    pen = true;
  });
  return d;
}

// ---------------------------------------------------------------- series gen

/**
 * Deterministic pseudo-random walk. Seeded so a diagram looks identical on
 * every render and between server and client — a Math.random() series would
 * hydrate-mismatch and flicker.
 */
export function walk(
  n: number,
  seed: number,
  { start = 100, drift = 0, vol = 1 } = {}
): number[] {
  let s = seed >>> 0;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296 - 0.5;
  };
  const out: number[] = [];
  let v = start;
  for (let i = 0; i < n; i++) {
    v += drift + rnd() * vol * 2;
    out.push(Math.round(v * 100) / 100);
  }
  return out;
}

/** Trailing simple moving average, null until the window fills. */
export function smaOf(values: number[], period: number): Nums {
  return values.map((_, i) => {
    if (i < period - 1) return null;
    let sum = 0;
    for (let k = i - period + 1; k <= i; k++) sum += values[k];
    return Math.round((sum / period) * 100) / 100;
  });
}
```

- [ ] **Step 5: Create `src/app/lib/learnWidgets.ts`**

```ts
/**
 * Learn calculators — the arithmetic and the verdict copy, platform-neutral.
 *
 * Each widget reproduces a rule the app actually applies elsewhere, so the
 * rule is IMPORTED from ./constants, never restated: a widget that teaches a
 * different number from the one the app computes is worse than no widget.
 * Shared with egx-api-mobile (copied by its sync script) so both apps teach
 * the same numbers in the same words.
 */
import {
  STOP_LOSS_ATR_MULTIPLIER,
  T_BILL_RATE_PCT,
  scoreBand,
  SCORE_BAND_LABEL,
  type ScoreBand,
} from "./constants";
import { V } from "./learnVisuals";

const NEUTRAL = "#7f8ea3";

// ---------------------------------------------------------------- readout

export type ReadoutTone = "up" | "down" | "plain";
export interface ReadoutItem {
  label: string;
  value: string;
  tone?: ReadoutTone;
}

export const readoutColor = (t?: ReadoutTone): string =>
  t === "up" ? V.up : t === "down" ? V.down : "rgba(255,255,255,0.9)";

export const egp = (n: number): string =>
  `${n.toLocaleString("en-US", { maximumFractionDigits: 0 })} EGP`;

// ---------------------------------------------------------------- RSI

export interface RsiReading {
  at: number;
  verdict: string;
  tone: string;
}

export const RSI_READINGS: RsiReading[] = [
  { at: 0, verdict: "Deeply oversold. Sellers exhausted — but a falling knife is still falling.", tone: V.up },
  { at: 30, verdict: "Oversold. Worth a look IF the trend and the story hold up.", tone: V.up },
  { at: 45, verdict: "Neutral. RSI is telling you nothing here. Look at trend instead.", tone: NEUTRAL },
  { at: 55, verdict: "Neutral, leaning strong. Normal for a healthy uptrend.", tone: NEUTRAL },
  { at: 65, verdict: "Getting warm. This app vetoes new entry zones from here up.", tone: V.gold },
  { at: 70, verdict: "Overbought. Don't start a new position. Existing ones: tighten the stop.", tone: V.down },
  { at: 85, verdict: "Very overbought. Late. Chasing here is how beginners buy the top.", tone: V.down },
];

export function rsiReading(rsi: number): RsiReading {
  return [...RSI_READINGS].reverse().find((r) => rsi >= r.at) ?? RSI_READINGS[0];
}

/** The oversold → overbought strip behind the RSI marker. Offsets in percent. */
export const RSI_STRIP_STOPS: { offset: number; color: string }[] = [
  { offset: 0, color: `${V.up}44` },
  { offset: 28, color: `${V.up}22` },
  { offset: 40, color: `${NEUTRAL}22` },
  { offset: 60, color: `${NEUTRAL}22` },
  { offset: 68, color: `${V.gold}33` },
  { offset: 100, color: `${V.down}44` },
];

// ---------------------------------------------------------------- stop-loss

export const STOP_LOSS_FORMULA = `stop = support − ${STOP_LOSS_ATR_MULTIPLIER} × ATR`;

export interface StopLossPlan {
  stop: number;
  riskPerShare: number;
  riskPct: number;
  readout: ReadoutItem[];
  advice: string;
}

export function stopLossPlan(entry: number, support: number, atr: number): StopLossPlan {
  const stop = support - STOP_LOSS_ATR_MULTIPLIER * atr;
  const riskPerShare = entry - stop;
  const riskPct = (riskPerShare / entry) * 100;
  const readout: ReadoutItem[] = [
    { label: "Stop goes at", value: `${stop.toFixed(2)} EGP`, tone: "down" },
    {
      label: "Risk per share",
      value: riskPerShare > 0 ? `${riskPerShare.toFixed(2)} EGP` : "—",
      tone: "down",
    },
    {
      label: "That's a drop of",
      value: riskPerShare > 0 ? `${riskPct.toFixed(1)}%` : "—",
      tone: riskPct > 15 ? "down" : "plain",
    },
    {
      label: "Room to support",
      value: `${(((entry - support) / entry) * 100).toFixed(1)}%`,
      tone: entry > support ? "plain" : "up",
    },
  ];
  const advice =
    riskPerShare <= 0
      ? "Your entry is already at or below the stop. There is no trade here — the level has broken."
      : riskPct > 15
      ? `A ${riskPct.toFixed(0)}% stop is a long way down. Either wait for a price nearer support, or size the position small enough that a stop-out is survivable.`
      : `Anchoring to support instead of your entry means this number does not change with the price you happened to pay.`;
  return { stop, riskPerShare, riskPct, readout, advice };
}

// ---------------------------------------------------------------- sizing

export interface Verdict {
  text: string;
  tone: string;
}
export interface PositionSizing {
  position: number;
  loss: number;
  hit: number;
  readout: ReadoutItem[];
  verdict: Verdict;
}

export function positionSizing(portfolio: number, weight: number, drop: number): PositionSizing {
  const position = (portfolio * weight) / 100;
  const loss = (position * drop) / 100;
  const hit = (loss / portfolio) * 100;
  const verdict: Verdict =
    weight <= 3
      ? { text: "Thin-liquidity / NILEX sizing. Correct for a name you may struggle to sell.", tone: V.up }
      : weight <= 10
      ? { text: "Inside the house limit of 5–10% per stock. Survivable.", tone: V.up }
      : weight <= 20
      ? { text: "Over the limit. One bad quarter here noticeably dents the whole portfolio.", tone: V.gold }
      : { text: "Concentrated. A single company's bad news is now your portfolio's bad news.", tone: V.down };
  const readout: ReadoutItem[] = [
    { label: "Position size", value: egp(position) },
    { label: "You lose", value: egp(loss), tone: "down" },
    { label: "Portfolio hit", value: `−${hit.toFixed(1)}%`, tone: "down" },
    {
      label: "To get back you need",
      value: `+${((1 / (1 - hit / 100) - 1) * 100).toFixed(1)}%`,
      tone: "up",
    },
  ];
  return { position, loss, hit, readout, verdict };
}

// ---------------------------------------------------------------- T-bill

export const TBILL_CAPITAL = 100000;
export const TBILL_TITLE = `Your stock vs the ${T_BILL_RATE_PCT}% T-bill`;

export interface RaceRow {
  label: string;
  value: number;
  color: string;
  /** Bar length, percent of the longer bar, never below 4 so a bar stays visible. */
  barPct: number;
}
export interface TBillRaceResult {
  stockEnd: number;
  billEnd: number;
  gap: number;
  winning: boolean;
  rows: RaceRow[];
  message: string;
}

export function tBillRace(stockReturn: number, years: number): TBillRaceResult {
  const capital = TBILL_CAPITAL;
  const stockEnd = capital * Math.pow(1 + stockReturn / 100, years);
  const billEnd = capital * Math.pow(1 + T_BILL_RATE_PCT / 100, years);
  const gap = stockEnd - billEnd;
  const winning = gap >= 0;
  const max = Math.max(stockEnd, billEnd);
  const rows: RaceRow[] = [
    { label: `Your stock at ${stockReturn}%`, value: stockEnd, color: winning ? V.up : V.down },
    { label: `T-bills at ${T_BILL_RATE_PCT}%, zero risk`, value: billEnd, color: V.violet },
  ].map((r) => ({ ...r, barPct: Math.max(4, (r.value / max) * 100) }));
  const message = winning
    ? `Starting from ${egp(capital)}, the stock ends ${egp(gap)} ahead. It is paying you for the risk you took.`
    : `Starting from ${egp(capital)}, you end ${egp(Math.abs(gap))} BEHIND simply leaving the money in T-bills — while carrying every bit of the stock's risk. This is the loss beginners never see, because the stock still went up.`;
  return { stockEnd, billEnd, gap, winning, rows, message };
}

// ---------------------------------------------------------------- score bands

export const BAND_COLOR: Record<ScoreBand, string> = {
  strong_sell: V.down,
  sell: V.coral,
  hold: NEUTRAL,
  buy: V.up,
  strong_buy: V.up,
};

const BAND_ORDER: ScoreBand[] = ["strong_sell", "sell", "hold", "buy", "strong_buy"];

/** The five equal-width segments of the explorer's strip, lowest first. */
export const SCORE_BAND_SEGMENTS = BAND_ORDER.map((band) => ({
  band,
  label: SCORE_BAND_LABEL[band],
  color: BAND_COLOR[band],
  width: 20,
}));

export function scoreBandReading(score: number): { band: ScoreBand; color: string; label: string } {
  const band = scoreBand(score);
  return { band, color: BAND_COLOR[band], label: SCORE_BAND_LABEL[band] };
}

export const SCORE_EXPLORER_NOTE =
  "This describes the stock's condition today. It is not an instruction. Nineteen years of EGX history say a high score is not followed by a better return than a low one — so read the category reasons underneath it, and decide on those.";
```

- [ ] **Step 6: Create `src/app/lib/learnLive.ts`**

```ts
/**
 * Which slice of COMI's real data each Learn LiveChart variant draws.
 *
 * Content, not rendering: the overlays, captions and level labels are what
 * the concept teaches, so they are shared by both apps. Returns null when the
 * data cannot support the variant — the caller then keeps its static diagram.
 */
import type { AnalysisResponse } from "./types";
import { V, type LiveVariant, type MiniChartProps, type ZoneScaleProps } from "./learnVisuals";

/** The most liquid EGX30 name — long history, so every overlay resolves. */
export const LIVE_SYMBOL = "COMI";
export const LIVE_BARS = 180;
/** Points actually drawn. Fewer than the fetch, so SMA200 is warm at the left edge. */
export const LIVE_SHOWN = 110;

export type LiveVisualSpec =
  | ({ kind: "MiniChart" } & MiniChartProps)
  | ({ kind: "ZoneScale" } & ZoneScaleProps);

function tail<T>(arr: T[] | undefined, n: number): T[] {
  return arr ? arr.slice(Math.max(0, arr.length - n)) : [];
}

export function liveVisual(
  variant: LiveVariant,
  d: AnalysisResponse,
  caption?: string
): LiveVisualSpec | null {
  const close = tail(d.ohlcv?.close, LIVE_SHOWN);
  if (close.length < 20) return null;

  switch (variant) {
    case "trend": {
      const sma50 = tail(d.indicators?.sma_50, LIVE_SHOWN);
      const sma200 = tail(d.indicators?.sma_200, LIVE_SHOWN);
      if (sma50.every((v) => v === null)) return null;
      return {
        kind: "MiniChart",
        series: close,
        lines: [
          { values: sma50, color: V.accent, width: 1.4 },
          { values: sma200, color: V.gold, width: 1.4 },
        ],
        legend: [
          { color: V.inkBright, label: `${LIVE_SYMBOL} close` },
          { color: V.accent, label: "SMA 50" },
          { color: V.gold, label: "SMA 200" },
        ],
        caption,
        height: 150,
      };
    }

    case "bollinger": {
      const upper = tail(d.indicators?.bollinger_upper, LIVE_SHOWN);
      const lower = tail(d.indicators?.bollinger_lower, LIVE_SHOWN);
      const mid = tail(d.indicators?.bollinger_middle, LIVE_SHOWN);
      if (upper.every((v) => v === null)) return null;
      return {
        kind: "MiniChart",
        series: close,
        band: { upper, lower, color: V.violet },
        lines: [{ values: mid, color: V.violet, width: 1.2, dash: "3 3" }],
        legend: [
          { color: V.inkBright, label: `${LIVE_SYMBOL} close` },
          { color: V.violet, label: "20-day band" },
        ],
        caption:
          caption ??
          (d.bb_squeeze
            ? "Right now the bands are squeezed — a bigger move is building."
            : undefined),
        height: 150,
        fill: false,
      };
    }

    case "rsi": {
      const rsi = tail(d.indicators?.rsi, LIVE_SHOWN).filter(
        (v): v is number => v !== null && Number.isFinite(v)
      );
      if (rsi.length < 20) return null;
      const now = rsi[rsi.length - 1];
      return {
        kind: "MiniChart",
        series: rsi,
        levels: [
          { value: 70, color: V.down, label: "70" },
          { value: 30, color: V.up, label: "30" },
        ],
        markers: [
          {
            index: rsi.length - 1,
            color: now >= 70 ? V.down : now <= 30 ? V.up : V.gold,
            label: `now ${now.toFixed(0)}`,
          },
        ],
        priceColor: V.gold,
        caption: caption ?? `${LIVE_SYMBOL}'s actual RSI over the last few months.`,
        height: 130,
        labelPad: 22,
      };
    }

    case "levels": {
      const sup = d.support_resistance?.supports?.[0];
      const res = d.support_resistance?.resistances?.[0];
      if (!sup && !res) return null;
      return {
        kind: "MiniChart",
        series: close,
        levels: [
          ...(res ? [{ value: res.price, color: V.down, label: "resist" }] : []),
          ...(sup ? [{ value: sup.price, color: V.up, label: "support" }] : []),
        ],
        legend: [
          { color: V.up, label: "support", dash: true },
          { color: V.down, label: "resistance", dash: true },
        ],
        caption:
          caption ??
          `${LIVE_SYMBOL}'s detected levels. Note how far apart they sit — that gap is where your stop has to live.`,
        height: 150,
        labelPad: 40,
      };
    }

    case "volume": {
      const vol = tail(d.ohlcv?.volume, LIVE_SHOWN);
      if (!vol.length) return null;
      return {
        kind: "MiniChart",
        series: vol,
        priceColor: V.teal,
        caption:
          caption ?? `${LIVE_SYMBOL}'s daily traded volume. Spikes mark the days a move was real.`,
        height: 110,
      };
    }

    case "score": {
      const s = d.composite_score?.score;
      if (typeof s !== "number") return null;
      return {
        kind: "ZoneScale",
        zones: [
          { from: 0, to: 20, color: V.down, label: "Very Weak" },
          { from: 20, to: 40, color: V.coral, label: "Weak" },
          { from: 40, to: 60, color: "#7f8ea3", label: "Neutral" },
          { from: 60, to: 80, color: V.up, label: "Strong" },
          { from: 80, to: 100, color: V.up, label: "Very Strong" },
        ],
        markers: [{ value: s, label: `${LIVE_SYMBOL} ${s.toFixed(0)}` }],
        ticks: [0, 20, 40, 60, 80, 100],
        caption:
          caption ??
          `${LIVE_SYMBOL}'s composite right now, on your own weights. A reading of condition — not a forecast.`,
      };
    }
  }
  return null;
}
```

- [ ] **Step 7: Point `components/learn/visuals.tsx` at the shared module**

Make exactly these five edits (everything else in the file stays byte-identical):

1. Replace from the line `import { useId } from "react";` through the closing `} as const;` of the `V` palette (including the `// ---- palette` comment between them) with:
```ts
import { useId } from "react";
import {
  V,
  VIEW_W as W,
  extent,
  toPath,
  type Nums,
  type ChartLine,
  type ChartLevel,
  type ChartMarker,
  type ChartShade,
  type Zone,
} from "../../lib/learnVisuals";

// The palette, prop shapes and series generators live in lib/learnVisuals.ts,
// shared with the mobile app. Re-exported so existing importers keep working.
export { V, walk, smaOf } from "../../lib/learnVisuals";
export type { ChartLine, ChartLevel, ChartMarker, ChartShade, Zone } from "../../lib/learnVisuals";
```
2. Delete everything from the line `// ---------------------------------------------------------------- helpers` up to (not including) the line `// ---------------------------------------------------------------- MiniChart` — that removes `type Nums`, `const W = 320`, `extent` and `toPath`.
3. Delete the four declarations `export interface ChartLine {…}`, `export interface ChartLevel {…}`, `export interface ChartMarker {…}`, `export interface ChartShade {…}` (between the MiniChart section marker and the `/** The workhorse.` comment).
4. Delete `export interface Zone {…}` (directly under the `// ---- ZoneScale` marker).
5. Delete everything from `// ---------------------------------------------------------------- series gen` to the end of the file (`walk`, `smaOf`).

- [ ] **Step 8: Replace `components/learn/widgets.tsx` in full**

```tsx
"use client";

/**
 * Learn-page calculators.
 *
 * Each one reproduces a rule the app actually applies elsewhere, so a reader
 * can drag a value and watch the app's own arithmetic move. The formulas and
 * verdict copy live in lib/learnWidgets.ts (shared with the mobile app), which
 * imports each rule from lib/constants.ts rather than restating it — a widget
 * that teaches a different number from the one the app computes is worse
 * than no widget.
 */

import { useId, useState } from "react";
import { STOP_LOSS_ATR_MULTIPLIER } from "../../lib/constants";
import { V } from "../../lib/learnVisuals";
import {
  RSI_STRIP_STOPS,
  SCORE_BAND_SEGMENTS,
  SCORE_EXPLORER_NOTE,
  TBILL_TITLE,
  egp,
  positionSizing,
  readoutColor,
  rsiReading,
  scoreBandReading,
  stopLossPlan,
  tBillRace,
  type ReadoutItem,
} from "../../lib/learnWidgets";

// ---------------------------------------------------------------- chrome

function Panel({
  title,
  children,
  accent = V.accent,
}: {
  title: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-white/[0.07] bg-black/25">
      <div className="flex items-center gap-2 border-b border-white/[0.05] px-3 py-2">
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: accent }}
        />
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/45">
          {title}
        </span>
        <span className="ml-auto font-mono text-[9px] uppercase tracking-wider text-white/25">
          try it
        </span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  accent = V.accent,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  accent?: string;
  onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[11px] text-white/55">
          {label}
        </label>
        <span
          className="font-mono text-[12px] font-semibold tabular-nums"
          style={{ color: accent }}
        >
          {value}
          {suffix}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-6 w-full cursor-pointer bg-transparent"
        style={{ accentColor: accent }}
      />
    </div>
  );
}

function Readout({ items }: { items: ReadoutItem[] }) {
  return (
    <dl className="m-0 mt-1 grid grid-cols-2 gap-x-3 gap-y-2 rounded-md bg-white/[0.03] p-2.5">
      {items.map((i) => (
        <div key={i.label} className="min-w-0">
          <dt className="truncate font-mono text-[9px] uppercase tracking-wider text-white/35">
            {i.label}
          </dt>
          <dd
            className="m-0 mt-0.5 font-mono text-[13px] font-semibold tabular-nums"
            style={{ color: readoutColor(i.tone) }}
          >
            {i.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// ---------------------------------------------------------------- RSI

export function RsiPlayground() {
  const [rsi, setRsi] = useState(58);
  const reading = rsiReading(rsi);

  return (
    <Panel title="RSI — drag to read it" accent={V.gold}>
      <div className="relative mb-3 h-9 overflow-hidden rounded-md">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(90deg, ${RSI_STRIP_STOPS.map(
              (s) => `${s.color} ${s.offset}%`
            ).join(", ")})`,
          }}
        />
        {[30, 70].map((t) => (
          <span
            key={t}
            className="absolute inset-y-0 w-px bg-white/25"
            style={{ left: `${t}%` }}
          />
        ))}
        <span
          className="absolute top-0 h-full w-[3px] rounded-full transition-[left] duration-100"
          style={{ left: `calc(${rsi}% - 1.5px)`, background: reading.tone }}
        />
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 font-mono text-[9px] uppercase tracking-wider text-white/50">
          oversold
        </span>
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 font-mono text-[9px] uppercase tracking-wider text-white/50">
          overbought
        </span>
      </div>

      <Slider
        label="RSI reading"
        value={rsi}
        min={0}
        max={100}
        accent={reading.tone}
        onChange={setRsi}
      />
      <p
        className="mt-1 rounded-md bg-white/[0.03] p-2.5 text-[11px] leading-relaxed"
        style={{ color: reading.tone }}
      >
        {reading.verdict}
      </p>
    </Panel>
  );
}

// ---------------------------------------------------------------- stop-loss

export function StopLossCalculator() {
  const [support, setSupport] = useState(98);
  const [atr, setAtr] = useState(4);
  const [entry, setEntry] = useState(104);
  const plan = stopLossPlan(entry, support, atr);

  return (
    <Panel title="Stop-loss — the app's own formula" accent={V.coral}>
      <p className="mb-3 font-mono text-[10px] leading-relaxed text-white/40">
        stop = support − {STOP_LOSS_ATR_MULTIPLIER} × ATR
      </p>
      <Slider label="Entry price you'd pay" value={entry} min={60} max={160} suffix=" EGP" accent={V.coral} onChange={setEntry} />
      <Slider label="Nearest support" value={support} min={50} max={150} suffix=" EGP" accent={V.coral} onChange={setSupport} />
      <Slider label="ATR (typical daily move)" value={atr} min={0.5} max={12} step={0.5} suffix=" EGP" accent={V.coral} onChange={setAtr} />

      <Readout items={plan.readout} />
      <p className="mt-2 text-[10px] leading-relaxed text-white/40">{plan.advice}</p>
    </Panel>
  );
}

// ---------------------------------------------------------------- sizing

export function PositionSizer() {
  const [portfolio, setPortfolio] = useState(100000);
  const [weight, setWeight] = useState(10);
  const [drop, setDrop] = useState(50);
  const sizing = positionSizing(portfolio, weight, drop);

  return (
    <Panel title="Position sizing — what a drop actually costs" accent={V.teal}>
      <Slider label="Portfolio value" value={portfolio} min={10000} max={1000000} step={10000} suffix=" EGP" accent={V.teal} onChange={setPortfolio} />
      <Slider label="Put into this one stock" value={weight} min={1} max={40} suffix="%" accent={V.teal} onChange={setWeight} />
      <Slider label="If it then falls" value={drop} min={5} max={80} step={5} suffix="%" accent={V.teal} onChange={setDrop} />

      <Readout items={sizing.readout} />
      <p
        className="mt-2 text-[10px] leading-relaxed"
        style={{ color: sizing.verdict.tone }}
      >
        {sizing.verdict.text}
      </p>
    </Panel>
  );
}

// ---------------------------------------------------------------- T-bill

export function TBillRace() {
  const [stockReturn, setStockReturn] = useState(18);
  const [years, setYears] = useState(5);
  const race = tBillRace(stockReturn, years);

  return (
    <Panel title={TBILL_TITLE} accent={V.violet}>
      <Slider label="Stock returns, per year" value={stockReturn} min={-10} max={60} suffix="%" accent={race.winning ? V.up : V.down} onChange={setStockReturn} />
      <Slider label="Held for" value={years} min={1} max={15} suffix={years === 1 ? " year" : " years"} accent={V.violet} onChange={setYears} />

      <div className="mt-3 space-y-2.5">
        {race.rows.map((r) => (
          <div key={r.label}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-[11px] text-white/55">{r.label}</span>
              <span
                className="font-mono text-[11px] font-semibold tabular-nums"
                style={{ color: r.color }}
              >
                {egp(r.value)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{ width: `${r.barPct}%`, background: r.color, opacity: 0.85 }}
              />
            </div>
          </div>
        ))}
      </div>

      <p
        className="mt-3 rounded-md bg-white/[0.03] p-2.5 text-[11px] leading-relaxed"
        style={{ color: race.winning ? V.up : V.down }}
      >
        {race.message}
      </p>
    </Panel>
  );
}

// ---------------------------------------------------------------- bands

export function ScoreBandExplorer() {
  const [score, setScore] = useState(64);
  const reading = scoreBandReading(score);

  return (
    <Panel title="Composite score — what each band means" accent={reading.color}>
      <div className="relative mb-3 flex h-9 overflow-hidden rounded-md">
        {SCORE_BAND_SEGMENTS.map((s, i) => (
          <span
            key={i}
            className="grid place-items-center"
            style={{
              width: `${s.width}%`,
              background: `${s.color}${i === 4 ? "55" : "2e"}`,
            }}
          />
        ))}
        <span
          className="absolute top-0 h-full w-[3px] rounded-full transition-[left] duration-100"
          style={{ left: `calc(${score}% - 1.5px)`, background: reading.color }}
        />
      </div>

      <Slider label="Score" value={score} min={0} max={100} accent={reading.color} onChange={setScore} />

      <div className="mt-1 rounded-md bg-white/[0.03] p-2.5">
        <p
          className="font-mono text-[13px] font-semibold uppercase tracking-wider"
          style={{ color: reading.color }}
        >
          {reading.label}
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-white/55">
          {SCORE_EXPLORER_NOTE}
        </p>
      </div>
    </Panel>
  );
}
```

- [ ] **Step 9: Replace `components/learn/LiveChart.tsx` in full**

```tsx
"use client";

/**
 * Real EGX data inside a Learn concept.
 *
 * Three constraints shaped this:
 *
 * 1. **One fetch for the whole page.** Every instance shares a single
 *    module-level promise, so five live concepts cost one `/api/analysis`
 *    call, not five.
 * 2. **Nothing loads until it's on screen.** An IntersectionObserver defers
 *    the fetch until a live concept scrolls into view, so opening the Learn
 *    page stays as instant as it was when it was pure text.
 * 3. **It must degrade to the diagram.** The page is service-worker cached
 *    and read offline; on any failure the caller's static SVG renders
 *    instead, with no error surfaced. A teaching page does not need to
 *    explain a network problem — it needs to keep teaching.
 *
 * WHICH series each variant draws lives in lib/learnLive.ts, shared with the
 * mobile app.
 */

import { useEffect, useRef, useState } from "react";
import { fetchAnalysis } from "../../lib/api";
import type { AnalysisResponse } from "../../lib/types";
import { V, specProps, type LiveVariant } from "../../lib/learnVisuals";
import { LIVE_BARS, LIVE_SYMBOL, liveVisual } from "../../lib/learnLive";
import { MiniChart, ZoneScale } from "./visuals";

export type { LiveVariant };

let inflight: Promise<AnalysisResponse> | null = null;

function loadAnalysis(): Promise<AnalysisResponse> {
  if (!inflight) {
    inflight = fetchAnalysis(LIVE_SYMBOL, "Daily", LIVE_BARS).catch((err) => {
      inflight = null; // let a later concept retry
      throw err;
    });
  }
  return inflight;
}

export default function LiveChart({
  variant,
  fallback,
  caption,
}: {
  variant: LiveVariant;
  /** Rendered while loading, and permanently if the data never arrives. */
  fallback: React.ReactNode;
  caption?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || data || failed) return;
    let alive = true;
    loadAnalysis()
      .then((d) => alive && setData(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [visible, data, failed]);

  const spec = data ? liveVisual(variant, data, caption) : null;
  const chart =
    spec === null ? null : spec.kind === "MiniChart" ? (
      <MiniChart {...specProps(spec)} />
    ) : (
      <ZoneScale {...specProps(spec)} />
    );

  return (
    <div ref={ref}>
      {chart ?? fallback}
      {chart && (
        <p className="mt-1.5 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-white/30">
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: V.up }}
          />
          Live · {LIVE_SYMBOL} · daily
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 10: Typecheck**

Run: `cd /home/mark/projects/egx-api/egx-api-fe && npx tsc --noEmit`
Expected: exits 0, no output. (Fix only type errors in the files this task touched.)

- [ ] **Step 11: Re-run parity and compare**

```bash
cd /home/mark/projects/egx-api/egx-api-fe
npx --yes tsx@4.20.3 --tsconfig scripts/tsconfig.parity.json scripts/learn-markup.tsx /tmp/egx-learn-parity/after-task1.html
cmp /tmp/egx-learn-parity/before.html /tmp/egx-learn-parity/after-task1.html && echo PARITY-OK
```
Expected: same card count as Step 3, then `PARITY-OK`. On a difference, `diff <(tr '>' '>\n' < /tmp/egx-learn-parity/before.html) <(tr '>' '>\n' < /tmp/egx-learn-parity/after-task1.html) | head` shows where; fix the code, not the baseline.

- [ ] **Step 12: Commit (scripts stay uncommitted)**

```bash
cd /home/mark/projects/egx-api/egx-api-fe
git add src/app/lib/learnVisuals.ts src/app/lib/learnWidgets.ts src/app/lib/learnLive.ts \
  src/app/components/learn/visuals.tsx src/app/components/learn/widgets.tsx src/app/components/learn/LiveChart.tsx
git status --short   # scripts/ must still show as untracked (??), not staged
git commit -m "$(cat <<'EOF'
refactor(learn): move palette, widget formulas and live mapping to lib

Platform-neutral modules shared with the mobile app. Server-rendered
/learn markup is byte-identical before and after.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XDkAB7UCK8WyT267W5ZxNV
EOF
)"
```

---

## Task 2: Web — curriculum as data (codemod), `LearnVisual`, guide update

**Repo:** `/home/mark/projects/egx-api/egx-api-fe` (+ mirror guide to `../egx-api-be`)

**Files:**
- Create: `src/app/lib/learn.ts`, `src/app/lib/curriculum.ts` (generated), `src/app/components/learn/LearnVisual.tsx`
- Modify: `src/app/learn/LearnClient.tsx`, `src/app/components/learn/ConceptCard.tsx`, `CLAUDE.md`, `../egx-api-be/CLAUDE.md`
- Delete: `src/app/learn/curriculum.tsx`
- Temporary: `scripts/curriculum-to-data.mjs` (deleted at the end with the Task 1 scripts)

**Interfaces:**
- Consumes: Task 1's `learnVisuals.ts` (`VisualSpec`, `specProps`, `V`, `walk`, `smaOf`).
- Produces:
  - `learn.ts`: `type Level`, `interface Concept { id?; title; definition; whyItMatters; howToUse; example?; level?: Level; visual?: VisualSpec }`, `interface Module { id; title; goal; hue; overview?: VisualSpec; concepts: Concept[] }`, `interface ConceptEntry { concept: Concept; module: Module }`, `LEVEL_LABEL: Record<Level,string>`, `LEARN_PROGRESS_KEY = "egx.learn.progress"`, `conceptKey(c: Concept): string`, `normalizeSearch(text: string): string`, `searchConcepts(entries: ConceptEntry[], query: string): ConceptEntry[] | null` (null ⇔ the folded query is empty).
  - `curriculum.ts`: `CURRICULUM: Module[]`, `ALL_CONCEPTS: ConceptEntry[]`, `TOTAL_CONCEPTS: number`.

- [ ] **Step 1: Create `src/app/lib/learn.ts`**

```ts
/**
 * Learn page types and helpers, shared by the web app and the mobile app
 * (copied into egx-api-mobile/src/shared by its sync script). Platform-
 * neutral: no JSX, no DOM, no React.
 */
import type { VisualSpec } from "./learnVisuals";

export type Level = "start" | "core" | "deep";

export interface Concept {
  /** Public deep-link anchor. Optional only for concepts nothing links to. */
  id?: string;
  title: string;
  definition: string;
  whyItMatters: string;
  howToUse: string;
  /** A concrete worked example, in EGP. Rendered in mono. */
  example?: string;
  level?: Level;
  visual?: VisualSpec;
}

export interface Module {
  /** Was a `<Section id>` before the redesign. Kept as a live anchor. */
  id: string;
  title: string;
  goal: string;
  hue: string;
  /** Shown once above the module's concepts. */
  overview?: VisualSpec;
  concepts: Concept[];
}

export interface ConceptEntry {
  concept: Concept;
  module: Module;
}

export const LEVEL_LABEL: Record<Level, string> = {
  start: "start here",
  core: "core",
  deep: "deeper",
};

/** Per-device reading progress lives under this key (localStorage / AsyncStorage). */
export const LEARN_PROGRESS_KEY = "egx.learn.progress";

/** Stable key for progress tracking — ids are preferred, titles are the fallback. */
export const conceptKey = (c: Concept): string =>
  c.id ?? c.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Fold punctuation so the reader does not have to guess our hyphens.
 *
 * The terms this page teaches are written with punctuation the reader has no
 * reason to reproduce — "stop-loss", "T-bill", "P/E", "risk-adjusted". A plain
 * substring match meant **"stop loss" returned nothing while "stop-loss"
 * returned nine**, and the old placeholder quietly worked around it by
 * spelling the hyphen out. Applied to BOTH the query and the text, so the two
 * always meet in the same shape.
 */
export function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Concepts whose text contains the folded query; null when there is no query. */
export function searchConcepts(entries: ConceptEntry[], query: string): ConceptEntry[] | null {
  const q = normalizeSearch(query);
  if (!q) return null;
  return entries.filter(({ concept: c }) =>
    normalizeSearch(
      [c.title, c.definition, c.whyItMatters, c.howToUse, c.example ?? ""].join(" ")
    ).includes(q)
  );
}
```

- [ ] **Step 2: Write the one-off codemod `scripts/curriculum-to-data.mjs`**

```js
// ONE-OFF, never committed. Converts src/app/learn/curriculum.tsx (content
// with JSX diagrams) into src/app/lib/curriculum.ts (content with VisualSpec
// objects). Every JSX element <Tag a={x} b="y">…children…</Tag> becomes
// { kind: "Tag", a: x, b: "y", children: [...] }; everything else in the file
// is copied verbatim. It refuses (throws) on anything it cannot convert
// exactly, rather than guessing.
import { readFileSync, writeFileSync } from "node:fs";
import ts from "typescript";

const SRC = "src/app/learn/curriculum.tsx";
const OUT = "src/app/lib/curriculum.ts";
const SERIES_MARKER = "// ---------------------------------------------------------------- series";

const text = readFileSync(SRC, "utf8");
const sf = ts.createSourceFile(SRC, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

const isJsx = (n) => ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n);
const where = (n) => {
  const { line, character } = sf.getLineAndCharacterOfPosition(n.getStart(sf));
  return `${SRC}:${line + 1}:${character + 1}`;
};
const indentOf = (n) => " ".repeat(sf.getLineAndCharacterOfPosition(n.getStart(sf)).character);

/** Outermost JSX nodes under `node`, in source order. */
function outerJsx(node) {
  const found = [];
  const visit = (n) => n.forEachChild((c) => (isJsx(c) ? found.push(c) : visit(c)));
  visit(node);
  return found;
}

/** Source text of an expression with every outermost JSX descendant converted. */
function rewrite(node) {
  if (isJsx(node)) return toSpec(node);
  let out = "";
  let cursor = node.getStart(sf);
  for (const k of outerJsx(node)) {
    out += text.slice(cursor, k.getStart(sf)) + toSpec(k);
    cursor = k.getEnd();
  }
  return out + text.slice(cursor, node.getEnd());
}

function toSpec(node) {
  if (ts.isJsxFragment(node)) throw new Error(`fragment at ${where(node)}`);
  const opening = ts.isJsxElement(node) ? node.openingElement : node;
  const tag = opening.tagName.getText(sf);
  if (!/^[A-Z]/.test(tag)) throw new Error(`lowercase (DOM) element <${tag}> at ${where(node)}`);
  const pad = indentOf(node) + "  ";
  const props = [`kind: ${JSON.stringify(tag)}`];

  for (const a of opening.attributes.properties) {
    if (!ts.isJsxAttribute(a)) throw new Error(`spread attribute at ${where(a)}`);
    const name = a.name.getText(sf);
    const init = a.initializer;
    if (!init) {
      props.push(`${name}: true`);
    } else if (ts.isStringLiteral(init)) {
      if (/&[a-z#0-9]+;/i.test(init.text)) throw new Error(`HTML entity in ${name} at ${where(a)}`);
      props.push(`${name}: ${JSON.stringify(init.text)}`);
    } else if (ts.isJsxExpression(init) && init.expression) {
      props.push(`${name}: ${rewrite(init.expression)}`);
    } else {
      throw new Error(`unsupported attribute ${name} at ${where(a)}`);
    }
  }

  if (ts.isJsxElement(node)) {
    const children = [];
    for (const c of node.children) {
      if (ts.isJsxText(c)) {
        if (c.text.trim()) throw new Error(`text child at ${where(c)}`);
        continue;
      }
      if (ts.isJsxExpression(c)) {
        if (!c.expression) continue; // a {/* comment */}
        throw new Error(`expression child at ${where(c)}`);
      }
      children.push(toSpec(c));
    }
    props.push(`children: [${children.map((c) => `\n${pad}  ${c}`).join(",")}\n${pad}]`);
  }

  return `{\n${props.map((p) => `${pad}${p},`).join("\n")}\n${indentOf(node)}}`;
}

const start = text.indexOf(SERIES_MARKER);
if (start < 0) throw new Error("series marker not found — has curriculum.tsx changed shape?");

let body = "";
let cursor = start;
let converted = 0;
for (const k of outerJsx(sf)) {
  if (k.getStart(sf) < start) continue; // the dropped header (the old Stack helper)
  body += text.slice(cursor, k.getStart(sf)) + toSpec(k);
  cursor = k.getEnd();
  converted += 1;
}
body += text.slice(cursor);

const HEADER = `/**
 * The Learn curriculum — all content as DATA.
 *
 * Shared by the web app (rendered by components/learn/LearnVisual.tsx) and
 * the mobile app (copied into egx-api-mobile/src/shared by its sync script),
 * so it must stay platform-neutral: no JSX, no DOM, no React. Diagrams are
 * \`VisualSpec\` objects (lib/learnVisuals.ts), not elements.
 *
 * Every \`id\` on this page is a public anchor: in-app signals deep-link to
 * \`/learn#<learn_concept>\` from \`AdvicePanel\`, and \`ForecastCard\`,
 * \`EntryExitCard\`, \`HoldingsTable\` and \`MarketRegimeCard\` link to fixed
 * ones. **Never rename or drop an id** — move a concept between modules
 * freely, the hash router finds it wherever it lives.
 *
 * The nine module ids are the old section anchors, kept for the same reason.
 *
 * A string that states a number the app computes MUST interpolate the
 * constant (\`\${T_BILL_RATE_PCT}\`), never restate it.
 */

import { V, walk, smaOf } from "./learnVisuals";
import { DEFAULT_WEIGHTS, T_BILL_RATE_PCT } from "./constants";
import type { Module } from "./learn";

`;

writeFileSync(OUT, HEADER + body);
console.log(`wrote ${OUT}: ${converted} top-level diagrams converted`);
```

- [ ] **Step 3: Run the codemod and format the output**

```bash
cd /home/mark/projects/egx-api/egx-api-fe
node scripts/curriculum-to-data.mjs
npx --yes prettier@3.3.3 --write src/app/lib/curriculum.ts
grep -c 'kind: "' src/app/lib/curriculum.ts
grep -c '<[A-Z]' src/app/lib/curriculum.ts
```
Expected: `wrote src/app/lib/curriculum.ts: 71 top-level diagrams converted` (70 `visual`s + 1 `overview`; a different number is fine only if the source has grown), then `89` (every element, nested ones included: 28 MiniChart, 17 LedgerRows, 8 ZoneScale, 8 BarCompare, 6 LiveChart, 6 Stack, 3 StepFlow, 3 AllocationDonut, 2 ConeChart, 2 CorrelationGrid, 2 TBillRace, 1 each of the other three widgets), then `0` — no JSX left. Note: the `<Section id>` text inside the `Module` doc comment was in the dropped header, so it is not counted.

- [ ] **Step 4: Create `src/app/components/learn/LearnVisual.tsx`**

```tsx
"use client";

/**
 * Renders one curriculum diagram (`VisualSpec`, lib/learnVisuals.ts) with the
 * web components. The mobile app has a twin with the same switch
 * (egx-api-mobile/src/features/learn/LearnVisual.tsx) — a new kind needs a
 * case in both.
 */
import { specProps, type VisualSpec } from "../../lib/learnVisuals";
import {
  AllocationDonut,
  BarCompare,
  ConeChart,
  CorrelationGrid,
  LedgerRows,
  MiniChart,
  StepFlow,
  ZoneScale,
} from "./visuals";
import {
  PositionSizer,
  RsiPlayground,
  ScoreBandExplorer,
  StopLossCalculator,
  TBillRace,
} from "./widgets";
import LiveChart from "./LiveChart";

export default function LearnVisual({ spec }: { spec: VisualSpec }) {
  switch (spec.kind) {
    case "MiniChart":
      return <MiniChart {...specProps(spec)} />;
    case "ZoneScale":
      return <ZoneScale {...specProps(spec)} />;
    case "BarCompare":
      return <BarCompare {...specProps(spec)} />;
    case "StepFlow":
      return <StepFlow {...specProps(spec)} />;
    case "AllocationDonut":
      return <AllocationDonut {...specProps(spec)} />;
    case "CorrelationGrid":
      return <CorrelationGrid {...specProps(spec)} />;
    case "ConeChart":
      return <ConeChart {...specProps(spec)} />;
    case "LedgerRows":
      return <LedgerRows {...specProps(spec)} />;
    case "Stack":
      // Was the curriculum's local <Stack> helper: same element, same class.
      return (
        <div className="space-y-2.5">
          {spec.children.map((child, i) => (
            <LearnVisual key={i} spec={child} />
          ))}
        </div>
      );
    case "LiveChart":
      return (
        <LiveChart
          variant={spec.variant}
          caption={spec.caption}
          fallback={<LearnVisual spec={spec.fallback} />}
        />
      );
    case "RsiPlayground":
      return <RsiPlayground />;
    case "StopLossCalculator":
      return <StopLossCalculator />;
    case "PositionSizer":
      return <PositionSizer />;
    case "TBillRace":
      return <TBillRace />;
    case "ScoreBandExplorer":
      return <ScoreBandExplorer />;
  }
  return null;
}
```

- [ ] **Step 5: Switch `ConceptCard.tsx` to the shared types**

Replace the import line and the local `LEVEL_LABEL` block (lines 3–9 of the current file):
```tsx
import type { Concept, Level } from "../../learn/curriculum";

const LEVEL_LABEL: Record<Level, string> = {
  start: "start here",
  core: "core",
  deep: "deeper",
};
```
with:
```tsx
import { LEVEL_LABEL, type Concept } from "../../lib/learn";
import LearnVisual from "./LearnVisual";
```
and replace
```tsx
        {concept.visual && <div className="mb-3">{concept.visual}</div>}
```
with
```tsx
        {concept.visual && (
          <div className="mb-3">
            <LearnVisual spec={concept.visual} />
          </div>
        )}
```

- [ ] **Step 6: Switch `LearnClient.tsx` to the shared modules**

1. Replace the import block
```tsx
import {
  CURRICULUM,
  ALL_CONCEPTS,
  TOTAL_CONCEPTS,
  conceptKey,
  type Module,
} from "./curriculum";
import ConceptCard from "../components/learn/ConceptCard";

const STORAGE_KEY = "egx.learn.progress";
```
with
```tsx
import { CURRICULUM, ALL_CONCEPTS, TOTAL_CONCEPTS } from "../lib/curriculum";
import {
  conceptKey,
  normalizeSearch,
  searchConcepts,
  LEARN_PROGRESS_KEY,
  type Module,
} from "../lib/learn";
import ConceptCard from "../components/learn/ConceptCard";
import LearnVisual from "../components/learn/LearnVisual";

const STORAGE_KEY = LEARN_PROGRESS_KEY;
```
2. Delete the local `normalizeSearch` function together with its doc comment (the block under `// ---- search`; keep the section marker line). Its doc now lives in `lib/learn.ts`.
3. Replace
```tsx
  const results = useMemo(() => {
    if (!q) return null;
    return ALL_CONCEPTS.filter(({ concept: c }) =>
      normalizeSearch(
        [c.title, c.definition, c.whyItMatters, c.howToUse, c.example ?? ""].join(" ")
      ).includes(q)
    );
  }, [q]);
```
with
```tsx
  const results = useMemo(() => searchConcepts(ALL_CONCEPTS, query), [query]);
```
(`const q = normalizeSearch(query);` above it stays — the effects and the pill strip still key on `q`.)
4. In `ModuleSection`, replace
```tsx
      {m.overview && <div className="mb-4">{m.overview}</div>}
```
with
```tsx
      {m.overview && (
        <div className="mb-4">
          <LearnVisual spec={m.overview} />
        </div>
      )}
```

- [ ] **Step 7: Delete the JSX curriculum and typecheck**

```bash
cd /home/mark/projects/egx-api/egx-api-fe
git rm -q src/app/learn/curriculum.tsx
grep -rn "learn/curriculum\"" src || echo "no stale imports"
npx tsc --noEmit
```
Expected: `no stale imports`, then tsc exits 0. A tsc error inside `lib/curriculum.ts` means a converted prop does not match its `VisualSpec` member — fix the spec type in `learnVisuals.ts` only if the web component genuinely accepts that prop; otherwise the codemod mis-converted, so fix the codemod and re-run Step 3.

- [ ] **Step 8: Parity against the Task 1 baseline**

```bash
cd /home/mark/projects/egx-api/egx-api-fe
npx --yes tsx@4.20.3 --tsconfig scripts/tsconfig.parity.json scripts/learn-markup.tsx /tmp/egx-learn-parity/after-task2.html
cmp /tmp/egx-learn-parity/before.html /tmp/egx-learn-parity/after-task2.html && echo PARITY-OK
grep -o 'id="[a-z0-9_-]*"' /tmp/egx-learn-parity/after-task2.html | sort -u | wc -l
grep -o 'id="[a-z0-9_-]*"' /tmp/egx-learn-parity/before.html | sort -u | wc -l
```
Expected: `PARITY-OK`; the two id counts are equal.

- [ ] **Step 9: Production build (tmux — may exceed 2 minutes)**

```bash
mkdir -p ~/logs
tmux kill-session -t egx-fe-build 2>/dev/null
tmux new -d -s egx-fe-build "cd /home/mark/projects/egx-api/egx-api-fe && npm run build 2>&1 | tee ~/logs/egx-fe-build.log"
```
Tell the user: session `egx-fe-build`, log `~/logs/egx-fe-build.log`. Poll with `tail -5 ~/logs/egx-fe-build.log` until it ends.
Expected: the route table lists `/learn`, no `Failed to compile`. (`next lint` is not run: the repo has no ESLint config and `next lint` would prompt interactively.)

- [ ] **Step 10: Update the web guide and mirror it**

In `egx-api-fe/CLAUDE.md`:

(a) Directory layout — replace
```
    learn/page.tsx              # Educational content (has id anchors for learn_concept deep links)
```
with
```
    learn/page.tsx              # Educational content (has id anchors for learn_concept deep links)
                                # — content is DATA in lib/curriculum.ts, shared with egx-api-mobile
```
(b) In `### Learn`, replace
```
`<details>` sections it used to be. Three files:

- `page.tsx` — a thin server component; owns the page `<title>` only
- `LearnClient.tsx` — the shell: hero, search, module nav, progress, hash router
- `curriculum.tsx` — **all content as data**, so the shell stays about layout

Plus `src/app/components/learn/`: `visuals.tsx` (the SVG diagram library),
`widgets.tsx` (the five calculators), `LiveChart.tsx`, `ConceptCard.tsx`.
```
with
```
`<details>` sections it used to be. Two route files:

- `page.tsx` — a thin server component; owns the page `<title>` only
- `LearnClient.tsx` — the shell: hero, search, module nav, progress, hash router

Plus `src/app/components/learn/`: `visuals.tsx` (the SVG diagram library),
`widgets.tsx` (the five calculators), `LiveChart.tsx`, `ConceptCard.tsx`, and
`LearnVisual.tsx` (renders one `VisualSpec` with those components).

#### The content is DATA, shared with the mobile app

Since 2026-10 the curriculum lives in `src/app/lib/`, because the React Native
app (`../egx-api-mobile`) renders the same content from verbatim copies
(`npm run sync:shared` there; its `check:shared` fails on any drift):

- `lib/curriculum.ts` — `CURRICULUM`, `ALL_CONCEPTS`, `TOTAL_CONCEPTS`. Every
  diagram is a `VisualSpec` OBJECT (`{ kind: "MiniChart", series, … }`), never
  JSX — the native app cannot import a `.tsx` file.
- `lib/learn.ts` — `Concept`/`Module` types, `conceptKey`, `normalizeSearch`,
  `searchConcepts`, `LEVEL_LABEL`, the progress storage key.
- `lib/learnVisuals.ts` — palette `V`, every diagram's prop shape, the
  `VisualSpec` union, `walk`/`smaOf`/`extent`/`toPath`.
- `lib/learnWidgets.ts` — the calculators' formulas and verdict copy.
- `lib/learnLive.ts` — which COMI series each `LiveChart` variant draws.

These must stay platform-neutral (no JSX, `window`, `document`, React). A new
diagram type is a new `VisualSpec` member plus a case in BOTH renderers
(`components/learn/LearnVisual.tsx` here, `src/features/learn/LearnVisual.tsx`
in the mobile app). To change content: edit `lib/curriculum.ts`, commit, then
run `npm run sync:shared` in `egx-api-mobile` and commit there.
```
(c) Replace
```
- `widgets.tsx` — `RsiPlayground`, `StopLossCalculator`, `PositionSizer`,
  `TBillRace`, `ScoreBandExplorer`. Each imports its formula from
  `lib/constants.ts` rather than restating it.
```
with
```
- `widgets.tsx` — `RsiPlayground`, `StopLossCalculator`, `PositionSizer`,
  `TBillRace`, `ScoreBandExplorer`. Formulas and verdict copy live in
  `lib/learnWidgets.ts` (shared with mobile), which imports each rule from
  `lib/constants.ts` rather than restating it.
```
(d) Replace `` (`id` attribute on a Concept card in `egx-api-fe/src/app/learn/page.tsx`) `` with `` (`id` of a Concept in `egx-api-fe/src/app/lib/curriculum.ts`) ``.
(e) Replace `6. Add a Concept card to `src/app/learn/page.tsx`` with `6. Add a Concept to `src/app/lib/curriculum.ts`, then `npm run sync:shared` in `egx-api-mobile``.

Then mirror:
```bash
cp /home/mark/projects/egx-api/egx-api-fe/CLAUDE.md /home/mark/projects/egx-api/egx-api-be/CLAUDE.md
diff -q /home/mark/projects/egx-api/egx-api-fe/CLAUDE.md /home/mark/projects/egx-api/egx-api-be/CLAUDE.md && echo MIRRORED
```
Expected: `MIRRORED`. (Before copying, `git -C ../egx-api-be diff --stat CLAUDE.md` must be empty — if the backend copy had diverged, stop and ask.)

- [ ] **Step 11: Remove the temporary scripts and commit both repos**

```bash
cd /home/mark/projects/egx-api/egx-api-fe
rm -f scripts/learn-markup.tsx scripts/tsconfig.parity.json scripts/curriculum-to-data.mjs
rmdir scripts 2>/dev/null || true
git add src/app/lib/learn.ts src/app/lib/curriculum.ts src/app/components/learn/LearnVisual.tsx \
  src/app/components/learn/ConceptCard.tsx src/app/learn/LearnClient.tsx CLAUDE.md
git status --short   # expect only the staged files and the curriculum.tsx deletion
git commit -m "$(cat <<'EOF'
refactor(learn): curriculum is data in lib/, rendered via LearnVisual

Converted mechanically from JSX to VisualSpec objects so the mobile app
can share it. Every anchor id kept; /learn markup byte-identical.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XDkAB7UCK8WyT267W5ZxNV
EOF
)"
cd /home/mark/projects/egx-api/egx-api-be
git add CLAUDE.md
git commit -m "$(cat <<'EOF'
docs: mirror web guide — Learn content is shared data in lib/

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XDkAB7UCK8WyT267W5ZxNV
EOF
)"
```

---

## Task 3: Mobile — sync the shared Learn modules, pin the content contract

**Repo:** `/home/mark/projects/egx-api/egx-api-mobile` (all remaining tasks)

**Files:**
- Modify: `scripts/sync-shared.mjs` (append to `SHARED_FILES`)
- Generated: `src/shared/learn.ts`, `src/shared/learnVisuals.ts`, `src/shared/learnWidgets.ts`, `src/shared/learnLive.ts`, `src/shared/curriculum.ts`
- Test: `src/features/learn/__tests__/sharedCurriculum.test.ts`

**Interfaces:**
- Consumes: Tasks 1–2 web modules; Plan 1's `sync:shared`/`check:shared` (assumption A1).
- Produces: `@/shared/learn`, `@/shared/learnVisuals`, `@/shared/learnWidgets`, `@/shared/learnLive`, `@/shared/curriculum` — exact exports listed in Tasks 1–2.

- [ ] **Step 1: Write the failing contract test**

`src/features/learn/__tests__/sharedCurriculum.test.ts`:
```ts
import { ALL_CONCEPTS, CURRICULUM, TOTAL_CONCEPTS } from "@/shared/curriculum";
import { conceptKey, normalizeSearch, searchConcepts } from "@/shared/learn";
import { T_BILL_RATE_PCT } from "@/shared/constants";
import { walk } from "@/shared/learnVisuals";

/** The nine old section anchors, in teaching order. Bookmarks depend on them. */
const MODULE_IDS = [
  "market-basics",
  "egx",
  "technical-analysis",
  "advanced-technical-indicators",
  "composite-score",
  "decision-framework",
  "risk-management",
  "portfolio-risk-metrics",
  "macro-context",
];

/** learn_concept ids the BACKEND emits (egx-api-be/app/routers/portfolio_analysis.py). */
const BACKEND_IDS = [
  "adx", "atr", "beta", "composite_score", "correlation", "divergence",
  "dividend_yield", "egx30_benchmark", "entry_exit_zones", "golden_death_cross",
  "liquidity", "max_drawdown", "mfi", "obv", "pe_ratio", "relative_strength",
  "risk_adjusted_return", "rsi", "sharpe_ratio", "sma", "stochastic",
  "stop_loss", "support_resistance",
];

/** Fixed links in the app (MarketRegimeCard, RiskGradeCard, DividendHistoryCard, ForecastCard, EntryExitCard, PriceChart, Calibration). */
const FIXED_LINKS = [
  "market_condition", "risk-management", "dividend_dates", "expected_move",
  "entry_exit_zones", "trendlines",
];

/** Every concept id that existed on 2026-10-10. Never shrink this list. */
const KNOWN_CONCEPT_IDS = [
  "sma", "trendlines", "rsi", "support_resistance", "entry_exit_zones",
  "golden_death_cross", "beta", "atr", "obv", "multi_timeframe", "which_interval",
  "stochastic", "adx", "mfi", "divergence", "composite_score", "score_limits",
  "market_condition", "risk_adjusted_return", "relative_strength", "quality",
  "decision_step_macro", "decision_step_score", "decision_step_risk",
  "decision_step_leader", "decision_step_stop", "decision_step_size",
  "why_no_price_prediction", "stop_loss", "liquidity", "cash_underperformer",
  "max_buy_price", "realized_gains", "dividends", "dividend_dates",
  "expected_move", "sharpe_ratio", "correlation", "max_drawdown",
  "egx30_benchmark", "pe_ratio", "dividend_yield",
];

const allIds = new Set<string>([
  ...CURRICULUM.map((m) => m.id),
  ...ALL_CONCEPTS.map(({ concept }) => conceptKey(concept)),
]);

describe("shared Learn curriculum", () => {
  it("keeps the nine module anchors, in teaching order", () => {
    expect(CURRICULUM.map((m) => m.id)).toEqual(MODULE_IDS);
  });

  it.each([...BACKEND_IDS, ...FIXED_LINKS, ...KNOWN_CONCEPT_IDS])(
    "still has the anchor %s",
    (id) => {
      expect(allIds.has(id)).toBe(true);
    }
  );

  it("gives every concept a unique key", () => {
    const keys = ALL_CONCEPTS.map(({ concept }) => conceptKey(concept));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("keeps module ids hyphenated and concept ids underscored, so they cannot collide", () => {
    for (const m of CURRICULUM) expect(m.id).not.toContain("_");
    for (const { concept } of ALL_CONCEPTS) if (concept.id) expect(concept.id).not.toContain("-");
  });

  it("derives the concept count from the data", () => {
    expect(TOTAL_CONCEPTS).toBe(CURRICULUM.reduce((n, m) => n + m.concepts.length, 0));
  });

  it("interpolates the T-bill rate rather than restating it", () => {
    const text = JSON.stringify(CURRICULUM);
    const stated = [...text.matchAll(/T-bills? (?:near|at|paid|offer|offers) (\d+(?:\.\d+)?)%/g)].map(
      (m) => Number(m[1])
    );
    expect(stated.length).toBeGreaterThanOrEqual(3);
    for (const n of stated) expect(n).toBe(T_BILL_RATE_PCT);
  });
});

describe("Learn search", () => {
  it("folds punctuation on both sides", () => {
    expect(normalizeSearch("Stop-Loss")).toBe("stop loss");
    expect(normalizeSearch("  P/E  ")).toBe("p e");
  });

  it.each(["stop loss", "t bill", "p e", "risk adjusted"])("finds concepts for %s", (q) => {
    expect(searchConcepts(ALL_CONCEPTS, q)?.length ?? 0).toBeGreaterThan(0);
  });

  it("matches the hyphenated and spaced spellings identically", () => {
    expect(searchConcepts(ALL_CONCEPTS, "stop loss")?.length).toBe(
      searchConcepts(ALL_CONCEPTS, "stop-loss")?.length
    );
  });

  it("returns null for an empty or punctuation-only query", () => {
    expect(searchConcepts(ALL_CONCEPTS, "   ")).toBeNull();
    expect(searchConcepts(ALL_CONCEPTS, "--/")).toBeNull();
  });
});

describe("illustrative series", () => {
  it("are seeded: the same seed gives the same walk", () => {
    expect(walk(30, 7, { start: 62, drift: 0.42, vol: 1.1 })).toEqual(
      walk(30, 7, { start: 62, drift: 0.42, vol: 1.1 })
    );
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest src/features/learn/__tests__/sharedCurriculum.test.ts`
Expected: FAIL — `Cannot find module '@/shared/curriculum'`.

- [ ] **Step 3: Register the files with the sync script**

In `scripts/sync-shared.mjs`, append to the `SHARED_FILES` array (same spelling convention as the existing entries — assumption A1):
```js
  "learn.ts",
  "learnVisuals.ts",
  "learnWidgets.ts",
  "learnLive.ts",
  "curriculum.ts",
```

- [ ] **Step 4: Sync**

Run: `npm run sync:shared && ls src/shared`
Expected: the five new files listed beside `api.ts`, `constants.ts`, `types.ts`, … each starting with the `// GENERATED` header.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx jest src/features/learn/__tests__/sharedCurriculum.test.ts`
Expected: PASS (all cases).

- [ ] **Step 6: Verify and commit**

Run: `npm run verify`
Expected: exits 0 (`check:shared` includes the new files; tsc, lint, jest green).
```bash
git add scripts/sync-shared.mjs src/shared/learn.ts src/shared/learnVisuals.ts src/shared/learnWidgets.ts \
  src/shared/learnLive.ts src/shared/curriculum.ts src/features/learn/__tests__/sharedCurriculum.test.ts
git commit -m "$(cat <<'EOF'
feat(learn): share the curriculum data with the web app

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XDkAB7UCK8WyT267W5ZxNV
EOF
)"
```

---

## Task 4: Mobile — Learn diagram library (react-native-svg)

**Files:**
- Create: `src/features/learn/visuals.tsx`
- Test: `src/features/learn/__tests__/visuals.test.tsx`

**Interfaces:**
- Consumes: `@/shared/learnVisuals` props types, `V`, `VIEW_W`, `extent`, `toPath`; `AppText` from `@/ui`.
- Produces: `SVG_MONO`, `SVG_MONO_SEMIBOLD`, `pct(n: number): \`${number}%\``, `svgSafeId(prefix: string, raw: string): string`, `VisualFrame({children, caption?, legend?})`, `MiniChart(MiniChartProps)`, `ZoneScale(ZoneScaleProps)`, `BarCompare(BarCompareProps)`, `StepFlow(StepFlowProps)`, `AllocationDonut(AllocationDonutProps)`, `CorrelationGrid(CorrelationGridProps)`, `ConeChart(ConeChartProps)`, `LedgerRows(LedgerRowsProps)`. Each MiniChart's plot View carries `testID="mini-chart"` and `nativeID=<its gradient id>`.

Translations from the web file (noted per the roadmap): `<svg className="w-full">` → a View with `aspectRatio: VIEW_W / H` holding an `Svg` at 100% (no `Dimensions`, no measuring); the legend's `repeating-linear-gradient` swatch → a dashed `Line`; CorrelationGrid's CSS grid → flex rows of `flex-1` square cells; SVG `className="font-mono"` → `fontFamily={SVG_MONO}` (assumption A2); `useId()` is sanitised because React 19 ids contain characters that are not valid in an SVG `url(#…)` reference. Markers whose series value is missing are skipped — a browser ignores `NaN` attributes, native SVG does not.

- [ ] **Step 1: Write the failing tests**

`src/features/learn/__tests__/visuals.test.tsx`:
```tsx
import { StyleSheet } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { V, walk } from "@/shared/learnVisuals";
import {
  AllocationDonut,
  BarCompare,
  CorrelationGrid,
  LedgerRows,
  MiniChart,
  StepFlow,
  ZoneScale,
  svgSafeId,
} from "../visuals";

type Json = { props?: Record<string, unknown>; children?: (Json | string)[] | null } | string | null;

/** Every prop value in the rendered tree, for geometry sanity checks. */
function allPropValues(node: Json | Json[]): unknown[] {
  if (!node || typeof node === "string") return [];
  if (Array.isArray(node)) return node.flatMap(allPropValues);
  const own = Object.values(node.props ?? {});
  return [...own, ...(node.children ?? []).flatMap((c) => allPropValues(c as Json))];
}

const SERIES = walk(40, 7, { start: 60, drift: 0.3, vol: 1 });

describe("Learn diagrams", () => {
  it("shows a chart's caption and legend", async () => {
    await render(
      <MiniChart
        series={SERIES}
        legend={[{ color: V.accent, label: "SMA 20" }]}
        caption="The averages lag on purpose."
      />
    );
    expect(screen.getByText("SMA 20")).toBeTruthy();
    expect(screen.getByText("The averages lag on purpose.")).toBeTruthy();
    expect(screen.getByLabelText("The averages lag on purpose.")).toBeTruthy();
  });

  it("gives two charts of the SAME series different gradient ids", async () => {
    await render(
      <>
        <MiniChart series={SERIES} priceColor={V.gold} />
        <MiniChart series={SERIES} priceColor={V.teal} />
      </>
    );
    const ids = screen.getAllByTestId("mini-chart").map((el) => el.props.nativeID as string);
    expect(ids).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
    for (const id of ids) expect(id).toMatch(/^mc[A-Za-z0-9]+$/);
  });

  it("no NaN reaches the SVG: null gaps, an off-series marker, a flat line", async () => {
    const { toJSON } = await render(
      <>
        <MiniChart
          series={[5, 5, 5, 5]}
          lines={[{ values: [null, null, 5, 6], color: V.accent }]}
          band={{ upper: [null, null, null, null], lower: [null, null, null, null], color: V.violet }}
          markers={[{ index: 99, color: V.up, label: "gone" }]}
          levels={[{ value: 5, color: V.down, label: "5" }]}
        />
        <MiniChart series={[]} />
      </>
    );
    const values = allPropValues(toJSON() as Json);
    for (const v of values) {
      if (typeof v === "number") expect(Number.isNaN(v)).toBe(false);
      if (typeof v === "string") expect(v).not.toContain("NaN");
    }
  });

  it("does not paint a neutral ledger row loss-red (paying is not a loss)", async () => {
    await render(
      <LedgerRows
        rows={[
          { left: "You paid", right: "41,000 EGP" },
          { left: "Market order fills at", right: "82.45 EGP", tone: "down" },
        ]}
      />
    );
    expect(StyleSheet.flatten(screen.getByText("41,000 EGP").props.style).color).toBe("rgba(255,255,255,0.75)");
    expect(StyleSheet.flatten(screen.getByText("82.45 EGP").props.style).color).toBe(V.down);
  });

  it("signs positive percentages in a bar comparison", async () => {
    await render(
      <BarCompare
        bars={[
          { label: "Stock", value: 12, color: V.down },
          { label: "Loss", value: -8, color: V.down },
        ]}
      />
    );
    expect(screen.getByText("+12%")).toBeTruthy();
    expect(screen.getByText("-8%")).toBeTruthy();
  });

  it("shows donut shares as whole percentages of the total", async () => {
    await render(
      <AllocationDonut
        centerLabel="3"
        slices={[
          { label: "Banks", value: 50, color: V.accent },
          { label: "Real estate", value: 30, color: V.gold },
          { label: "Telecom", value: 20, color: V.teal },
        ]}
      />
    );
    expect(screen.getByText("50%")).toBeTruthy();
    expect(screen.getByText("30%")).toBeTruthy();
    expect(screen.getByText("20%")).toBeTruthy();
  });

  it("renders an n×n correlation grid with headers", async () => {
    await render(
      <CorrelationGrid
        labels={["COMI", "HRHO"]}
        matrix={[
          [1, 0.8],
          [0.8, 1],
        ]}
      />
    );
    expect(screen.getAllByText("COMI")).toHaveLength(2);
    expect(screen.getAllByText("0.8")).toHaveLength(2);
    expect(screen.getAllByText("1.0")).toHaveLength(2);
  });

  it("numbers the steps of a flow in order", async () => {
    await render(
      <StepFlow
        steps={[
          { title: "Check the macro", text: "a" },
          { title: "Set the stop first", text: "b" },
        ]}
      />
    );
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("Set the stop first")).toBeTruthy();
  });

  it("labels a scale diagram for screen readers", async () => {
    await render(
      <ZoneScale
        zones={[{ from: 0, to: 30, color: V.up, label: "oversold" }]}
        markers={[{ value: 42, label: "now" }]}
        caption="RSI right now"
      />
    );
    expect(screen.getByLabelText("RSI right now")).toBeTruthy();
  });
});

describe("svgSafeId", () => {
  it.each(["«r1»", "_r_1_", ":R1a:"])("strips React's id punctuation from %s", (raw) => {
    expect(svgSafeId("mc", raw)).toMatch(/^mc[A-Za-z0-9]+$/);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx jest src/features/learn/__tests__/visuals.test.tsx`
Expected: FAIL — `Cannot find module '../visuals'`.

- [ ] **Step 3: Implement `src/features/learn/visuals.tsx`**

```tsx
/**
 * Learn diagram library — react-native-svg twin of the web's
 * components/learn/visuals.tsx. Props are the shared shapes from
 * @/shared/learnVisuals, so the curriculum's VisualSpec objects render
 * unchanged. Geometry is copied from the web file; schematics, not market
 * data, chosen to read at a glance on a 360pt screen.
 *
 * Colour rule: V.up / V.down mean a real direction in the data, never
 * decoration.
 */
import { useId, type ReactNode } from "react";
import { View } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { AppText } from "@/ui";
import {
  V,
  VIEW_W as W,
  extent,
  toPath,
  type AllocationDonutProps,
  type BarCompareProps,
  type ConeChartProps,
  type CorrelationGridProps,
  type LedgerRowsProps,
  type LegendItem,
  type MiniChartProps,
  type StepFlowProps,
  type ZoneScaleProps,
} from "@/shared/learnVisuals";

/** Family names Plan 1 registers with useFonts (SVG text cannot use a className). */
export const SVG_MONO = "JetBrainsMono_400Regular";
export const SVG_MONO_SEMIBOLD = "JetBrainsMono_600SemiBold";

/** A percentage typed for RN style props (`width`, `left`). */
export const pct = (n: number) => `${n}%` as const;

/** React 19's useId() contains « » or _ — not usable inside url(#…). */
export function svgSafeId(prefix: string, raw: string): string {
  return `${prefix}${raw.replace(/[^A-Za-z0-9]/g, "")}`;
}

const finite = (v: number | null | undefined): v is number =>
  typeof v === "number" && Number.isFinite(v);

// ---------------------------------------------------------------- frame

function LegendSwatch({ color, dash }: { color: string; dash?: boolean }) {
  return (
    <Svg width={14} height={2}>
      <Line
        x1={0}
        y1={1}
        x2={14}
        y2={1}
        stroke={color}
        strokeWidth={2}
        strokeDasharray={dash ? "3 3" : undefined}
      />
    </Svg>
  );
}

export function VisualFrame({
  children,
  caption,
  legend,
}: {
  children: ReactNode;
  caption?: string;
  legend?: LegendItem[];
}) {
  const hasFooter = Boolean(legend?.length) || Boolean(caption);
  return (
    <View className="overflow-hidden rounded-lg border border-white/[0.07] bg-black/25">
      <View className="px-1 pt-1">{children}</View>
      {hasFooter ? (
        <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/[0.05] px-3 py-2">
          {legend?.map((l) => (
            <View key={l.label} className="flex-row items-center gap-1.5">
              <LegendSwatch color={l.color} dash={l.dash} />
              <AppText className="font-mono text-[9px] uppercase tracking-[0.5px] text-white/45">
                {l.label}
              </AppText>
            </View>
          ))}
          {caption ? (
            <AppText className="text-[10px] leading-[14px] text-white/35">{caption}</AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/** An SVG drawn in VIEW_W × height units, scaled to the container's width. */
function Plot({
  height,
  label,
  children,
  testID,
  nativeID,
}: {
  height: number;
  label: string;
  children: ReactNode;
  testID?: string;
  nativeID?: string;
}) {
  return (
    <View
      testID={testID}
      nativeID={nativeID}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{ width: "100%", aspectRatio: W / height }}
    >
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${height}`}>
        {children}
      </Svg>
    </View>
  );
}

// ---------------------------------------------------------------- MiniChart

/**
 * The workhorse. A price path plus any combination of overlay lines, a
 * shaded channel (Bollinger), horizontal rails (support/resistance/Fib),
 * point markers and vertical highlight regions.
 */
export function MiniChart({
  series,
  lines = [],
  band,
  levels = [],
  markers = [],
  shades = [],
  height = 140,
  priceColor = V.inkBright,
  fill = true,
  caption,
  legend,
  labelPad = 34,
}: MiniChartProps) {
  const H = height;
  const padT = 12;
  const padB = 12;
  const padL = 6;
  const padR = 6 + (levels.some((l) => l.label) ? labelPad : 0);

  const [min, max] = extent([
    series,
    ...lines.map((l) => l.values),
    ...(band ? [band.upper, band.lower] : []),
    levels.map((l) => l.value),
  ]);
  const pad = (max - min) * 0.1;
  const lo = min - pad;
  const hi = max + pad;

  const n = series.length;
  const x = (i: number) => padL + (i * (W - padL - padR)) / Math.max(1, n - 1);
  const y = (v: number) => padT + ((hi - v) / (hi - lo)) * (H - padT - padB);

  // Unique per RENDERED chart, not per series: several concepts reuse one
  // illustrative series in different colours.
  const gid = svgSafeId("mc", useId());

  const pricePath = toPath(series, x, y);
  const areaPath =
    fill && n > 1 && pricePath
      ? `${pricePath}L${x(n - 1).toFixed(1)},${(H - padB).toFixed(1)}L${x(0).toFixed(1)},${(H - padB).toFixed(1)}Z`
      : "";
  const upperPath = band ? toPath(band.upper, x, y) : "";
  const bandPath =
    band && upperPath
      ? `${upperPath}${toPath([...band.lower].reverse(), (i) => x(n - 1 - i), y).replace(/^M/, "L")}Z`
      : "";

  return (
    <VisualFrame caption={caption} legend={legend}>
      <Plot
        height={H}
        label={caption ?? "Illustrative price chart"}
        testID="mini-chart"
        nativeID={gid}
      >
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={priceColor} stopOpacity={0.22} />
            <Stop offset="100%" stopColor={priceColor} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        {shades.map((s, i) => (
          <G key={`sh${i}`}>
            <Rect
              x={x(s.from)}
              y={padT}
              width={Math.max(1, x(s.to) - x(s.from))}
              height={H - padT - padB}
              fill={s.color}
              opacity={0.1}
            />
            {s.label ? (
              <SvgText
                x={(x(s.from) + x(s.to)) / 2}
                y={padT + 9}
                textAnchor="middle"
                fontFamily={SVG_MONO}
                fontSize={8}
                fill={s.color}
                opacity={0.9}
              >
                {s.label}
              </SvgText>
            ) : null}
          </G>
        ))}

        {band && bandPath ? <Path d={bandPath} fill={band.color} opacity={0.12} /> : null}

        {levels.map((l, i) => (
          <G key={`lv${i}`}>
            <Line
              x1={padL}
              x2={W - padR}
              y1={y(l.value)}
              y2={y(l.value)}
              stroke={l.color}
              strokeWidth={1}
              strokeDasharray={l.dash ?? "3 3"}
              opacity={0.8}
            />
            {l.label ? (
              <SvgText x={W - padR + 4} y={y(l.value) + 3} fontFamily={SVG_MONO} fontSize={8} fill={l.color}>
                {l.label}
              </SvgText>
            ) : null}
          </G>
        ))}

        {lines.map((l, i) => {
          const d = toPath(l.values, x, y);
          return d ? (
            <Path
              key={`ln${i}`}
              d={d}
              fill="none"
              stroke={l.color}
              strokeWidth={l.width ?? 1.5}
              strokeDasharray={l.dash}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null;
        })}

        {areaPath ? <Path d={areaPath} fill={`url(#${gid})`} /> : null}
        {pricePath ? (
          <Path
            d={pricePath}
            fill="none"
            stroke={priceColor}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {markers.map((m, i) => {
          const v = series[m.index];
          if (!finite(v)) return null;
          const px = x(m.index);
          const py = y(v);
          const above = m.place !== "below";
          return (
            <G key={`mk${i}`}>
              <Circle cx={px} cy={py} r={4.5} fill={m.color} opacity={0.25} />
              <Circle cx={px} cy={py} r={2.5} fill={m.color} stroke="#0a0a0f" strokeWidth={1} />
              {m.label ? (
                <SvgText
                  x={Math.min(Math.max(px, 26), W - padR - 12)}
                  y={above ? py - 8 : py + 14}
                  textAnchor="middle"
                  fontFamily={SVG_MONO}
                  fontSize={8}
                  fill={m.color}
                >
                  {m.label}
                </SvgText>
              ) : null}
            </G>
          );
        })}
      </Plot>
    </VisualFrame>
  );
}

// ---------------------------------------------------------------- ZoneScale

/** A 0–100 rail with meaning-bearing zones and one or more readings on it. */
export function ZoneScale({
  zones,
  markers,
  min = 0,
  max = 100,
  ticks,
  unit = "",
  caption,
  height = 74,
}: ZoneScaleProps) {
  const H = height;
  const padL = 10;
  const padR = 10;
  const barY = 30;
  const barH = 14;
  const x = (v: number) => padL + ((v - min) / (max - min)) * (W - padL - padR);

  return (
    <VisualFrame caption={caption}>
      <Plot height={H} label={caption ?? "Scale diagram"}>
        {zones.map((z, i) => (
          <G key={`z${i}`}>
            <Rect
              x={x(z.from)}
              y={barY}
              width={Math.max(0, x(z.to) - x(z.from))}
              height={barH}
              fill={z.color}
              opacity={0.28}
            />
            {z.label ? (
              <SvgText
                x={(x(z.from) + x(z.to)) / 2}
                y={barY + barH + 11}
                textAnchor="middle"
                fontFamily={SVG_MONO}
                fontSize={8}
                fill={z.color}
                opacity={0.95}
              >
                {z.label}
              </SvgText>
            ) : null}
          </G>
        ))}
        <Rect
          x={padL}
          y={barY}
          width={W - padL - padR}
          height={barH}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
        />
        {(ticks ?? [min, max]).map((t) => (
          <SvgText
            key={`t${t}`}
            x={x(t)}
            y={barY + barH + 22}
            textAnchor="middle"
            fontFamily={SVG_MONO}
            fontSize={8}
            fill={V.ink}
          >
            {`${t}${unit}`}
          </SvgText>
        ))}
        {markers.map((m, i) => (
          <G key={`m${i}`}>
            <Path d={`M${x(m.value)},${barY - 3} l-4,-6 h8 Z`} fill={m.color ?? "#fff"} />
            <SvgText
              x={Math.min(Math.max(x(m.value), 30), W - 30)}
              y={barY - 13}
              textAnchor="middle"
              fontFamily={SVG_MONO}
              fontSize={9}
              fill={m.color ?? "#fff"}
            >
              {m.label}
            </SvgText>
          </G>
        ))}
      </Plot>
    </VisualFrame>
  );
}

// ---------------------------------------------------------------- BarCompare

/** Side-by-side magnitudes: T-bill vs stock, leader vs laggard, volume tiers. */
export function BarCompare({ bars, unit = "%", caption, baseline }: BarCompareProps) {
  const maxV = Math.max(
    ...bars.map((b) => Math.abs(b.value)),
    baseline ? Math.abs(baseline.value) : 0,
    1
  );
  return (
    <VisualFrame caption={caption}>
      <View className="gap-2.5 p-3">
        {bars.map((b, bi) => (
          <View key={`${bi}-${b.label}`}>
            <View className="mb-1 flex-row items-baseline justify-between gap-2">
              <AppText className="flex-1 text-[11px] text-white/65">{b.label}</AppText>
              <AppText className="font-mono-semibold text-[11px]" style={{ color: b.color }}>
                {`${b.value > 0 && unit === "%" ? "+" : ""}${b.value}${unit}`}
              </AppText>
            </View>
            <View className="relative h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <View
                className="h-full rounded-full"
                style={{
                  width: pct((Math.abs(b.value) / maxV) * 100),
                  backgroundColor: b.color,
                  opacity: 0.85,
                }}
              />
              {baseline ? (
                <View
                  className="absolute bottom-0 top-0 w-px"
                  style={{
                    left: pct((Math.abs(baseline.value) / maxV) * 100),
                    backgroundColor: baseline.color,
                  }}
                />
              ) : null}
            </View>
            {b.note ? (
              <AppText className="mt-1 text-[10px] leading-[14px] text-white/35">{b.note}</AppText>
            ) : null}
          </View>
        ))}
        {baseline ? (
          <View className="flex-row items-center gap-1.5 pt-0.5">
            <View className="h-3 w-px" style={{ backgroundColor: baseline.color }} />
            <AppText className="font-mono text-[9px] uppercase tracking-[0.5px] text-white/40">
              {baseline.label}
            </AppText>
          </View>
        ) : null}
      </View>
    </VisualFrame>
  );
}

// ---------------------------------------------------------------- StepFlow

/** A numbered sequence — numbered because the order genuinely matters. */
export function StepFlow({ steps, accent = V.accent, caption }: StepFlowProps) {
  return (
    <VisualFrame caption={caption}>
      <View className="p-3">
        {steps.map((s, i) => {
          const last = i === steps.length - 1;
          return (
            <View key={s.title} className={`relative flex-row gap-3 ${last ? "" : "pb-3"}`}>
              {last ? null : (
                <View
                  className="absolute bottom-0 left-[11px] top-6 w-px"
                  style={{ backgroundColor: "rgba(255,255,255,0.09)" }}
                />
              )}
              <View
                className="h-[22px] w-[22px] items-center justify-center rounded-full"
                style={{ backgroundColor: `${accent}2b`, borderWidth: 1, borderColor: `${accent}66` }}
              >
                <AppText className="font-mono-semibold text-[10px]" style={{ color: accent }}>
                  {String(i + 1)}
                </AppText>
              </View>
              <View className="min-w-0 flex-1 pt-0.5">
                <AppText className="font-sans-semibold text-[11px] text-white/85">{s.title}</AppText>
                <AppText className="mt-0.5 text-[10px] leading-[16px] text-white/45">{s.text}</AppText>
              </View>
            </View>
          );
        })}
      </View>
    </VisualFrame>
  );
}

// ---------------------------------------------------------------- Donut

/** Portfolio allocation: sizing, diversification, concentration. */
export function AllocationDonut({ slices, centerLabel, centerSub, caption }: AllocationDonutProps) {
  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  const R = 42;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const arcs = slices.map((s) => {
    const len = (s.value / total) * C;
    const arc = { ...s, len, offset };
    offset += len;
    return arc;
  });

  return (
    <VisualFrame caption={caption}>
      <View className="flex-row items-center gap-4 p-3">
        <Svg width={110} height={110} viewBox="0 0 110 110">
          <G transform="rotate(-90 55 55)">
            {arcs.map((a) => (
              <Circle
                key={a.label}
                cx={55}
                cy={55}
                r={R}
                fill="none"
                stroke={a.color}
                strokeWidth={13}
                strokeDasharray={`${a.len} ${C - a.len}`}
                strokeDashoffset={-a.offset}
                opacity={0.9}
              />
            ))}
          </G>
          <SvgText x={55} y={53} textAnchor="middle" fontFamily={SVG_MONO_SEMIBOLD} fontSize={15} fill="#fff">
            {centerLabel}
          </SvgText>
          {centerSub ? (
            <SvgText x={55} y={66} textAnchor="middle" fontFamily={SVG_MONO} fontSize={7} fill={V.ink}>
              {centerSub}
            </SvgText>
          ) : null}
        </Svg>
        <View className="min-w-0 flex-1 gap-1.5">
          {slices.map((s) => (
            <View key={s.label} className="flex-row items-center gap-2">
              <View className="h-2 w-2 rounded-sm" style={{ backgroundColor: s.color }} />
              <AppText numberOfLines={1} className="min-w-0 flex-1 text-[11px] text-white/60">
                {s.label}
              </AppText>
              <AppText className="font-mono text-[11px] text-white/80">
                {`${Math.round((s.value / total) * 100)}%`}
              </AppText>
            </View>
          ))}
        </View>
      </View>
    </VisualFrame>
  );
}

// ---------------------------------------------------------------- Correlation

export function CorrelationGrid({ labels, matrix, caption }: CorrelationGridProps) {
  // +1 is concentrated risk (red), 0 is unrelated, -1 is true diversification.
  const tint = (v: number) => (v > 0.15 ? V.down : v < -0.15 ? V.up : "#7f8ea3");
  return (
    <VisualFrame caption={caption}>
      <View className="gap-1 p-3">
        <View className="flex-row gap-1">
          <View className="w-[34px]" />
          {labels.map((l) => (
            <AppText
              key={`h-${l}`}
              className="flex-1 pb-0.5 text-center font-mono text-[9px] uppercase text-white/40"
            >
              {l}
            </AppText>
          ))}
        </View>
        {matrix.map((row, r) => (
          <View key={`r-${r}`} className="flex-row items-center gap-1">
            <AppText className="w-[34px] pr-1 font-mono text-[9px] uppercase text-white/40">
              {labels[r]}
            </AppText>
            {row.map((v, c) => (
              <View
                key={`c-${r}-${c}`}
                className="flex-1 items-center justify-center rounded"
                style={{
                  aspectRatio: 1,
                  backgroundColor: tint(v),
                  opacity: r === c ? 0.18 : 0.22 + Math.abs(v) * 0.55,
                }}
              >
                <AppText className="font-mono text-[9px] text-white/90">{v.toFixed(1)}</AppText>
              </View>
            ))}
          </View>
        ))}
      </View>
    </VisualFrame>
  );
}

// ---------------------------------------------------------------- Cone

/** Monte Carlo / expected-move fan: percentile bands widening over time. */
export function ConeChart({
  days = 60,
  start = 100,
  drift = 0.0008,
  vol = 0.018,
  caption,
}: ConeChartProps) {
  const H = 150;
  const padT = 14;
  const padB = 18;
  const padL = 8;
  const padR = 40;

  // Analytic percentile envelope — the same shape 1,000 simulated paths make.
  const zs = [-1.645, -0.674, 0, 0.674, 1.645];
  const bands = zs.map((z) =>
    Array.from({ length: days + 1 }, (_, t) => start * Math.exp(drift * t + z * vol * Math.sqrt(t)))
  );
  const lo = Math.min(...bands[0]) * 0.99;
  const hi = Math.max(...bands[4]) * 1.01;
  const x = (i: number) => padL + (i * (W - padL - padR)) / days;
  const y = (v: number) => padT + ((hi - v) / (hi - lo)) * (H - padT - padB);
  const line = (a: number[]) =>
    a.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const ribbon = (a: number[], b: number[]) =>
    `${line(a)}${b
      .map((_, i) => `L${x(b.length - 1 - i).toFixed(1)},${y(b[b.length - 1 - i]).toFixed(1)}`)
      .join("")}Z`;

  return (
    <VisualFrame caption={caption}>
      <Plot height={H} label="Simulated outcome cone">
        <Path d={ribbon(bands[4], bands[0])} fill={V.accent} opacity={0.1} />
        <Path d={ribbon(bands[3], bands[1])} fill={V.accent} opacity={0.18} />
        <Path d={line(bands[2])} fill="none" stroke={V.accent} strokeWidth={1.5} strokeDasharray="4 3" />
        <Line x1={padL} x2={W - padR} y1={y(start)} y2={y(start)} stroke={V.axis} strokeWidth={1} />
        {[
          { v: bands[4][days], t: "95th", c: V.up },
          { v: bands[2][days], t: "median", c: V.accent },
          { v: bands[0][days], t: "5th", c: V.down },
        ].map((m) => (
          <SvgText key={m.t} x={W - padR + 4} y={y(m.v) + 3} fontFamily={SVG_MONO} fontSize={8} fill={m.c}>
            {m.t}
          </SvgText>
        ))}
        <SvgText x={padL} y={H - 5} fontFamily={SVG_MONO} fontSize={8} fill={V.ink}>
          today
        </SvgText>
        <SvgText x={W - padR} y={H - 5} textAnchor="end" fontFamily={SVG_MONO} fontSize={8} fill={V.ink}>
          {`+${days} days`}
        </SvgText>
      </Plot>
    </VisualFrame>
  );
}

// ---------------------------------------------------------------- Ledger

/** A two-column "what actually happens" ledger — settlement, tax, fees. */
export function LedgerRows({ rows, caption }: LedgerRowsProps) {
  // Same as the web: only up/down carry colour; "muted" and untoned rows are ink.
  const tone = (t?: string) =>
    t === "up" ? V.up : t === "down" ? V.down : "rgba(255,255,255,0.75)";
  return (
    <VisualFrame caption={caption}>
      <View>
        {/* Keyed by index: a ledger legitimately repeats a label. */}
        {rows.map((r, i) => (
          <View
            key={`${i}-${r.left}`}
            className={`flex-row items-baseline justify-between gap-3 px-3 py-2 ${
              i < rows.length - 1 ? "border-b border-white/[0.05]" : ""
            }`}
          >
            <AppText className="flex-1 text-[11px] text-white/50">{r.left}</AppText>
            <AppText className="font-mono text-[11px]" style={{ color: tone(r.tone) }}>
              {r.right}
            </AppText>
          </View>
        ))}
      </View>
    </VisualFrame>
  );
}
```

Note: the web `LedgerRows` value is `font-medium` mono; there is no JetBrains Mono 500 family in the roadmap's font list, so `font-mono` (400) is used.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/features/learn/__tests__/visuals.test.tsx`
Expected: PASS. If the "different gradient ids" case fails because React returns the same id in a fragment, it is a real bug — never fall back to a series hash.

- [ ] **Step 5: Verify and commit**

Run: `npm run verify` — Expected: exits 0.
```bash
git add src/features/learn/visuals.tsx src/features/learn/__tests__/visuals.test.tsx
git commit -m "$(cat <<'EOF'
feat(learn): port the Learn diagram library to react-native-svg

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XDkAB7UCK8WyT267W5ZxNV
EOF
)"
```

---

## Task 5: Mobile — the five calculators

**Files:**
- Create: `src/features/learn/widgets.tsx`
- Test: `src/features/learn/__tests__/widgets.test.tsx`
- Modify: `package.json` / `package-lock.json` via `npx expo install`

**Slider choice:** `@react-native-community/slider`. It is bundled in Expo Go (SDK 57 docs list it as "works in Expo Go"), so no development build is needed; it is the platform's own control (UISlider / SeekBar), so VoiceOver/TalkBack "adjustable" increments, step snapping, RTL and thumb sizing come for free; it takes `minimumValue/maximumValue/step/value/onValueChange` and tint colours, which map 1:1 onto the web's `<input type="range">`. Rejected: a custom gesture-handler slider (≈150 lines plus hand-built accessibility actions, for a teaching widget) and `@expo/ui`'s Slider (newer SwiftUI/Compose surface; not worth a second UI system for five sliders). Two native quirks handled in `LearnSlider`: Android reports values like `30.000001` (snapped to the step), and changing `value` while the thumb is dragged makes the thumb jitter (the slider is fed its initial value once and is otherwise uncontrolled).

**Interfaces:**
- Consumes: `@/shared/learnWidgets` (all exports from Task 1 Step 5), `@/shared/constants` (`STOP_LOSS_ATR_MULTIPLIER` only through `STOP_LOSS_FORMULA`), `pct`, `svgSafeId` from `./visuals`.
- Produces: `RsiPlayground()`, `StopLossCalculator()`, `PositionSizer()`, `TBillRace()`, `ScoreBandExplorer()`, `snapToStep(v, min, max, step): number`, `splitHexAlpha(color): { color: string; opacity: number }`. Each slider has `accessibilityLabel` = its label.

- [ ] **Step 1: Install the slider**

Run: `npx expo install @react-native-community/slider`
Expected: added to `dependencies` at the SDK-57 version.

- [ ] **Step 2: Write the failing tests**

`src/features/learn/__tests__/widgets.test.tsx`:
```tsx
import { fireEvent, render, screen } from "@testing-library/react-native";
import { SCORE_BAND_LABEL, STOP_LOSS_ATR_MULTIPLIER, T_BILL_RATE_PCT, scoreBand } from "@/shared/constants";
import {
  PositionSizer,
  RsiPlayground,
  ScoreBandExplorer,
  StopLossCalculator,
  TBillRace,
  snapToStep,
  splitHexAlpha,
} from "../widgets";

// The native slider has no JS behaviour worth exercising here; a View that
// keeps its props lets the tests fire `valueChange` at our handler.
jest.mock("@react-native-community/slider", () => {
  const { View } = jest.requireActual("react-native");
  return { __esModule: true, default: (props: object) => <View {...props} /> };
});

async function drag(label: string, value: number) {
  await fireEvent(screen.getByLabelText(label), "valueChange", value);
}

describe("snapToStep", () => {
  it("removes native float noise", () => expect(snapToStep(30.000001, 0, 100, 1)).toBe(30));
  it("snaps to half steps from the minimum", () => expect(snapToStep(4.24, 0.5, 12, 0.5)).toBe(4));
  it("clamps to the range", () => {
    expect(snapToStep(-3, 0, 100, 1)).toBe(0);
    expect(snapToStep(140, 0, 100, 1)).toBe(100);
  });
});

describe("splitHexAlpha", () => {
  it("splits an 8-digit hex into colour and opacity", () => {
    expect(splitHexAlpha("#00ff8844")).toEqual({ color: "#00ff88", opacity: 0x44 / 255 });
  });
  it("leaves a 6-digit hex opaque", () => {
    expect(splitHexAlpha("#e8b04b")).toEqual({ color: "#e8b04b", opacity: 1 });
  });
});

describe("Learn calculators", () => {
  it("RSI: dragging into overbought changes the verdict", async () => {
    await render(<RsiPlayground />);
    expect(screen.getByText(/Neutral, leaning strong/)).toBeTruthy();
    await drag("RSI reading", 75.0000001);
    expect(screen.getByText(/Overbought\. Don't start a new position/)).toBeTruthy();
  });

  it("stop-loss: states the app's own multiplier and computes from support", async () => {
    await render(<StopLossCalculator />);
    expect(screen.getByText(`stop = support − ${STOP_LOSS_ATR_MULTIPLIER} × ATR`)).toBeTruthy();
    // defaults: support 98, ATR 4
    expect(screen.getByText(`${(98 - STOP_LOSS_ATR_MULTIPLIER * 4).toFixed(2)} EGP`)).toBeTruthy();
    await drag("Entry price you'd pay", 60);
    expect(screen.getByText(/There is no trade here/)).toBeTruthy();
  });

  it("position sizing: concentration is called out", async () => {
    await render(<PositionSizer />);
    expect(screen.getByText(/Inside the house limit/)).toBeTruthy();
    await drag("Put into this one stock", 30);
    expect(screen.getByText(/Concentrated\./)).toBeTruthy();
  });

  it("T-bill race: titled with the live rate, and a sub-rate return falls BEHIND", async () => {
    await render(<TBillRace />);
    expect(screen.getByText(`Your stock vs the ${T_BILL_RATE_PCT}% T-bill`)).toBeTruthy();
    await drag("Stock returns, per year", T_BILL_RATE_PCT - 5);
    expect(screen.getByText(/BEHIND simply leaving the money in T-bills/)).toBeTruthy();
  });

  it("score bands: labels come from SCORE_BAND_LABEL, never Buy/Sell", async () => {
    await render(<ScoreBandExplorer />);
    expect(screen.getByText(SCORE_BAND_LABEL[scoreBand(64)])).toBeTruthy();
    await drag("Score", 15);
    expect(screen.getByText(SCORE_BAND_LABEL[scoreBand(15)])).toBeTruthy();
    expect(screen.queryByText(/\bBuy\b|\bSell\b/)).toBeNull();
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npx jest src/features/learn/__tests__/widgets.test.tsx`
Expected: FAIL — `Cannot find module '../widgets'`.

- [ ] **Step 4: Implement `src/features/learn/widgets.tsx`**

```tsx
/**
 * Learn calculators — native twins of the web's components/learn/widgets.tsx.
 * Every formula and verdict comes from @/shared/learnWidgets, which imports
 * its rules from @/shared/constants: a widget that teaches a different number
 * from the one the app computes is worse than no widget.
 *
 * Translations: CSS `linear-gradient` strip → react-native-svg gradient;
 * `left: calc(x% - 1.5px)` → `left: x%` + `marginLeft: -1.5`; CSS grid
 * readout → two-column flex-wrap.
 */
import { useId, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Slider from "@react-native-community/slider";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { AppText } from "@/ui";
import { V } from "@/shared/learnVisuals";
import {
  RSI_STRIP_STOPS,
  SCORE_BAND_SEGMENTS,
  SCORE_EXPLORER_NOTE,
  STOP_LOSS_FORMULA,
  TBILL_TITLE,
  egp,
  positionSizing,
  readoutColor,
  rsiReading,
  scoreBandReading,
  stopLossPlan,
  tBillRace,
  type ReadoutItem,
} from "@/shared/learnWidgets";
import { pct, svgSafeId } from "./visuals";

/** Round a native slider value to the step grid (Android reports 30.000001). */
export function snapToStep(v: number, min: number, max: number, step: number): number {
  const snapped = Math.round((v - min) / step) * step + min;
  return Number(Math.min(max, Math.max(min, snapped)).toFixed(4));
}

/** "#rrggbbaa" → colour + opacity, for SVG stops that want them separately. */
export function splitHexAlpha(color: string): { color: string; opacity: number } {
  if (/^#[0-9a-fA-F]{8}$/.test(color)) {
    return { color: color.slice(0, 7), opacity: parseInt(color.slice(7), 16) / 255 };
  }
  return { color, opacity: 1 };
}

// ---------------------------------------------------------------- chrome

function Panel({ title, children, accent = V.accent }: { title: string; children: ReactNode; accent?: string }) {
  return (
    <View className="overflow-hidden rounded-lg border border-white/[0.07] bg-black/25">
      <View className="flex-row items-center gap-2 border-b border-white/[0.05] px-3 py-2">
        <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
        <AppText numberOfLines={1} className="flex-1 font-mono text-[9px] uppercase tracking-[1.5px] text-white/45">
          {title}
        </AppText>
        <AppText className="font-mono text-[9px] uppercase tracking-[0.5px] text-white/25">try it</AppText>
      </View>
      <View className="p-3">{children}</View>
    </View>
  );
}

function LearnSlider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  accent = V.accent,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  accent?: string;
  onChange: (v: number) => void;
}) {
  // Fed once: re-feeding `value` during a drag makes the native thumb jitter.
  const [initial] = useState(value);
  return (
    <View className="mb-3">
      <View className="mb-1.5 flex-row items-baseline justify-between gap-2">
        <AppText className="flex-1 text-[11px] text-white/55">{label}</AppText>
        <AppText className="font-mono-semibold text-[12px]" style={{ color: accent }}>
          {`${value}${suffix}`}
        </AppText>
      </View>
      <Slider
        accessibilityLabel={label}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={initial}
        onValueChange={(v: number) => onChange(snapToStep(v, min, max, step))}
        minimumTrackTintColor={accent}
        maximumTrackTintColor="rgba(255,255,255,0.15)"
        thumbTintColor={accent}
        style={{ height: 44 }}
      />
    </View>
  );
}

function Readout({ items }: { items: ReadoutItem[] }) {
  return (
    <View className="mt-1 flex-row flex-wrap rounded-md bg-white/[0.03] px-2.5 pt-2.5">
      {items.map((i) => (
        <View key={i.label} className="mb-2.5 w-1/2 pr-3">
          <AppText numberOfLines={1} className="font-mono text-[9px] uppercase tracking-[0.5px] text-white/35">
            {i.label}
          </AppText>
          <AppText className="mt-0.5 font-mono-semibold text-[13px]" style={{ color: readoutColor(i.tone) }}>
            {i.value}
          </AppText>
        </View>
      ))}
    </View>
  );
}

function Marker({ at, color }: { at: number; color: string }) {
  return (
    <View
      className="absolute top-0 h-full w-[3px] rounded-full"
      style={{ left: pct(at), marginLeft: -1.5, backgroundColor: color }}
    />
  );
}

// ---------------------------------------------------------------- RSI

export function RsiPlayground() {
  const [rsi, setRsi] = useState(58);
  const reading = rsiReading(rsi);
  const gid = svgSafeId("rsi", useId());

  return (
    <Panel title="RSI — drag to read it" accent={V.gold}>
      <View className="relative mb-3 h-9 overflow-hidden rounded-md">
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 100 1" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
              {RSI_STRIP_STOPS.map((s) => {
                const { color, opacity } = splitHexAlpha(s.color);
                return <Stop key={s.offset} offset={`${s.offset}%`} stopColor={color} stopOpacity={opacity} />;
              })}
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={100} height={1} fill={`url(#${gid})`} />
        </Svg>
        {[30, 70].map((t) => (
          <View key={t} className="absolute bottom-0 top-0 w-px bg-white/25" style={{ left: pct(t) }} />
        ))}
        <Marker at={rsi} color={reading.tone} />
        <View className="absolute bottom-0 left-1.5 top-0 justify-center">
          <AppText className="font-mono text-[9px] uppercase tracking-[0.5px] text-white/50">oversold</AppText>
        </View>
        <View className="absolute bottom-0 right-1.5 top-0 justify-center">
          <AppText className="font-mono text-[9px] uppercase tracking-[0.5px] text-white/50">overbought</AppText>
        </View>
      </View>

      <LearnSlider label="RSI reading" value={rsi} min={0} max={100} accent={reading.tone} onChange={setRsi} />
      <AppText
        className="mt-1 rounded-md bg-white/[0.03] p-2.5 text-[11px] leading-[18px]"
        style={{ color: reading.tone }}
      >
        {reading.verdict}
      </AppText>
    </Panel>
  );
}

// ---------------------------------------------------------------- stop-loss

export function StopLossCalculator() {
  const [support, setSupport] = useState(98);
  const [atr, setAtr] = useState(4);
  const [entry, setEntry] = useState(104);
  const plan = stopLossPlan(entry, support, atr);

  return (
    <Panel title="Stop-loss — the app's own formula" accent={V.coral}>
      <AppText className="mb-3 font-mono text-[10px] leading-[16px] text-white/40">{STOP_LOSS_FORMULA}</AppText>
      <LearnSlider label="Entry price you'd pay" value={entry} min={60} max={160} suffix=" EGP" accent={V.coral} onChange={setEntry} />
      <LearnSlider label="Nearest support" value={support} min={50} max={150} suffix=" EGP" accent={V.coral} onChange={setSupport} />
      <LearnSlider label="ATR (typical daily move)" value={atr} min={0.5} max={12} step={0.5} suffix=" EGP" accent={V.coral} onChange={setAtr} />
      <Readout items={plan.readout} />
      <AppText className="mt-2 text-[10px] leading-[16px] text-white/40">{plan.advice}</AppText>
    </Panel>
  );
}

// ---------------------------------------------------------------- sizing

export function PositionSizer() {
  const [portfolio, setPortfolio] = useState(100000);
  const [weight, setWeight] = useState(10);
  const [drop, setDrop] = useState(50);
  const sizing = positionSizing(portfolio, weight, drop);

  return (
    <Panel title="Position sizing — what a drop actually costs" accent={V.teal}>
      <LearnSlider label="Portfolio value" value={portfolio} min={10000} max={1000000} step={10000} suffix=" EGP" accent={V.teal} onChange={setPortfolio} />
      <LearnSlider label="Put into this one stock" value={weight} min={1} max={40} suffix="%" accent={V.teal} onChange={setWeight} />
      <LearnSlider label="If it then falls" value={drop} min={5} max={80} step={5} suffix="%" accent={V.teal} onChange={setDrop} />
      <Readout items={sizing.readout} />
      <AppText className="mt-2 text-[10px] leading-[16px]" style={{ color: sizing.verdict.tone }}>
        {sizing.verdict.text}
      </AppText>
    </Panel>
  );
}

// ---------------------------------------------------------------- T-bill

export function TBillRace() {
  const [stockReturn, setStockReturn] = useState(18);
  const [years, setYears] = useState(5);
  const race = tBillRace(stockReturn, years);

  return (
    <Panel title={TBILL_TITLE} accent={V.violet}>
      <LearnSlider label="Stock returns, per year" value={stockReturn} min={-10} max={60} suffix="%" accent={race.winning ? V.up : V.down} onChange={setStockReturn} />
      <LearnSlider label="Held for" value={years} min={1} max={15} suffix={years === 1 ? " year" : " years"} accent={V.violet} onChange={setYears} />
      <View className="mt-3 gap-2.5">
        {race.rows.map((r) => (
          <View key={r.label}>
            <View className="mb-1 flex-row items-baseline justify-between gap-2">
              <AppText className="flex-1 text-[11px] text-white/55">{r.label}</AppText>
              <AppText className="font-mono-semibold text-[11px]" style={{ color: r.color }}>
                {egp(r.value)}
              </AppText>
            </View>
            <View className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <View className="h-full rounded-full" style={{ width: pct(r.barPct), backgroundColor: r.color, opacity: 0.85 }} />
            </View>
          </View>
        ))}
      </View>
      <AppText
        className="mt-3 rounded-md bg-white/[0.03] p-2.5 text-[11px] leading-[18px]"
        style={{ color: race.winning ? V.up : V.down }}
      >
        {race.message}
      </AppText>
    </Panel>
  );
}

// ---------------------------------------------------------------- bands

export function ScoreBandExplorer() {
  const [score, setScore] = useState(64);
  const reading = scoreBandReading(score);

  return (
    <Panel title="Composite score — what each band means" accent={reading.color}>
      <View className="relative mb-3 h-9 flex-row overflow-hidden rounded-md">
        {SCORE_BAND_SEGMENTS.map((s, i) => (
          <View key={s.band} style={{ width: pct(s.width), backgroundColor: `${s.color}${i === 4 ? "55" : "2e"}` }} />
        ))}
        <Marker at={score} color={reading.color} />
      </View>
      <LearnSlider label="Score" value={score} min={0} max={100} accent={reading.color} onChange={setScore} />
      <View className="mt-1 rounded-md bg-white/[0.03] p-2.5">
        <AppText className="font-mono-semibold text-[13px] uppercase tracking-[0.5px]" style={{ color: reading.color }}>
          {reading.label}
        </AppText>
        <AppText className="mt-1.5 text-[11px] leading-[18px] text-white/55">{SCORE_EXPLORER_NOTE}</AppText>
      </View>
    </Panel>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest src/features/learn/__tests__/widgets.test.tsx`
Expected: PASS.

- [ ] **Step 6: Verify and commit**

Run: `npm run verify` — Expected: exits 0.
```bash
git add package.json package-lock.json src/features/learn/widgets.tsx src/features/learn/__tests__/widgets.test.tsx
git commit -m "$(cat <<'EOF'
feat(learn): port the five Learn calculators with the native slider

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XDkAB7UCK8WyT267W5ZxNV
EOF
)"
```

---

## Task 6: Mobile — LiveChart (one shared fetch, armed by viewability) and the `VisualSpec` renderer

**Files:**
- Create: `src/features/learn/liveData.ts`, `src/features/learn/LiveChart.tsx`, `src/features/learn/LearnVisual.tsx`
- Test: `src/features/learn/__tests__/LiveChart.test.tsx`, `src/features/learn/__tests__/LearnVisual.test.tsx`

**Interfaces:**
- Consumes: `fetchAnalysis(symbol, interval, bars)` from `@/shared/api`; `LIVE_SYMBOL`, `LIVE_BARS`, `liveVisual` from `@/shared/learnLive`; `specProps`, `VisualSpec`, `LiveVariant` from `@/shared/learnVisuals`; Task 4 diagrams; Task 5 widgets.
- Produces:
  - `loadLiveAnalysis(): Promise<AnalysisResponse>`, `resetLiveAnalysisForTests(): void`.
  - `LiveChart({ variant: LiveVariant; caption?: string; fallback: ReactNode; armed?: boolean })` — `armed` replaces the web's IntersectionObserver: the Learn list sets it once the row has been on screen (Task 8). Default `true`, matching the web's "no observer ⇒ visible".
  - `LearnVisual({ spec: VisualSpec; armed?: boolean })`.

- [ ] **Step 1: Write the failing tests**

`src/features/learn/__tests__/LiveChart.test.tsx`:
```tsx
import { render, screen, waitFor } from "@testing-library/react-native";
import { AppText } from "@/ui";
import { fetchAnalysis } from "@/shared/api";
import { liveVisual } from "@/shared/learnLive";
import type { AnalysisResponse } from "@/shared/types";
import { LiveChart } from "../LiveChart";
import { resetLiveAnalysisForTests } from "../liveData";

jest.mock("@/shared/api", () => ({ fetchAnalysis: jest.fn() }));
const fetchMock = fetchAnalysis as jest.MockedFunction<typeof fetchAnalysis>;

const close = Array.from({ length: 150 }, (_, i) => 50 + i * 0.1);
const ANALYSIS = {
  ohlcv: { close, volume: close.map(() => 1000) },
  indicators: {
    sma_50: close.map((v) => v - 1),
    sma_200: close.map((v) => v - 2),
    rsi: close.map(() => 55),
    bollinger_upper: close.map((v) => v + 2),
    bollinger_lower: close.map((v) => v - 2),
    bollinger_middle: close,
  },
  support_resistance: { supports: [{ price: 48 }], resistances: [{ price: 70 }] },
  composite_score: { score: 64 },
  bb_squeeze: false,
} as unknown as AnalysisResponse;

const Fallback = () => <AppText>static diagram</AppText>;

beforeEach(() => {
  resetLiveAnalysisForTests();
  fetchMock.mockReset();
});

describe("LiveChart", () => {
  it("does not fetch until armed, and shows the static diagram meanwhile", async () => {
    fetchMock.mockResolvedValue(ANALYSIS);
    await render(<LiveChart variant="trend" fallback={<Fallback />} armed={false} />);
    expect(screen.getByText("static diagram")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shares ONE fetch between every armed instance", async () => {
    fetchMock.mockResolvedValue(ANALYSIS);
    await render(
      <>
        <LiveChart variant="trend" fallback={<Fallback />} />
        <LiveChart variant="rsi" fallback={<Fallback />} />
      </>
    );
    await waitFor(() => expect(screen.getAllByText("Live · COMI · daily")).toHaveLength(2));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("COMI", "Daily", 180);
  });

  it("degrades silently: on failure the diagram stays and no error is shown", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    await render(<LiveChart variant="trend" fallback={<Fallback />} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.getByText("static diagram")).toBeTruthy();
    expect(screen.queryByText(/offline|error|failed/i)).toBeNull();
  });

  it("lets a later instance retry after a failure", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(ANALYSIS);
    const first = await render(<LiveChart variant="trend" fallback={<Fallback />} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    first.unmount();
    await render(<LiveChart variant="trend" fallback={<Fallback />} />);
    await waitFor(() => expect(screen.getByText("Live · COMI · daily")).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("short data keeps the diagram", async () => {
    const short = { ...ANALYSIS, ohlcv: { close: close.slice(0, 10), volume: [] } } as unknown as AnalysisResponse;
    fetchMock.mockResolvedValue(short);
    await render(<LiveChart variant="trend" fallback={<Fallback />} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.getByText("static diagram")).toBeTruthy();
    expect(screen.queryByText("Live · COMI · daily")).toBeNull();
  });
});

describe("liveVisual (shared)", () => {
  it("puts COMI's composite on the band scale", () => {
    const spec = liveVisual("score", ANALYSIS);
    expect(spec?.kind).toBe("ZoneScale");
    expect(spec && "markers" in spec ? spec.markers?.[0]?.label : null).toBe("COMI 64");
  });
  it("returns null when the variant's series is empty", () => {
    const noSma = { ...ANALYSIS, indicators: { ...ANALYSIS.indicators, sma_50: close.map(() => null) } } as unknown as AnalysisResponse;
    expect(liveVisual("trend", noSma)).toBeNull();
  });
});
```

`src/features/learn/__tests__/LearnVisual.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react-native";
import { TBILL_TITLE } from "@/shared/learnWidgets";
import { V } from "@/shared/learnVisuals";
import { LearnVisual } from "../LearnVisual";

jest.mock("@react-native-community/slider", () => {
  const { View } = jest.requireActual("react-native");
  return { __esModule: true, default: (props: object) => <View {...props} /> };
});
jest.mock("@/shared/api", () => ({ fetchAnalysis: jest.fn(() => new Promise(() => {})) }));

describe("LearnVisual", () => {
  it("renders a Stack's children in order", async () => {
    await render(
      <LearnVisual
        spec={{
          kind: "Stack",
          children: [
            { kind: "LedgerRows", rows: [{ left: "first", right: "1" }] },
            { kind: "TBillRace" },
          ],
        }}
      />
    );
    expect(screen.getByText("first")).toBeTruthy();
    expect(screen.getByText(TBILL_TITLE)).toBeTruthy();
  });

  it("renders a LiveChart's fallback spec while it is not armed", async () => {
    await render(
      <LearnVisual
        armed={false}
        spec={{
          kind: "LiveChart",
          variant: "trend",
          fallback: { kind: "BarCompare", bars: [{ label: "fallback bar", value: 5, color: V.accent }] },
        }}
      />
    );
    expect(screen.getByText("fallback bar")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx jest src/features/learn/__tests__/LiveChart.test.tsx src/features/learn/__tests__/LearnVisual.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `src/features/learn/liveData.ts`**

```ts
/**
 * The one /api/analysis call behind every Learn LiveChart.
 *
 * Module-level, so six live concepts cost one request. A failure clears the
 * promise so a concept scrolled to later can retry.
 */
import { fetchAnalysis } from "@/shared/api";
import { LIVE_BARS, LIVE_SYMBOL } from "@/shared/learnLive";
import type { AnalysisResponse } from "@/shared/types";

let inflight: Promise<AnalysisResponse> | null = null;

export function loadLiveAnalysis(): Promise<AnalysisResponse> {
  if (!inflight) {
    inflight = fetchAnalysis(LIVE_SYMBOL, "Daily", LIVE_BARS).catch((err: unknown) => {
      inflight = null;
      throw err;
    });
  }
  return inflight;
}

export function resetLiveAnalysisForTests(): void {
  inflight = null;
}
```

- [ ] **Step 4: Implement `src/features/learn/LiveChart.tsx`**

```tsx
/**
 * Real COMI data inside a Learn concept.
 *
 * 1. One fetch for the whole screen (liveData.ts).
 * 2. Nothing loads until the concept has been on screen: the Learn list arms
 *    it from FlatList viewability (the web uses an IntersectionObserver).
 * 3. It must degrade to the diagram: on any failure, or data too thin to
 *    draw, the caller's static diagram stays and no error is surfaced — a
 *    teaching page keeps teaching offline.
 */
import { useEffect, useState, type ReactNode } from "react";
import { View } from "react-native";
import { AppText } from "@/ui";
import { LIVE_SYMBOL, liveVisual } from "@/shared/learnLive";
import { V, specProps, type LiveVariant } from "@/shared/learnVisuals";
import type { AnalysisResponse } from "@/shared/types";
import { loadLiveAnalysis } from "./liveData";
import { MiniChart, ZoneScale } from "./visuals";

export function LiveChart({
  variant,
  caption,
  fallback,
  armed = true,
}: {
  variant: LiveVariant;
  caption?: string;
  /** Shown while loading, and permanently if the data never arrives. */
  fallback: ReactNode;
  armed?: boolean;
}) {
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!armed || data || failed) return;
    let alive = true;
    loadLiveAnalysis()
      .then((d) => {
        if (alive) setData(d);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [armed, data, failed]);

  const spec = data ? liveVisual(variant, data, caption) : null;
  if (!spec) return <>{fallback}</>;

  return (
    <View>
      {spec.kind === "MiniChart" ? <MiniChart {...specProps(spec)} /> : <ZoneScale {...specProps(spec)} />}
      <View className="mt-1.5 flex-row items-center gap-1.5">
        <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: V.up }} />
        <AppText className="font-mono text-[9px] uppercase tracking-[0.5px] text-white/30">
          {`Live · ${LIVE_SYMBOL} · daily`}
        </AppText>
      </View>
    </View>
  );
}
```

- [ ] **Step 5: Implement `src/features/learn/LearnVisual.tsx`**

```tsx
/**
 * Renders one curriculum diagram (VisualSpec). Twin of the web's
 * components/learn/LearnVisual.tsx — a new kind needs a case in both.
 */
import { View } from "react-native";
import { specProps, type VisualSpec } from "@/shared/learnVisuals";
import { LiveChart } from "./LiveChart";
import {
  AllocationDonut,
  BarCompare,
  ConeChart,
  CorrelationGrid,
  LedgerRows,
  MiniChart,
  StepFlow,
  ZoneScale,
} from "./visuals";
import { PositionSizer, RsiPlayground, ScoreBandExplorer, StopLossCalculator, TBillRace } from "./widgets";

export function LearnVisual({ spec, armed = true }: { spec: VisualSpec; armed?: boolean }) {
  switch (spec.kind) {
    case "MiniChart":
      return <MiniChart {...specProps(spec)} />;
    case "ZoneScale":
      return <ZoneScale {...specProps(spec)} />;
    case "BarCompare":
      return <BarCompare {...specProps(spec)} />;
    case "StepFlow":
      return <StepFlow {...specProps(spec)} />;
    case "AllocationDonut":
      return <AllocationDonut {...specProps(spec)} />;
    case "CorrelationGrid":
      return <CorrelationGrid {...specProps(spec)} />;
    case "ConeChart":
      return <ConeChart {...specProps(spec)} />;
    case "LedgerRows":
      return <LedgerRows {...specProps(spec)} />;
    case "Stack":
      return (
        <View className="gap-2.5">
          {spec.children.map((child, i) => (
            <LearnVisual key={i} spec={child} armed={armed} />
          ))}
        </View>
      );
    case "LiveChart":
      return (
        <LiveChart
          variant={spec.variant}
          caption={spec.caption}
          armed={armed}
          fallback={<LearnVisual spec={spec.fallback} armed={armed} />}
        />
      );
    case "RsiPlayground":
      return <RsiPlayground />;
    case "StopLossCalculator":
      return <StopLossCalculator />;
    case "PositionSizer":
      return <PositionSizer />;
    case "TBillRace":
      return <TBillRace />;
    case "ScoreBandExplorer":
      return <ScoreBandExplorer />;
  }
  return null;
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx jest src/features/learn/__tests__/LiveChart.test.tsx src/features/learn/__tests__/LearnVisual.test.tsx`
Expected: PASS.

- [ ] **Step 7: Verify and commit**

Run: `npm run verify` — Expected: exits 0.
```bash
git add src/features/learn/liveData.ts src/features/learn/LiveChart.tsx src/features/learn/LearnVisual.tsx \
  src/features/learn/__tests__/LiveChart.test.tsx src/features/learn/__tests__/LearnVisual.test.tsx
git commit -m "$(cat <<'EOF'
feat(learn): live COMI charts (one lazy fetch, silent fallback) and spec renderer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XDkAB7UCK8WyT267W5ZxNV
EOF
)"
```

---

## Task 7: Mobile — reading progress (AsyncStorage) and the concept card

**Files:**
- Create: `src/features/learn/progress.ts`, `src/features/learn/useReduceMotion.ts`, `src/features/learn/ConceptCard.tsx`
- Test: `src/features/learn/__tests__/progress.test.tsx`, `src/features/learn/__tests__/ConceptCard.test.tsx`

**Interfaces:**
- Consumes: `LEARN_PROGRESS_KEY`, `LEVEL_LABEL`, `conceptKey`, `Concept` from `@/shared/learn`; `LearnVisual` (Task 6); `COLORS` (`@/shared/theme`, assumption A3); `V`.
- Produces:
  - `parseProgress(raw: string | null): Set<string>`
  - `useLearnProgress(): { read: ReadonlySet<string>; toggle(key: string): void; reset(): void; hydrated: boolean }`
  - `useReduceMotion(): boolean`
  - `FLASH_MS = 2200`; `ConceptCard(props: { concept: Concept; hue: string; read: boolean; onToggle(key: string): void; armed: boolean; flash: number; reduceMotion: boolean })` — `flash` is 0 for none, otherwise a counter that restarts the ring when it changes. Root `testID="concept-<conceptKey>"`; ring `testID="learn-flash"`.

- [ ] **Step 1: Install AsyncStorage**

Run: `npx expo install @react-native-async-storage/async-storage`
Expected: added to `dependencies`. Check the installed major's README for the default-export API (`AsyncStorage.getItem/setItem/removeItem`); if the major changed its default export, adapt the single import in `progress.ts` — the tests below mock the module, so they do not depend on it.

- [ ] **Step 2: Write the failing tests**

`src/features/learn/__tests__/progress.test.tsx`:
```tsx
import { act, renderHook, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LEARN_PROGRESS_KEY } from "@/shared/learn";
import { parseProgress, useLearnProgress } from "../progress";

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));
const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

beforeEach(() => {
  jest.clearAllMocks();
  storage.getItem.mockResolvedValue(null);
  storage.setItem.mockResolvedValue(undefined);
  storage.removeItem.mockResolvedValue(undefined);
});

describe("parseProgress", () => {
  it.each([
    [null, []],
    ["", []],
    ["not json", []],
    ['{"a":1}', []],
    ['["rsi",3,"sma"]', ["rsi", "sma"]],
  ])("parses %p", (raw, expected) => {
    expect([...parseProgress(raw as string | null)]).toEqual(expected);
  });
});

describe("useLearnProgress", () => {
  it("hydrates from storage under the shared key", async () => {
    storage.getItem.mockResolvedValue('["rsi"]');
    const { result } = await renderHook(() => useLearnProgress());
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(storage.getItem).toHaveBeenCalledWith(LEARN_PROGRESS_KEY);
    expect(result.current.read.has("rsi")).toBe(true);
  });

  it("persists a toggle", async () => {
    const { result } = await renderHook(() => useLearnProgress());
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(async () => result.current.toggle("sma"));
    expect(result.current.read.has("sma")).toBe(true);
    expect(storage.setItem).toHaveBeenLastCalledWith(LEARN_PROGRESS_KEY, '["sma"]');
  });

  it("a toggle made before hydration is merged, not lost", async () => {
    let resolve: (v: string | null) => void = () => {};
    storage.getItem.mockReturnValue(new Promise((r) => (resolve = r)));
    const { result } = await renderHook(() => useLearnProgress());
    await act(async () => result.current.toggle("sma"));
    await act(async () => resolve('["rsi"]'));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect([...result.current.read].sort()).toEqual(["rsi", "sma"]);
    expect(JSON.parse(storage.setItem.mock.calls.at(-1)![1]).sort()).toEqual(["rsi", "sma"]);
  });

  it("a failed read still yields a working, empty tracker", async () => {
    storage.getItem.mockRejectedValue(new Error("disk"));
    const { result } = await renderHook(() => useLearnProgress());
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(async () => result.current.toggle("rsi"));
    expect(result.current.read.has("rsi")).toBe(true);
  });

  it("a failed write (sync throw or rejection) never breaks the toggle", async () => {
    storage.setItem.mockImplementationOnce(() => {
      throw new Error("quota");
    });
    storage.setItem.mockRejectedValueOnce(new Error("quota"));
    const { result } = await renderHook(() => useLearnProgress());
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(async () => result.current.toggle("rsi"));
    await act(async () => result.current.toggle("sma"));
    expect([...result.current.read].sort()).toEqual(["rsi", "sma"]);
  });

  it("reset clears memory and storage", async () => {
    storage.getItem.mockResolvedValue('["rsi"]');
    const { result } = await renderHook(() => useLearnProgress());
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(async () => result.current.reset());
    expect(result.current.read.size).toBe(0);
    expect(storage.removeItem).toHaveBeenCalledWith(LEARN_PROGRESS_KEY);
  });
});
```

`src/features/learn/__tests__/ConceptCard.test.tsx`:
```tsx
import { StyleSheet } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import type { Concept } from "@/shared/learn";
import { ConceptCard, FLASH_MS } from "../ConceptCard";

const CONCEPT: Concept = {
  id: "rsi",
  title: "RSI — Relative Strength Index",
  level: "start",
  definition: "A momentum oscillator.",
  whyItMatters: "Helps avoid buying peaks.",
  howToUse: "Check the RSI panel.",
  example: "RSI 75 on COMI.",
};

const base = { concept: CONCEPT, hue: "#2fd3c0", armed: false, flash: 0, reduceMotion: false };

describe("ConceptCard", () => {
  it("shows the level, title, body blocks and the worked example", async () => {
    await render(<ConceptCard {...base} read={false} onToggle={jest.fn()} />);
    expect(screen.getByText("start here")).toBeTruthy();
    expect(screen.getByText("RSI — Relative Strength Index")).toBeTruthy();
    expect(screen.getByText("Why it matters")).toBeTruthy();
    expect(screen.getByText("How to use it")).toBeTruthy();
    expect(screen.getByText("For example")).toBeTruthy();
    expect(screen.getByText("RSI 75 on COMI.")).toBeTruthy();
  });

  it("toggles read state by concept key, with an accessible checkbox", async () => {
    const onToggle = jest.fn();
    await render(<ConceptCard {...base} read={false} onToggle={onToggle} />);
    const box = screen.getByLabelText("Mark RSI — Relative Strength Index read");
    expect(box.props.accessibilityState).toMatchObject({ checked: false });
    await fireEvent.press(box);
    expect(onToggle).toHaveBeenCalledWith("rsi");
  });

  it("offers 'unread' once read", async () => {
    await render(<ConceptCard {...base} read onToggle={jest.fn()} />);
    expect(screen.getByLabelText("Mark RSI — Relative Strength Index unread")).toBeTruthy();
  });

  it("rests VISIBLE: nothing about the card starts transparent", async () => {
    await render(<ConceptCard {...base} read={false} onToggle={jest.fn()} />);
    const card = screen.getByTestId("concept-rsi");
    expect(StyleSheet.flatten(card.props.style)?.opacity ?? 1).toBe(1);
  });

  it("flashes when asked, then the ring goes away", async () => {
    jest.useFakeTimers();
    const view = await render(<ConceptCard {...base} flash={1} read={false} onToggle={jest.fn()} />);
    expect(screen.getByTestId("learn-flash")).toBeTruthy();
    await view.rerender(<ConceptCard {...base} flash={0} read={false} onToggle={jest.fn()} />);
    act(() => jest.advanceTimersByTime(FLASH_MS));
    expect(screen.queryByTestId("learn-flash")).toBeNull();
    jest.useRealTimers();
  });

  it("does not flash under reduced motion", async () => {
    await render(<ConceptCard {...base} flash={1} reduceMotion read={false} onToggle={jest.fn()} />);
    expect(screen.queryByTestId("learn-flash")).toBeNull();
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npx jest src/features/learn/__tests__/progress.test.tsx src/features/learn/__tests__/ConceptCard.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 4: Implement `src/features/learn/progress.ts`**

```ts
/**
 * Per-concept read state, per device, under the same key the web uses.
 *
 * A reading aid, not user data: no backend, no sync, and losing it costs
 * nothing — so every storage call is wrapped and a failure only means the
 * state is not remembered. AsyncStorage is asynchronous (the web's
 * localStorage is not), so a tap can land before the stored set arrives;
 * such taps are queued and replayed on top of it instead of being lost.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LEARN_PROGRESS_KEY } from "@/shared/learn";

export function parseProgress(raw: string | null): Set<string> {
  if (!raw) return new Set();
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? new Set(v.filter((x): x is string => typeof x === "string")) : new Set();
  } catch {
    return new Set();
  }
}

function toggled(set: ReadonlySet<string>, key: string): Set<string> {
  const next = new Set(set);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

/** Fire-and-forget; swallows both synchronous throws and rejections. */
function safely(op: () => Promise<unknown>): void {
  try {
    op().catch(() => {});
  } catch {
    /* storage unavailable — the in-memory state still works */
  }
}

function persist(set: ReadonlySet<string>): void {
  if (set.size === 0) safely(() => AsyncStorage.removeItem(LEARN_PROGRESS_KEY));
  else safely(() => AsyncStorage.setItem(LEARN_PROGRESS_KEY, JSON.stringify(Array.from(set))));
}

async function readStored(): Promise<Set<string>> {
  try {
    return parseProgress(await AsyncStorage.getItem(LEARN_PROGRESS_KEY));
  } catch {
    return new Set();
  }
}

type PendingOp = { type: "toggle"; key: string } | { type: "reset" };

export function useLearnProgress() {
  const [read, setRead] = useState<ReadonlySet<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);
  const pending = useRef<PendingOp[]>([]);

  useEffect(() => {
    let alive = true;
    readStored().then((stored) => {
      if (!alive) return;
      let next: Set<string> = stored;
      for (const op of pending.current) next = op.type === "reset" ? new Set() : toggled(next, op.key);
      const replayed = pending.current.length > 0;
      pending.current = [];
      hydratedRef.current = true;
      setRead(next);
      setHydrated(true);
      if (replayed) persist(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  const toggle = useCallback((key: string) => {
    if (!hydratedRef.current) pending.current.push({ type: "toggle", key });
    setRead((prev) => {
      const next = toggled(prev, key);
      if (hydratedRef.current) persist(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    if (!hydratedRef.current) pending.current.push({ type: "reset" });
    setRead(new Set());
    if (hydratedRef.current) persist(new Set());
  }, []);

  return { read, toggle, reset, hydrated };
}
```

Note: `persist` inside the `setRead` updater is idempotent (it writes the same value if React replays the updater in Strict Mode), which is why it is acceptable there.

- [ ] **Step 5: Implement `src/features/learn/useReduceMotion.ts`**

```ts
import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/** The OS "reduce motion" setting; false until known. */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (alive) setReduce(v);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduce;
}
```

- [ ] **Step 6: Implement `src/features/learn/ConceptCard.tsx`**

```tsx
/**
 * One concept: module-hued rail (fills when read), level, title, read toggle,
 * definition, diagram, why/how, worked example.
 *
 * The card RESTS VISIBLE. The only animation is the deep-link flash, an
 * accent ring drawn OVER an already-opaque card and removed after FLASH_MS;
 * under reduced motion it is not drawn at all (the web disables it too).
 */
import { memo, useEffect, useRef } from "react";
import { Animated, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/ui";
import { COLORS } from "@/shared/theme";
import { LEVEL_LABEL, conceptKey, type Concept } from "@/shared/learn";
import { V } from "@/shared/learnVisuals";
import { LearnVisual } from "./LearnVisual";

export const FLASH_MS = 2200;

/** Accent ring that peaks at 18% of FLASH_MS, like the web's learn-flash keyframe. */
export function FlashRing({ radius = 12 }: { radius?: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: FLASH_MS * 0.18, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: FLASH_MS * 0.82, useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [opacity]);
  return (
    <Animated.View
      testID="learn-flash"
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: radius,
        borderWidth: 2,
        borderColor: `${V.accent}99`,
        opacity,
      }}
    />
  );
}

function Block({ label, text }: { label: string; text: string }) {
  return (
    <View>
      <AppText className="mb-0.5 font-mono text-[9px] uppercase tracking-[1.5px] text-white/30">{label}</AppText>
      <AppText className="text-[12px] leading-[19px] text-white/50">{text}</AppText>
    </View>
  );
}

export interface ConceptCardProps {
  concept: Concept;
  hue: string;
  read: boolean;
  onToggle: (key: string) => void;
  /** True once the card has been on screen — arms its LiveChart. */
  armed: boolean;
  /** 0 = no flash; any other value (re)starts the ring when it changes. */
  flash: number;
  reduceMotion: boolean;
}

export const ConceptCard = memo(function ConceptCard({
  concept,
  hue,
  read,
  onToggle,
  armed,
  flash,
  reduceMotion,
}: ConceptCardProps) {
  const key = conceptKey(concept);
  const level = concept.level ?? "core";

  return (
    <View
      testID={`concept-${key}`}
      className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]"
    >
      <View
        className="absolute bottom-0 left-0 top-0 w-[2px]"
        style={{ backgroundColor: hue, opacity: read ? 0.9 : 0.18 }}
      />
      <View className="p-4 pl-5">
        <View className="mb-2.5 flex-row items-start gap-3">
          <View className="min-w-0 flex-1">
            <AppText className="mb-1 font-mono text-[9px] uppercase tracking-[1.5px]" style={{ color: hue, opacity: 0.75 }}>
              {LEVEL_LABEL[level]}
            </AppText>
            <AppText accessibilityRole="header" className="font-sans-semibold text-[15px] leading-[20px] text-white">
              {concept.title}
            </AppText>
          </View>
          <Pressable
            onPress={() => onToggle(key)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: read }}
            accessibilityLabel={read ? `Mark ${concept.title} unread` : `Mark ${concept.title} read`}
            className="-mr-1 -mt-1 h-11 w-11 items-center justify-center rounded-lg"
          >
            <View
              className="h-[18px] w-[18px] items-center justify-center rounded-full border"
              style={{ borderColor: read ? hue : "rgba(255,255,255,0.22)", backgroundColor: read ? hue : "transparent" }}
            >
              <Ionicons name="checkmark" size={11} color={read ? COLORS["charcoal-dark"] : "rgba(255,255,255,0.3)"} />
            </View>
          </Pressable>
        </View>

        <AppText className="mb-3 text-[13px] leading-[21px] text-white/70">{concept.definition}</AppText>

        {concept.visual ? (
          <View className="mb-3">
            <LearnVisual spec={concept.visual} armed={armed} />
          </View>
        ) : null}

        <View className="gap-2.5">
          <Block label="Why it matters" text={concept.whyItMatters} />
          <Block label="How to use it" text={concept.howToUse} />
        </View>

        {concept.example ? (
          <View className="mt-3 rounded-md border-l-2 bg-white/[0.03] px-3 py-2.5" style={{ borderLeftColor: hue }}>
            <AppText className="mb-1 font-mono text-[9px] uppercase tracking-[1.5px] text-white/35">For example</AppText>
            <AppText className="font-mono text-[11px] leading-[18px] text-white/70">{concept.example}</AppText>
          </View>
        ) : null}
      </View>
      {flash && !reduceMotion ? <FlashRing key={flash} /> : null}
    </View>
  );
});
```

`{flash && !reduceMotion ? … : null}` is a ternary on a boolean expression — `flash` is a number, so it must never be used as `{flash && <FlashRing/>}` (Global Constraints).

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx jest src/features/learn/__tests__/progress.test.tsx src/features/learn/__tests__/ConceptCard.test.tsx`
Expected: PASS.

- [ ] **Step 8: Verify and commit**

Run: `npm run verify` — Expected: exits 0.
```bash
git add package.json package-lock.json src/features/learn/progress.ts src/features/learn/useReduceMotion.ts \
  src/features/learn/ConceptCard.tsx src/features/learn/__tests__/progress.test.tsx src/features/learn/__tests__/ConceptCard.test.tsx
git commit -m "$(cat <<'EOF'
feat(learn): reading progress on AsyncStorage and the concept card

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XDkAB7UCK8WyT267W5ZxNV
EOF
)"
```

---

## Task 8: Mobile — the Learn screen (list, sticky controls, search, modules, back-to-top)

**Files:**
- Create: `src/features/learn/rows.ts`, `src/features/learn/LearnHeader.tsx`, `src/features/learn/ModuleHeader.tsx`, `src/features/learn/LearnScreen.tsx`, `src/test-utils/renderScreen.tsx`
- Modify: `src/app/(tabs)/learn.tsx` (replace Plan 1's shell)
- Test: `src/features/learn/__tests__/rows.test.ts`, `src/features/learn/__tests__/LearnScreen.test.tsx`

**Interfaces:**
- Consumes: `CURRICULUM`, `ALL_CONCEPTS`, `TOTAL_CONCEPTS` (`@/shared/curriculum`); `conceptKey`, `searchConcepts`, `Module`, `Concept`, `ConceptEntry` (`@/shared/learn`); Tasks 6–7; `Screen`, `AppText` (`@/ui`).
- Produces:
  - `rows.ts`: `type LearnRow`, `CONTROLS_INDEX = 1`, `buildRows({ modules, collapsed, results }): LearnRow[]`, `type DeepLinkTarget = { moduleId: string; rowKey: string }`, `resolveTarget(modules: Module[], id: string): DeepLinkTarget | null`, `withOpen(set, id)`, `toggledSet(set, id)`. Row keys: `m-<moduleId>`, `o-<moduleId>`, `c-<conceptKey>`, `r-<moduleId>-<conceptKey>`.
  - `LearnScreen({ concept?: string; onConceptHandled?: () => void })` — Task 9 wires `concept`.
  - `renderScreen(ui: ReactElement)` — RNTL render with a `SafeAreaProvider` wrapper (survives `rerender`).

Translations: the web's sticky search bar (`position: sticky` + backdrop-blur) → `FlatList stickyHeaderIndices={[1]}` with an opaque `bg-charcoal-dark` row; `<details open>` modules → tappable headers that drop their rows from the list; IntersectionObserver for the active module → `onViewableItemsChanged`; the `/` shortcut and its hint are dropped (no key on a phone; the web hides the hint there too); Escape → the clear button.

- [ ] **Step 1: Write the failing tests**

`src/features/learn/__tests__/rows.test.ts`:
```ts
import { ALL_CONCEPTS, CURRICULUM, TOTAL_CONCEPTS } from "@/shared/curriculum";
import { searchConcepts } from "@/shared/learn";
import { CONTROLS_INDEX, buildRows, resolveTarget, toggledSet, withOpen } from "../rows";

const none = new Set<string>();

describe("buildRows", () => {
  it("lays out hero, sticky controls, every module and concept, then the footer", () => {
    const rows = buildRows({ modules: CURRICULUM, collapsed: none, results: null });
    expect(rows[0].type).toBe("hero");
    expect(rows[CONTROLS_INDEX].type).toBe("controls");
    expect(rows[2].key).toBe("m-market-basics");
    expect(rows.filter((r) => r.type === "concept")).toHaveLength(TOTAL_CONCEPTS);
    expect(rows.filter((r) => r.type === "module")).toHaveLength(9);
    expect(rows.at(-1)?.type).toBe("footer");
  });

  it("drops a collapsed module's overview and concepts but keeps its header", () => {
    const rows = buildRows({ modules: CURRICULUM, collapsed: new Set(["decision-framework"]), results: null });
    const header = rows.find((r) => r.key === "m-decision-framework");
    expect(header && header.type === "module" && header.open).toBe(false);
    expect(rows.some((r) => r.key === "o-decision-framework")).toBe(false);
    expect(rows.some((r) => r.key === "c-decision_step_macro")).toBe(false);
  });

  it("shows the decision-framework overview when open", () => {
    const rows = buildRows({ modules: CURRICULUM, collapsed: none, results: null });
    expect(rows.some((r) => r.key === "o-decision-framework")).toBe(true);
  });

  it("in search mode lists only matches, with a count row and no footer", () => {
    const results = searchConcepts(ALL_CONCEPTS, "stop loss");
    const rows = buildRows({ modules: CURRICULUM, collapsed: none, results });
    const head = rows[2];
    expect(head.type === "results-head" && head.count).toBe(results!.length);
    expect(rows.filter((r) => r.type === "concept")).toHaveLength(results!.length);
    expect(rows.some((r) => r.type === "footer")).toBe(false);
  });

  it("adds an empty row when nothing matches", () => {
    const rows = buildRows({ modules: CURRICULUM, collapsed: none, results: [] });
    expect(rows.map((r) => r.type)).toEqual(["hero", "controls", "results-head", "empty"]);
  });

  it("never repeats a key", () => {
    const rows = buildRows({ modules: CURRICULUM, collapsed: none, results: null });
    expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length);
  });
});

describe("resolveTarget", () => {
  it("finds a concept id", () => {
    expect(resolveTarget(CURRICULUM, "dividend_yield")).toEqual({ moduleId: "macro-context", rowKey: "c-dividend_yield" });
  });
  it("finds a module id", () => {
    expect(resolveTarget(CURRICULUM, "risk-management")).toEqual({ moduleId: "risk-management", rowKey: "m-risk-management" });
  });
  it("finds an id-less concept by its title slug", () => {
    expect(resolveTarget(CURRICULUM, "what-is-a-stock")).toEqual({ moduleId: "market-basics", rowKey: "c-what-is-a-stock" });
  });
  it("returns null for an unknown id", () => {
    expect(resolveTarget(CURRICULUM, "from_a_newer_backend")).toBeNull();
  });
});

describe("set helpers", () => {
  it("withOpen removes the id, and returns the same set when already open", () => {
    const s = new Set(["a"]);
    expect(withOpen(s, "a").has("a")).toBe(false);
    expect(withOpen(s, "b")).toBe(s);
  });
  it("toggledSet flips membership", () => {
    expect(toggledSet(new Set(["a"]), "a").has("a")).toBe(false);
    expect(toggledSet(new Set<string>(), "a").has("a")).toBe(true);
  });
});
```

`src/features/learn/__tests__/LearnScreen.test.tsx`:
```tsx
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ALL_CONCEPTS, TOTAL_CONCEPTS } from "@/shared/curriculum";
import { searchConcepts } from "@/shared/learn";
import { renderScreen } from "@/test-utils/renderScreen";
import { LearnScreen } from "../LearnScreen";

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));
jest.mock("@react-native-community/slider", () => {
  const { View } = jest.requireActual("react-native");
  return { __esModule: true, default: (props: object) => <View {...props} /> };
});
jest.mock("@/shared/api", () => ({ fetchAnalysis: jest.fn(() => new Promise(() => {})) }));

describe("LearnScreen", () => {
  it("opens on the hero, the progress count and the first module", async () => {
    await renderScreen(<LearnScreen />);
    await waitFor(() => expect(screen.getByText(`0 of ${TOTAL_CONCEPTS} read`)).toBeTruthy());
    expect(screen.getByText("one idea at a time.")).toBeTruthy();
    expect(screen.getByText("What is a Stock?")).toBeTruthy();
  });

  it("counts a concept read, and reset clears it", async () => {
    await renderScreen(<LearnScreen />);
    await waitFor(() => expect(screen.getByText(`0 of ${TOTAL_CONCEPTS} read`)).toBeTruthy());
    await fireEvent.press(screen.getByLabelText("Mark What is a Stock? read"));
    expect(screen.getByText(`1 of ${TOTAL_CONCEPTS} read`)).toBeTruthy();
    expect(AsyncStorage.setItem).toHaveBeenCalled();
    await fireEvent.press(screen.getByLabelText("Reset reading progress"));
    expect(screen.getByText(`0 of ${TOTAL_CONCEPTS} read`)).toBeTruthy();
  });

  it("searches with punctuation folded and shows the live count", async () => {
    await renderScreen(<LearnScreen />);
    const n = searchConcepts(ALL_CONCEPTS, "stop loss")!.length;
    await fireEvent.changeText(screen.getByLabelText("Search all concepts"), "stop loss");
    expect(screen.getByText(`${n} ${n === 1 ? "concept" : "concepts"} match “stop loss”`)).toBeTruthy();
    expect(screen.getAllByText(String(n)).length).toBeGreaterThan(0); // the live count in the field
    expect(screen.queryByLabelText(/^Module 1:/)).toBeNull(); // pills hide while searching
  });

  it("says so when nothing matches, and clearing restores the path", async () => {
    await renderScreen(<LearnScreen />);
    await fireEvent.changeText(screen.getByLabelText("Search all concepts"), "zzzz");
    expect(screen.getByText("Nothing matches that yet.")).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("Clear search"));
    expect(screen.getByText("What is a Stock?")).toBeTruthy();
    expect(screen.getByLabelText(/^Module 1: Foundations/)).toBeTruthy();
  });

  it("collapses and reopens a module from its header", async () => {
    await renderScreen(<LearnScreen />);
    await fireEvent.press(screen.getByTestId("module-market-basics"));
    expect(screen.queryByText("What is a Stock?")).toBeNull();
    expect(screen.getByTestId("module-market-basics").props.accessibilityState).toMatchObject({ expanded: false });
    await fireEvent.press(screen.getByTestId("module-market-basics"));
    expect(screen.getByText("What is a Stock?")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx jest src/features/learn/__tests__/rows.test.ts src/features/learn/__tests__/LearnScreen.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `src/test-utils/renderScreen.tsx`**

```tsx
import type { ReactNode, ReactElement } from "react";
import { render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function Wrapper({ children }: { children: ReactNode }) {
  return <SafeAreaProvider initialMetrics={METRICS}>{children}</SafeAreaProvider>;
}

/**
 * Render a screen that needs safe-area context but none of the data
 * providers (Learn, Calibration, Admin). Uses RNTL's `wrapper`, so
 * `rerender` keeps the provider.
 */
export function renderScreen(ui: ReactElement) {
  return render(ui, { wrapper: Wrapper });
}
```

- [ ] **Step 4: Implement `src/features/learn/rows.ts`**

```ts
/**
 * The Learn screen is ONE virtualised list. This flattens the curriculum (or
 * the search results) into its rows, and resolves deep-link ids to rows.
 * Pure, so the layout rules are testable without rendering.
 */
import type { VisualSpec } from "@/shared/learnVisuals";
import { conceptKey, type Concept, type ConceptEntry, type Module } from "@/shared/learn";

export type LearnRow =
  | { type: "hero"; key: "hero" }
  | { type: "controls"; key: "controls" }
  | { type: "module"; key: string; module: Module; index: number; open: boolean }
  | { type: "overview"; key: string; module: Module; spec: VisualSpec }
  | { type: "concept"; key: string; module: Module; concept: Concept }
  | { type: "results-head"; key: "results-head"; count: number }
  | { type: "empty"; key: "empty" }
  | { type: "footer"; key: "footer" };

/** The search + pill row; pinned with FlatList stickyHeaderIndices. */
export const CONTROLS_INDEX = 1;

export function buildRows({
  modules,
  collapsed,
  results,
}: {
  modules: Module[];
  collapsed: ReadonlySet<string>;
  results: ConceptEntry[] | null;
}): LearnRow[] {
  const rows: LearnRow[] = [
    { type: "hero", key: "hero" },
    { type: "controls", key: "controls" },
  ];

  if (results) {
    rows.push({ type: "results-head", key: "results-head", count: results.length });
    if (!results.length) rows.push({ type: "empty", key: "empty" });
    for (const { concept, module } of results) {
      rows.push({ type: "concept", key: `r-${module.id}-${conceptKey(concept)}`, concept, module });
    }
    return rows;
  }

  modules.forEach((module, index) => {
    const open = !collapsed.has(module.id);
    rows.push({ type: "module", key: `m-${module.id}`, module, index, open });
    if (!open) return;
    if (module.overview) rows.push({ type: "overview", key: `o-${module.id}`, module, spec: module.overview });
    for (const concept of module.concepts) {
      rows.push({ type: "concept", key: `c-${conceptKey(concept)}`, concept, module });
    }
  });
  rows.push({ type: "footer", key: "footer" });
  return rows;
}

export interface DeepLinkTarget {
  moduleId: string;
  rowKey: string;
}

/**
 * Same reach as the web's getElementById on /learn#<id>: a module id, a
 * concept id, or an id-less concept's title slug (its card's anchor).
 */
export function resolveTarget(modules: Module[], id: string): DeepLinkTarget | null {
  for (const m of modules) {
    if (m.id === id) return { moduleId: m.id, rowKey: `m-${m.id}` };
    for (const c of m.concepts) {
      if (c.id === id || conceptKey(c) === id) return { moduleId: m.id, rowKey: `c-${conceptKey(c)}` };
    }
  }
  return null;
}

export function withOpen(collapsed: ReadonlySet<string>, id: string): ReadonlySet<string> {
  if (!collapsed.has(id)) return collapsed;
  const next = new Set(collapsed);
  next.delete(id);
  return next;
}

export function toggledSet(set: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}
```

- [ ] **Step 5: Implement `src/features/learn/LearnHeader.tsx`**

```tsx
/**
 * The top of the Learn list: hero + progress (scrolls away), and the sticky
 * controls row — module pills ABOVE the search, because the modules are the
 * order the page is meant to be walked and search is the shortcut.
 */
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/ui";
import type { Module } from "@/shared/learn";
import { V } from "@/shared/learnVisuals";
import { pct } from "./visuals";

export function LearnHero({ doneCount, total, onReset }: { doneCount: number; total: number; onReset: () => void }) {
  const share = Math.min(100, Math.round((doneCount / total) * 100));
  return (
    <View className="mb-7 px-4 pt-6">
      <AppText className="mb-3 font-mono text-[10px] uppercase tracking-[2px] text-white/30">
        EGX Analytics · Learn
      </AppText>
      <AppText accessibilityRole="header" className="font-sans-bold text-[26px] leading-[30px] text-white">
        {"Learn the EGX,\n"}
        <AppText className="font-sans-bold text-[26px] leading-[30px] text-accent">one idea at a time.</AppText>
      </AppText>
      <AppText className="mt-3 text-[13px] leading-[21px] text-white/45">
        Every number this app shows you, explained — with the diagram, the worked example in EGP, and the honest
        limits. Nine modules, in the order you actually need them.
      </AppText>
      <View className="mt-5">
        <View className="mb-1.5 flex-row items-baseline justify-between gap-3">
          <AppText className="font-mono text-[10px] uppercase tracking-[1.5px] text-white/35">
            {`${doneCount} of ${total} read`}
          </AppText>
          {doneCount > 0 ? (
            <Pressable
              onPress={onReset}
              accessibilityRole="button"
              accessibilityLabel="Reset reading progress"
              hitSlop={16}
            >
              <AppText className="font-mono text-[10px] uppercase tracking-[0.5px] text-white/25">reset</AppText>
            </Pressable>
          ) : null}
        </View>
        <View className="h-1 overflow-hidden rounded-full bg-white/[0.07]">
          <View className="h-full rounded-full bg-accent" style={{ width: pct(share) }} />
        </View>
      </View>
    </View>
  );
}

/**
 * Nine pills, about three visible: the strip follows the active module by
 * scrolling ITSELF (never the page) so the highlight stays on screen.
 */
export function ModulePills({
  modules,
  active,
  onJump,
  reduceMotion,
}: {
  modules: Module[];
  active: string;
  onJump: (moduleId: string) => void;
  reduceMotion: boolean;
}) {
  const ref = useRef<ScrollView>(null);
  const layouts = useRef(new Map<string, { x: number; width: number }>());
  const strip = useRef({ width: 0, content: 0, offset: 0 });

  useEffect(() => {
    const pill = layouts.current.get(active);
    const { width, content, offset } = strip.current;
    if (!pill || !width) return;
    const target = pill.x - (width - pill.width) / 2;
    const x = Math.max(0, Math.min(target, content - width));
    if (Math.abs(x - offset) < 4) return;
    ref.current?.scrollTo({ x, animated: !reduceMotion });
  }, [active, reduceMotion]);

  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      onLayout={(e) => {
        strip.current.width = e.nativeEvent.layout.width;
      }}
      onContentSizeChange={(w) => {
        strip.current.content = w;
      }}
      onScroll={(e) => {
        strip.current.offset = e.nativeEvent.contentOffset.x;
      }}
      scrollEventThrottle={64}
      style={{ marginHorizontal: -16, marginBottom: 10 }}
      contentContainerStyle={{ gap: 6, paddingHorizontal: 16 }}
    >
      {modules.map((m, i) => {
        const on = m.id === active;
        const ink = on ? m.hue : "rgba(255,255,255,0.5)";
        return (
          <Pressable
            key={m.id}
            onPress={() => onJump(m.id)}
            onLayout={(e) =>
              layouts.current.set(m.id, { x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width })
            }
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`Module ${i + 1}: ${m.title}`}
            className="min-h-[44px] flex-row items-center gap-1.5 rounded-full border px-3"
            style={{
              borderColor: on ? m.hue : "rgba(255,255,255,0.08)",
              backgroundColor: on ? `${m.hue}1f` : "transparent",
            }}
          >
            <AppText className="font-mono text-[9px]" style={{ color: ink, opacity: 0.6 }}>
              {String(i + 1).padStart(2, "0")}
            </AppText>
            <AppText className="font-sans-medium text-[11px]" style={{ color: ink }}>
              {m.title}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Command-bar search: the live match count sits in the field, where feedback belongs. */
export function SearchField({
  query,
  onChange,
  count,
}: {
  query: string;
  onChange: (q: string) => void;
  count: number | null;
}) {
  const [focused, setFocused] = useState(false);
  const ref = useRef<TextInput>(null);
  return (
    <View
      className="relative justify-center rounded-xl border"
      style={{
        borderColor: focused ? `${V.accent}73` : "rgba(255,255,255,0.08)",
        backgroundColor: focused ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.03)",
      }}
    >
      <View pointerEvents="none" className="absolute left-3.5">
        <Ionicons name="search" size={16} color={focused ? V.accent : "rgba(255,255,255,0.3)"} />
      </View>
      <TextInput
        ref={ref}
        value={query}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search concepts"
        placeholderTextColor="rgba(255,255,255,0.25)"
        accessibilityLabel="Search all concepts"
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        className="min-h-[48px] pl-10 pr-24 font-sans text-[16px] text-white"
      />
      <View className="absolute right-2 flex-row items-center gap-1">
        {count !== null ? (
          <AppText
            accessibilityLiveRegion="polite"
            className="font-mono text-[11px]"
            style={{ color: count ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.25)" }}
          >
            {String(count)}
          </AppText>
        ) : null}
        {query ? (
          <Pressable
            onPress={() => {
              onChange("");
              ref.current?.focus();
            }}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            className="h-11 w-11 items-center justify-center rounded-lg"
          >
            <Ionicons name="close" size={16} color="rgba(255,255,255,0.35)" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** The sticky row. Opaque: React Native has no backdrop-blur. */
export function LearnControls({
  modules,
  activeModule,
  onJump,
  reduceMotion,
  query,
  onQuery,
  count,
  onHeight,
}: {
  modules: Module[];
  activeModule: string;
  onJump: (moduleId: string) => void;
  reduceMotion: boolean;
  query: string;
  onQuery: (q: string) => void;
  count: number | null;
  onHeight: (h: number) => void;
}) {
  return (
    <View className="mb-5 bg-charcoal-dark px-4 py-3" onLayout={(e) => onHeight(e.nativeEvent.layout.height)}>
      {count === null ? (
        <ModulePills modules={modules} active={activeModule} onJump={onJump} reduceMotion={reduceMotion} />
      ) : null}
      <SearchField query={query} onChange={onQuery} count={count} />
    </View>
  );
}
```

- [ ] **Step 6: Implement `src/features/learn/ModuleHeader.tsx`**

```tsx
/**
 * A module's header — the web's <details><summary>. Tapping collapses or
 * reopens the module. The id is the OLD section anchor (Task 9 deep-links it).
 */
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/ui";
import { COLORS } from "@/shared/theme";
import type { Module } from "@/shared/learn";
import { FlashRing } from "./ConceptCard";

export function ModuleHeader({
  module: m,
  index,
  done,
  open,
  onToggle,
  flash,
  reduceMotion,
}: {
  module: Module;
  index: number;
  done: number;
  open: boolean;
  onToggle: (moduleId: string) => void;
  flash: number;
  reduceMotion: boolean;
}) {
  const total = m.concepts.length;
  const complete = total > 0 && done === total;
  return (
    <View className={`px-4 ${index === 0 ? "" : "pt-5"}`}>
      <Pressable
        testID={`module-${m.id}`}
        onPress={() => onToggle(m.id)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${m.title}, module ${index + 1}, ${done} of ${total} read`}
        className="relative mb-4 flex-row items-start gap-3 rounded-lg"
      >
        <View
          className="mt-0.5 h-8 w-8 items-center justify-center rounded-lg"
          style={{
            backgroundColor: complete ? m.hue : `${m.hue}24`,
            borderWidth: 1,
            borderColor: `${m.hue}57`,
          }}
        >
          <AppText className="font-mono-semibold text-[12px]" style={{ color: complete ? COLORS["charcoal-dark"] : m.hue }}>
            {String(index + 1).padStart(2, "0")}
          </AppText>
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-2">
            <AppText accessibilityRole="header" className="font-sans-bold text-[17px] leading-[21px] text-white">
              {m.title}
            </AppText>
            <Ionicons
              name="chevron-down"
              size={12}
              color="rgba(255,255,255,0.3)"
              style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}
            />
          </View>
          <AppText className="mt-0.5 text-[12px] leading-[16px] text-white/40">{m.goal}</AppText>
          <AppText className="mt-1 font-mono text-[9px] uppercase tracking-[1.5px] text-white/25">
            {`${done} of ${total} read`}
          </AppText>
        </View>
        {flash && !reduceMotion ? <FlashRing key={flash} radius={8} /> : null}
      </Pressable>
    </View>
  );
}
```

- [ ] **Step 7: Implement `src/features/learn/LearnScreen.tsx`**

```tsx
/**
 * The Learn path: hero, sticky module pills + search, nine collapsible
 * modules, back-to-top. One virtualised FlatList — 70 cards with diagrams
 * is too much to mount at once on a phone.
 *
 * - LiveCharts are armed by viewability (a row is "seen" once on screen).
 * - The active pill follows the first visible module-bearing row.
 * - Deep links (`concept` prop) are handled in Task 9.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  View,
  useWindowDimensions,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText, Screen } from "@/ui";
import { ALL_CONCEPTS, CURRICULUM, TOTAL_CONCEPTS } from "@/shared/curriculum";
import { conceptKey, searchConcepts, type Module } from "@/shared/learn";
import { ConceptCard } from "./ConceptCard";
import { LearnControls, LearnHero } from "./LearnHeader";
import { LearnVisual } from "./LearnVisual";
import { ModuleHeader } from "./ModuleHeader";
import { useLearnProgress } from "./progress";
import { CONTROLS_INDEX, buildRows, toggledSet, type LearnRow } from "./rows";
import { useReduceMotion } from "./useReduceMotion";

const STICKY = [CONTROLS_INDEX];
const VIEWABILITY = { itemVisiblePercentThreshold: 1 };

export interface LearnScreenProps {
  /** A module id, concept id or title slug to open, scroll to and flash. */
  concept?: string;
  /** Called once the param has been consumed, so the same link works again. */
  onConceptHandled?: () => void;
}

export function LearnScreen({ concept, onConceptHandled }: LearnScreenProps) {
  const { read, toggle, reset, hydrated } = useLearnProgress();
  const reduceMotion = useReduceMotion();
  const { height: viewportH } = useWindowDimensions();

  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());
  const [activeModule, setActiveModule] = useState(CURRICULUM[0].id);
  const [seen, setSeen] = useState<ReadonlySet<string>>(() => new Set());
  const [showTop, setShowTop] = useState(false);

  const listRef = useRef<FlatList<LearnRow>>(null);
  const controlsH = useRef(120);
  const showTopRef = useRef(false);

  const results = useMemo(() => searchConcepts(ALL_CONCEPTS, query), [query]);
  const rows = useMemo(() => buildRows({ modules: CURRICULUM, collapsed, results }), [collapsed, results]);
  const doneCount = hydrated ? read.size : 0;

  // ---- deep links + pill jumps: filled in by Task 9
  const flashFor = (rowKey: string): number => {
    void rowKey;
    return 0;
  };
  const jumpToModule = useCallback((moduleId: string) => {
    setQuery("");
    const index = buildRows({ modules: CURRICULUM, collapsed, results: null }).findIndex(
      (r) => r.key === `m-${moduleId}`
    );
    if (index >= 0) listRef.current?.scrollToIndex({ index, animated: !reduceMotion, viewOffset: controlsH.current });
  }, [collapsed, reduceMotion]);
  void concept;
  void onConceptHandled;

  const toggleModule = useCallback((id: string) => setCollapsed((prev) => toggledSet(prev, id)), []);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken<LearnRow>[] }) => {
    const keys = viewableItems.flatMap((t) => (t.item ? [t.item.key] : []));
    setSeen((prev) => (keys.every((k) => prev.has(k)) ? prev : new Set([...prev, ...keys])));
    const first = viewableItems.find((t) => t.item && "module" in t.item);
    if (first?.item && "module" in first.item) setActiveModule(first.item.module.id);
  }, []);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = e.nativeEvent.contentOffset.y > viewportH;
      if (next !== showTopRef.current) {
        showTopRef.current = next;
        setShowTop(next);
      }
    },
    [viewportH]
  );

  const doneIn = (m: Module) => m.concepts.filter((c) => read.has(conceptKey(c))).length;

  const renderItem = ({ item }: ListRenderItemInfo<LearnRow>) => {
    switch (item.type) {
      case "hero":
        return <LearnHero doneCount={doneCount} total={TOTAL_CONCEPTS} onReset={reset} />;
      case "controls":
        return (
          <LearnControls
            modules={CURRICULUM}
            activeModule={activeModule}
            onJump={jumpToModule}
            reduceMotion={reduceMotion}
            query={query}
            onQuery={setQuery}
            count={results ? results.length : null}
            onHeight={(h) => {
              controlsH.current = h;
            }}
          />
        );
      case "module":
        return (
          <ModuleHeader
            module={item.module}
            index={item.index}
            done={doneIn(item.module)}
            open={item.open}
            onToggle={toggleModule}
            flash={flashFor(item.key)}
            reduceMotion={reduceMotion}
          />
        );
      case "overview":
        return (
          <View className="mb-4 px-4">
            <LearnVisual spec={item.spec} armed={seen.has(item.key)} />
          </View>
        );
      case "concept":
        return (
          <View className="mb-3 px-4">
            <ConceptCard
              concept={item.concept}
              hue={item.module.hue}
              read={read.has(conceptKey(item.concept))}
              onToggle={toggle}
              armed={seen.has(item.key)}
              flash={flashFor(item.key)}
              reduceMotion={reduceMotion}
            />
          </View>
        );
      case "results-head":
        return (
          <AppText className="mb-4 px-4 font-mono text-[10px] uppercase tracking-[1.5px] text-white/35">
            {`${item.count} ${item.count === 1 ? "concept" : "concepts"} match “${query.trim()}”`}
          </AppText>
        );
      case "empty":
        return (
          <View className="mx-4 items-center rounded-xl border border-white/[0.06] bg-white/[0.02] p-8">
            <AppText className="text-sm text-white/60">Nothing matches that yet.</AppText>
            <AppText className="mt-1.5 text-center text-[12px] text-white/35">
              Try a shorter word — “stop”, “volume”, “tax”, “EGX30”.
            </AppText>
          </View>
        );
      case "footer":
        return (
          <AppText className="mx-4 mt-10 border-t border-white/[0.06] pt-5 text-[11px] leading-[18px] text-white/30">
            Nothing here is investment advice. The composite score is an educational tool built from price data — it
            does not predict where a stock goes next, and it knows nothing about a company&apos;s earnings quality,
            debt, or the news. Decide with your own money in mind.
          </AppText>
        );
    }
  };

  return (
    <Screen scroll={false}>
      <View className="flex-1">
        <FlatList
          ref={listRef}
          data={rows}
          keyExtractor={(r) => r.key}
          renderItem={renderItem}
          extraData={{ read, seen, activeModule, query, doneCount, reduceMotion }}
          stickyHeaderIndices={STICKY}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={VIEWABILITY}
          onScroll={onScroll}
          scrollEventThrottle={32}
          initialNumToRender={8}
          maxToRenderPerBatch={6}
          windowSize={9}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: 64 }}
        />
        {showTop ? (
          <Pressable
            onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: !reduceMotion })}
            accessibilityRole="button"
            accessibilityLabel="Back to top"
            className="absolute bottom-4 right-4 h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-charcoal/90"
          >
            <Ionicons name="arrow-up" size={20} color="rgba(255,255,255,0.6)" />
          </Pressable>
        ) : null}
      </View>
    </Screen>
  );
}
```

`&apos;` inside an RN `<Text>` child is JSX and decodes to `'` — React handles the entity in JSX text, not HTML.

- [ ] **Step 8: Replace the route shell `src/app/(tabs)/learn.tsx`**

```tsx
import { LearnScreen } from "@/features/learn/LearnScreen";

export default function LearnRoute() {
  return <LearnScreen />;
}
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `npx jest src/features/learn`
Expected: PASS (all Learn suites).

- [ ] **Step 10: Verify and commit**

Run: `npm run verify` — Expected: exits 0.
```bash
git add src/features/learn/rows.ts src/features/learn/LearnHeader.tsx src/features/learn/ModuleHeader.tsx \
  src/features/learn/LearnScreen.tsx src/test-utils/renderScreen.tsx "src/app/(tabs)/learn.tsx" \
  src/features/learn/__tests__/rows.test.ts src/features/learn/__tests__/LearnScreen.test.tsx
git commit -m "$(cat <<'EOF'
feat(learn): Learn screen — virtualised path, sticky search, modules

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XDkAB7UCK8WyT267W5ZxNV
EOF
)"
```

---

## Task 9: Mobile — `concept` deep links (scroll + open + flash)

**Files:**
- Modify: `src/features/learn/LearnScreen.tsx`, `src/app/(tabs)/learn.tsx`
- Test: `src/features/learn/__tests__/LearnDeepLink.test.tsx`

**Interfaces:**
- Consumes: `resolveTarget`, `withOpen` (Task 8), `FLASH_MS` (Task 7); `useLocalSearchParams`, `router` from `expo-router`.
- Produces: `LearnScreen` honours `concept` (module id, concept id or title slug): clears search, reopens the module, `scrollToIndex` with `viewOffset` = sticky row height, flashes the row for `FLASH_MS`, then calls `onConceptHandled`. The route clears the param (`router.setParams({ concept: undefined })`) so the same link works twice. Pills reuse the same jump without a flash.

The web does this in a `hashchange` effect. Here the prop→state sync uses React's "adjust state when a prop changes" render-phase pattern (no synchronous `setState` inside an effect), and the only side effect (clearing the route param) runs in an effect.

- [ ] **Step 1: Write the failing tests**

`src/features/learn/__tests__/LearnDeepLink.test.tsx`:
```tsx
import { FlatList } from "react-native";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { CURRICULUM } from "@/shared/curriculum";
import { renderScreen } from "@/test-utils/renderScreen";
import { FLASH_MS } from "../ConceptCard";
import { LearnScreen } from "../LearnScreen";
import { buildRows } from "../rows";

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));
jest.mock("@react-native-community/slider", () => {
  const { View } = jest.requireActual("react-native");
  return { __esModule: true, default: (props: object) => <View {...props} /> };
});
jest.mock("@/shared/api", () => ({ fetchAnalysis: jest.fn(() => new Promise(() => {})) }));

const indexOf = (key: string) =>
  buildRows({ modules: CURRICULUM, collapsed: new Set(), results: null }).findIndex((r) => r.key === key);

let scrollSpy: jest.SpyInstance;
beforeEach(() => {
  jest.useFakeTimers();
  scrollSpy = jest.spyOn(FlatList.prototype, "scrollToIndex").mockImplementation(() => {});
});
afterEach(() => {
  scrollSpy.mockRestore();
  jest.useRealTimers();
});

async function flushFrames() {
  await act(async () => {
    jest.advanceTimersByTime(50);
  });
}

describe("Learn deep links", () => {
  it("scrolls to a concept in the last module and reports it handled", async () => {
    const handled = jest.fn();
    await renderScreen(<LearnScreen concept="dividend_yield" onConceptHandled={handled} />);
    await flushFrames();
    expect(scrollSpy).toHaveBeenCalledWith(expect.objectContaining({ index: indexOf("c-dividend_yield") }));
    expect(handled).toHaveBeenCalledTimes(1);
  });

  it("scrolls to a MODULE id (risk-management)", async () => {
    await renderScreen(<LearnScreen concept="risk-management" />);
    await flushFrames();
    expect(scrollSpy).toHaveBeenCalledWith(expect.objectContaining({ index: indexOf("m-risk-management") }));
  });

  it("clears an active search and reopens a collapsed module", async () => {
    const view = await renderScreen(<LearnScreen />);
    await fireEvent.press(screen.getByTestId("module-market-basics"));
    expect(screen.queryByText("What is a Stock?")).toBeNull();
    await fireEvent.changeText(screen.getByLabelText("Search all concepts"), "volume");
    await view.rerender(<LearnScreen concept="what-is-a-stock" />);
    await flushFrames();
    expect(screen.getByLabelText("Search all concepts").props.value).toBe("");
    expect(screen.getByText("What is a Stock?")).toBeTruthy();
  });

  it("flashes the target, then stops", async () => {
    await renderScreen(<LearnScreen concept="what-is-a-stock" />);
    await flushFrames();
    expect(screen.getByTestId("learn-flash")).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(FLASH_MS + 50);
    });
    expect(screen.queryByTestId("learn-flash")).toBeNull();
  });

  it("the same concept twice scrolls twice", async () => {
    const view = await renderScreen(<LearnScreen concept="rsi" />);
    await flushFrames();
    await view.rerender(<LearnScreen concept={undefined} />);
    await view.rerender(<LearnScreen concept="rsi" />);
    await flushFrames();
    const calls = scrollSpy.mock.calls.filter(([arg]) => arg.index === indexOf("c-rsi"));
    expect(calls).toHaveLength(2);
  });

  it("ignores an id it does not know, without crashing", async () => {
    const handled = jest.fn();
    await renderScreen(<LearnScreen concept="from_a_newer_backend" onConceptHandled={handled} />);
    await flushFrames();
    expect(scrollSpy).not.toHaveBeenCalled();
    expect(handled).toHaveBeenCalledTimes(1);
    expect(screen.getByText("What is a Stock?")).toBeTruthy();
  });

  it("a module pill jumps without flashing", async () => {
    await renderScreen(<LearnScreen />);
    await fireEvent.press(screen.getByLabelText(/^Module 7: /));
    await flushFrames();
    expect(scrollSpy).toHaveBeenCalledWith(expect.objectContaining({ index: indexOf(`m-${CURRICULUM[6].id}`) }));
    expect(screen.queryByTestId("learn-flash")).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx jest src/features/learn/__tests__/LearnDeepLink.test.tsx`
Expected: FAIL — no scroll for `concept`, `onConceptHandled` never called, no flash.

- [ ] **Step 3: Implement the deep-link state in `LearnScreen.tsx`**

1. Add to the imports:
```tsx
import { useEffect } from "react";
import { FLASH_MS } from "./ConceptCard";
import { resolveTarget, withOpen } from "./rows";
```
(merge `useEffect` into the existing `react` import and the `rows` names into the existing `./rows` import).

2. Replace the placeholder block that starts with `// ---- deep links + pill jumps: filled in by Task 9` and ends with `void onConceptHandled;` with:
```tsx
  // ---- deep links + pill jumps
  // `jump` is the one source of scroll intent. `n` increases on every jump,
  // so jumping to the same row twice is still a new jump.
  const [jump, setJump] = useState<{ key: string; n: number; flash: boolean } | null>(null);
  const [flashEnded, setFlashEnded] = useState(0);
  const scrolledN = useRef(0);
  const retries = useRef(0);

  // Prop → state, in render (React's documented pattern for "adjust state
  // when a prop changes"): no synchronous setState inside an effect.
  const [lastConcept, setLastConcept] = useState<string | undefined>(undefined);
  if (concept !== lastConcept) {
    setLastConcept(concept);
    const target = concept ? resolveTarget(CURRICULUM, concept) : null;
    if (target) {
      setQuery("");
      setCollapsed((prev) => withOpen(prev, target.moduleId));
      setJump((prev) => ({ key: target.rowKey, n: (prev?.n ?? 0) + 1, flash: true }));
    }
  }

  // Tell the route the param is consumed, so it can clear it and the same
  // link works again. A ref keeps an inline callback from re-firing this.
  const handledRef = useRef(onConceptHandled);
  useEffect(() => {
    handledRef.current = onConceptHandled;
  }, [onConceptHandled]);
  useEffect(() => {
    if (concept) handledRef.current?.();
  }, [concept]);

  // Scroll once per jump, after the rows that contain the target exist.
  useEffect(() => {
    if (!jump || jump.n === scrolledN.current) return;
    const index = rows.findIndex((r) => r.key === jump.key);
    if (index < 0) return;
    scrolledN.current = jump.n;
    retries.current = 0;
    requestAnimationFrame(() =>
      listRef.current?.scrollToIndex({ index, animated: !reduceMotion, viewOffset: controlsH.current })
    );
  }, [jump, rows, reduceMotion]);

  // The flash ends after FLASH_MS (the ring also fades itself out).
  useEffect(() => {
    if (!jump?.flash) return;
    const t = setTimeout(() => setFlashEnded(jump.n), FLASH_MS);
    return () => clearTimeout(t);
  }, [jump]);

  const flashFor = (rowKey: string) =>
    jump && jump.flash && jump.key === rowKey && jump.n !== flashEnded ? jump.n : 0;

  const jumpToModule = useCallback((moduleId: string) => {
    setQuery("");
    setJump((prev) => ({ key: `m-${moduleId}`, n: (prev?.n ?? 0) + 1, flash: false }));
  }, []);

  // Rows far below the rendered window have no measured offset yet: jump
  // near it by the average row height, then retry (bounded).
  const onScrollToIndexFailed = useCallback(
    (info: { index: number; averageItemLength: number }) => {
      if (retries.current >= 3) return;
      retries.current += 1;
      listRef.current?.scrollToOffset({
        offset: Math.max(0, info.averageItemLength * info.index - controlsH.current),
        animated: false,
      });
      setTimeout(
        () =>
          listRef.current?.scrollToIndex({
            index: info.index,
            animated: !reduceMotion,
            viewOffset: controlsH.current,
          }),
        100
      );
    },
    [reduceMotion]
  );
```

3. In the `<FlatList …>` props add `onScrollToIndexFailed={onScrollToIndexFailed}` and extend `extraData` to `{ read, seen, activeModule, query, doneCount, reduceMotion, jump, flashEnded }`.

- [ ] **Step 4: Wire the route `src/app/(tabs)/learn.tsx`**

```tsx
import { router, useLocalSearchParams } from "expo-router";
import { LearnScreen } from "@/features/learn/LearnScreen";

/**
 * /learn?concept=<id> — the mobile spelling of the web's /learn#<id>
 * (`learnHref(id)` builds it). The param is cleared once handled so tapping
 * the same "Learn more" link again scrolls again.
 */
export default function LearnRoute() {
  const params = useLocalSearchParams<{ concept?: string | string[] }>();
  const concept = Array.isArray(params.concept) ? params.concept[0] : params.concept;
  return (
    <LearnScreen
      concept={concept || undefined}
      onConceptHandled={() => router.setParams({ concept: undefined })}
    />
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest src/features/learn`
Expected: PASS (Task 8's suites still pass, the new deep-link suite passes).

- [ ] **Step 6: Verify and commit**

Run: `npm run verify` — Expected: exits 0.
```bash
git add src/features/learn/LearnScreen.tsx "src/app/(tabs)/learn.tsx" src/features/learn/__tests__/LearnDeepLink.test.tsx
git commit -m "$(cat <<'EOF'
feat(learn): concept deep links scroll, reopen and flash like the web hash router

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XDkAB7UCK8WyT267W5ZxNV
EOF
)"
```

---

## Task 10: Mobile — Calibration screen ("Checking our work")

**Files:**
- Create: `src/features/calibration/CalibrationScreen.tsx`
- Modify: `src/app/calibration.tsx` (replace Plan 1's shell)
- Test: `src/features/calibration/__tests__/CalibrationScreen.test.tsx`

**Interfaces:**
- Consumes: `fetchCalibration(): Promise<CalibrationResponse>` and `CalibrationResponse` from `@/shared/api`; `learnHref` from `@/lib/links`; `Screen`, `AppText`, `CardSkeleton`, `ErrorState` from `@/ui`; `router` from `expo-router`.
- Produces: `CalibrationScreen()`.

The page's two rules carry over: width ships beside coverage (coverage alone is gameable), and the failures sit on the same screen as the successes. A Retry button is added to the error state (rendering, not a rule change).

- [ ] **Step 1: Write the failing test**

`src/features/calibration/__tests__/CalibrationScreen.test.tsx`:
```tsx
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { fetchCalibration, type CalibrationResponse } from "@/shared/api";
import { learnHref } from "@/lib/links";
import { renderScreen } from "@/test-utils/renderScreen";
import { CalibrationScreen } from "../CalibrationScreen";

jest.mock("@/shared/api", () => ({ fetchCalibration: jest.fn() }));
jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
const fetchMock = fetchCalibration as jest.MockedFunction<typeof fetchCalibration>;

const DATA: CalibrationResponse = {
  forecast: {
    fitted_at: "2026-09-30",
    n_observations: 41234,
    universe: "EGX30 + EGX70",
    bands: [{ claim: "90% range, 60 days", promised_pct: 90, delivered_pct: 89, note: "Close enough." }],
    sharpness: { median_width_pct_of_spot: 88, p25: 72, p75: 110, note: "Wide on purpose." },
    z_table: {},
  },
  risk_grade: {
    fitted_at: "2026-09-30",
    n_observations: 9000,
    claims: [{ claim: "Orders future volatility", ic: 0.41, t_non_overlapping: 6.2, verdict: "holds" }],
  },
  what_failed: [{ claim: "Composite ranks stocks", measured: "IC ≈ 0", outcome: "Retracted." }],
};

beforeEach(() => fetchMock.mockReset());

describe("CalibrationScreen", () => {
  it("shows promised vs delivered, the band width, and what failed", async () => {
    fetchMock.mockResolvedValue(DATA);
    await renderScreen(<CalibrationScreen />);
    await waitFor(() => expect(screen.getByText("Checking our work")).toBeTruthy());
    expect(screen.getByText("said 90%")).toBeTruthy();
    expect(screen.getByText("was 89%")).toBeTruthy();
    expect(screen.getByText("88% of the share price")).toBeTruthy();
    expect(screen.getByText("0.41")).toBeTruthy();
    expect(screen.getByText("What we tested and dropped")).toBeTruthy();
    expect(screen.getByText("Composite ranks stocks")).toBeTruthy();
    expect(screen.getByText((41234).toLocaleString())).toBeTruthy();
  });

  it("links to the risk-management module", async () => {
    fetchMock.mockResolvedValue(DATA);
    await renderScreen(<CalibrationScreen />);
    await waitFor(() => expect(screen.getByText("Learn how to read these →")).toBeTruthy());
    await fireEvent.press(screen.getByText("Learn how to read these →"));
    expect(router.push).toHaveBeenCalledWith(learnHref("risk-management"));
  });

  it("says it could not load, and retries on request", async () => {
    fetchMock.mockRejectedValueOnce(new Error("500")).mockResolvedValueOnce(DATA);
    await renderScreen(<CalibrationScreen />);
    await waitFor(() => expect(screen.getByText("Could not load the accuracy record.")).toBeTruthy());
    await fireEvent.press(screen.getByText(/retry/i));
    await waitFor(() => expect(screen.getByText("Checking our work")).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
```

(If Plan 1's `ErrorState` labels its button differently than "Retry", adjust only the `/retry/i` matcher.)

- [ ] **Step 2: Run to verify failure**

Run: `npx jest src/features/calibration`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/features/calibration/CalibrationScreen.tsx`**

```tsx
/**
 * "Checking our work" — the app's own accuracy record (/api/calibration).
 *
 *  1. COVERAGE ALONE IS GAMEABLE: the band's width ships beside its hit
 *     rate, and the copy admits it is wide.
 *  2. THE FAILURES ARE ON THE SAME SCREEN AS THE SUCCESSES: a record that
 *     only lists what worked is marketing.
 */
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { AppText, CardSkeleton, ErrorState, Screen } from "@/ui";
import { fetchCalibration, type CalibrationResponse } from "@/shared/api";
import { learnHref } from "@/lib/links";

export function CalibrationScreen() {
  const [data, setData] = useState<CalibrationResponse | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    fetchCalibration()
      .then((d) => {
        if (alive) setData(d);
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  if (error) {
    return (
      <Screen>
        <ErrorState
          message="Could not load the accuracy record."
          onRetry={() => {
            setError(false);
            setAttempt((a) => a + 1);
          }}
        />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen>
        <View className="gap-4 px-4 py-8">
          <CardSkeleton />
          <CardSkeleton />
        </View>
      </Screen>
    );
  }

  const { forecast, risk_grade, what_failed } = data;

  return (
    <Screen scroll>
      <View className="px-4 pb-24 pt-8">
        <AppText accessibilityRole="header" className="font-sans-bold text-xl text-white">
          Checking our work
        </AppText>
        <AppText className="mt-2 text-sm leading-[22px] text-white/60">
          {"When this app says a range holds 9 times in 10, did it? Every number below was measured on "}
          <AppText className="font-mono text-sm text-white/80">{forecast.n_observations.toLocaleString()}</AppText>
          {" past checks against real Egyptian market history, and every one of them is re-runnable."}
        </AppText>

        <View className="mt-6 rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <AppText className="font-sans-semibold text-sm text-white">Ranges: what we promised vs what happened</AppText>
          <View className="mt-3 gap-2">
            {forecast.bands.map((b) => {
              const close = Math.abs(b.delivered_pct - b.promised_pct) <= 2;
              return (
                <View key={b.claim} className="rounded-lg bg-white/[0.03] p-3">
                  <View className="flex-row items-baseline justify-between gap-3">
                    <AppText className="flex-1 text-xs text-white/70">{b.claim}</AppText>
                    <View className="flex-row items-baseline">
                      <AppText className="font-mono text-xs text-white/40">{`said ${b.promised_pct}%`}</AppText>
                      <AppText className="mx-1.5 font-mono text-xs text-white/25">→</AppText>
                      <AppText className={`font-mono text-xs ${close ? "text-white" : "text-white/70"}`}>
                        {`was ${b.delivered_pct}%`}
                      </AppText>
                    </View>
                  </View>
                  {b.note ? (
                    <AppText className="mt-1 text-[10px] leading-[16px] text-white/30">{b.note}</AppText>
                  ) : null}
                </View>
              );
            })}
          </View>

          <View className="mt-4 rounded-lg border border-white/5 bg-white/[0.02] p-3">
            <AppText className="font-sans-medium text-[11px] text-white/60">
              {"How wide is that range? "}
              <AppText className="font-mono text-[11px] text-white/80">
                {`${forecast.sharpness.median_width_pct_of_spot}% of the share price`}
              </AppText>
            </AppText>
            <AppText className="mt-1 text-[10px] leading-[16px] text-white/35">
              {`${forecast.sharpness.note} Half the time the 3-month range is wider than ${forecast.sharpness.p25}% and narrower than ${forecast.sharpness.p75}% of today's price. That is a wide range, and it is meant to be — the market genuinely is that uncertain over three months.`}
            </AppText>
          </View>
        </View>

        <View className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <AppText className="font-sans-semibold text-sm text-white">Risk grade: how well it ordered stocks</AppText>
          <View className="mt-3 gap-2">
            {risk_grade.claims.map((c) => (
              <View key={c.claim} className="flex-row items-baseline justify-between gap-3 rounded-lg bg-white/[0.03] p-3">
                <AppText className="flex-1 text-xs text-white/70">{c.claim}</AppText>
                <View className="flex-row items-baseline gap-1">
                  <AppText className="font-mono text-xs text-white/80">{c.ic.toFixed(2)}</AppText>
                  <AppText className="font-mono text-xs text-white/35">{`(t ${c.t_non_overlapping})`}</AppText>
                </View>
              </View>
            ))}
          </View>
          <AppText className="mt-2 text-[10px] leading-[16px] text-white/30">
            A correlation of 0.03–0.05 counts as good in professional investing. These are far higher because how much
            a stock moves is genuinely predictable — unlike which way it moves.
          </AppText>
        </View>

        {/* Loss-tinted on purpose: this section IS the record of what failed. */}
        <View className="mt-4 rounded-xl border border-loss/10 bg-loss/[0.03] p-5">
          <AppText className="font-sans-semibold text-sm text-white">What we tested and dropped</AppText>
          <AppText className="mt-1 text-[11px] text-white/45">A record that only lists what worked is marketing.</AppText>
          <View className="mt-3 gap-3">
            {what_failed.map((f) => (
              <View key={f.claim} className="rounded-lg bg-white/[0.03] p-3">
                <AppText className="font-sans-medium text-xs text-white/70">{f.claim}</AppText>
                <AppText className="mt-1 font-mono text-[10px] text-white/40">{f.measured}</AppText>
                <AppText className="mt-1 text-[10px] leading-[16px] text-white/35">{f.outcome}</AppText>
              </View>
            ))}
          </View>
        </View>

        <AppText className="mt-6 text-[10px] leading-[16px] text-white/25">
          {`Measured ${forecast.fitted_at} on ${forecast.universe}.`}
        </AppText>
        <Pressable
          onPress={() => router.push(learnHref("risk-management"))}
          accessibilityRole="link"
          className="min-h-[44px] justify-center"
        >
          <AppText className="text-[11px] text-accent/60">Learn how to read these →</AppText>
        </Pressable>
      </View>
    </Screen>
  );
}
```

- [ ] **Step 4: Replace the route shell `src/app/calibration.tsx`**

```tsx
import { Stack } from "expo-router";
import { CalibrationScreen } from "@/features/calibration/CalibrationScreen";

export default function CalibrationRoute() {
  return (
    <>
      <Stack.Screen options={{ title: "Checking our work" }} />
      <CalibrationScreen />
    </>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx jest src/features/calibration`
Expected: PASS.

- [ ] **Step 6: Verify and commit**

Run: `npm run verify` — Expected: exits 0.
```bash
git add src/features/calibration src/app/calibration.tsx
git commit -m "$(cat <<'EOF'
feat(calibration): port the accuracy record screen

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XDkAB7UCK8WyT267W5ZxNV
EOF
)"
```

---

## Task 11: Mobile — admin building blocks (user cards, create sheet, password reveal)

**Files:**
- Create: `src/features/admin/credentials.ts`, `src/features/admin/UsersList.tsx`, `src/features/admin/CreateUserSheet.tsx`, `src/features/admin/PasswordRevealSheet.tsx`
- Modify: `src/lib/env.ts` (add `normalizeBaseUrl`, `feBaseUrl`), `.env.example`
- Test: `src/features/admin/__tests__/credentials.test.ts`, `src/features/admin/__tests__/UsersList.test.tsx`, `src/features/admin/__tests__/CreateUserSheet.test.tsx`, `src/features/admin/__tests__/PasswordRevealSheet.test.tsx`

**Interfaces:**
- Consumes: `ManagedUser` from `@/shared/api`; `Sheet`, `Button`, `TextField`, `AppText`, `confirm` from `@/ui` (assumption A5); `expo-clipboard` `setStringAsync`.
- Produces:
  - `buildCredentialMessage(appUrl: string, username: string, password: string): string`
  - `validateNewUser(username: string, ownPassword: boolean, password: string): string | null`
  - `formatAdded(raw: string): string`
  - `normalizeBaseUrl(raw: string | undefined): string`, `feBaseUrl(): string` in `@/lib/env`
  - `UsersList({ users, busyId, currentUserId, onResetPassword, onToggleActive, onDelete })`
  - `CreateUserSheet({ onCreate(username, password?): Promise<void>; onClose(): void })` — mounted only while open (so its state resets each time, like the web modal).
  - `PasswordRevealSheet({ username, password, appUrl, onClose })`

- [ ] **Step 1: Install the clipboard module**

Run: `npx expo install expo-clipboard`
Expected: added to `dependencies`.

- [ ] **Step 2: Write the failing tests**

`src/features/admin/__tests__/credentials.test.ts`:
```ts
import { normalizeBaseUrl } from "@/lib/env";
import { buildCredentialMessage, formatAdded, validateNewUser } from "../credentials";

describe("buildCredentialMessage", () => {
  it("puts link, username and password on three lines", () => {
    expect(buildCredentialMessage("https://egx.example", "sara.b", "pw123")).toBe(
      "Link: https://egx.example\nUsername: sara.b\nPassword: pw123"
    );
  });
  it("omits the link line when no link is configured", () => {
    expect(buildCredentialMessage("", "sara.b", "pw123")).toBe("Username: sara.b\nPassword: pw123");
  });
});

describe("validateNewUser", () => {
  it("requires a username", () => expect(validateNewUser("  ", false, "")).toBe("Enter a username."));
  it("requires 8 characters when setting the password yourself", () =>
    expect(validateNewUser("sara", true, "short")).toBe("The password needs at least 8 characters."));
  it("accepts a generated-password request", () => expect(validateNewUser("sara", false, "")).toBeNull());
});

describe("normalizeBaseUrl", () => {
  it.each([
    [undefined, ""],
    ["", ""],
    ["  https://egx.example/// ", "https://egx.example"],
  ])("%p → %p", (raw, expected) => expect(normalizeBaseUrl(raw)).toBe(expected));
});

describe("formatAdded", () => {
  it("falls back to a dash for an unparseable date", () => expect(formatAdded("nope")).toBe("—"));
  it("formats a real date", () => expect(formatAdded("2026-10-01T10:00:00Z")).toMatch(/2026/));
});
```

`src/features/admin/__tests__/UsersList.test.tsx`:
```tsx
import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ManagedUser } from "@/shared/api";
import { UsersList } from "../UsersList";

const ME: ManagedUser = { id: "1", username: "mark", role: "admin", is_active: true, created_at: "2026-01-02T00:00:00Z", holdings_count: 3 };
const SARA: ManagedUser = { id: "2", username: "sara.b", role: "user", is_active: false, created_at: "2026-02-03T00:00:00Z", holdings_count: 1 };

function setup(busyId: string | null = null) {
  const handlers = { onResetPassword: jest.fn(), onToggleActive: jest.fn(), onDelete: jest.fn() };
  return { handlers, view: render(<UsersList users={[ME, SARA]} busyId={busyId} currentUserId="1" {...handlers} />) };
}

describe("UsersList", () => {
  it("shows role, status and holdings on each card", async () => {
    await setup().view;
    expect(screen.getByText("Admin")).toBeTruthy();
    expect(screen.getByText("Disabled")).toBeTruthy();
    expect(screen.getByText("1 holding")).toBeTruthy();
    expect(screen.getByText("3 holdings")).toBeTruthy();
  });

  it("expands a card to its actions", async () => {
    const { handlers, view } = setup();
    await view;
    await fireEvent.press(screen.getByLabelText("sara.b, show actions"));
    expect(screen.getByText(/^Added /)).toBeTruthy();
    await fireEvent.press(screen.getByText("Enable"));
    expect(handlers.onToggleActive).toHaveBeenCalledWith(SARA);
    await fireEvent.press(screen.getByText("Delete"));
    expect(handlers.onDelete).toHaveBeenCalledWith(SARA);
  });

  it("explains why you cannot disable or delete yourself", async () => {
    await setup().view;
    await fireEvent.press(screen.getByLabelText("mark, show actions"));
    expect(screen.getByText("This is you")).toBeTruthy();
    expect(screen.queryByText("Disable")).toBeNull();
    expect(screen.queryByText("Delete")).toBeNull();
    expect(screen.getByText("Reset password")).toBeTruthy();
  });

  it("says so when there are no users", async () => {
    await render(<UsersList users={[]} busyId={null} currentUserId="1" onResetPassword={jest.fn()} onToggleActive={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText("No users yet.")).toBeTruthy();
  });
});
```

`src/features/admin/__tests__/CreateUserSheet.test.tsx`:
```tsx
import { Pressable, View } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { CreateUserSheet } from "../CreateUserSheet";

jest.mock("@/ui", () => {
  const actual = jest.requireActual("@/ui");
  return {
    ...actual,
    Sheet: ({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) =>
      visible ? (
        <View>
          <Pressable accessibilityLabel="Dismiss sheet" onPress={onClose} />
          {children}
        </View>
      ) : null,
  };
});

describe("CreateUserSheet", () => {
  it("creates with a trimmed, lower-cased username and a generated password", async () => {
    const onCreate = jest.fn().mockResolvedValue(undefined);
    await render(<CreateUserSheet onCreate={onCreate} onClose={jest.fn()} />);
    expect(screen.getByText("A strong password will be generated and shown to you once.")).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Username"), "  Sara.B ");
    await fireEvent.press(screen.getByText("Create user"));
    expect(onCreate).toHaveBeenCalledWith("sara.b", undefined);
  });

  it("validates before calling the server", async () => {
    const onCreate = jest.fn();
    await render(<CreateUserSheet onCreate={onCreate} onClose={jest.fn()} />);
    await fireEvent.press(screen.getByText("Create user"));
    expect(screen.getByText("Enter a username.")).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Username"), "sara");
    await fireEvent(screen.getByLabelText("Set the password myself"), "valueChange", true);
    await fireEvent.changeText(screen.getByLabelText("Password"), "short");
    await fireEvent.press(screen.getByText("Create user"));
    expect(screen.getByText("The password needs at least 8 characters.")).toBeTruthy();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("sends a chosen password", async () => {
    const onCreate = jest.fn().mockResolvedValue(undefined);
    await render(<CreateUserSheet onCreate={onCreate} onClose={jest.fn()} />);
    await fireEvent.changeText(screen.getByLabelText("Username"), "sara");
    await fireEvent(screen.getByLabelText("Set the password myself"), "valueChange", true);
    await fireEvent.changeText(screen.getByLabelText("Password"), "agreed-pass-1");
    await fireEvent.press(screen.getByText("Create user"));
    expect(onCreate).toHaveBeenCalledWith("sara", "agreed-pass-1");
  });

  it("shows the server's error and lets the admin try again", async () => {
    const onCreate = jest.fn().mockRejectedValueOnce(new Error("Username already exists")).mockResolvedValueOnce(undefined);
    await render(<CreateUserSheet onCreate={onCreate} onClose={jest.fn()} />);
    await fireEvent.changeText(screen.getByLabelText("Username"), "sara");
    await fireEvent.press(screen.getByText("Create user"));
    await waitFor(() => expect(screen.getByText("Username already exists")).toBeTruthy());
    await fireEvent.press(screen.getByText("Create user"));
    expect(onCreate).toHaveBeenCalledTimes(2);
  });
});
```

`src/features/admin/__tests__/PasswordRevealSheet.test.tsx`:
```tsx
import { Pressable, View } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import * as Clipboard from "expo-clipboard";
import { confirm } from "@/ui";
import { PasswordRevealSheet } from "../PasswordRevealSheet";

jest.mock("expo-clipboard", () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));
jest.mock("@/ui", () => {
  const actual = jest.requireActual("@/ui");
  return {
    ...actual,
    confirm: jest.fn(),
    Sheet: ({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) =>
      visible ? (
        <View>
          <Pressable accessibilityLabel="Dismiss sheet" onPress={onClose} />
          {children}
        </View>
      ) : null,
  };
});
const confirmMock = confirm as jest.MockedFunction<typeof confirm>;

const props = { username: "sara.b", password: "Xk7mPq2vRt9wZs4n", appUrl: "https://egx.example" };

beforeEach(() => jest.clearAllMocks());

describe("PasswordRevealSheet", () => {
  it("shows link, username and password, and says it is shown once", async () => {
    await render(<PasswordRevealSheet {...props} onClose={jest.fn()} />);
    expect(screen.getByText("https://egx.example")).toBeTruthy();
    expect(screen.getByText("sara.b")).toBeTruthy();
    expect(screen.getByText("Xk7mPq2vRt9wZs4n")).toBeTruthy();
    expect(screen.getByText(/the password cannot be shown again/)).toBeTruthy();
  });

  it("copies the whole block as one message", async () => {
    await render(<PasswordRevealSheet {...props} onClose={jest.fn()} />);
    await fireEvent.press(screen.getByText("Copy link, username & password"));
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith(
      "Link: https://egx.example\nUsername: sara.b\nPassword: Xk7mPq2vRt9wZs4n"
    );
    await waitFor(() => expect(screen.getByText("Copied")).toBeTruthy());
  });

  it("copies the bare password for the WhatsApp case", async () => {
    await render(<PasswordRevealSheet {...props} onClose={jest.fn()} />);
    await fireEvent.press(screen.getByText("Copy password only"));
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith("Xk7mPq2vRt9wZs4n");
  });

  it("warns when no app link is configured", async () => {
    await render(<PasswordRevealSheet {...props} appUrl="" onClose={jest.fn()} />);
    expect(screen.getByText(/No app link is configured/)).toBeTruthy();
  });

  it("asks before a swipe/back dismiss throws away an uncopied password", async () => {
    const onClose = jest.fn();
    confirmMock.mockResolvedValueOnce(false);
    await render(<PasswordRevealSheet {...props} onClose={onClose} />);
    await fireEvent.press(screen.getByLabelText("Dismiss sheet"));
    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });

  it("Done always closes", async () => {
    const onClose = jest.fn();
    await render(<PasswordRevealSheet {...props} onClose={onClose} />);
    await fireEvent.press(screen.getByText("Done"));
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npx jest src/features/admin`
Expected: FAIL — modules not found.

- [ ] **Step 4: Add the FE link to `src/lib/env.ts` and `.env.example`**

Append to `src/lib/env.ts`:
```ts
/** Trim whitespace and trailing slashes; "" when unset. */
export function normalizeBaseUrl(raw: string | undefined): string {
  return (raw ?? "").trim().replace(/\/+$/, "");
}

/**
 * The web app's address (its login page), put in front of every credential
 * block an admin copies — credentials with no address are a login the
 * recipient cannot use. Same value as the web's FE_BASE_URL. Optional: when
 * unset the admin is told to send the address separately.
 */
export function feBaseUrl(): string {
  // Static dot access: Expo inlines EXPO_PUBLIC_* only when spelled like this.
  return normalizeBaseUrl(process.env.EXPO_PUBLIC_FE_BASE_URL);
}
```
Append to `.env.example`:
```
# The web app's address, included in the login details an admin copies.
EXPO_PUBLIC_FE_BASE_URL=http://localhost:3000
```

- [ ] **Step 5: Implement `src/features/admin/credentials.ts`**

```ts
/**
 * Link, username and password in one block, because it gets pasted into one
 * message. Same format as the web's PasswordRevealDialog.
 */
export function buildCredentialMessage(appUrl: string, username: string, password: string): string {
  return [appUrl && `Link: ${appUrl}`, `Username: ${username}`, `Password: ${password}`]
    .filter(Boolean)
    .join("\n");
}

/**
 * The web form's HTML constraints (`required`, `minLength={8}`), which a
 * native form does not get for free. The backend stays authoritative for
 * the username pattern.
 */
export function validateNewUser(username: string, ownPassword: boolean, password: string): string | null {
  if (!username.trim()) return "Enter a username.";
  if (ownPassword && password.length < 8) return "The password needs at least 8 characters.";
  return null;
}

export function formatAdded(raw: string): string {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
```

- [ ] **Step 6: Implement `src/features/admin/UsersList.tsx`**

```tsx
/**
 * Admin user list — the web's mobile card branch of AdminUsersTable.
 * The guards live on the backend; this only explains why a button is
 * missing ("This is you") so an admin isn't left tapping something that
 * will always 400. There is no role control: admin comes from AUTH_ADMINS.
 */
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText, Button } from "@/ui";
import type { ManagedUser } from "@/shared/api";
import { formatAdded } from "./credentials";

interface Actions {
  onResetPassword: (u: ManagedUser) => void;
  onToggleActive: (u: ManagedUser) => void;
  onDelete: (u: ManagedUser) => void;
  busyId: string | null;
  currentUserId: string | undefined;
}

function RoleBadge({ role }: { role: ManagedUser["role"] }) {
  if (role !== "admin") return <AppText className="text-xs text-white/40">User</AppText>;
  return (
    <View className="rounded-md border border-accent/30 bg-accent/10 px-1.5 py-0.5">
      <AppText className="font-sans-semibold text-[10px] uppercase tracking-[0.5px] text-accent">Admin</AppText>
    </View>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className={`h-1.5 w-1.5 rounded-full ${active ? "bg-gain" : "bg-white/25"}`} />
      <AppText className={`text-xs ${active ? "text-white/70" : "text-white/40"}`}>{active ? "Active" : "Disabled"}</AppText>
    </View>
  );
}

function UserActions({ u, onResetPassword, onToggleActive, onDelete, busyId, currentUserId }: Actions & { u: ManagedUser }) {
  const busy = busyId === u.id;
  const isSelf = u.id === currentUserId;
  return (
    <View className="flex-row flex-wrap items-center gap-2">
      <Button variant="secondary" label="Reset password" onPress={() => onResetPassword(u)} disabled={busy} />
      {isSelf ? (
        <AppText className="text-[11px] text-white/30">This is you</AppText>
      ) : (
        <>
          <Button variant="secondary" label={u.is_active ? "Disable" : "Enable"} onPress={() => onToggleActive(u)} disabled={busy} />
          <Button variant="danger" label="Delete" onPress={() => onDelete(u)} disabled={busy} />
        </>
      )}
    </View>
  );
}

export function UsersList({ users, ...actions }: Actions & { users: ManagedUser[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!users.length) {
    return (
      <View className="items-center rounded-xl border border-white/10 bg-charcoal p-6">
        <AppText className="text-sm text-white/40">No users yet.</AppText>
      </View>
    );
  }

  return (
    <View className="gap-3">
      {users.map((u) => {
        const open = expanded === u.id;
        return (
          <View key={u.id} className="rounded-xl border border-white/10 bg-charcoal p-4">
            <Pressable
              onPress={() => setExpanded(open ? null : u.id)}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              accessibilityLabel={`${u.username}, ${open ? "hide" : "show"} actions`}
              className="min-h-[44px] flex-row items-center justify-between gap-3"
            >
              <View className="min-w-0 flex-1">
                <View className="flex-row items-center gap-2">
                  <AppText numberOfLines={1} className="shrink font-mono text-sm text-white">{u.username}</AppText>
                  <RoleBadge role={u.role} />
                </View>
                <View className="mt-1 flex-row items-center gap-3">
                  <StatusDot active={u.is_active} />
                  <AppText className="text-xs text-white/40">
                    {`${u.holdings_count} holding${u.holdings_count === 1 ? "" : "s"}`}
                  </AppText>
                </View>
              </View>
              <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color="rgba(255,255,255,0.3)" />
            </Pressable>
            {open ? (
              <View className="mt-3 border-t border-white/10 pt-3">
                <AppText className="mb-3 text-xs text-white/40">{`Added ${formatAdded(u.created_at)}`}</AppText>
                <UserActions u={u} {...actions} />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
```

- [ ] **Step 7: Implement `src/features/admin/CreateUserSheet.tsx`**

```tsx
/**
 * Add a user. Leaving the password blank is the intended path: the backend
 * generates a strong one and returns it once. The switch exists for when the
 * admin has already agreed a password with the person.
 *
 * Mount it only while open (like the web modal), so a second "Add user"
 * starts from an empty form rather than a stale "Creating…".
 */
import { useState } from "react";
import { Switch, View } from "react-native";
import { AppText, Button, Sheet, TextField } from "@/ui";
import { V } from "@/shared/learnVisuals";
import { validateNewUser } from "./credentials";

export function CreateUserSheet({
  onCreate,
  onClose,
}: {
  onCreate: (username: string, password?: string) => Promise<void>;
  onClose: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [ownPassword, setOwnPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    const invalid = validateNewUser(username, ownPassword, password);
    if (invalid) {
      setErr(invalid);
      return;
    }
    setErr(null);
    setSubmitting(true);
    try {
      await onCreate(username.trim().toLowerCase(), ownPassword ? password : undefined);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not create the user");
      setSubmitting(false);
    }
  };

  return (
    <Sheet visible onClose={onClose} title="Add user">
      <View className="gap-4">
        <View>
          <TextField
            label="Username"
            accessibilityLabel="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            placeholder="sara.b"
            className="font-mono"
          />
          <AppText className="mt-1 text-[11px] text-white/40">3–32 characters: a–z, 0–9, dot, dash or underscore.</AppText>
        </View>

        <View className="min-h-[44px] flex-row items-center justify-between gap-3">
          <AppText className="flex-1 text-sm text-white/70">Set the password myself</AppText>
          <Switch
            accessibilityLabel="Set the password myself"
            value={ownPassword}
            onValueChange={setOwnPassword}
            trackColor={{ true: V.accent, false: "rgba(255,255,255,0.15)" }}
          />
        </View>

        {ownPassword ? (
          <View>
            <TextField
              label="Password"
              accessibilityLabel="Password"
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              className="font-mono"
            />
            <AppText className="mt-1 text-[11px] text-white/40">At least 8 characters.</AppText>
          </View>
        ) : (
          <View className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
            <AppText className="text-xs text-white/50">A strong password will be generated and shown to you once.</AppText>
          </View>
        )}

        {err ? (
          <View className="rounded-lg border border-loss/30 bg-loss/10 px-3 py-2">
            <AppText className="text-xs text-loss">{err}</AppText>
          </View>
        ) : null}

        <View className="flex-row gap-2 pt-1">
          <View className="flex-1">
            <Button label={submitting ? "Creating…" : "Create user"} onPress={submit} loading={submitting} disabled={submitting} />
          </View>
          <Button variant="secondary" label="Cancel" onPress={onClose} />
        </View>
      </View>
    </Sheet>
  );
}
```

(The password field is plain text, not `secureTextEntry`, matching the web's `type="text"`: the admin must be able to read back what they are about to hand over.)

- [ ] **Step 8: Implement `src/features/admin/PasswordRevealSheet.tsx`**

```tsx
/**
 * Shows a generated password exactly once. The backend stores only the
 * bcrypt hash, so this really is the only time it can be displayed — the
 * copy says so. Dismissing by swipe/back before anything was copied asks
 * first; "Done" is the explicit, unquestioned exit.
 */
import { useEffect, useState } from "react";
import { View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { AppText, Button, Sheet, confirm } from "@/ui";
import { buildCredentialMessage } from "./credentials";

function Row({ label, value, divider }: { label: string; value: string; divider?: "top" | "bottom" }) {
  const border = divider === "top" ? "mt-2 border-t border-white/10 pt-2" : divider === "bottom" ? "mb-2 border-b border-white/10 pb-2" : "";
  return (
    <View className={`flex-row gap-2 ${border}`}>
      <AppText className="w-[70px] text-xs text-white/40">{label}</AppText>
      <AppText selectable className="flex-1 font-mono text-sm text-white">{value}</AppText>
    </View>
  );
}

export function PasswordRevealSheet({
  username,
  password,
  appUrl,
  onClose,
}: {
  username: string;
  password: string;
  /** feBaseUrl(); "" when not configured. */
  appUrl: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<"all" | "password" | null>(null);
  const [everCopied, setEverCopied] = useState(false);
  const message = buildCredentialMessage(appUrl, username, password);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const copyText = async (text: string, which: "all" | "password") => {
    try {
      await Clipboard.setStringAsync(text);
      setCopied(which);
      setEverCopied(true);
    } catch {
      // Every value is on screen and selectable, so this is not a dead end.
      setCopied(null);
    }
  };

  const dismiss = async () => {
    if (everCopied) {
      onClose();
      return;
    }
    const ok = await confirm({
      title: "Close without copying?",
      message: "The password cannot be shown again. If it is lost, generate a new one.",
      confirmLabel: "Close",
      destructive: true,
    });
    if (ok) onClose();
  };

  return (
    <Sheet visible onClose={dismiss} title="Login details">
      <AppText className="text-sm text-white/50">
        Copy these now — the password cannot be shown again. If it is lost, generate a new one.
      </AppText>

      {/* Mirrors the copied text exactly, so what is sent matches what was checked. */}
      <View className="mt-4 rounded-lg border border-accent/30 bg-accent/5 p-3">
        {appUrl ? <Row label="Link" value={appUrl} divider="bottom" /> : null}
        <Row label="Username" value={username} />
        <Row label="Password" value={password} divider="top" />
      </View>
      {appUrl ? null : (
        <AppText className="mt-2 text-[11px] text-white/40">
          No app link is configured (EXPO_PUBLIC_FE_BASE_URL), so the copied text has no address — send it separately.
        </AppText>
      )}

      <View className="mt-4 gap-2">
        <Button
          label={copied === "all" ? "Copied" : "Copy link, username & password"}
          onPress={() => copyText(message, "all")}
        />
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button
              variant="secondary"
              label={copied === "password" ? "Copied" : "Copy password only"}
              onPress={() => copyText(password, "password")}
            />
          </View>
          <Button variant="secondary" label="Done" onPress={onClose} />
        </View>
      </View>
    </Sheet>
  );
}
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `npx jest src/features/admin`
Expected: PASS.

- [ ] **Step 10: Verify and commit**

Run: `npm run verify` — Expected: exits 0.
```bash
git add package.json package-lock.json src/lib/env.ts .env.example src/features/admin
git commit -m "$(cat <<'EOF'
feat(admin): user cards, create sheet and one-time password reveal

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XDkAB7UCK8WyT267W5ZxNV
EOF
)"
```

---

## Task 12: Mobile — Admin screen, header button beside Log out, admin-only guard

**Files:**
- Create: `src/features/admin/AdminScreen.tsx`, `src/features/admin/AdminHeaderButton.tsx`
- Modify: `src/app/admin.tsx` (replace shell), `src/app/(tabs)/_layout.tsx` (headerRight)
- Test: `src/features/admin/__tests__/AdminScreen.test.tsx`, `src/features/admin/__tests__/AdminHeaderButton.test.tsx`

**Interfaces:**
- Consumes: `useAuth()` (`@/auth/AuthProvider`): `{ user, isAdmin, isLoading }`; `fetchUsers`, `createUser`, `resetUserPassword`, `setUserActive`, `deleteUser`, `ManagedUser` (`@/shared/api`); `routes` (`@/lib/links`); `feBaseUrl` (`@/lib/env`); Task 11 components; `confirm`, `IconButton`, `Button`, `CardSkeleton`, `Screen`, `AppText` (`@/ui`).
- Produces: `AdminScreen()`, `AdminHeaderButton()` (renders `null` unless `isAdmin`).

- [ ] **Step 1: Write the failing tests**

`src/features/admin/__tests__/AdminScreen.test.tsx`:
```tsx
import { Pressable, View } from "react-native";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { useAuth } from "@/auth/AuthProvider";
import { confirm } from "@/ui";
import {
  createUser,
  deleteUser,
  fetchUsers,
  resetUserPassword,
  setUserActive,
  type ManagedUser,
} from "@/shared/api";
import { routes } from "@/lib/links";
import { renderScreen } from "@/test-utils/renderScreen";
import { AdminScreen } from "../AdminScreen";

jest.mock("@/auth/AuthProvider", () => ({ useAuth: jest.fn() }));
jest.mock("expo-router", () => ({ router: { replace: jest.fn(), push: jest.fn() } }));
jest.mock("expo-clipboard", () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));
jest.mock("@/lib/env", () => ({ feBaseUrl: () => "https://egx.example" }));
jest.mock("@/shared/api", () => ({
  fetchUsers: jest.fn(),
  createUser: jest.fn(),
  resetUserPassword: jest.fn(),
  setUserActive: jest.fn(),
  deleteUser: jest.fn(),
}));
jest.mock("@/ui", () => {
  const actual = jest.requireActual("@/ui");
  return {
    ...actual,
    confirm: jest.fn(),
    Sheet: ({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) =>
      visible ? (
        <View>
          <Pressable accessibilityLabel="Dismiss sheet" onPress={onClose} />
          {children}
        </View>
      ) : null,
  };
});

const authMock = useAuth as jest.Mock;
const confirmMock = confirm as jest.MockedFunction<typeof confirm>;
const ME: ManagedUser = { id: "1", username: "mark", role: "admin", is_active: true, created_at: "2026-01-02T00:00:00Z", holdings_count: 3 };
const SARA: ManagedUser = { id: "2", username: "sara.b", role: "user", is_active: true, created_at: "2026-02-03T00:00:00Z", holdings_count: 1 };

beforeEach(() => {
  jest.clearAllMocks();
  authMock.mockReturnValue({ user: { id: "1", username: "mark", role: "admin" }, isAdmin: true, isLoading: false });
  (fetchUsers as jest.Mock).mockResolvedValue({ users: [ME, SARA] });
});

describe("AdminScreen", () => {
  it("refuses non-admins without calling the users API", async () => {
    authMock.mockReturnValue({ user: { id: "9", username: "bob", role: "user" }, isAdmin: false, isLoading: false });
    await renderScreen(<AdminScreen />);
    expect(screen.getByText("Admins only")).toBeTruthy();
    expect(fetchUsers).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText("Back to dashboard"));
    expect(router.replace).toHaveBeenCalledWith(routes.dashboard);
  });

  it("lists accounts with a count", async () => {
    await renderScreen(<AdminScreen />);
    await waitFor(() => expect(screen.getByText("2 accounts.")).toBeTruthy());
    expect(screen.getByText("sara.b")).toBeTruthy();
  });

  it("creates a user and reveals the generated password once", async () => {
    (createUser as jest.Mock).mockResolvedValue({ user: { ...SARA, id: "3", username: "omar" }, generated_password: "Gen3rat3dPassw0rd" });
    await renderScreen(<AdminScreen />);
    await waitFor(() => expect(screen.getByText("2 accounts.")).toBeTruthy());
    await fireEvent.press(screen.getByLabelText("Add user"));
    await fireEvent.changeText(screen.getByLabelText("Username"), "omar");
    await fireEvent.press(screen.getByText("Create user"));
    await waitFor(() => expect(screen.getByText("Gen3rat3dPassw0rd")).toBeTruthy());
    expect(createUser).toHaveBeenCalledWith("omar", undefined);
    expect(fetchUsers).toHaveBeenCalledTimes(2);
  });

  it("asks before resetting a password, with the web's wording", async () => {
    confirmMock.mockResolvedValueOnce(false);
    await renderScreen(<AdminScreen />);
    await waitFor(() => expect(screen.getByText("sara.b")).toBeTruthy());
    await fireEvent.press(screen.getByLabelText("sara.b, show actions"));
    await fireEvent.press(screen.getByText("Reset password"));
    await waitFor(() =>
      expect(confirmMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Generate a new password for sara.b? Their current password will stop working immediately.",
        })
      )
    );
    expect(resetUserPassword).not.toHaveBeenCalled();
  });

  it("resets after confirmation and reveals the new password", async () => {
    confirmMock.mockResolvedValueOnce(true);
    (resetUserPassword as jest.Mock).mockResolvedValue({ id: "2", username: "sara.b", generated_password: "N3wPassw0rdHere" });
    await renderScreen(<AdminScreen />);
    await waitFor(() => expect(screen.getByText("sara.b")).toBeTruthy());
    await fireEvent.press(screen.getByLabelText("sara.b, show actions"));
    await fireEvent.press(screen.getByText("Reset password"));
    await waitFor(() => expect(screen.getByText("N3wPassw0rdHere")).toBeTruthy());
    expect(resetUserPassword).toHaveBeenCalledWith("2");
  });

  it("deletes only after the irreversible-delete confirmation", async () => {
    confirmMock.mockResolvedValueOnce(true);
    (deleteUser as jest.Mock).mockResolvedValue({ deleted: "2", username: "sara.b" });
    await renderScreen(<AdminScreen />);
    await waitFor(() => expect(screen.getByText("sara.b")).toBeTruthy());
    await fireEvent.press(screen.getByLabelText("sara.b, show actions"));
    await fireEvent.press(screen.getByText("Delete"));
    await waitFor(() => expect(deleteUser).toHaveBeenCalledWith("2"));
    expect(confirmMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          "Delete sara.b? This permanently removes their portfolio, sale history and watchlist. This cannot be undone.",
        destructive: true,
      })
    );
  });

  it("toggles active state and surfaces a server refusal", async () => {
    (setUserActive as jest.Mock).mockRejectedValue(new Error("Cannot disable the last active admin"));
    await renderScreen(<AdminScreen />);
    await waitFor(() => expect(screen.getByText("sara.b")).toBeTruthy());
    await fireEvent.press(screen.getByLabelText("sara.b, show actions"));
    await fireEvent.press(screen.getByText("Disable"));
    expect(setUserActive).toHaveBeenCalledWith("2", false);
    await waitFor(() => expect(screen.getByText("Cannot disable the last active admin")).toBeTruthy());
  });

  it("shows a load failure", async () => {
    (fetchUsers as jest.Mock).mockRejectedValue(new Error("Forbidden"));
    await renderScreen(<AdminScreen />);
    await waitFor(() => expect(screen.getByText("Forbidden")).toBeTruthy());
  });
});
```

`src/features/admin/__tests__/AdminHeaderButton.test.tsx`:
```tsx
import { fireEvent, render, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { useAuth } from "@/auth/AuthProvider";
import { routes } from "@/lib/links";
import { AdminHeaderButton } from "../AdminHeaderButton";

jest.mock("@/auth/AuthProvider", () => ({ useAuth: jest.fn() }));
jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
const authMock = useAuth as jest.Mock;

describe("AdminHeaderButton", () => {
  it("is absent for a normal user", async () => {
    authMock.mockReturnValue({ isAdmin: false });
    await render(<AdminHeaderButton />);
    expect(screen.queryByLabelText("Users")).toBeNull();
  });

  it("opens user management for an admin", async () => {
    authMock.mockReturnValue({ isAdmin: true });
    await render(<AdminHeaderButton />);
    await fireEvent.press(screen.getByLabelText("Users"));
    expect(router.push).toHaveBeenCalledWith(routes.admin);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx jest src/features/admin/__tests__/AdminScreen.test.tsx src/features/admin/__tests__/AdminHeaderButton.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `src/features/admin/AdminScreen.tsx`**

```tsx
/**
 * User management. The backend 403s non-admins regardless (and the route is
 * guarded in the root layout); the in-screen check just avoids an
 * admin-shaped page full of errors. No role picker: admin comes only from
 * AUTH_ADMINS on the server.
 */
import { useCallback, useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText, Button, CardSkeleton, Screen, confirm } from "@/ui";
import { useAuth } from "@/auth/AuthProvider";
import { feBaseUrl } from "@/lib/env";
import { routes } from "@/lib/links";
import { COLORS } from "@/shared/theme";
import { createUser, deleteUser, fetchUsers, resetUserPassword, setUserActive, type ManagedUser } from "@/shared/api";
import { CreateUserSheet } from "./CreateUserSheet";
import { PasswordRevealSheet } from "./PasswordRevealSheet";
import { UsersList } from "./UsersList";

interface Revealed {
  username: string;
  password: string;
}

const message = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

export function AdminScreen() {
  const { isAdmin, isLoading: authLoading, user } = useAuth();
  const insets = useSafeAreaInsets();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [revealed, setRevealed] = useState<Revealed | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchUsers();
      setUsers(data.users);
      setError(null);
    } catch (e: unknown) {
      setError(message(e, "Could not load users"));
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAdmin) void load();
  }, [authLoading, isAdmin, load]);

  const handleCreate = async (username: string, password?: string) => {
    const res = await createUser(username, password);
    setShowCreate(false);
    if (res.generated_password) setRevealed({ username: res.user.username, password: res.generated_password });
    await load();
  };

  const handleReset = async (u: ManagedUser) => {
    const ok = await confirm({
      title: "Reset password",
      message: `Generate a new password for ${u.username}? Their current password will stop working immediately.`,
      confirmLabel: "Generate",
    });
    if (!ok) return;
    setBusyId(u.id);
    try {
      const res = await resetUserPassword(u.id);
      if (res.generated_password) setRevealed({ username: u.username, password: res.generated_password });
    } catch (e: unknown) {
      setError(message(e, "Could not reset the password"));
    } finally {
      setBusyId(null);
    }
  };

  const handleToggle = async (u: ManagedUser) => {
    setBusyId(u.id);
    setError(null);
    try {
      await setUserActive(u.id, !u.is_active);
      await load();
    } catch (e: unknown) {
      setError(message(e, "Could not update the user"));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (u: ManagedUser) => {
    // Spelled out because it is irreversible and takes their data with it.
    const ok = await confirm({
      title: "Delete user",
      message: `Delete ${u.username}? This permanently removes their portfolio, sale history and watchlist. This cannot be undone.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    setBusyId(u.id);
    setError(null);
    try {
      await deleteUser(u.id);
      await load();
    } catch (e: unknown) {
      setError(message(e, "Could not delete the user"));
    } finally {
      setBusyId(null);
    }
  };

  if (authLoading) {
    return (
      <Screen>
        <View className="px-4 py-8">
          <CardSkeleton />
        </View>
      </Screen>
    );
  }

  if (!isAdmin) {
    return (
      <Screen>
        <View className="items-center px-4 py-16">
          <AppText accessibilityRole="header" className="font-sans-bold text-xl text-white">Admins only</AppText>
          <AppText className="mt-2 text-center text-sm text-white/50">
            Your account does not have access to user management.
          </AppText>
          <View className="mt-6">
            <Button variant="secondary" label="Back to dashboard" onPress={() => router.replace(routes.dashboard)} />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <View className="flex-1 bg-charcoal-dark">
      <Screen scroll>
        <View className="px-4 pb-28 pt-6">
          <View className="mb-6">
            <AppText accessibilityRole="header" className="font-sans-bold text-2xl text-white">Users</AppText>
            <AppText className="mt-1 text-sm text-white/50">
              {`${users.length} account${users.length === 1 ? "" : "s"}.`}
            </AppText>
          </View>

          {error ? (
            <View className="mb-4 rounded-lg border border-loss/30 bg-loss/10 px-3 py-2.5">
              <AppText className="text-sm text-loss">{error}</AppText>
            </View>
          ) : null}

          {loaded ? (
            <UsersList
              users={users}
              busyId={busyId}
              currentUserId={user?.id}
              onResetPassword={handleReset}
              onToggleActive={handleToggle}
              onDelete={handleDelete}
            />
          ) : (
            <CardSkeleton />
          )}
        </View>
      </Screen>

      {/* FAB, matching the portfolio screen. Offset by the bottom inset: this
          is a stack screen above the tabs, so there is no tab bar to clear. */}
      <Pressable
        onPress={() => setShowCreate(true)}
        accessibilityRole="button"
        accessibilityLabel="Add user"
        className="absolute right-4 h-14 w-14 items-center justify-center rounded-full bg-accent"
        style={{ bottom: insets.bottom + 16 }}
      >
        <Ionicons name="add" size={28} color={COLORS["charcoal-dark"]} />
      </Pressable>

      {showCreate ? <CreateUserSheet onCreate={handleCreate} onClose={() => setShowCreate(false)} /> : null}
      {revealed ? (
        <PasswordRevealSheet
          username={revealed.username}
          password={revealed.password}
          appUrl={feBaseUrl()}
          onClose={() => setRevealed(null)}
        />
      ) : null}
    </View>
  );
}
```

- [ ] **Step 4: Implement `src/features/admin/AdminHeaderButton.tsx`**

```tsx
/**
 * Administering accounts is an account action, not a place — so it is a
 * button beside Log out, never a tab. The tab bar is the same for everyone.
 */
import { router } from "expo-router";
import { IconButton } from "@/ui";
import { useAuth } from "@/auth/AuthProvider";
import { routes } from "@/lib/links";

export function AdminHeaderButton() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return null;
  return <IconButton icon="people-outline" accessibilityLabel="Users" onPress={() => router.push(routes.admin)} />;
}
```

- [ ] **Step 5: Replace the route shell `src/app/admin.tsx`**

```tsx
import { Stack } from "expo-router";
import { AdminScreen } from "@/features/admin/AdminScreen";

export default function AdminRoute() {
  return (
    <>
      <Stack.Screen options={{ title: "Users" }} />
      <AdminScreen />
    </>
  );
}
```

- [ ] **Step 6: Put the button beside Log out (`src/app/(tabs)/_layout.tsx`)**

Find the `headerRight` Plan 1 defines in the Tabs `screenOptions` (assumption A6). Wrap whatever it renders so the admin button sits immediately to its left — for example, if it is `headerRight: () => <IconButton icon="log-out-outline" accessibilityLabel="Log out" onPress={() => void logout()} />`:
```tsx
import { View } from "react-native";
import { AdminHeaderButton } from "@/features/admin/AdminHeaderButton";

// inside screenOptions:
headerRight: () => (
  <View className="flex-row items-center gap-1 pr-2">
    <AdminHeaderButton />
    <IconButton icon="log-out-outline" accessibilityLabel="Log out" onPress={() => void logout()} />
  </View>
),
```
Keep Plan 1's log-out element exactly as it was (same component, same props). Do **not** add a Tabs.Screen for admin.

- [ ] **Step 7: Confirm the route guard (already built by Plan 1)**

Plan 1 Task 7 declares `admin` inside `<Stack.Protected guard={isAdmin}>` in `src/navigation/RootNavigator.tsx`, and `src/__tests__/routes/guard.test.tsx` ("keeps a non-admin out of /admin") already pins it. Do not add a second guard.
Run: `grep -n 'guard={isAdmin}' src/navigation/RootNavigator.tsx`
Expected: one match. If it is missing, add it there exactly as Plan 1 Task 7 Step 2 shows — not in `src/app/_layout.tsx`.

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx jest src/features/admin`
Expected: PASS.

- [ ] **Step 9: Verify and commit**

Run: `npm run verify` — Expected: exits 0.
```bash
git add src/features/admin/AdminScreen.tsx src/features/admin/AdminHeaderButton.tsx \
  src/features/admin/__tests__/AdminScreen.test.tsx src/features/admin/__tests__/AdminHeaderButton.test.tsx \
  src/app/admin.tsx "src/app/(tabs)/_layout.tsx"
git commit -m "$(cat <<'EOF'
feat(admin): user management screen, header button and admin-only guard

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XDkAB7UCK8WyT267W5ZxNV
EOF
)"
```

---

## Task 13: Release config — icons, splash, app.json, eas.json

**Files:**
- Create: `scripts/make-icons.mjs`, `eas.json`, `src/__tests__/release/config.test.ts`
- Modify: `app.json`, `package.json` (`icons` script, dev dep, `expo-system-ui`)
- Regenerate: `assets/icon.png`, `assets/android-icon-foreground.png`, `assets/android-icon-monochrome.png`, `assets/splash-icon.png`, `assets/favicon.png`
- Delete: `assets/android-icon-background.png` (a flat colour replaces it)

**What exists to work from:** `egx-api-fe/public/icons/` has `egx-logo-512.svg` (rounded `#08080d` tile, green rising bars, "EGX" wordmark, "by Mark Botros"), PNGs at 512/192/180/32/16, and `manifest.json` uses `#0a0a0f` for background/theme. Nothing is 1024px, so the native set is rasterised from the **SVG** at 1024: iOS gets a full-bleed square on `#0a0a0f` (iOS masks the corners and rejects transparency); Android gets a transparent foreground scaled to 0.55 to sit inside the adaptive-icon safe circle, a `#0a0a0f` background colour, and a white monochrome variant for themed icons; the splash uses the transparent mark on `#0a0a0f`.

**Interfaces:**
- Consumes: `../egx-api-fe/public/icons/egx-logo-512.svg` (dev-time only; PNGs are committed so EAS never needs the sibling repo).
- Produces: `npm run icons`; `app.json` (name "EGX Analytics", dark UI, ids `com.markbotros.egxanalytics`); `eas.json` profiles `development` / `preview` / `production`.

- [ ] **Step 1: Write the failing config test**

`src/__tests__/release/config.test.ts`:
```ts
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const root = resolve(__dirname, "../../..");
const read = (rel: string) => readFileSync(resolve(root, rel));
const expo = JSON.parse(read("app.json").toString()).expo;
const eas = JSON.parse(read("eas.json").toString());

function pngSize(rel: string) {
  const b = read(rel);
  expect(b.subarray(1, 4).toString("ascii")).toBe("PNG");
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

const BG = "#0a0a0f";
const ID = "com.markbotros.egxanalytics";

describe("app.json", () => {
  it("is called EGX Analytics and is dark", () => {
    expect(expo.name).toBe("EGX Analytics");
    expect(expo.userInterfaceStyle).toBe("dark");
    expect(expo.backgroundColor).toBe(BG);
    expect(expo.orientation).toBe("portrait");
  });

  it("uses the proposed bundle id on both platforms", () => {
    expect(expo.ios.bundleIdentifier).toBe(ID);
    expect(expo.android.package).toBe(ID);
    expect(expo.ios.supportsTablet).toBe(false);
  });

  it("uses a dark adaptive icon with a monochrome layer", () => {
    expect(expo.android.adaptiveIcon.backgroundColor).toBe(BG);
    expect(expo.android.adaptiveIcon.backgroundImage).toBeUndefined();
    expect(existsSync(resolve(root, expo.android.adaptiveIcon.foregroundImage))).toBe(true);
    expect(existsSync(resolve(root, expo.android.adaptiveIcon.monochromeImage))).toBe(true);
  });

  it("configures a dark splash through the expo-splash-screen plugin", () => {
    const entry = (expo.plugins as unknown[]).find(
      (p) => Array.isArray(p) && p[0] === "expo-splash-screen"
    ) as [string, { backgroundColor: string; image: string; imageWidth: number }] | undefined;
    expect(entry).toBeDefined();
    expect(entry![1].backgroundColor).toBe(BG);
    expect(existsSync(resolve(root, entry![1].image))).toBe(true);
  });

  it.each(["assets/icon.png", "assets/android-icon-foreground.png", "assets/android-icon-monochrome.png", "assets/splash-icon.png"])(
    "%s is 1024×1024",
    (rel) => expect(pngSize(rel)).toEqual({ width: 1024, height: 1024 })
  );
});

describe("eas.json", () => {
  const profile = (name: string) => {
    const p = eas.build[name];
    return p.extends ? { ...eas.build[p.extends], ...p, env: { ...eas.build[p.extends].env, ...p.env } } : p;
  };

  it("has development, preview and production profiles", () => {
    for (const name of ["development", "preview", "production"]) expect(eas.build[name]).toBeDefined();
  });

  it("builds an installable internal APK for preview", () => {
    expect(profile("preview").distribution).toBe("internal");
    expect(profile("preview").android.buildType).toBe("apk");
  });

  it("skips the sibling-repo shared check on every cloud build", () => {
    for (const name of ["development", "preview", "production"]) {
      expect(profile(name).env.SKIP_SHARED_CHECK).toBe("1");
    }
  });

  it("selects an EAS environment per profile (where the EXPO_PUBLIC_* values live)", () => {
    expect(profile("development").environment).toBe("development");
    expect(profile("preview").environment).toBe("preview");
    expect(profile("production").environment).toBe("production");
  });

  it("lets EAS own the build number", () => {
    expect(eas.cli.appVersionSource).toBe("remote");
    expect(profile("production").autoIncrement).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx jest src/__tests__/release`
Expected: FAIL — `ENOENT … eas.json` (and name/style assertions).

- [ ] **Step 3: Install the rasteriser and system-ui**

```bash
npx expo install expo-system-ui
npx expo install @resvg/resvg-js -- --dev
```
`expo-system-ui` is what makes `userInterfaceStyle`/`backgroundColor` take effect on Android. `@resvg/resvg-js` is a Node-only dev tool for the icon script.

- [ ] **Step 4: Write `scripts/make-icons.mjs`**

```js
#!/usr/bin/env node
/**
 * Rasterises the web app's logo (../egx-api-fe/public/icons/egx-logo-512.svg)
 * into the native icon set. Run after the logo changes: `npm run icons`.
 * The PNGs are committed, so EAS builds never need the sibling repo.
 *
 *  icon.png                     1024, full-bleed on #0a0a0f (iOS masks corners; no alpha allowed)
 *  android-icon-foreground.png  1024, transparent, mark at 55% to sit in the adaptive safe circle
 *  android-icon-monochrome.png  1024, transparent, white silhouette for Android 13+ themed icons
 *  splash-icon.png              1024, transparent mark (the splash plugin paints #0a0a0f behind it)
 *  favicon.png                  48, for completeness (web target unused)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = resolve(root, "../egx-api-fe/public/icons/egx-logo-512.svg");
const BG = "#0a0a0f";

const svg = readFileSync(SRC, "utf8");
const body = svg.match(/<g clip-path="url\(#lc\)">([\s\S]*)<\/g>/)?.[1];
if (!body) throw new Error(`No logo body found in ${SRC} — has the SVG changed shape?`);

const wrap = (inner, { background = null, scale = 1 } = {}) => `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
${background ? `<rect width="512" height="512" fill="${background}"/>` : ""}
<g transform="translate(256 256) scale(${scale}) translate(-256 -256)">${inner}</g>
</svg>`;

const mono = body.replace(/(fill|stroke)="#[0-9a-fA-F]{6}"/g, '$1="#ffffff"');

function render(name, source, size) {
  const png = new Resvg(source, {
    fitTo: { mode: "width", value: size },
    font: { loadSystemFonts: true, defaultFontFamily: "DejaVu Sans" },
  })
    .render()
    .asPng();
  writeFileSync(resolve(root, "assets", name), png);
  console.log(`assets/${name} ${size}x${size}`);
}

render("icon.png", wrap(body, { background: BG }), 1024);
render("android-icon-foreground.png", wrap(body, { scale: 0.55 }), 1024);
render("android-icon-monochrome.png", wrap(mono, { scale: 0.55 }), 1024);
render("splash-icon.png", wrap(body), 1024);
render("favicon.png", wrap(body, { background: BG }), 48);
```

Add to `package.json` `scripts`: `"icons": "node scripts/make-icons.mjs"`.

- [ ] **Step 5: Generate the assets and look at them**

```bash
npm run icons
rm -f assets/android-icon-background.png
```
Expected: five `assets/… 1024x1024` / `48x48` lines. Open `assets/icon.png` and `assets/android-icon-foreground.png` with the Read tool and check: bars green, wordmark legible, nothing clipped. (The wordmark font falls back to the system sans — acceptable; if it renders as boxes, install a font package or set `defaultFontFamily` to an installed family and re-run.)

- [ ] **Step 6: Update `app.json`**

Set these keys inside `expo`, **keeping every key and plugin Plan 1 added that is not listed here** (`scheme`, `experiments`, `extra`, existing `plugins` entries such as `expo-router`, `expo-secure-store`, `expo-font`):
```json
{
  "expo": {
    "name": "EGX Analytics",
    "slug": "egx-api-mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "backgroundColor": "#0a0a0f",
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.markbotros.egxanalytics",
      "config": { "usesNonExemptEncryption": false }
    },
    "android": {
      "package": "com.markbotros.egxanalytics",
      "adaptiveIcon": {
        "backgroundColor": "#0a0a0f",
        "foregroundImage": "./assets/android-icon-foreground.png",
        "monochromeImage": "./assets/android-icon-monochrome.png"
      },
      "predictiveBackGestureEnabled": false
    },
    "web": { "favicon": "./assets/favicon.png" },
    "plugins": [
      [
        "expo-splash-screen",
        {
          "image": "./assets/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#0a0a0f"
        }
      ]
    ]
  }
}
```
(`plugins` above shows only the entry to ADD — append it to Plan 1's array.) The slug stays `egx-api-mobile`: changing it later re-links the EAS project. **The bundle id is a proposal — ask the user to confirm `com.markbotros.egxanalytics` before Task 14's first build**, because it cannot change once an app is published.

- [ ] **Step 7: Create `eas.json`**

```json
{
  "cli": {
    "version": ">= 16.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "base": {
      "env": { "SKIP_SHARED_CHECK": "1" }
    },
    "development": {
      "extends": "base",
      "environment": "development",
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "extends": "base",
      "environment": "preview",
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "extends": "base",
      "environment": "production",
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```
Notes: `SKIP_SHARED_CHECK=1` because the EAS builder has no `../egx-api-fe` (the committed `src/shared/` copy is what ships). `.env` is gitignored and therefore not available on EAS — `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_FE_BASE_URL` live in EAS environments selected by each profile's `environment` (Task 14). The `development` profile needs `expo-dev-client`, which is deliberately **not** installed (the app runs in Expo Go, and installing it changes `expo start`'s default); `docs/release.md` says when to add it.

- [ ] **Step 8: Run the config test and Expo's doctor**

```bash
npx jest src/__tests__/release
npx expo-doctor
npx expo config --type public | grep -E '"name"|userInterfaceStyle|bundleIdentifier|"package"'
```
Expected: jest PASS; expo-doctor reports no failed checks (warnings about unrelated packages are reported to the user, not silenced); the config shows the new name, `dark`, and both ids.

- [ ] **Step 9: Verify and commit**

Run: `npm run verify` — Expected: exits 0.
```bash
git add scripts/make-icons.mjs eas.json app.json package.json package-lock.json assets src/__tests__/release
git commit -m "$(cat <<'EOF'
build(release): EGX Analytics name, dark icon set, splash and EAS profiles

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XDkAB7UCK8WyT267W5ZxNV
EOF
)"
```

---

## Task 14: Project guide, release doc, preview build and manual checklist

**Files:**
- Create: `CLAUDE.md`, `docs/release.md`
- Possibly modify: `app.json` (EAS `extra.eas.projectId` written by `eas init`)

**Interfaces:**
- Consumes: everything above.
- Produces: the repo guide future sessions load automatically; a documented, user-run release path; an installable APK (when the user has an Expo account).

- [ ] **Step 1: Write `CLAUDE.md`**

```markdown
# EGX Analytics — mobile (Expo) — guide for Claude

React Native port of the EGX Analytics web app (`../egx-api-fe`, Next.js) — the
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
| `npm run verify` | `check:shared` + `tsc --noEmit` + `expo lint` + `jest` — green before every commit |
| `npm run sync:shared` / `check:shared` | copy / diff `../egx-api-fe/src/app/lib/*` → `src/shared/` |
| `npm run icons` | regenerate `assets/*.png` from the web logo SVG |
| `npx expo start` | dev server — **always in tmux**: `tmux new -d -s egx-mobile-metro "npx expo start 2>&1 \| tee ~/logs/egx-mobile-metro.log"` |

Long-running commands (Metro, long test runs, EAS builds) go in tmux with output in
`~/logs/egx-mobile-<task>.log`; tell the user the session name and log path.

## Layout

- `src/app/` — routes ONLY (no tests, no components). Tabs: Dashboard, Portfolio, Learn, News.
- `src/shared/` — **GENERATED, never edit.** Change `../egx-api-fe/src/app/lib/`, commit
  there, `npm run sync:shared` here, commit here. Must stay platform-neutral.
- `src/ui/` UI kit · `src/charts/` chart kit · `src/auth/`, `src/providers/` ·
  `src/features/{market,portfolio,learn,calibration,admin}/` · `src/lib/` (env, links) · `src/test-utils/`.
- Tests in `__tests__/` beside the code (`*.test.ts(x)`); route tests in `src/__tests__/routes/`.
- Import across folders with `@/…`; relative only within a folder.

## Rules that are easy to break

- `gain`/`loss` (and Learn's `V.up`/`V.down`) mean a real direction in the data, never decoration.
  Hexes only from `COLORS` (`@/shared/theme`) or `V` (`@/shared/learnVisuals`).
- Score labels are condition words (`scoreBand`/`SCORE_BAND_LABEL`), never Buy/Sell.
- Fonts are families: `font-sans`, `-medium`, `-semibold`, `-bold`, `font-mono`, `font-mono-semibold`.
- NativeWind: em tracking → px, relative leading → px, `space-y` → `gap`, no `md:`/`hover:`.
- Never `{n && <X/>}` with a number/string `n` — use a ternary.
- Touch targets ≥ 44pt; safe areas via `Screen` only; widths from layout, never `Dimensions` at module scope.
- Everything must run in **Expo Go** (no custom native modules).
- Money inputs accept 3 decimals; share counts are integers.

## Learn

Content is the SHARED `@/shared/curriculum` (web `lib/curriculum.ts`), diagrams are
`VisualSpec` objects rendered by `src/features/learn/LearnVisual.tsx` (twin of the web's
`components/learn/LearnVisual.tsx` — a new kind needs a case in both). Edit content in
the web repo only.
- Anchors are a public contract: 9 hyphenated module ids, underscore concept ids; never
  rename/drop (pinned by `sharedCurriculum.test.ts`). Deep link = `learnHref(id)` →
  `/(tabs)/learn?concept=<id>`; module ids and title slugs work too; the param is cleared
  after handling so the same link works twice.
- Seeded `walk()`, never `Math.random()`; gradient ids from `useId()` (sanitised).
- Cards rest VISIBLE; the only animation is the deep-link flash ring over an opaque card.
- Widgets import their formula (`@/shared/learnWidgets` → `constants`); curriculum strings
  interpolate `T_BILL_RATE_PCT`.
- Search: `searchConcepts`/`normalizeSearch` fold punctuation on both sides.
- Progress: AsyncStorage key `egx.learn.progress`, keyed by `conceptKey()`; storage failures
  are swallowed; taps before hydration are replayed.
- LiveChart: ONE shared COMI fetch, armed by FlatList viewability, silent fallback to the diagram.

## Admin

Header button beside Log out (admins only) → `/admin`, guarded by `Stack.Protected guard={isAdmin}`
plus an in-screen "Admins only". No role picker (admin = server `AUTH_ADMINS`). You cannot
disable/delete yourself. Generated passwords are shown once; copy block
`Link/Username/Password`, link from `EXPO_PUBLIC_FE_BASE_URL`.

## Environment and release

`.env` (gitignored; see `.env.example`): `EXPO_PUBLIC_API_BASE_URL` (via `apiBaseUrl()`),
`EXPO_PUBLIC_FE_BASE_URL` (via `feBaseUrl()`). EAS builds read them from EAS environments,
not `.env`. Bundle id `com.markbotros.egxanalytics`. Build/submit steps: `docs/release.md`.

## Git

No GitHub remote yet (creating one is the user's call, owner `MarkBotros0`). When pushing:
`gh auth switch --hostname github.com --user MarkBotros0 && git push`. Commit trailer:
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` +
`Claude-Session: https://claude.ai/code/session_01XDkAB7UCK8WyT267W5ZxNV`.
```

- [ ] **Step 2: Write `docs/release.md`**

```markdown
# Releasing EGX Analytics (mobile)

Everything here is run by a person with the Expo / Apple / Google accounts. Nothing
in this file has been executed by an agent beyond the preview build, if the user
asked for it.

## 0. Once per machine / project

1. Confirm the bundle id `com.markbotros.egxanalytics` (app.json `ios.bundleIdentifier`,
   `android.package`). It cannot change after the first store upload.
2. `npx eas-cli@latest login` (interactive).
3. `npx eas-cli@latest init` — creates the EAS project and writes
   `expo.extra.eas.projectId` (and `owner`) into `app.json`. Commit that change.
4. Create the public env vars in each EAS environment (`.env` is not uploaded).
   Check the subcommand name first with `npx eas-cli@latest env --help`
   (`env:create` in current CLIs):
   ```bash
   for ENV in development preview production; do
     npx eas-cli@latest env:create --environment $ENV --name EXPO_PUBLIC_API_BASE_URL \
       --value https://<backend-host>/api --visibility plaintext
     npx eas-cli@latest env:create --environment $ENV --name EXPO_PUBLIC_FE_BASE_URL \
       --value https://<web-app-host> --visibility plaintext
   done
   ```
   These are public values (inlined into the bundle), not secrets.

## 1. Internal Android preview (APK)

```bash
mkdir -p ~/logs
tmux kill-session -t egx-mobile-eas-preview 2>/dev/null
tmux new -d -s egx-mobile-eas-preview \
  "cd /home/mark/projects/egx-api/egx-api-mobile && npx eas-cli@latest build --profile preview --platform android 2>&1 | tee ~/logs/egx-mobile-eas-preview.log"
tmux attach -t egx-mobile-eas-preview   # answer the first-run keystore prompt ("Generate new keystore": yes), then Ctrl-b d
```
When it finishes the log ends with a build URL and an install QR code; open it on the
phone, download the APK, allow "install unknown apps" for the browser. Later runs can
add `--non-interactive` (credentials then exist on EAS).

## 2. Development build (only if a native module outside Expo Go is ever added)

`npx expo install expo-dev-client`, commit, then
`npx eas-cli@latest build --profile development --platform android`. Note that with
`expo-dev-client` installed `npx expo start` opens dev-client mode by default (press `s`
to switch to Expo Go).

## 3. Production builds

```bash
npx eas-cli@latest build --profile production --platform android   # .aab
npx eas-cli@latest build --profile production --platform ios        # needs Apple Developer membership
```
Build numbers are remote and auto-incremented (`appVersionSource: remote`); bump
`expo.version` in app.json for a user-visible version change.

## 4. Store submission (documented, not executed)

**Google Play**
1. Play Console → Create app "EGX Analytics", default language, app/free.
2. Complete App content: privacy policy URL (the app stores a username, portfolio
   holdings, sales, dividends and a watchlist on the EGX Analytics backend; no ads, no
   third-party analytics), Data safety form to match, content rating questionnaire,
   target audience (adults), "financial features": informational only — the app gives
   no investment advice (the composite score is educational).
3. Store listing: short/full description, 512×512 icon (`../egx-api-fe/public/icons/egx-logo-512.png`),
   1024×500 feature graphic, ≥ 2 phone screenshots (Dashboard, Stock, Portfolio, Learn).
4. The FIRST upload of a new app must be manual: upload the production `.aab` to an
   Internal testing track in the console.
5. For later uploads create a Google Cloud service account with Play access, download
   its JSON key (never commit it), set `submit.production.android.serviceAccountKeyPath`
   in eas.json to its local path, then `npx eas-cli@latest submit -p android --latest`.
6. Promote Internal → Closed → Production after testing. New personal developer
   accounts must run a closed test with testers for the required period before
   production access is granted — check the current Play policy.

**Apple App Store**
1. Apple Developer Program membership; App Store Connect → New App, bundle id
   `com.markbotros.egxanalytics`, name "EGX Analytics" (must be unique on the store).
2. `npx eas-cli@latest submit -p ios --latest` (EAS asks for the Apple ID / creates an
   App Store Connect API key) → build appears in TestFlight.
3. App Privacy answers (same data as above, linked to the user, not used for tracking),
   screenshots for 6.9" and 6.5" iPhones, review notes with a demo account (accounts
   are admin-created; there is no sign-up), export compliance already declared via
   `usesNonExemptEncryption: false`.
4. Submit for review.
```

- [ ] **Step 3: Verify and commit the docs**

Run: `npm run verify` — Expected: exits 0.
```bash
git add CLAUDE.md docs/release.md
git commit -m "$(cat <<'EOF'
docs: mobile project guide and release/store runbook

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XDkAB7UCK8WyT267W5ZxNV
EOF
)"
```

- [ ] **Step 4: Internal preview build (user-gated)**

Ask the user: (a) confirm the bundle id, (b) whether they are logged in to EAS and want the APK built now, (c) the production `EXPO_PUBLIC_API_BASE_URL` / `EXPO_PUBLIC_FE_BASE_URL` values. Only with all three: follow `docs/release.md` §0 steps 3–4 and §1, commit the `app.json` `projectId` change with the trailer, and report the tmux session `egx-mobile-eas-preview` and log `~/logs/egx-mobile-eas-preview.log`. Expected log tail: `Build finished` and an `https://expo.dev/accounts/…/builds/…` URL. Without the user's go-ahead, stop here and give them the §1 command.

- [ ] **Step 5: Manual device checklist**

Start Metro in tmux and open in Expo Go on the phone (and repeat the starred items on the preview APK if built):
```bash
mkdir -p ~/logs
tmux kill-session -t egx-mobile-metro 2>/dev/null
tmux new -d -s egx-mobile-metro "cd /home/mark/projects/egx-api/egx-api-mobile && npx expo start --tunnel 2>&1 | tee ~/logs/egx-mobile-metro.log"
```
Tell the user the session (`egx-mobile-metro`) and log path, then check by hand and record pass/fail for each:

**Learn**
- [ ] Learn tab opens instantly; hero shows "0 of N read"; first module's cards visible, none faded or blank.
- [ ] Scroll the whole path: every diagram draws (no blank boxes), gradients differ between charts sharing a series, text in SVG is mono.
- [ ] Module pills follow the scroll (active pill always visible); tapping a pill jumps without flashing.
- [ ] Search stays pinned under the header; "stop loss", "t bill", "p e" all return results; count shows in the field; clear button restores the path.
- [ ] Collapse a module, then reopen it.
- [ ] Mark three concepts read → count updates; kill the app, reopen → still 3; "reset" clears.
- [ ] Airplane mode on, fresh launch, scroll to SMA/RSI/Bollinger → static diagrams, no error text. Airplane mode off, scroll to another live concept → "Live · COMI · daily" charts appear (one network call — check Metro log or proxy).
- [ ] Sliders: drag each of the five calculators; values snap to steps (no 30.000001); VoiceOver/TalkBack can adjust them.
- [ ] From Portfolio advice / a stock's "Learn more" (Plans 3/4) → lands on the right card, module opened, ring flashes once; tapping the same link again scrolls again. From Calibration "Learn how to read these →" → lands on the Managing Risk module.
- [ ] With reduce-motion on: deep link scrolls without animation and no flash.
- [ ] Back-to-top button appears after one screen of scrolling and returns to the top.

**Calibration**
- [ ] Opens from the forecast card link; numbers, "said X% → was Y%", the width line and "What we tested and dropped" all render; airplane mode shows the error with Retry.

**Admin** (sign in as an `AUTH_ADMINS` user, then as a normal user)
- [ ] Admin: people icon sits beside Log out; tab bar still has exactly Dashboard/Portfolio/Learn/News.
- [ ] Normal user: no people icon; typing the `/admin` deep link does not show user management.
- [ ] Add user with generated password → sheet shows Link/Username/Password; "Copy link, username & password" pastes the 3-line block into a chat; "Copy password only" pastes just the password; swiping the sheet away before copying asks first.
- [ ] Your own card says "This is you" and has no Disable/Delete.
- [ ] Reset password asks with the web's wording, then shows the new password once.
- [ ] Disable/enable another user; delete a throwaway user (confirmation names what is lost).

**Release** (*)
- [ ] * Launcher icon is the dark EGX tile; Android adaptive icon not clipped in circle/squircle masks; themed (monochrome) icon shows on Android 13+.
- [ ] * Splash is the mark on `#0a0a0f`, no white flash; status bar light-on-dark everywhere; app name "EGX Analytics".

Report any failure as a bug with the step that failed; do not mark the plan complete until every item passes or the user accepts the exception.

---

## Self-review (run by the plan author)

1. **Scope coverage.** Learn: LearnClient → Tasks 8–9; curriculum decision + web refactor → Tasks 1–3; visuals → 4; widgets + slider choice → 5; LiveChart via viewability → 6/8; ConceptCard → 7; `concept` param scroll/open/flash → 9; AsyncStorage wrapped → 7. Calibration → 10. Admin page/table cards/create/password reveal (expo-clipboard, `EXPO_PUBLIC_FE_BASE_URL`)/header button/guard → 11–12. Release: name, icons/splash from `public/icons` on `#0a0a0f`, app.json ids (user-confirmable), dark UI, eas.json three profiles, `SKIP_SHARED_CHECK=1`, APK preview command, project CLAUDE.md, store steps documented not executed → 13–14. Final manual checklist → 14. Every task ends with `npm run verify` + trailer commit (web tasks: tsc + parity + build, since that repo has no verify script).
2. **Placeholder scan.** No TBD/TODO. The two judgement points are explicit and bounded: assumptions A1–A9 (each says what to adapt), and the Task 8 deep-link placeholder block, which Task 9 replaces with full code by exact marker text.
3. **Type consistency.** `VisualSpec`/`specProps` (Task 1) used identically in both renderers; `LearnRow` keys (`m-`, `o-`, `c-`, `r-`) shared by `rows.ts`, the tests and `resolveTarget`; `ConceptCard.flash: number` and `FLASH_MS` match between Tasks 7–9; `loadLiveAnalysis`/`resetLiveAnalysisForTests` match Task 6 tests; `feBaseUrl`/`normalizeBaseUrl` match Tasks 11–12; `PasswordRevealSheet` takes `appUrl` everywhere.
4. **Review Focus.** Each of the five has a named test in its owning task (7, 9, 9, 9, 4+6).
