import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils/render";
import { mockPortfolioApi, sent } from "@/features/portfolio/testing/api";
import { NO_SALES, analysisResponse, portfolio } from "@/features/portfolio/testing/fixtures";
import { PortfolioScreen } from "../PortfolioScreen";

/** Every text node of the rendered tree, in document order. */
function renderedTexts(node: unknown, out: string[] = []): string[] {
  if (typeof node === "string") out.push(node);
  else if (Array.isArray(node)) node.forEach((n) => renderedTexts(n, out));
  else if (node && typeof node === "object") renderedTexts((node as { children?: unknown }).children, out);
  return out;
}

async function openComi() {
  await fireEvent.press(await screen.findByText("COMI"));
}

describe("PortfolioScreen", () => {
  it("renders the holdings view in the web's section order", async () => {
    mockPortfolioApi({
      analysis: analysisResponse({
        correlation_matrix: { symbols: ["COMI", "ETEL"], matrix: [[1, 0.2], [0.2, 1]] },
        monte_carlo: {
          days: 3, initial_value: 100_000, probability_of_loss: 0.38, worst_case_5pct: 0.9,
          pessimistic_25pct: 0.97, median: 1.05, optimistic_75pct: 1.1, best_case_95pct: 1.2,
          percentiles: {
            p5: [0.98, 0.95, 0.9], p25: [0.99, 0.98, 0.97], p50: [1, 1.02, 1.05],
            p75: [1.01, 1.05, 1.1], p95: [1.02, 1.08, 1.2],
          },
        },
      }),
    });
    await renderWithProviders(<PortfolioScreen />);
    await screen.findByText("Portfolio Summary");
    const texts = renderedTexts(screen.toJSON());
    const order = [
      "Portfolio Summary", "COMI", "Realized Winnings", "Signals & Advice", "Risk Dashboard",
      "Correlation Matrix", "Monte Carlo Simulation", "Macro Context",
    ].map((t) => ({ t, at: texts.indexOf(t) }));
    for (const { t, at } of order) expect({ t, found: at >= 0 }).toEqual({ t, found: true });
    const positions = order.map((o) => o.at);
    expect(positions).toEqual([...positions].sort((x, y) => x - y));
  });

  it("opens the add sheet from the FAB", async () => {
    mockPortfolioApi();
    await renderWithProviders(<PortfolioScreen />);
    await screen.findByText("COMI");
    await fireEvent.press(screen.getByLabelText("Add a stock"));
    expect(screen.getByText("Add to Portfolio")).toBeTruthy();
  });

  it("sells part of a two-lot position from its card", async () => {
    const fetchMock = mockPortfolioApi();
    await renderWithProviders(<PortfolioScreen />);
    await openComi();
    await fireEvent.press(screen.getByText("Sell"));
    expect(screen.getByText("300 shares held across 2 purchases · average 42.40 EGP")).toBeTruthy();
    await fireEvent.changeText(screen.getByPlaceholderText("Shares to sell"), "250");
    await fireEvent.changeText(screen.getByPlaceholderText("95.00"), "52");
    expect(screen.getByText("+2,540 EGP")).toBeTruthy();
    await fireEvent.press(screen.getByText("Record Sale"));
    await waitFor(() => expect(sent(fetchMock, "POST", "/sales")).toHaveLength(1));
    expect(sent(fetchMock, "POST", "/sales")[0].body).toMatchObject({ holding_id: "lotA", quantity: 250, sell_price: 52 });
    await waitFor(() => expect(screen.queryByPlaceholderText("Shares to sell")).toBeNull());
  });

  it("shows the duplicate-dividend 409 inside the open sheet", async () => {
    const message = "You already recorded a dividend of 1200.00 EGP for COMI on 2026-10-10.";
    mockPortfolioApi({ extra: [{ method: "POST", path: "/dividends", status: 409, body: { detail: message } }] });
    await renderWithProviders(<PortfolioScreen />);
    await openComi();
    await fireEvent.press(screen.getByText("Dividend"));
    await fireEvent.changeText(screen.getByPlaceholderText("1200.00"), "1200");
    await fireEvent.press(screen.getByText("Record Dividend"));
    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.getByPlaceholderText("1200.00")).toBeTruthy();
  });

  it("shows the never-traded state only when there is no history", async () => {
    mockPortfolioApi({ portfolio: portfolio([]), sales: NO_SALES });
    await renderWithProviders(<PortfolioScreen />);
    expect(await screen.findByText("No holdings yet")).toBeTruthy();
  });

  it("keeps the realized ledger on screen after selling out", async () => {
    mockPortfolioApi({ portfolio: portfolio([]) });
    await renderWithProviders(<PortfolioScreen />);
    expect(await screen.findByText("You have no open positions.")).toBeTruthy();
    expect(screen.getByText("Realized Winnings")).toBeTruthy();
    expect(screen.getByText("Record a Dividend")).toBeTruthy();
  });

  it("offers a retry when the analysis fails", async () => {
    const fetchMock = mockPortfolioApi({ analysisStatus: 500 });
    await renderWithProviders(<PortfolioScreen />);
    expect(await screen.findByText("Analysis timed out")).toBeTruthy();
    expect(sent(fetchMock, "GET", "/portfolio_analysis")).toHaveLength(1);
    await fireEvent.press(screen.getByText("Try again"));
    await waitFor(() => expect(sent(fetchMock, "GET", "/portfolio_analysis")).toHaveLength(2));
    expect(await screen.findByText("Analysis timed out")).toBeTruthy();
  });
});
