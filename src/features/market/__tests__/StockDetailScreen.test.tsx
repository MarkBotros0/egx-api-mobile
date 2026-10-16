import { fireEvent, screen, userEvent, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiMarket, setApiMarket } from "@/shared/api";
import { renderWithProviders } from "@/test-utils/render";
import type { ChartInterval } from "../logic/stockDetail";
import { StockDetailScreen, WatchStarButton } from "../StockDetailScreen";
import { fail, marketPrefRoutes, mockMarketApi, requestsTo, type Route } from "../testing/api";
import { lastChartProps } from "../testing/chartsMock";
import { EG_FALLBACK } from "@/shared/markets";
import { makeAnalysis, US_MARKET } from "../testing/fixtures";

// The shared stub, but Stack.Screen renders the header's right side so the star can be asserted.
jest.mock("expo-router", () => {
  const actual = jest.requireActual("@/features/market/testing/expoRouterMock");
  const { createElement: h } = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");
  const Screen = ({ options }: { options?: { headerRight?: () => unknown } }) =>
    h(View, { testID: "header-right" }, options?.headerRight?.() ?? null);
  return { ...actual, Stack: Object.assign(() => null, { ...actual.Stack, Screen }) };
});
jest.mock("@/charts", () => jest.requireActual("@/features/market/testing/chartsMock"));

beforeEach(async () => {
  jest.clearAllMocks();
  // A market choice made by one test must not leak into the next.
  await AsyncStorage.clear();
  setApiMarket("EG");
});

async function renderStock(routes: Record<string, Route> = {}, initialInterval: ChartInterval = "Daily") {
  const fetchMock = mockMarketApi(routes);
  await renderWithProviders(<StockDetailScreen symbol="COMI" initialInterval={initialInterval} />);
  await screen.findByText("Technical Condition");
  return fetchMock;
}

const analysisCalls = (fetchMock: ReturnType<typeof mockMarketApi>) => requestsTo(fetchMock, "/analysis");

it("loads the analysis and names the company (the top bar carries the ticker)", async () => {
  const fetchMock = await renderStock();
  expect(screen.getByText("Commercial International Bank")).toBeTruthy();
  expect(screen.getByText("Daily · 200 bars")).toBeTruthy();
  const [first] = analysisCalls(fetchMock);
  expect(first.searchParams.get("symbol")).toBe("COMI");
  expect(first.searchParams.get("interval")).toBe("Daily");
  expect(first.searchParams.get("bars")).toBe("200");
});

it("opens on the interval the dashboard card was scored on", async () => {
  const fetchMock = await renderStock({}, "Monthly");
  expect(analysisCalls(fetchMock)[0].searchParams.get("interval")).toBe("Monthly");
  expect(screen.getByText("on monthly bars")).toBeTruthy();
});

it("re-scores on another interval and says so", async () => {
  const fetchMock = await renderStock();
  await fireEvent.press(screen.getByText("Weekly"));
  expect(await screen.findByText("on weekly bars")).toBeTruthy();
  expect(screen.getByText("Daily is the primary view for timing")).toBeTruthy();
  expect(analysisCalls(fetchMock).some((u) => u.searchParams.get("interval") === "Weekly")).toBe(true);
});

it("changes how much history it loads", async () => {
  await renderStock();
  await fireEvent.press(screen.getByText("500"));
  expect(await screen.findByText("Daily · 500 bars")).toBeTruthy();
});

it("starts with SMA 20 and Trendlines on and toggles overlays", async () => {
  await renderStock();
  expect(lastChartProps("PriceChart")?.overlays).toMatchObject({ sma20: true, trendlines: true, sma50: false });
  expect(lastChartProps("PriceChart")?.supports).toHaveLength(3);
  await fireEvent.press(screen.getByLabelText("SMA 50 overlay"));
  expect(lastChartProps("PriceChart")?.overlays).toMatchObject({ sma50: true });
});

