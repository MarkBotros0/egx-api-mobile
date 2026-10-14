import { fireEvent, screen, userEvent, waitFor } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils/render";
import type { ChartInterval } from "../logic/stockDetail";
import { StockDetailScreen, WatchStarButton } from "../StockDetailScreen";
import { fail, mockMarketApi, requestsTo, type Route } from "../testing/api";
import { lastChartProps } from "../testing/chartsMock";
import { makeAnalysis } from "../testing/fixtures";

jest.mock("expo-router", () => jest.requireActual("@/features/market/testing/expoRouterMock"));
jest.mock("@/charts", () => jest.requireActual("@/features/market/testing/chartsMock"));

beforeEach(() => jest.clearAllMocks());

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
