import { screen } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils/render";
import { macroData, metrics } from "@/features/portfolio/testing/fixtures";
import { MacroCard } from "../MacroCard";
import { PortfolioSummary } from "../PortfolioSummary";
import { RiskDashboard } from "../RiskDashboard";

describe("PortfolioSummary", () => {
  it("shows totals, signed P&L and the average score", async () => {
    await renderWithProviders(<PortfolioSummary metrics={metrics()} />);
    expect(screen.getByText("15,600.00")).toBeTruthy();
    expect(screen.getByText("+2,880.00")).toBeTruthy();
    expect(screen.getByText("+22.64%")).toBeTruthy();
    expect(screen.getByText("64")).toBeTruthy();
    expect(screen.getByText("Sector Allocation")).toBeTruthy();
  });

  it("says when holdings were left out of the totals", async () => {
    await renderWithProviders(<PortfolioSummary metrics={metrics({ excluded_count: 2, excluded_invested: 5000 })} />);
    expect(screen.getByText(/2 holdings could not be priced/)).toBeTruthy();
  });
});

describe("RiskDashboard", () => {
  it("formats each metric and dashes the missing ones", async () => {
    await renderWithProviders(<RiskDashboard metrics={metrics({ sortino_ratio: null })} />);
    expect(screen.getByText("0.42")).toBeTruthy();
    expect(screen.getByText("-18.0%")).toBeTruthy();
    expect(screen.getByText("on 2026-03-15")).toBeTruthy();
    expect(screen.getByText("437 EGP")).toBeTruthy();
    expect(screen.getByText("2.8% of portfolio")).toBeTruthy();
    expect(screen.getByText("-3.0%")).toBeTruthy();
    expect(screen.getByText("--")).toBeTruthy();
  });
});

describe("MacroCard", () => {
  it("shows the three indicators with their context", async () => {
    await renderWithProviders(<MacroCard data={macroData()} />);
    expect(screen.getByText("31,000")).toBeTruthy();
    expect(screen.getByText("48.5")).toBeTruthy();
    expect(screen.getByText("Strengthening EGP benefits importers")).toBeTruthy();
    expect(screen.getByText(/rose 8.25× in pounds and 0.94× in dollars/)).toBeTruthy();
  });

  it("collapses to one line when every source failed", async () => {
    const none = { value: null, direction: null };
    await renderWithProviders(<MacroCard data={{ egx30: none, usd_egp: none, interest_rate: none }} />);
    expect(screen.getByText("Macro data unavailable")).toBeTruthy();
  });
});
