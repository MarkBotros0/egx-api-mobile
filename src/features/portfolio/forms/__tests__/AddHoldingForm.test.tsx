import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils/render";
import { EG_WORDING, renderedText } from "@/test-utils/text";
import { mockPortfolioApi } from "@/features/portfolio/testing/api";
import { TICKERS } from "@/features/portfolio/testing/fixtures";
import { todayIso } from "@/lib/dates";
import { US_MARKET } from "@/features/market/testing/fixtures";
import { EG_FALLBACK } from "@/shared/markets";
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
    expect(await screen.findByText("No EGX symbol matches — check and try again")).toBeTruthy();
    await fireEvent.press(screen.getByText("Add to Portfolio"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("treats a company name with matches as a search, not a failed symbol", async () => {
    jest.useFakeTimers();
    mockPortfolioApi({
      extra: [{ method: "GET", path: /\/tickers\?validate=COMMERCIAL/, body: { symbol: "COMMERCIAL", valid: false, name: null } }],
    });
    await renderWithProviders(<AddHoldingForm tickers={TICKERS} onSubmit={jest.fn()} onCancel={jest.fn()} />);
    await fireEvent.changeText(screen.getByPlaceholderText("Search by symbol or name..."), "commercial");
    await act(async () => {
      jest.advanceTimersByTime(600);
    });
    expect(screen.getByText("COMI")).toBeTruthy();
    expect(screen.queryByText("No EGX symbol matches — check and try again")).toBeNull();
  });

  it("explains invalid quantity and price instead of submitting", async () => {
    mockPortfolioApi();
    const onSubmit = jest.fn();
    await renderWithProviders(<AddHoldingForm tickers={TICKERS} onSubmit={onSubmit} onCancel={jest.fn()} />);
    await fireEvent.changeText(screen.getByPlaceholderText("Search by symbol or name..."), "COMI");
    await fireEvent.changeText(screen.getByPlaceholderText("100"), "5.5");
    await fireEvent.changeText(screen.getByPlaceholderText("85.50"), "27.6971");
    expect(screen.getByText("Enter a whole number of shares")).toBeTruthy();
    expect(screen.getByText("Prices go to 3 decimals at most")).toBeTruthy();
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

  describe("remote suggestions", () => {
    const VOO = { symbol: "VOO", name: "Vanguard S&P 500 ETF", sector: "Miscellaneous", exchange: "AMEX", kind: "fund" };

    /** A user whose saved market is `code`, with EG and US enabled, and a search that finds VOO. */
    function onMarket(code: "EG" | "US") {
      return mockPortfolioApi({
        extra: [
          { path: "/markets", body: { markets: [EG_FALLBACK, US_MARKET], default: "EG" } },
          { path: /\/settings\?section=market/, body: { market: code } },
          { path: "/tickers/search", body: [VOO] },
        ],
      });
    }
    const searches = (fetchMock: jest.Mock) => fetchMock.mock.calls.filter(([u]) => String(u).includes("/tickers/search"));

    it("offers the market's wider listing after a pause and picks it like a local ticker", async () => {
      jest.useFakeTimers();
      const fetchMock = onMarket("US");
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      await renderWithProviders(<AddHoldingForm tickers={TICKERS} onSubmit={onSubmit} onCancel={jest.fn()} />);
      await screen.findByText("Buy Price (USD) *");

      await fireEvent.changeText(screen.getByPlaceholderText("Search by symbol or name..."), "vo");
      await act(async () => {
        jest.advanceTimersByTime(299);
      });
      expect(screen.queryByText("VOO")).toBeNull();
      await act(async () => {
        jest.advanceTimersByTime(1);
      });
      await fireEvent.press(await screen.findByText("VOO"));
      expect(searches(fetchMock)).toHaveLength(1);
      expect(String(searches(fetchMock)[0][0])).toContain("market=US");

      expect(screen.getByPlaceholderText("Search by symbol or name...").props.value).toBe("VOO");
      expect(screen.getByText("Vanguard S&P 500 ETF — Miscellaneous")).toBeTruthy();
      await fireEvent.changeText(screen.getByPlaceholderText("100"), "3");
      await fireEvent.changeText(screen.getByPlaceholderText("85.50"), "512.4");
      await fireEvent.press(screen.getByText("Add to Portfolio"));
      await waitFor(() =>
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ symbol: "VOO", name: "Vanguard S&P 500 ETF", sector: "Miscellaneous" }),
        ),
      );
    });

    it("does not ask while five local matches already show", async () => {
      jest.useFakeTimers();
      const fetchMock = onMarket("US");
      const many = ["AA", "AB", "AC", "AD", "AE"].map((s) => ({ symbol: s, name: `${s} Corp`, sector: "Tech", index: "SPX" }));
      await renderWithProviders(<AddHoldingForm tickers={many} onSubmit={jest.fn()} onCancel={jest.fn()} />);
      await screen.findByText("Buy Price (USD) *");
      await fireEvent.changeText(screen.getByPlaceholderText("Search by symbol or name..."), "corp");
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      expect(searches(fetchMock)).toHaveLength(0);
    });

    it("names the US market when a symbol is not found there", async () => {
      jest.useFakeTimers();
      mockPortfolioApi({
        extra: [
          { path: "/markets", body: { markets: [EG_FALLBACK, US_MARKET], default: "EG" } },
          { path: /\/settings\?section=market/, body: { market: "US" } },
          { path: "/tickers/search", body: [] },
          { method: "GET", path: /\/tickers\?validate=ZZZZ/, body: { symbol: "ZZZZ", valid: false, name: null } },
        ],
      });
      await renderWithProviders(<AddHoldingForm tickers={TICKERS} onSubmit={jest.fn()} onCancel={jest.fn()} />);
      await screen.findByText("Buy Price (USD) *");
      await fireEvent.changeText(screen.getByPlaceholderText("Search by symbol or name..."), "zzzz");
      await act(async () => {
        jest.advanceTimersByTime(600);
      });
      expect(await screen.findByText("No US symbol matches — check and try again")).toBeTruthy();
      expect(renderedText()).not.toMatch(EG_WORDING);
    });

    it("submits a dotted US symbol picked from the wider listing as-is", async () => {
      jest.useFakeTimers();
      const BRKB = { symbol: "BRK.B", name: "Berkshire Hathaway Inc. Class B", sector: "Finance", exchange: "NYSE", kind: "stock" };
      mockPortfolioApi({
        extra: [
          { path: "/markets", body: { markets: [EG_FALLBACK, US_MARKET], default: "EG" } },
          { path: /\/settings\?section=market/, body: { market: "US" } },
          { path: "/tickers/search", body: [BRKB] },
        ],
      });
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      await renderWithProviders(<AddHoldingForm tickers={TICKERS} onSubmit={onSubmit} onCancel={jest.fn()} />);
      await screen.findByText("Buy Price (USD) *");
      await fireEvent.changeText(screen.getByPlaceholderText("Search by symbol or name..."), "berk");
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      await fireEvent.press(await screen.findByText("BRK.B"));
      await fireEvent.changeText(screen.getByPlaceholderText("100"), "2");
      await fireEvent.changeText(screen.getByPlaceholderText("85.50"), "471.25");
      await fireEvent.press(screen.getByText("Add to Portfolio"));
      await waitFor(() =>
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ symbol: "BRK.B", name: "Berkshire Hathaway Inc. Class B", quantity: 2, buy_price: 471.25 }),
        ),
      );
    });

    it("never searches on EG", async () => {
      jest.useFakeTimers();
      const fetchMock = onMarket("EG");
      await renderWithProviders(<AddHoldingForm tickers={TICKERS} onSubmit={jest.fn()} onCancel={jest.fn()} />);
      await fireEvent.changeText(screen.getByPlaceholderText("Search by symbol or name..."), "vo");
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      expect(searches(fetchMock)).toHaveLength(0);
      expect(screen.queryByText("VOO")).toBeNull();
    });
  });
});
