import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { useMarket } from "@/providers/market";
import { searchTickers } from "@/shared/api";
import { EG_FALLBACK, type Market } from "@/shared/markets";
import type { TickerSearchResult } from "@/shared/types";
import { stockDetailHref } from "../links";
import { RemoteSearchResults } from "../RemoteSearchResults";
import { US_MARKET } from "../testing/fixtures";

jest.mock("expo-router", () => jest.requireActual("@/features/market/testing/expoRouterMock"));
jest.mock("@/providers/market", () => ({ useMarket: jest.fn() }));
jest.mock("@/shared/api", () => ({ ...jest.requireActual("@/shared/api"), searchTickers: jest.fn() }));

const search = searchTickers as jest.MockedFunction<typeof searchTickers>;

const RESULTS: TickerSearchResult[] = [
  { symbol: "AAPL", name: "Apple Inc.", sector: "Electronic Technology", exchange: "NASDAQ", kind: "stock" },
  { symbol: "RIVN", name: "Rivian Automotive", sector: "Consumer Durables", exchange: "NASDAQ", kind: "stock" },
  { symbol: "SPY", name: "SPDR S&P 500 ETF Trust", sector: "Miscellaneous", exchange: "AMEX", kind: "fund" },
];

function onMarket(market: Market) {
  (useMarket as jest.Mock).mockReturnValue({ market, markets: [EG_FALLBACK, US_MARKET], setMarket: jest.fn(), loading: false });
}

async function renderResults(query: string, opts: { localCount?: number; known?: string[] } = {}) {
  await render(
    <RemoteSearchResults query={query} localCount={opts.localCount ?? 0} knownSymbols={new Set(opts.known ?? [])} />
  );
}

/** Run the debounce and let the search promise settle. */
async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  onMarket(US_MARKET);
  search.mockResolvedValue(RESULTS);
});
afterEach(() => jest.useRealTimers());

it("never searches on EG", async () => {
  onMarket(EG_FALLBACK);
  await renderResults("apple");
  await advance(1000);
  expect(search).not.toHaveBeenCalled();
  expect(screen.toJSON()).toBeNull();
});

it("waits 300ms after typing, then searches once", async () => {
  await renderResults("riv");
  await advance(299);
  expect(search).not.toHaveBeenCalled();
  await advance(1);
  expect(search).toHaveBeenCalledTimes(1);
  expect(search.mock.calls[0][0]).toBe("riv");
  expect(await screen.findByText("More US stocks")).toBeTruthy();
});

it("does not search a one-letter query or when enough local matches show", async () => {
  await renderResults("r");
  await advance(1000);
  await renderResults("bank", { localCount: 5 });
  await advance(1000);
  expect(search).not.toHaveBeenCalled();
});

it("drops symbols the grid already shows and opens a result's stock page", async () => {
  await renderResults("an", { known: ["AAPL"] });
  await advance(300);
  expect(await screen.findByText("RIVN")).toBeTruthy();
  expect(screen.queryByText("AAPL")).toBeNull();
  await fireEvent.press(screen.getByText("RIVN"));
  expect(router.push).toHaveBeenCalledWith(stockDetailHref("RIVN"));
});

it("badges an ETF, and only an ETF", async () => {
  await renderResults("sp");
  await advance(300);
  expect(await screen.findByText("SPY")).toBeTruthy();
  expect(screen.getAllByText("ETF")).toHaveLength(1);
});

it("renders nothing when the search fails", async () => {
  search.mockRejectedValue(new Error("Request failed"));
  await renderResults("riv");
  await advance(300);
  expect(screen.queryByText("More US stocks")).toBeNull();
  expect(screen.toJSON()).toBeNull();
});
