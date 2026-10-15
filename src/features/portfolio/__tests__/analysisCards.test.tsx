import { fireEvent, screen } from "@testing-library/react-native";
import { marketPrefRoutes, mockPortfolioApi } from "@/features/portfolio/testing/api";
import { renderWithProviders } from "@/test-utils/render";
import { EG_WORDING, openAllExplanations, renderedText } from "@/test-utils/text";
import { macroData, metrics } from "@/features/portfolio/testing/fixtures";
import { MacroCard } from "../MacroCard";
import { PortfolioSummary } from "../PortfolioSummary";
import { RiskDashboard } from "../RiskDashboard";

describe("PortfolioSummary", () => {
  it("shows totals, signed P&L and the average score", async () => {
    await renderWithProviders(<PortfolioSummary metrics={metrics()} currency="EGP" />);
    expect(screen.getByText("15,600.00")).toBeTruthy();
    expect(screen.getByText("+2,880.00")).toBeTruthy();
    expect(screen.getByText("+22.64%")).toBeTruthy();
    expect(screen.getByText("64")).toBeTruthy();
    expect(screen.getByText("Sector Allocation")).toBeTruthy();
  });

  it("says when holdings were left out of the totals", async () => {
    await renderWithProviders(<PortfolioSummary metrics={metrics({ excluded_count: 2, excluded_invested: 5000 })} currency="EGP" />);
    expect(screen.getByText(/2 holdings could not be priced/)).toBeTruthy();
  });
});

describe("PortfolioSummary on an uncalibrated market", () => {
  it("tags the average score PRELIM on US", async () => {
    mockPortfolioApi({ extra: marketPrefRoutes("US") });
    await renderWithProviders(<PortfolioSummary metrics={metrics()} currency="USD" />);
    expect(await screen.findByText("PRELIM")).toBeTruthy();
  });

  it("carries no tag on EG", async () => {
    mockPortfolioApi({ extra: marketPrefRoutes("EG") });
    await renderWithProviders(<PortfolioSummary metrics={metrics()} currency="EGP" />);
    expect(screen.getByText("64")).toBeTruthy();
    expect(screen.queryByText("PRELIM")).toBeNull();
  });
});

describe("RiskDashboard copy per market", () => {
  it("keeps the EG Sharpe explanation and the Egypt note word for word", async () => {
    mockPortfolioApi({ extra: marketPrefRoutes("EG") });
    await renderWithProviders(<RiskDashboard metrics={metrics()} currency="EGP" riskFreeRatePct={19} />);
    await fireEvent.press(screen.getByText("Sharpe Ratio"));
    expect(
      screen.getByText(
        "Measures risk-adjusted return. Higher = better. A ratio > 1 means your returns strongly justify the risk. Below 0 means you would earn more in risk-free Egyptian cash (~19%)."
      )
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Note: Egypt's risk-free rate is ~19%, which is very high globally. This makes it harder for stocks to have a positive Sharpe ratio compared to other markets."
      )
    ).toBeTruthy();
  });

  it("grades US against the US 3-month T-bill at the server's rate, with no Egyptian note", async () => {
    mockPortfolioApi({ extra: marketPrefRoutes("US") });
    await renderWithProviders(<RiskDashboard metrics={metrics()} currency="USD" riskFreeRatePct={4.12} />);
    await openAllExplanations();
    expect(
      await screen.findByText(
        "Measures risk-adjusted return. Higher = better. A ratio > 1 means your returns strongly justify the risk. Below 0 means you would earn more in the US 3-month T-bill (~4.1%)."
      )
    ).toBeTruthy();
    expect(screen.queryByText(/very high globally/)).toBeNull();
    expect(renderedText()).not.toMatch(EG_WORDING);
  });
});

describe("RiskDashboard", () => {
  it("formats each metric and dashes the missing ones", async () => {
    await renderWithProviders(<RiskDashboard metrics={metrics({ sortino_ratio: null })} currency="EGP" />);
    expect(screen.getByText("0.42")).toBeTruthy();
    expect(screen.getByText("-18.0%")).toBeTruthy();
    expect(screen.getByText("on 2026-03-15")).toBeTruthy();
    expect(screen.getByText("437 EGP")).toBeTruthy();
    expect(screen.getByText("2.8% of portfolio")).toBeTruthy();
    expect(screen.getByText("-3.0%")).toBeTruthy();
    expect(screen.getByText("--")).toBeTruthy();
  });

  it("names the market's currency on the VaR figure", async () => {
    await renderWithProviders(<RiskDashboard metrics={metrics()} currency="USD" />);
    expect(screen.getByText("437 USD")).toBeTruthy();
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
