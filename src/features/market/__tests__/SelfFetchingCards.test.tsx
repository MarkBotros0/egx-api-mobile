import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { learnHref, routes } from "@/lib/links";
import { EG_FALLBACK } from "@/shared/markets";
import { renderWithProviders } from "@/test-utils/render";
import { DividendHistoryCard } from "../DividendHistoryCard";
import { ForecastCard } from "../ForecastCard";
import { RiskGradeCard } from "../RiskGradeCard";
import { fail, marketPrefRoutes, mockMarketApi, requestsTo } from "../testing/api";
import { DIVIDEND_HISTORY, FORECAST, RISK, US_MARKET } from "../testing/fixtures";

jest.mock("expo-router", () => jest.requireActual("@/features/market/testing/expoRouterMock"));

beforeEach(() => jest.clearAllMocks());

describe("RiskGradeCard", () => {
  it("names the stock's own market in a calibrated US grade", async () => {
    const US_CAL = { ...US_MARKET, score_calibrated: true };
    mockMarketApi({
      "/markets": { markets: [EG_FALLBACK, US_CAL], default: "EG" },
      "/risk": { ...RISK, liquidity_floor: 20_000_000, data: [{ ...RISK.data[0], symbol: "AAPL" }] },
    });
    await renderWithProviders(<RiskGradeCard symbol="AAPL" market="US" />);
    expect(await screen.findByText("moves least of the tradeable US names")).toBeTruthy();
    expect(screen.getByText(/across 140 US stocks/)).toBeTruthy();
    expect(screen.queryByText(/EGX/)).toBeNull();
  });

  it("grades how much the stock moves, never which way", async () => {
    mockMarketApi({ "/risk": RISK });
    await renderWithProviders(<RiskGradeCard symbol="COMI" />);
    expect(await screen.findByText("moves least of the tradeable EGX names")).toBeTruthy();
    expect(screen.getByText("18th percentile of 140 tradeable stocks")).toBeTruthy();
    expect(screen.getByText("24%")).toBeTruthy();
    expect(screen.getByText("−12%")).toBeTruthy();
    expect(screen.getByText("−21%")).toBeTruthy();
    expect(screen.getByText("Its own swing: 24%/yr")).toBeTruthy();
    expect(screen.getByText("Beta 1.05")).toBeTruthy();
    expect(screen.getByText(/Measured on 9,120 past checks across 140 EGX stocks/)).toBeTruthy();
  });

  it("gives a thinly traded stock no grade", async () => {
    mockMarketApi({ "/risk": { ...RISK, data: [{ ...RISK.data[0], band: null, pct_rank: null, historical: undefined }] } });
    await renderWithProviders(<RiskGradeCard symbol="COMI" />);
    expect(await screen.findByText("Too thinly traded to grade")).toBeTruthy();
    expect(screen.getByText("Its own recent swing: 24%/yr")).toBeTruthy();
  });

  it("never shows another stock's row", async () => {
    mockMarketApi({ "/risk": RISK });
    await renderWithProviders(<RiskGradeCard symbol="TMGH" />);
    await waitFor(() => expect(screen.queryByTestId("risk-skeleton")).toBeNull());
    expect(screen.queryByText(/percentile/)).toBeNull();
  });

  // What /api/risk?market=US actually answers: US has no liquidity floors, so
  // nothing is tradeable, every band is null and the floor is null.
  const US_RISK = {
    ...RISK,
    n_ranked: 0,
    liquidity_floor: null,
    calibration: undefined,
    data: [{ ...RISK.data[0], symbol: "AAPL", tradeable: false, band: null, band_label: null, pct_rank: null, quintile: null, historical: undefined }],
  };

  it("keeps grading EG stocks when the server names a floor", async () => {
    mockMarketApi({ "/risk": { ...RISK, liquidity_floor: 1_000_000 } });
    await renderWithProviders(<RiskGradeCard symbol="COMI" />);
    expect(await screen.findByText("moves least of the tradeable EGX names")).toBeTruthy();
  });

  it("renders nothing for a deep link into an uncalibrated market", async () => {
    const fetchMock = mockMarketApi({ "/markets": { markets: [EG_FALLBACK, US_MARKET], default: "EG" }, "/risk": US_RISK });
    await renderWithProviders(<RiskGradeCard symbol="AAPL" market="US" />);
    await waitFor(() => expect(requestsTo(fetchMock, "/markets").length).toBeGreaterThan(0));
    await waitFor(() => expect(screen.queryByTestId("risk-skeleton")).toBeNull());
    expect(screen.queryByText("Risk grade")).toBeNull();
    expect(screen.queryByText(/thinly traded/)).toBeNull();
    expect(screen.queryByText(/EGX/)).toBeNull();
  });

  it("renders nothing when the APP is on an uncalibrated market", async () => {
    const fetchMock = mockMarketApi({ ...marketPrefRoutes("US"), "/risk": US_RISK });
    await renderWithProviders(<RiskGradeCard symbol="AAPL" />);
    await waitFor(() => expect(requestsTo(fetchMock, "/settings").length).toBeGreaterThan(0));
    await waitFor(() => expect(screen.queryByTestId("risk-skeleton")).toBeNull());
    expect(requestsTo(fetchMock, "/risk").filter((u) => u.searchParams.get("market") === "US")).toHaveLength(0);
    expect(screen.queryByText("Risk grade")).toBeNull();
    expect(screen.queryByText(/thinly traded/)).toBeNull();
  });

  it("renders nothing when the server reports no floor, whatever the market list says", async () => {
    // A deep link whose market the app's list has not described yet falls back
    // to the app's (calibrated) market; the response's null floor still hides it.
    mockMarketApi({ "/risk": US_RISK });
    await renderWithProviders(<RiskGradeCard symbol="AAPL" />);
    await waitFor(() => expect(screen.queryByTestId("risk-skeleton")).toBeNull());
    expect(screen.queryByText("Risk grade")).toBeNull();
    expect(screen.queryByText(/thinly traded/)).toBeNull();
    expect(screen.queryByText(/EGX/)).toBeNull();
  });

  it("renders nothing for an unmeasured symbol (404)", async () => {
    mockMarketApi();
    await renderWithProviders(<RiskGradeCard symbol="COMI" />);
    await waitFor(() => expect(screen.queryByTestId("risk-skeleton")).toBeNull());
    expect(screen.queryByText("Risk grade")).toBeNull();
  });
});

