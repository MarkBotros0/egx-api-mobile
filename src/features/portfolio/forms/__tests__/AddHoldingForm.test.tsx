import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils/render";
import { mockPortfolioApi } from "@/features/portfolio/testing/api";
import { TICKERS } from "@/features/portfolio/testing/fixtures";
import { todayIso } from "@/features/portfolio/logic/format";
import { AddHoldingForm } from "../AddHoldingForm";

afterEach(() => jest.useRealTimers());

describe("AddHoldingForm", () => {
  it("adds a stock picked from the list at a three-decimal price", async () => {
    mockPortfolioApi();
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await renderWithProviders(<AddHoldingForm tickers={TICKERS} onSubmit={onSubmit} onCancel={jest.fn()} />);

    await fireEvent.changeText(screen.getByPlaceholderText("Search by symbol or name..."), "co");
    await fireEvent.press(screen.getByText("COMI"));
    expect(screen.getByText("Commercial International Bank — Banking")).toBeTruthy();
    await fireEvent.changeText(screen.getByPlaceholderText("100"), "100");
    await fireEvent.changeText(screen.getByPlaceholderText("85.50"), "27.697");
    await fireEvent.press(screen.getByText("Add to Portfolio"));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        symbol: "COMI", name: "Commercial International Bank", sector: "Banking",
        buy_price: 27.697, buy_date: todayIso(), quantity: 100,
        target_price: null, stop_loss: null, notes: "",
      }),
    );
  });

  // Review Focus 5
  it("edits before the ticker list loads without wiping name, sector, target, stop or notes", async () => {
    mockPortfolioApi();
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await renderWithProviders(
      <AddHoldingForm
        tickers={[]}
        initialValues={{
          symbol: "COMI", name: "Commercial International Bank", sector: "Banking",
          buy_price: 41, buy_date: "2026-01-10", quantity: 200, target_price: 60, stop_loss: 38, notes: "core",
        }}
        onSubmit={onSubmit}
        onCancel={jest.fn()}
      />,
    );
    await fireEvent.changeText(screen.getByPlaceholderText("100"), "250");
    await fireEvent.press(screen.getByText("Update"));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        symbol: "COMI", name: "Commercial International Bank", sector: "Banking",
        buy_price: 41, buy_date: "2026-01-10", quantity: 250,
        target_price: 60, stop_loss: 38, notes: "core",
      }),
    );
  });

  it("checks an unknown symbol with the server after a pause and blocks it when not found", async () => {
    jest.useFakeTimers();
    mockPortfolioApi({
      extra: [{ method: "GET", path: /\/tickers\?validate=XYZQ/, body: { symbol: "XYZQ", valid: false, name: null } }],
    });
    const onSubmit = jest.fn();
    await renderWithProviders(<AddHoldingForm tickers={TICKERS} onSubmit={onSubmit} onCancel={jest.fn()} />);
    await fireEvent.changeText(screen.getByPlaceholderText("Search by symbol or name..."), "xyzq");
    await fireEvent.changeText(screen.getByPlaceholderText("100"), "10");
    await fireEvent.changeText(screen.getByPlaceholderText("85.50"), "5");
    expect(screen.getByText("Checking…")).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(600);
    });
    expect(await screen.findByText("Symbol not found on EGX — check and try again")).toBeTruthy();
    await fireEvent.press(screen.getByText("Add to Portfolio"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("explains invalid quantity and price instead of submitting", async () => {
    mockPortfolioApi();
    const onSubmit = jest.fn();
    await renderWithProviders(<AddHoldingForm tickers={TICKERS} onSubmit={onSubmit} onCancel={jest.fn()} />);
    await fireEvent.changeText(screen.getByPlaceholderText("Search by symbol or name..."), "COMI");
    await fireEvent.changeText(screen.getByPlaceholderText("100"), "5.5");
    await fireEvent.changeText(screen.getByPlaceholderText("85.50"), "27.6971");
    expect(screen.getByText("Enter a whole number of shares")).toBeTruthy();
    expect(screen.getByText("EGX prices go to 3 decimals at most")).toBeTruthy();
    await fireEvent.press(screen.getByText("Add to Portfolio"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows a server rejection inside the form and clears it on the next edit", async () => {
    mockPortfolioApi();
    const onDismissError = jest.fn();
    await renderWithProviders(
      <AddHoldingForm tickers={TICKERS} onSubmit={jest.fn()} onCancel={jest.fn()} error="Invalid buy date" onDismissError={onDismissError} />,
    );
    expect(screen.getByText("Invalid buy date")).toBeTruthy();
    await fireEvent.changeText(screen.getByPlaceholderText("100"), "1");
    expect(onDismissError).toHaveBeenCalled();
  });

  it("keeps submit disabled and says what is missing while the form is empty", async () => {
    mockPortfolioApi();
    const onSubmit = jest.fn();
    await renderWithProviders(<AddHoldingForm tickers={TICKERS} onSubmit={onSubmit} onCancel={jest.fn()} />);
    expect(screen.getByText("Enter a symbol, quantity and buy price to add this holding")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add to Portfolio" })).toBeDisabled();
    await fireEvent.press(screen.getByText("Add to Portfolio"));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
