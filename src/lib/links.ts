import type { Href } from "expo-router";

/** Mobile equivalents of the web's paths. See the roadmap's route map. */
export const routes = {
  dashboard: "/",
  portfolio: "/portfolio",
  learn: "/learn",
  news: "/news",
  compare: "/compare",
  dividends: "/dividends",
  calibration: "/calibration",
  admin: "/admin",
  alerts: "/alerts",
  account: "/account",
} as const;

export function stockHref(symbol: string): Href {
  return { pathname: "/stock/[symbol]", params: { symbol: symbol.toUpperCase() } };
}

/**
 * The web deep-links concepts as /learn#<id>, with ids chosen by the backend
 * (signal.learn_concept) — a public contract. Mobile carries the same id in a
 * `concept` param, which the Learn screen scrolls to.
 */
export function learnHref(conceptId?: string): Href {
  return conceptId ? { pathname: "/learn", params: { concept: conceptId } } : routes.learn;
}
