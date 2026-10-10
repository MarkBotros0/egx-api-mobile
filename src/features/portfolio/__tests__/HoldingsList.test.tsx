import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils/render";
import { TWO_LOT_HOLDINGS, holding } from "@/features/portfolio/testing/fixtures";
import { autoCancel, autoConfirm } from "@/features/portfolio/testing/alerts";
import { HoldingsList } from "../HoldingsList";

function setup(holdings = TWO_LOT_HOLDINGS) {
  const handlers = { onEdit: jest.fn(), onDelete: jest.fn(), onSell: jest.fn(), onAddDividend: jest.fn() };
  return { handlers, render: () => renderWithProviders(<HoldingsList holdings={holdings} {...handlers} />) };
}

afterEach(() => jest.restoreAllMocks());

describe("HoldingsList", () => {
  it("shows ONE card for two purchases of the same stock, at the cost-weighted average", async () => {
    const { render } = setup();
    await render();
    expect(screen.getAllByText("COMI")).toHaveLength(1);
    expect(screen.getByText(/300 x 42\.40/)).toBeTruthy();
    expect(screen.getByText("avg")).toBeTruthy();
    expect(screen.getByText("First bought 2026-01-10")).toBeTruthy();
    expect(screen.getByText("+2,880")).toBeTruthy();
    expect(screen.getByText("+22.6%")).toBeTruthy();
  });

  it("expands to the purchases, each with its own Edit and Delete", async () => {
    const { render, handlers } = setup();
    await render();
    await fireEvent.press(screen.getByText("COMI"));
    expect(screen.getByText("2 purchases · average 42.40 EGP")).toBeTruthy();
    expect(screen.getByText("200 × 41.00")).toBeTruthy();
    expect(screen.getByText("100 × 45.20")).toBeTruthy();
    expect(screen.getByText("per lot")).toBeTruthy();
    // Edit/Delete live on the lots, not the action row, once there are two.
    expect(screen.queryByText("Edit")).toBeNull();
    await fireEvent.press(screen.getByLabelText("Edit purchase of 2026-06-01"));
    expect(handlers.onEdit).toHaveBeenCalledWith("lotB");
  });

  it("deletes a purchase only after confirmation", async () => {
    const { render, handlers } = setup();
    await render();
    await fireEvent.press(screen.getByText("COMI"));

    autoCancel();
    await fireEvent.press(screen.getByLabelText("Delete purchase of 2026-01-10"));
    expect(handlers.onDelete).not.toHaveBeenCalled();

    jest.restoreAllMocks();
    const alert = autoConfirm("Delete");
    await fireEvent.press(screen.getByLabelText("Delete purchase of 2026-01-10"));
    expect(alert.mock.calls[0][1]).toBe("COMI will be removed from your portfolio. This cannot be undone.");
    await waitFor(() => expect(handlers.onDelete).toHaveBeenCalledWith("lotA"));
  });

  it("sells and records dividends against the POSITION", async () => {
    const { render, handlers } = setup();
    await render();
    await fireEvent.press(screen.getByText("COMI"));
    await fireEvent.press(screen.getByText("Sell"));
    expect(handlers.onSell).toHaveBeenCalledWith("COMI");
    await fireEvent.press(screen.getByText("Dividend"));
    expect(handlers.onAddDividend.mock.calls[0][0]).toMatchObject({ symbol: "COMI", quantity: 300 });
  });

  it("puts Edit and Delete in the action row for a single purchase", async () => {
    const { render, handlers } = setup([holding({ id: "solo", annualized_return: 37.2 })]);
    await render();
    await fireEvent.press(screen.getByText("COMI"));
    expect(screen.getByText("Lot from 2026-01-10")).toBeTruthy();
    expect(screen.getByText("+37.2%")).toBeTruthy();
    await fireEvent.press(screen.getByText("Edit"));
    expect(handlers.onEdit).toHaveBeenCalledWith("solo");
  });

  it("keeps Sell reachable when the price feed failed", async () => {
    const { render, handlers } = setup([holding({ id: "bad", error: "No data for COMI" })]);
    await render();
    expect(screen.getByText("No data for COMI")).toBeTruthy();
    await fireEvent.press(screen.getByText("Sell"));
    expect(handlers.onSell).toHaveBeenCalledWith("COMI");
  });

  it("shows a low-confidence zone as a plain hint", async () => {
    const lowEntry = {
      entry_zone: { active: true, confidence: "low" as const, price_range: { low: 50, high: 52 }, suggested_stop_loss: 47.5, reasons: [] },
      exit_zone: { active: false, confidence: null, price_range: null, reasons: [] },
    };
    const { render } = setup([holding({ entry_exit: lowEntry })]);
    await render();
    expect(screen.getByText("Entry zone · low")).toBeTruthy();
    await fireEvent.press(screen.getByText("COMI"));
    expect(screen.getByText("50.00 – 52.00")).toBeTruthy();
    expect(screen.getByText("What does this mean? →")).toBeTruthy();
  });
});