describe("DividendHistoryCard", () => {
  it("lists years and pages through all of them", async () => {
    mockMarketApi();
    await renderWithProviders(<DividendHistoryCard symbol="COMI" />);
    expect(await screen.findByText("2026")).toBeTruthy();
    expect(screen.getByText("6.00")).toBeTruthy();
    expect(screen.queryByText("2018")).toBeNull();
    await fireEvent.press(screen.getByText("Show 4 more — 4 earlier"));
    expect(screen.getByText("2015")).toBeTruthy();
    await fireEvent.press(screen.getByText("Show less"));
    expect(screen.queryByText("2015")).toBeNull();
    expect(screen.getByText(/Typically pays around April · last ex-date 7 Apr 2026/)).toBeTruthy();
  });

  it("says so when there is no history", async () => {
    mockMarketApi({ "/dividend_history": { ...DIVIDEND_HISTORY, dividends: [] } });
    await renderWithProviders(<DividendHistoryCard symbol="COMI" />);
    expect(await screen.findByText("No dividend history on record for this stock.")).toBeTruthy();
  });

  it("degrades to an empty state when the source times out", async () => {
    mockMarketApi({ "/dividend_history": fail(504, "timeout") });
    await renderWithProviders(<DividendHistoryCard symbol="COMI" />);
    expect(await screen.findByText("Dividend history is unavailable right now.")).toBeTruthy();
  });

  it("links to the dividend dates concept", async () => {
    mockMarketApi();
    await renderWithProviders(<DividendHistoryCard symbol="COMI" />);
    await fireEvent.press(await screen.findByText("Learn more →"));
    expect(router.push).toHaveBeenCalledWith(learnHref("dividend_dates"));
  });
});

describe("ForecastCard", () => {
  it("says which market the range was fitted to", async () => {
    mockMarketApi();
    await renderWithProviders(<ForecastCard forecast={FORECAST} symbol="AAPL" currency="USD" adjective="US" />);
    expect(screen.getByText(/Fitted to how US stocks have actually moved/)).toBeTruthy();
    expect(screen.queryByText(/Egyptian/)).toBeNull();
  });

  it("shows typical moves with measured coverage and the outcome range", async () => {
    mockMarketApi();
    await renderWithProviders(<ForecastCard forecast={FORECAST} symbol="COMI" currency="EGP" adjective="Egyptian" />);
    expect(screen.getByText("±1.8%")).toBeTruthy();
    expect(screen.getByText("79% land inside")).toBeTruthy();
    expect(screen.getByText("21% are bigger")).toBeTruthy();
    expect(screen.getByText("76% land inside")).toBeTruthy();
    expect(
      screen.getByText(/COMI has historically ended between 80\.0 and 120 EGP about 90% of the time — so roughly 10% of the time it ended outside/)
    ).toBeTruthy();
    expect(screen.getByText(/48,210 past checks, last fitted 2026-09-01/)).toBeTruthy();
  });

  it("draws the cone once it knows its width", async () => {
    mockMarketApi();
    await renderWithProviders(<ForecastCard forecast={FORECAST} symbol="COMI" currency="EGP" adjective="Egyptian" />);
    expect(screen.queryByTestId("cone-svg")).toBeNull();
    await fireEvent(screen.getByTestId("outcome-cone"), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 280, height: 160 } },
    });
    expect(screen.getByTestId("cone-svg")).toBeTruthy();
    expect(screen.getByText("120")).toBeTruthy();
    expect(screen.getByText("80.0")).toBeTruthy();
  });

  it("links to the calibration record", async () => {
    mockMarketApi();
    await renderWithProviders(<ForecastCard forecast={FORECAST} symbol="COMI" currency="EGP" adjective="Egyptian" />);
    await fireEvent.press(screen.getByText("See how often these ranges held →"));
    expect(router.push).toHaveBeenCalledWith(routes.calibration);
  });

  it("renders nothing without a forecast", async () => {
    mockMarketApi();
    await renderWithProviders(<ForecastCard forecast={null} symbol="COMI" currency="EGP" adjective="Egyptian" />);
    expect(screen.queryByText("Typical moves & outcome range")).toBeNull();
  });
});
