import { mockFetchHandler } from "@/test-utils/fetch";
import { DEFAULT_WEIGHTS, FALLBACK_WEIGHT_PRESETS } from "@/shared/constants";
import { EG_FALLBACK } from "@/shared/markets";
import { batch, DASHBOARD, DIVIDEND_HISTORY, makeAnalysis, REGIME, TICKERS, US_MARKET } from "./fixtures";

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
  "/analysis": (url: URL) =>
    url.searchParams.get("mode") === "batch"
      ? batch({})
      : makeAnalysis({
          interval: url.searchParams.get("interval") ?? "Daily",
          bars: Number(url.searchParams.get("bars") ?? 200),
        }),
  // An unmeasured symbol is a 404 — a normal state, the card renders nothing.
  "/risk": reply(404, { detail: "Not measured yet" }),
  "/dividend_history": DIVIDEND_HISTORY,
  "/pe": () => ({ last_successful_fetch: new Date().toISOString(), last_attempt_status: "ok" }),
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
  return globalThis.fetch as jest.Mock;
}

/** Every request made to `path` with `method`, as parsed URLs, oldest first. */
export function requestsTo(fetchMock: FetchMock, path: string, method = "GET"): URL[] {
  return fetchMock.mock.calls
    .filter(([, init]) => (((init as RequestInit | undefined)?.method ?? "GET").toUpperCase() === method))
    .map(([input]) => new URL(String(input), "http://localhost"))
    .filter((u) => u.pathname.endsWith(path));
}

/** Routes for a user whose saved market is `code`, with EG and US enabled. */
export function marketPrefRoutes(code: "EG" | "US"): Record<string, Route> {
  return {
    "/markets": { markets: [EG_FALLBACK, US_MARKET], default: "EG" },
    "/settings": (url: URL, init?: RequestInit) =>
      url.searchParams.get("section") === "market"
        ? { market: code }
        : (DEFAULTS["/settings"] as (u: URL, i?: RequestInit) => unknown)(url, init),
  };
}