it("explains an overlay on long-press", async () => {
  await renderStock();
  await fireEvent(screen.getByLabelText("Trendlines overlay"), "longPress");
  expect(await screen.findByText(/three pivot lows/)).toBeTruthy();
});

it("keeps the indicator panel collapsed until asked", async () => {
  await renderStock();
  expect(screen.queryByTestId("chart-IndicatorPanel")).toBeNull();
  await fireEvent.press(screen.getByText("Technical Indicators"));
  expect(screen.getByTestId("chart-IndicatorPanel")).toBeTruthy();
});

it("the top-bar star adds the stock to the watchlist", async () => {
  const fetchMock = await renderStock();
  await renderWithProviders(<WatchStarButton symbol="COMI" />);
  await fireEvent.press(screen.getByLabelText("Add to watchlist"));
  expect(await screen.findByLabelText("Watching — remove from watchlist")).toBeTruthy();
  await waitFor(() => expect(requestsTo(fetchMock, "/watchlist", "POST")).toHaveLength(1));
});

it("shows the error and retries", async () => {
  let calls = 0;
  mockMarketApi({ "/analysis": () => (++calls === 1 ? fail(500, "Symbol not found") : makeAnalysis()) });
  await renderWithProviders(<StockDetailScreen symbol="COMI" initialInterval="Daily" />);
  expect(await screen.findByText("Symbol not found")).toBeTruthy();
  await fireEvent.press(screen.getByText("Retry"));
  expect(await screen.findByText("Technical Condition")).toBeTruthy();
});

it("pull-to-refresh refetches without blanking the page", async () => {
  const fetchMock = await renderStock();
  await userEvent.pullToRefresh(screen.getByTestId("stock-scroll"));
  expect(screen.getByText("Technical Condition")).toBeTruthy();
  await waitFor(() => expect(analysisCalls(fetchMock)).toHaveLength(2));
});

it("refetches after the score weights are saved", async () => {
  const fetchMock = await renderStock();
  await fireEvent.press(screen.getByLabelText("Adjust weights"));
  await fireEvent.press(await screen.findByLabelText("Increase Trend weight"));
  await fireEvent.press(screen.getByText("Save"));
  await waitFor(() => expect(analysisCalls(fetchMock)).toHaveLength(2));
});

it("keeps the analysis on screen when a refresh fails", async () => {
  let calls = 0;
  mockMarketApi({ "/analysis": () => (++calls === 1 ? makeAnalysis() : fail(500, "down")) });
  await renderWithProviders(<StockDetailScreen symbol="COMI" initialInterval="Daily" />);
  await screen.findByText("Technical Condition");
  await userEvent.pullToRefresh(screen.getByTestId("stock-scroll"));
  expect(await screen.findByText("Couldn't refresh — showing the last loaded data")).toBeTruthy();
  expect(screen.getByText("Technical Condition")).toBeTruthy();
});

it("a deep link into the other market fetches that market without switching the app", async () => {
  const fetchMock = mockMarketApi({});
  await renderWithProviders(<StockDetailScreen symbol="COMI" initialInterval="Daily" market="US" />);
  await screen.findByText("Technical Condition");
  const [first] = analysisCalls(fetchMock);
  expect(first.searchParams.getAll("market")).toEqual(["US"]);
  expect(first.searchParams.getAll("symbol")).toEqual(["COMI"]);
  expect(first.searchParams.get("interval")).toBe("Daily");
  expect(getApiMarket()).toBe("EG");
  // The self-fetching cards and the P/E banner read the linked market too.
  await waitFor(() => expect(requestsTo(fetchMock, "/risk")).toHaveLength(1));
  await waitFor(() => expect(requestsTo(fetchMock, "/pe")).toHaveLength(1));
  for (const path of ["/risk", "/pe"]) {
    expect(requestsTo(fetchMock, path)[0].searchParams.getAll("market")).toEqual(["US"]);
  }
  expect(requestsTo(fetchMock, "/risk")[0].searchParams.get("symbol")).toBe("COMI");
  // Dividend history reads the linked market's store too.
  await waitFor(() => expect(requestsTo(fetchMock, "/dividend_history")).toHaveLength(1));
  expect(requestsTo(fetchMock, "/dividend_history")[0].searchParams.getAll("market")).toEqual(["US"]);
});

