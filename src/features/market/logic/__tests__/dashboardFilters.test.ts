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
