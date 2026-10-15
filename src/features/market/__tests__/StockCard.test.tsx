import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { renderWithProviders } from "@/test-utils/render";
import { stockDetailHref } from "../links";
import { StockCard } from "../StockCard";
import { marketPrefRoutes, mockMarketApi } from "../testing/api";

jest.mock("expo-router", () => jest.requireActual("@/features/market/testing/expoRouterMock"));
jest.mock("@/charts", () => jest.requireActual("@/features/market/testing/chartsMock"));

const base = { symbol: "COMI", name: "Commercial International Bank", sector: "Banking" };

beforeEach(() => {
  jest.clearAllMocks();
  mockMarketApi();
});

it("shows a live price with its session and fetch age", async () => {
  await renderWithProviders(
    <StockCard {...base} price={82.5} change={1.2} changePct={1.48} state="live" asOf="2 Sep" fetchedAgo="14s ago" />
  );
  expect(screen.getByText("82.50")).toBeTruthy();
  expect(screen.getByText("+1.20 (+1.48%)")).toBeTruthy();
  expect(screen.getByText("2 Sep close · 14s ago")).toBeTruthy();
});

it("says Market closed instead of a climbing age", async () => {
  await renderWithProviders(
    <StockCard {...base} price={82.5} change={1.2} changePct={1.48} state="stale" asOf="3 Sep" isToday fetchedAgo="2h 5m ago" marketClosed />
  );
  expect(screen.getByText("3 Sep close · Market closed")).toBeTruthy();
});

it("shows the score number when given", async () => {
  await renderWithProviders(
    <StockCard {...base} price={1} changePct={0} compositeScore={72.4} compositeSignal="Strong" />
  );
  expect(screen.getByText("72")).toBeTruthy();
  expect(screen.queryByText("Banking")).toBeNull();
});

it("shows the sector when there is no score", async () => {
  await renderWithProviders(<StockCard {...base} price={1} changePct={0} compositeScore={null} />);
  expect(screen.getByText("Banking")).toBeTruthy();
});

it("shows the risk band as a word beside its dot", async () => {
  await renderWithProviders(
    <StockCard {...base} price={1} changePct={0} riskBand="calm" riskBandLabel="Calm" />
  );
  expect(screen.getByText("Calm")).toBeTruthy();
});

it("hides the risk band on a card with no feed", async () => {
  await renderWithProviders(<StockCard {...base} state="unavailable" riskBand="calm" riskBandLabel="Calm" />);
  expect(screen.queryByText("Calm")).toBeNull();
  expect(screen.getByText("No price feed")).toBeTruthy();
});

it("says which bar a non-daily change covers", async () => {
  await renderWithProviders(<StockCard {...base} price={1} change={0.1} changePct={2} changeInterval="Weekly" />);
  expect(screen.getByText("vs last week")).toBeTruthy();
});

it("shows a skeleton while loading", async () => {
  await renderWithProviders(<StockCard {...base} state="loading" />);
  expect(screen.getByTestId("stockcard-loading")).toBeTruthy();
});

it("retries a failed card without navigating", async () => {
  const onRetry = jest.fn();
  await renderWithProviders(<StockCard {...base} state="failed" onRetry={onRetry} />);
  await fireEvent.press(screen.getByText("Couldn't load — retry"));
  expect(onRetry).toHaveBeenCalledTimes(1);
  expect(router.push).not.toHaveBeenCalled();
});

it("opens the stock on the card's interval", async () => {
  await renderWithProviders(<StockCard {...base} price={1} changePct={0} interval="Weekly" />);
  await fireEvent.press(screen.getByTestId("stockcard-COMI"));
  expect(router.push).toHaveBeenCalledWith(stockDetailHref("COMI", "Weekly"));
});

describe("score caption per market", () => {
  it.each([false, true])("reads prelim on an uncalibrated market (compact: %s)", async (compact) => {
    mockMarketApi(marketPrefRoutes("US"));
    await renderWithProviders(
      <StockCard {...base} price={1} changePct={0} compositeScore={61} compact={compact} />
    );
    expect(await screen.findByText("prelim")).toBeTruthy();
    expect(screen.queryByText("score")).toBeNull();
  });

  it.each([false, true])("reads score on a calibrated market (compact: %s)", async (compact) => {
    mockMarketApi(marketPrefRoutes("EG"));
    await renderWithProviders(
      <StockCard {...base} price={1} changePct={0} compositeScore={61} compact={compact} />
    );
    expect(await screen.findByText("score")).toBeTruthy();
    expect(screen.queryByText("prelim")).toBeNull();
  });
});