it("shows the dividend history card on an EG stock", async () => {
  const fetchMock = await renderStock();
  expect(await screen.findByText("Dividend History")).toBeTruthy();
  expect(requestsTo(fetchMock, "/dividend_history")[0].searchParams.getAll("market")).toEqual(["EG"]);
});

it("shows the US dividend history with no Egyptian facts when the app is on US", async () => {
  const fetchMock = mockMarketApi(marketPrefRoutes("US"));
  await renderWithProviders(<StockDetailScreen symbol="AAPL" initialInterval="Daily" />);
  await waitFor(() =>
    expect(analysisCalls(fetchMock).some((u) => u.searchParams.get("market") === "US")).toBe(true)
  );
  await screen.findByText("Technical Condition");
  // US risk grades are not calibrated: the card is absent and never asks.
  expect(requestsTo(fetchMock, "/risk").some((u) => u.searchParams.get("market") === "US")).toBe(false);
  expect(screen.queryByText("Risk grade")).toBeNull();
  expect(screen.queryByText(/thinly traded/)).toBeNull();
  expect(await screen.findByText("Dividend History")).toBeTruthy();
  await waitFor(() =>
    expect(requestsTo(fetchMock, "/dividend_history").some((u) => u.searchParams.get("market") === "US")).toBe(true)
  );
  await fireEvent.press(screen.getByText("Dividend History"));
  expect(screen.getByText(/Amounts are gross, as reported, before any tax/)).toBeTruthy();
  expect(screen.queryByText(/withholding|EGX publishes/)).toBeNull();
  // Key Statistics explains beta against the US benchmark.
  await fireEvent.press(screen.getByText("Beta"));
  expect(screen.getByText("Beta vs S&P 500")).toBeTruthy();
});

it("a US deep link from an EG app tags the score preliminary and shows no risk grade", async () => {
  const fetchMock = mockMarketApi({ "/markets": { markets: [EG_FALLBACK, US_MARKET], default: "EG" } });
  await renderWithProviders(<StockDetailScreen symbol="AAPL" initialInterval="Daily" market="US" />);
  await screen.findByText("Technical Condition");
  expect(getApiMarket()).toBe("EG");
  expect(await screen.findByText("Preliminary")).toBeTruthy();
  await waitFor(() => expect(requestsTo(fetchMock, "/pe")).toHaveLength(1));
  expect(requestsTo(fetchMock, "/risk")).toHaveLength(0);
  expect(screen.queryByText("Risk grade")).toBeNull();
  expect(screen.queryByText(/thinly traded/)).toBeNull();
});

it("an EG stock in an EG app carries no preliminary tag", async () => {
  mockMarketApi({ "/markets": { markets: [EG_FALLBACK, US_MARKET], default: "EG" } });
  await renderWithProviders(<StockDetailScreen symbol="COMI" initialInterval="Daily" />);
  await screen.findByText("Technical Condition");
  expect(screen.queryByText("Preliminary")).toBeNull();
});

it("hides the watch star on another market's stock (the watchlist is this market's)", async () => {
  mockMarketApi({});
  await renderWithProviders(<StockDetailScreen symbol="AAPL" initialInterval="Daily" market="US" />);
  await screen.findByText("Technical Condition");
  expect(screen.queryByLabelText("Add to watchlist")).toBeNull();
});

it("shows the watch star in the header for this market's stock", async () => {
  await renderStock();
  expect(screen.getByLabelText("Add to watchlist")).toBeTruthy();
});

it("without a deep-linked market, fetches in the app's market", async () => {
  const fetchMock = await renderStock();
  expect(analysisCalls(fetchMock)[0].searchParams.getAll("market")).toEqual(["EG"]);
});
