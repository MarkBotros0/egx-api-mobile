import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils/render";
import { CompositeCard } from "../CompositeCard";
import { ScoreBreakdown } from "../ScoreBreakdown";
import { ScoreWeightsSheet } from "../ScoreWeightsSheet";
import { marketPrefRoutes, mockMarketApi, requestsTo } from "../testing/api";
import { makeAnalysis, US_MARKET } from "../testing/fixtures";
import { EG_FALLBACK } from "@/shared/markets";
import { EG_WORDING, renderedText } from "@/test-utils/text";

jest.mock("expo-router", () => jest.requireActual("@/features/market/testing/expoRouterMock"));
jest.mock("@/charts", () => jest.requireActual("@/features/market/testing/chartsMock"));

const composite = makeAnalysis().composite_score;

beforeEach(() => jest.clearAllMocks());

describe("ScoreBreakdown", () => {
  it("states the backtest of the score's own market", async () => {
    mockMarketApi();
    await renderWithProviders(
      <ScoreBreakdown composite={composite} market={{ ...US_MARKET, score_calibrated: true }} />
    );
    expect(screen.getByText(/tested on US stocks, higher scores did not precede better returns/)).toBeTruthy();
    expect(screen.queryByText(/EGX|2007/)).toBeNull();
  });

  it("an uncalibrated market is told no other market's evidence", async () => {
    mockMarketApi();
    await renderWithProviders(
      <ScoreBreakdown composite={composite} market={{ ...US_MARKET, score_calibrated: false }} />
    );
    expect(screen.getByText(/it has not yet been tested on this market/)).toBeTruthy();
    expect(screen.queryByText(/EGX|2007/)).toBeNull();
  });

  it("keeps the EGX evidence on EG", async () => {
    mockMarketApi();
    await renderWithProviders(<ScoreBreakdown composite={composite} market={EG_FALLBACK} />);
    expect(screen.getByText(/tested across the EGX from 2007–2026/)).toBeTruthy();
  });

  it("lists categories with the weight each actually carried", async () => {
    mockMarketApi();
    await renderWithProviders(<ScoreBreakdown composite={composite} />);
    expect(screen.getByText("Trend")).toBeTruthy();
    expect(screen.getAllByText("14% weight").length).toBe(7);
    expect(screen.getByText("excluded — not enough data")).toBeTruthy();
    expect(screen.getByText("—")).toBeTruthy();
    expect(screen.getByText(/It is not a forecast/)).toBeTruthy();
  });

  it("expands a category to show its reasons", async () => {
    mockMarketApi();
    await renderWithProviders(<ScoreBreakdown composite={composite} />);
    expect(screen.queryByText("Price above SMA 50")).toBeNull();
    await fireEvent.press(screen.getByText("Trend"));
    expect(screen.getByText("• Price above SMA 50")).toBeTruthy();
    await fireEvent.press(screen.getByText("Momentum"));
    expect(screen.getByText("No notable signals in this category.")).toBeTruthy();
  });

  it("shows a macro adjustment when there is one", async () => {
    mockMarketApi();
    await renderWithProviders(
      <ScoreBreakdown composite={{ ...composite, macro_adjustment: 1.5, macro_context: "EGX30 uptrend" }} />
    );
    expect(screen.getByText("Macro adjustment: +1.5")).toBeTruthy();
    expect(screen.getByText("EGX30 uptrend")).toBeTruthy();
  });

  it("opens the weights sheet", async () => {
    mockMarketApi();
    await renderWithProviders(<ScoreBreakdown composite={composite} />);
    await fireEvent.press(screen.getByLabelText("Adjust weights"));
    expect(await screen.findByText("Composite Score Weights")).toBeTruthy();
  });
});

