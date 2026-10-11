/**
 * The ONE place portfolio tests touch the fetch mock. Every test calls
 * mockPortfolioApi() and sent(); nothing else imports @/test-utils/fetch.
 *
 * Plan 1's mockFetch(method, path, body, status) APPENDS a route and the most
 * recently registered match wins, so the defaults are registered first and
 * `extra` routes last.
 */
import { fetchCalls, mockFetch } from "@/test-utils/fetch";
import type { Portfolio, PortfolioAnalysisResponse, SalesResponse } from "@/shared/types";
import { analysisResponse, portfolio, salesResponse } from "./fixtures";

export interface Route {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  path: string | RegExp;
  status?: number;
  body?: unknown;
}
export type FetchMock = jest.Mock;

export interface ApiOverrides {
  portfolio?: Portfolio;
  analysis?: PortfolioAnalysisResponse;
  /** Replaces the analysis route entirely, e.g. a 500. */
  analysisStatus?: number;
  sales?: SalesResponse;
  pe?: { last_successful_fetch: string | null; last_attempt_status: string | null };
  /** Registered last, so they win over the defaults below. */
  extra?: Route[];
}

export function mockPortfolioApi(o: ApiOverrides = {}): FetchMock {
  const routes: Route[] = [
    o.analysisStatus
      ? { method: "GET", path: "/portfolio_analysis", status: o.analysisStatus, body: { detail: "Analysis timed out" } }
      : { method: "GET", path: "/portfolio_analysis", body: o.analysis ?? analysisResponse() },
    { method: "GET", path: "/portfolio", body: o.portfolio ?? portfolio() },
    { method: "POST", path: "/portfolio", body: { id: "new1" } },
    { method: "PUT", path: "/portfolio", body: { id: "lotA" } },
    { method: "DELETE", path: "/portfolio", body: { deleted: "lotA" } },
    { method: "GET", path: "/sales", body: o.sales ?? salesResponse() },
    { method: "POST", path: "/sales", body: { sales: [], holdings: [] } },
    { method: "DELETE", path: "/sales", body: { deleted: "o1", holding_id: "lotA", restored_quantity: 100 } },
    { method: "POST", path: "/dividends", body: { dividend: { id: "d9" } } },
    { method: "DELETE", path: "/dividends", body: { deleted: "d1" } },
    {
      method: "GET",
      path: "/pe",
      body: { data: [], ...(o.pe ?? { last_successful_fetch: new Date().toISOString(), last_attempt_status: "ok" }) },
    },
    ...(o.extra ?? []),
  ];
  for (const r of routes) mockFetch(r.method ?? "GET", r.path, r.body ?? {}, r.status ?? 200);
  // jest.setup.ts installs a fresh jest.fn() as globalThis.fetch before every test.
  return globalThis.fetch as jest.Mock;
}

export interface SentRequest {
  method: string;
  url: string;
  body: unknown;
}

/** Requests the code under test sent to `path` (pathname suffix, query ignored). */
export function sent(_fetchMock: FetchMock, method: string, path: string): SentRequest[] {
  return fetchCalls()
    .filter((c) => c.method === method.toUpperCase() && c.url.split("?")[0].endsWith(path))
    .map((c) => ({ method: c.method, url: c.url, body: c.body ?? undefined }));
}
