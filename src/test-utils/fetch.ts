// A fake backend for tests. Register responses by method + path (the part
// after the /api base, without the query string) or a RegExp over the full
// URL. The most recent matching registration wins. Any unregistered request
// fails the test loudly instead of silently hanging.
type Reply = { status: number; body: unknown };
type Handler = (url: string, init?: RequestInit) => Reply | Promise<Reply>;
type Route = { method: string; path: string | RegExp; status: number; body: unknown; networkError?: boolean; handler?: Handler };
type Call = { method: string; url: string; headers: Record<string, string>; body: unknown };

let routes: Route[] = [];
let calls: Call[] = [];

const BASE = "https://api.test/api";

function matches(route: Route, method: string, url: string): boolean {
  if (route.method !== method) return false;
  if (route.path instanceof RegExp) return route.path.test(url);
  const pathOnly = url.replace(BASE, "").split("?")[0];
  return pathOnly === route.path;
}

export function mockFetch(method: string, path: string | RegExp, body: unknown, status = 200): void {
  routes.push({ method: method.toUpperCase(), path, body, status });
}

/** Answer with a function of the request — for routes whose reply depends on the query or body. */
export function mockFetchHandler(method: string, path: string | RegExp, handler: Handler): void {
  routes.push({ method: method.toUpperCase(), path, body: null, status: 200, handler });
}

export function mockFetchNetworkError(method: string, path: string | RegExp): void {
  routes.push({ method: method.toUpperCase(), path, body: null, status: 0, networkError: true });
}

export function fetchCalls(): Call[] {
  return calls;
}

export function installFetchMock(): void {
  routes = [];
  calls = [];
  globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    const headers: Record<string, string> = {};
    new Headers(init?.headers ?? {}).forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : init?.body ?? null;
    calls.push({ method, url, headers, body });

    const route = [...routes].reverse().find((r) => matches(r, method, url));
    if (!route) throw new Error(`Unmocked fetch: ${method} ${url}`);
    if (route.networkError) throw new TypeError("Network request failed");
    const { status, body: replyBody } = route.handler
      ? await route.handler(url, init)
      : { status: route.status, body: route.body };
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => replyBody,
    } as Response;
  }) as typeof fetch;
}