describe("ScoreWeightsSheet", () => {
  it("steps a weight and saves it", async () => {
    const fetchMock = mockMarketApi();
    const onClose = jest.fn();
    await renderWithProviders(<ScoreWeightsSheet open onClose={onClose} />);
    // MarketProvider also GETs /settings?section=market; count only the weights load.
    await waitFor(() =>
      expect(requestsTo(fetchMock, "/settings").filter((u) => u.searchParams.get("section") === "weights")).toHaveLength(1)
    );
    expect(await screen.findByText("raw 18")).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("Increase Trend weight"));
    expect(screen.getByText("raw 20")).toBeTruthy();
    await fireEvent.press(screen.getByText("Save"));
    await waitFor(() => expect(requestsTo(fetchMock, "/settings", "PUT")).toHaveLength(1));
    const putInit = fetchMock.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === "PUT")?.[1] as RequestInit;
    expect(JSON.parse(String(putInit.body)).weights.trend).toBe(20);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("cancel throws the draft away", async () => {
    mockMarketApi();
    const onClose = jest.fn();
    await renderWithProviders(<ScoreWeightsSheet open onClose={onClose} />);
    await fireEvent.press(await screen.findByLabelText("Increase Trend weight"));
    expect(screen.getByText("raw 20")).toBeTruthy();
    await fireEvent.press(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
    expect(await screen.findByText("raw 18")).toBeTruthy();
  });

  it("shows the advanced categories on request", async () => {
    mockMarketApi();
    await renderWithProviders(<ScoreWeightsSheet open onClose={jest.fn()} />);
    expect(screen.queryByText("Divergence")).toBeNull();
    await fireEvent.press(screen.getByText("Show advanced categories"));
    expect(screen.getByText("Divergence")).toBeTruthy();
  });
});

describe("ScoreWeightsSheet copy per market", () => {
  it("keeps the EG quality, risk-adjusted and relative-strength descriptions word for word", async () => {
    mockMarketApi(marketPrefRoutes("EG"));
    await renderWithProviders(<ScoreWeightsSheet open onClose={jest.fn()} />);
    await fireEvent.press(screen.getByText("Show advanced categories"));
    expect(
      screen.getByText(
        "Trend consistency, multi-timeframe alignment, distance from the 52-week high, plus valuation: P/E and dividend yield versus the EGX median."
      )
    ).toBeTruthy();
    expect(screen.getByText("Annualized return vs the Egyptian T-bill, volatility, and ATR context.")).toBeTruthy();
    expect(screen.getByText("Performance vs EGX30 over 30 days (leaders vs laggards).")).toBeTruthy();
  });

  it("names the US benchmark and drops the EGX median on US", async () => {
    mockMarketApi(marketPrefRoutes("US"));
    await renderWithProviders(<ScoreWeightsSheet open onClose={jest.fn()} />);
    await fireEvent.press(screen.getByText("Show advanced categories"));
    expect(await screen.findByText("Performance vs S&P 500 over 30 days (leaders vs laggards).")).toBeTruthy();
    expect(
      screen.getByText(
        "Trend consistency, multi-timeframe alignment, distance from the 52-week high, plus valuation: P/E and dividend yield."
      )
    ).toBeTruthy();
    expect(screen.getByText("Annualized return vs the US 3-month T-bill, volatility, and ATR context.")).toBeTruthy();
    expect(renderedText()).not.toMatch(EG_WORDING);
  });
});

describe("CompositeCard", () => {
  it("names the condition, the timeframe and the callouts", async () => {
    mockMarketApi();
    await renderWithProviders(
      <CompositeCard
        composite={composite}
        interval="Weekly"
        callouts={[{ key: "aligned", label: "✅ Daily + Weekly aligned (up)", tone: "accent" }]}
      />
    );
    expect(screen.getByText("Technical Condition")).toBeTruthy();
    expect(screen.getByText("Strong")).toBeTruthy();
    expect(screen.getByText("on weekly bars")).toBeTruthy();
    expect(screen.getByText("Daily is the primary view for timing")).toBeTruthy();
    expect(screen.getByText("✅ Daily + Weekly aligned (up)")).toBeTruthy();
  });

  it("tags the score Preliminary on an uncalibrated market, and only there", async () => {
    mockMarketApi(marketPrefRoutes("US"));
    await renderWithProviders(<CompositeCard composite={composite} interval="Daily" callouts={[]} />);
    expect(await screen.findByText("Preliminary")).toBeTruthy();
  });

  it("carries no tag on a calibrated market", async () => {
    mockMarketApi(marketPrefRoutes("EG"));
    await renderWithProviders(<CompositeCard composite={composite} interval="Daily" callouts={[]} />);
    expect(screen.getByText("Technical Condition")).toBeTruthy();
    expect(screen.queryByText("Preliminary")).toBeNull();
  });
});
