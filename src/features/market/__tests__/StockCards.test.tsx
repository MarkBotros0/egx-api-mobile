import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { learnHref } from "@/lib/links";
import { renderWithProviders } from "@/test-utils/render";
import { EntryExitCard } from "../EntryExitCard";
import { KeyLevelsCard } from "../KeyLevelsCard";
import { PEFreshnessBanner } from "../PEFreshnessBanner";
import { StatsPanel } from "../StatsPanel";
import { fail, mockMarketApi, requestsTo } from "../testing/api";
import { ENTRY_EXIT, KEY_LEVELS, makeAnalysis } from "../testing/fixtures";

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
      <StatsPanel stats={d.stats} pe={{ ...d.pe!, pe_ratio: null, loss_making: true }} />
    );
    expect(screen.getByText("Loss-making")).toBeTruthy();
    expect(screen.queryByText(/as of 2026/)).toBeNull();
  });
});

describe("KeyLevelsCard", () => {
  it("shows the nearest levels with strength and age", async () => {
    mockMarketApi();
    await renderWithProviders(<KeyLevelsCard keyLevels={KEY_LEVELS} />);
    expect(screen.getByText("85.00 EGP")).toBeTruthy();
    expect(screen.getByText("Touched once — weak level · ~3 months ago")).toBeTruthy();
    expect(screen.getByText("3.0% above current")).toBeTruthy();
    expect(screen.getByText("80.00 EGP")).toBeTruthy();
    expect(screen.getByText("Tested 3x · 4 days ago")).toBeTruthy();
    expect(screen.getByText("3.0% below current")).toBeTruthy();
  });

  it("names clear air instead of a stale resistance", async () => {
    mockMarketApi();
    await renderWithProviders(<KeyLevelsCard keyLevels={{ ...KEY_LEVELS, clear_air_above: true }} />);
    expect(screen.getByText("No resistance above")).toBeTruthy();
    expect(screen.queryByText("85.00 EGP")).toBeNull();
  });

  it("renders nothing without levels", async () => {
    mockMarketApi();
    await renderWithProviders(<KeyLevelsCard keyLevels={null} />);
    expect(screen.queryByText("Key Levels")).toBeNull();
  });
});

describe("EntryExitCard", () => {
  it("shows an active entry zone with confidence and stop-loss", async () => {
    mockMarketApi();
    await renderWithProviders(<EntryExitCard entryExit={ENTRY_EXIT} />);
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
      />
    );
    expect(screen.getByText(/No active entry or exit zone right now/)).toBeTruthy();
    fireEvent.press(screen.getByText("Learn more →"));
    expect(router.push).toHaveBeenCalledWith(learnHref("entry_exit_zones"));
  });
});

describe("PEFreshnessBanner", () => {
  it("warns when the P/E feed is stale", async () => {
    mockMarketApi({
      "/pe": {
        last_successful_fetch: new Date(Date.now() - 84 * 3_600_000).toISOString(),
        last_attempt_status: "timeout",
      },
    });
    await renderWithProviders(<PEFreshnessBanner />);
    expect(
      await screen.findByText(
        "P/E data last updated 3 days ago — the EGX feed may be temporarily unavailable. Last attempt: timeout."
      )
    ).toBeTruthy();
  });

  it("stays silent when the feed is fresh", async () => {
    const fetchMock = mockMarketApi();
    await renderWithProviders(<PEFreshnessBanner />);
    await waitFor(() => expect(requestsTo(fetchMock, "/pe")).toHaveLength(1));
    expect(screen.queryByText(/P\/E data last updated/)).toBeNull();
  });

  it("stays silent when the status call fails", async () => {
    const fetchMock = mockMarketApi({ "/pe": fail(503) });
    await renderWithProviders(<PEFreshnessBanner />);
    await waitFor(() => expect(requestsTo(fetchMock, "/pe")).toHaveLength(1));
    expect(screen.queryByText(/P\/E data last updated/)).toBeNull();
  });
});
