import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { learnHref } from "@/lib/links";
import { renderWithProviders } from "@/test-utils/render";
import { EntryExitCard } from "../EntryExitCard";
import { KeyLevelsCard } from "../KeyLevelsCard";
import { StatsPanel } from "../StatsPanel";
import { mockMarketApi } from "../testing/api";
import { ENTRY_EXIT, KEY_LEVELS, makeAnalysis, US_MARKET } from "../testing/fixtures";
import { EG_FALLBACK, type Market } from "@/shared/markets";
import { EG_WORDING, openAllExplanations, renderedText } from "@/test-utils/text";

jest.mock("expo-router", () => jest.requireActual("@/features/market/testing/expoRouterMock"));

const d = makeAnalysis();

beforeEach(() => jest.clearAllMocks());

describe("StatsPanel", () => {
  it("shows the key statistics with the crossover badge", async () => {
    mockMarketApi();
    await renderWithProviders(
      <StatsPanel
        stats={d.stats}
        latestRsi={62.4}
        latestVolatility={0.021}
        cumulativeReturn={0.031}
        beta={1.12}
        atr={2.06}
        atrPct={2.5}
        crossovers={d.crossovers}
        pe={d.pe}
        currency="EGP"
        market={EG_FALLBACK}
      />
    );
    expect(screen.getByText("Golden Cross Active (12d ago)")).toBeTruthy();
    expect(screen.getByText("82.50 EGP")).toBeTruthy();
    expect(screen.getByText("+1.20 (+1.48%)")).toBeTruthy();
    expect(screen.getByText("1.3M")).toBeTruthy();
    expect(screen.getByText("62.4")).toBeTruthy();
    expect(screen.getByText("2.10%")).toBeTruthy();
    expect(screen.getByText("3.10%")).toBeTruthy();
    expect(screen.getByText("1.12")).toBeTruthy();
    expect(screen.getByText("2.06 (2.5%)")).toBeTruthy();
    expect(screen.getByText("9.1 · as of 2026-09-01")).toBeTruthy();
    expect(screen.getByText("3.20%")).toBeTruthy();
  });

  it("says loss-making instead of a P/E", async () => {
    mockMarketApi();
    await renderWithProviders(
      <StatsPanel stats={d.stats} pe={{ ...d.pe!, pe_ratio: null, loss_making: true }} currency="EGP" market={EG_FALLBACK} />
    );
    expect(screen.getByText("Loss-making")).toBeTruthy();
    expect(screen.queryByText(/as of 2026/)).toBeNull();
  });
});

describe("StatsPanel copy per market", () => {
  async function renderFor(market: Market) {
    mockMarketApi();
    await renderWithProviders(
      <StatsPanel
        stats={d.stats}
        beta={1.12}
        pe={{ ...d.pe!, pe_ratio: 9.1, dividend_yield: 3.2 }}
        currency={market.currency}
        market={market}
      />
    );
    expect(await openAllExplanations()).toBeGreaterThanOrEqual(3);
  }

  it("keeps the EG beta, P/E and dividend explanations word for word", async () => {
    await renderFor(EG_FALLBACK);
    // The same scan the US test relies on, proven to see the opened explanations.
    expect(renderedText()).toMatch(EG_WORDING);
    expect(screen.getByText("Beta vs EGX30")).toBeTruthy();
    expect(
      screen.getByText(
        "Measures how much this stock moves relative to the EGX30 index. Beta > 1 = more volatile than market. Beta < 1 = less volatile. Beta = 1 = moves with the market. A negative beta means it tends to move in the OPPOSITE direction to the index — its size still tells you how big those moves are."
      )
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Price-to-Earnings: how many EGP investors pay for every 1 EGP of annual profit. Judge it against the EGX median of about 12, not against global markets — under 8 is genuinely cheap here, over 25 is expensive. Below 3 is a warning, not a bargain: it usually means one-off earnings or a collapsed share price."
      )
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Annual dividends as a percentage of the current share price. The EGX median is about 3%. Read a healthy yield as evidence the company generates real cash, not as income — even 8% loses to the ~19% policy rate. Above 15% is a red flag: usually a one-off special dividend or a share price that has collapsed."
      )
    ).toBeTruthy();
  });

  it("names the US benchmark and currency, with no EGX median or Egyptian rate", async () => {
    await renderFor(US_MARKET);
    expect(screen.getByText("Beta vs S&P 500")).toBeTruthy();
    expect(screen.getByText(/relative to the S&P 500 index/)).toBeTruthy();
    // The EGX-measured "below 3" and "above 15%" warnings are EG-only.
    expect(screen.getByText(/how many USD investors pay for every 1 USD of annual profit\.$/)).toBeTruthy();
    expect(screen.getByText(/^Annual dividends as a percentage of the current share price\. Read a healthy yield as evidence the company generates real cash\.$/)).toBeTruthy();
    expect(screen.queryByText(/Below 3|Above 15%/)).toBeNull();
    expect(renderedText()).not.toMatch(EG_WORDING);
  });
});

