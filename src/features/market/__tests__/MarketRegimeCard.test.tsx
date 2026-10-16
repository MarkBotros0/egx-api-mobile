import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import * as marketProvider from "@/providers/market";
import { EG_FALLBACK } from "@/shared/markets";
import { router } from "expo-router";
import { learnHref } from "@/lib/links";
import { renderWithProviders } from "@/test-utils/render";
import { MarketRegimeCard } from "../MarketRegimeCard";
import { fail, mockMarketApi, requestsTo } from "../testing/api";
import { REGIME, US_MARKET } from "../testing/fixtures";

jest.mock("expo-router", () => jest.requireActual("@/features/market/testing/expoRouterMock"));

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

it("shows the reading, its history and breadth", async () => {
  mockMarketApi();
  await renderWithProviders(<MarketRegimeCard />);
  expect(await screen.findByText("Mixed")).toBeTruthy();
  expect(screen.getByText("52.3")).toBeTruthy();
  expect(screen.getByText("avg of 61 / 79")).toBeTruthy();
  expect(screen.getByText(/were positive 58% of the time — and negative or flat the other 42%/)).toBeTruthy();
  expect(screen.getByText(/does not clear the usual significance bar/)).toBeTruthy();
  expect(screen.getByText("62% above their 200-day average")).toBeTruthy();
  expect(screen.getByText(/On EGX history that has leaned the wrong way/)).toBeTruthy();
});

it("says breadth is still filling in when there are too few stocks", async () => {
  mockMarketApi({
    "/market_regime": { ...REGIME, breadth: { n_symbols: 9, enough_data: false } },
  });
  await renderWithProviders(<MarketRegimeCard />);
  expect(await screen.findByText(/Needs at least 15 measured stocks; 9 are in/)).toBeTruthy();
});

it("links to the Learn concept", async () => {
  mockMarketApi();
  await renderWithProviders(<MarketRegimeCard />);
  await fireEvent.press(await screen.findByText("What does this mean? →"));
  expect(router.push).toHaveBeenCalledWith(learnHref("market_condition"));
});

it("renders nothing when the reading fails", async () => {
  mockMarketApi({ "/market_regime": fail(500) });
  await renderWithProviders(<MarketRegimeCard />);
  await waitFor(() => expect(screen.queryByTestId("regime-skeleton")).toBeNull());
  expect(screen.queryByText("Market Condition")).toBeNull();
});

const asUS = () =>
  jest.spyOn(marketProvider, "useMarket").mockReturnValue({
    market: US_MARKET,
    markets: [EG_FALLBACK, US_MARKET],
    setMarket: jest.fn(),
    loading: false,
  });

it("on US shows the US reading with US labels and no EGX history", async () => {
  mockMarketApi({
    "/market_regime": {
      ...REGIME,
      universe_label: "S&P 500",
      breadth: { ...REGIME.breadth!, evidence: undefined },
    },
  });
  asUS();
  await renderWithProviders(<MarketRegimeCard />);
  expect(await screen.findByText("Mixed")).toBeTruthy();
  expect(screen.getByText(/the S&P 500's next 63 trading days/)).toBeTruthy();
  expect(screen.queryByText(/EGX/)).toBeNull();
});

it("renders nothing when the market's own measurement hides the reading", async () => {
  mockMarketApi({ "/market_regime": { market: "US", band: null, hidden: true, n_symbols: 0 } });
  asUS();
  await renderWithProviders(<MarketRegimeCard />);
  await waitFor(() => expect(screen.queryByTestId("regime-skeleton")).toBeNull());
  expect(screen.queryByText("Market Condition")).toBeNull();
});

it("skips the fetch and the skeleton when the market says the reading is hidden", async () => {
  const fetchMock = mockMarketApi();
  jest.spyOn(marketProvider, "useMarket").mockReturnValue({
    market: { ...US_MARKET, regime_shown: false },
    markets: [EG_FALLBACK, US_MARKET],
    setMarket: jest.fn(),
    loading: false,
  });
  await renderWithProviders(<MarketRegimeCard />);
  expect(screen.queryByTestId("regime-skeleton")).toBeNull();
  await new Promise((r) => setTimeout(r, 0));
  expect(requestsTo(fetchMock, "/market_regime")).toEqual([]);
});
