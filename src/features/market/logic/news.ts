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

/** "https://www.arabfinance.com/en/…" → "arabfinance.com": where a story opens. */
export function storySite(url: string): string {
  const m = /^[a-z]+:\/\/(?:www\.)?([^/?#:]+)/i.exec(url);
  return m ? m[1].toLowerCase() : "the publisher's site";
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
