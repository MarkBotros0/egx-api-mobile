import { DASHBOARD, TICKERS, US_MARKET, US_TICKERS } from "@/features/market/testing/fixtures";
import { EG_FALLBACK } from "@/shared/markets";
import { cardsFromSnapshot } from "../cards";
import {
  filterDividendPayers,
  filterTickers,
  indexLabel,
  indexTabs,
  pageSlice,
  SECTORS,
  sectorsFor,
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

describe("per-market index tabs", () => {
  it("lists the market's indices, then All", () => {
    expect(indexTabs(US_MARKET)).toEqual(["SPX", "NDX", "DJI", "All"]);
    expect(indexTabs(EG_FALLBACK)).toEqual(["EGX30", "EGX70", "EGX100", "NILEX", "All"]);
  });
  it("falls back to the EG tabs when the market lists no indices", () => {
    // The EGX tabs are EG's own; another market without a list gets "All".
    expect(indexTabs({ ...US_MARKET, indices: [] })).toEqual(["All"]);
    expect(indexTabs({ ...EG_FALLBACK, indices: [] })).toEqual(["EGX30", "EGX70", "EGX100", "NILEX", "All"]);
  });
  it("labels an index id, or echoes it", () => {
    expect(indexLabel(US_MARKET, "SPX")).toBe("S&P 500");
    expect(indexLabel(US_MARKET, "All")).toBe("All");
    expect(indexLabel(EG_FALLBACK, "EGX30")).toBe("EGX30");
  });
  it("filters on every index a ticker belongs to", () => {
    const f = { index: "DJI", sector: "All Sectors", search: "" };
    expect(symbols(filterTickers(US_TICKERS, f))).toEqual(["AAPL", "KO"]);
    expect(symbols(filterTickers(US_TICKERS, { ...f, index: "NDX" }))).toEqual(["AAPL"]);
  });
});

describe("sectorsFor", () => {
  it("keeps the fixed EG list", () => {
    expect(sectorsFor(EG_FALLBACK, TICKERS)).toEqual([...SECTORS]);
  });
  it("derives the other markets' sectors from the tickers: sorted, unique, no Unknown", () => {
    expect(sectorsFor(US_MARKET, [...US_TICKERS, US_TICKERS[2]])).toEqual([
      "All Sectors", "Consumer Non-Durables", "Electronic Technology", "Technology Services",
    ]);
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