describe("KeyLevelsCard", () => {
  it("shows the nearest levels with strength and age", async () => {
    mockMarketApi();
    await renderWithProviders(<KeyLevelsCard keyLevels={KEY_LEVELS} currency="EGP" />);
    expect(screen.getByText("85.00 EGP")).toBeTruthy();
    expect(screen.getByText("Touched once — weak level · ~3 months ago")).toBeTruthy();
    expect(screen.getByText("3.0% above current")).toBeTruthy();
    expect(screen.getByText("80.00 EGP")).toBeTruthy();
    expect(screen.getByText("Tested 3x · 4 days ago")).toBeTruthy();
    expect(screen.getByText("3.0% below current")).toBeTruthy();
  });

  it("names clear air instead of a stale resistance", async () => {
    mockMarketApi();
    await renderWithProviders(<KeyLevelsCard keyLevels={{ ...KEY_LEVELS, clear_air_above: true }} currency="EGP" />);
    expect(screen.getByText("No resistance above")).toBeTruthy();
    expect(screen.queryByText("85.00 EGP")).toBeNull();
  });

  it("renders nothing without levels", async () => {
    mockMarketApi();
    await renderWithProviders(<KeyLevelsCard keyLevels={null} currency="EGP" />);
    expect(screen.queryByText("Key Levels")).toBeNull();
  });
});

describe("EntryExitCard", () => {
  it("shows an active entry zone with confidence and stop-loss", async () => {
    mockMarketApi();
    await renderWithProviders(<EntryExitCard entryExit={ENTRY_EXIT} currency="EGP" />);
    expect(screen.getByText("80.00 – 81.50 EGP")).toBeTruthy();
    expect(screen.getByText("High confidence")).toBeTruthy();
    expect(screen.getByText("77.30 EGP")).toBeTruthy();
    expect(screen.getByText("• RSI 48 — not overbought")).toBeTruthy();
  });

  // The neutral colour itself is pinned by `zoneTone` in levels.test.ts.
  it("renders a low-confidence exit as a hint", async () => {
    mockMarketApi();
    await renderWithProviders(
      <EntryExitCard
        entryExit={{
          entry_zone: { ...ENTRY_EXIT.entry_zone, active: false },
          exit_zone: { active: true, confidence: "low", price_range: { low: 90, high: 92 }, reasons: [] },
        }}
        currency="EGP"
      />
    );
    expect(screen.getByText("90.00 – 92.00 EGP")).toBeTruthy();
    expect(screen.getByText("Low confidence")).toBeTruthy();
  });

  it("explains when no zone is active and links to Learn", async () => {
    mockMarketApi();
    await renderWithProviders(
      <EntryExitCard
        entryExit={{ entry_zone: { ...ENTRY_EXIT.entry_zone, active: false }, exit_zone: ENTRY_EXIT.exit_zone }}
        currency="EGP"
      />
    );
    expect(screen.getByText(/No active entry or exit zone right now/)).toBeTruthy();
    fireEvent.press(screen.getByText("Learn more →"));
    expect(router.push).toHaveBeenCalledWith(learnHref("entry_exit_zones"));
  });
});
