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
