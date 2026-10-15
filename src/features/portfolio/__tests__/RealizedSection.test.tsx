import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils/render";
import { autoConfirm } from "@/features/portfolio/testing/alerts";
import { TWO_LOT_ORDER, dividend, order, summary } from "@/features/portfolio/testing/fixtures";
import type { Dividend, SaleOrder, SalesSummary } from "@/shared/types";
import { RealizedSection } from "../RealizedSection";

async function renderSection(over: { orders?: SaleOrder[]; dividends?: Dividend[]; summary?: SalesSummary } = {}) {
  const onDeleteSale = jest.fn();
  const onDeleteDividend = jest.fn();
  await renderWithProviders(
    <RealizedSection
      summary={over.summary ?? summary({ total_realized_pnl: 1700, total_winnings: 2900, total_dividends: 1200, dividend_count: 1 })}
      orders={over.orders ?? [order(), TWO_LOT_ORDER]}
      dividends={over.dividends ?? [dividend()]}
      riskFreeRatePct={19}
      currency="EGP"
      onDeleteSale={onDeleteSale}
      onDeleteDividend={onDeleteDividend}
    />,
  );
  return { onDeleteSale, onDeleteDividend };
}

afterEach(() => jest.restoreAllMocks());

describe("RealizedSection", () => {
  it("shows the combined headline while collapsed, gains and dividends stated separately", async () => {
    await renderSection();
    expect(screen.getByText("+2,900 EGP")).toBeTruthy();
    expect(screen.getByText(/\+1,700 from sales/)).toBeTruthy();
    expect(screen.getByText("1,200")).toBeTruthy();
    expect(screen.queryByText("Record")).toBeNull();
  });

  it("opens on the Closed tab with one line per ORDER", async () => {
    await renderSection();
    await fireEvent.press(screen.getByText("Realized Winnings"));
    expect(screen.getByText("Record")).toBeTruthy();
    expect(screen.getByText("ETEL")).toBeTruthy();
    expect(screen.getByText("SWDY")).toBeTruthy();
    expect(screen.getByText("2 lots")).toBeTruthy();
    expect(screen.getByText("Spans 2 purchases — see each below")).toBeTruthy();
    expect(screen.getByText("+43.6%/yr — beat the 21% T-bill")).toBeTruthy();
    expect(screen.getByText("1 of 1")).toBeTruthy();

    await fireEvent.press(screen.getByText("Show purchases"));
    expect(screen.getByText("2 purchases sold, oldest first")).toBeTruthy();
    expect(screen.getByText(/200 bought 2025-01-05 @ 20\.00/)).toBeTruthy();
  });

  it("undoes the WHOLE order and says how many purchases that reaches", async () => {
    const { onDeleteSale } = await renderSection();
    await fireEvent.press(screen.getByText("Realized Winnings"));
    const alert = autoConfirm("Undo");
    await fireEvent.press(screen.getAllByText("Undo this sale")[1]);
    await waitFor(() => expect(onDeleteSale).toHaveBeenCalledWith("o2"));
    expect(alert.mock.calls[0][0]).toBe("Undo this sale?");
    expect(alert.mock.calls[0][1]).toContain("across all 2 purchases it sold from");
  });

  it("lists and removes dividends on their own tab", async () => {
    const { onDeleteDividend } = await renderSection();
    await fireEvent.press(screen.getByText("Realized Winnings"));
    await fireEvent.press(screen.getByText("Dividends 1"));
    expect(screen.getByText("1 payment · 1,200 EGP received")).toBeTruthy();
    expect(screen.getByText(/Paid 2026-04-07 · 4\.00 EGP\/share/)).toBeTruthy();
    autoConfirm("Remove");
    await fireEvent.press(screen.getByText("Remove"));
    await waitFor(() => expect(onDeleteDividend).toHaveBeenCalledWith("d1"));
  });

  it("opens on Dividends when there are no sales", async () => {
    await renderSection({ orders: [] });
    await fireEvent.press(screen.getByText("Realized Winnings"));
    expect(screen.getByText("1 payment · 1,200 EGP received")).toBeTruthy();
  });

  it("shows the per-stock breakdown", async () => {
    await renderSection();
    await fireEvent.press(screen.getByText("Realized Winnings"));
    await fireEvent.press(screen.getByText("By stock"));
    expect(screen.getByText("100 shares · 1 sale")).toBeTruthy();
  });
});
