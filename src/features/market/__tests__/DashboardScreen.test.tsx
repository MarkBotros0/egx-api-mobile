import { act, fireEvent, screen, userEvent, waitFor, within } from "@testing-library/react-native";
import { Pressable } from "react-native";
import { router } from "expo-router";
import { routes } from "@/lib/links";
import { useMarket } from "@/providers/market";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setApiMarket } from "@/shared/api";
import { EG_FALLBACK } from "@/shared/markets";
import { renderWithProviders } from "@/test-utils/render";
import { EG_WORDING, renderedText } from "@/test-utils/text";
import { DashboardScreen } from "../DashboardScreen";
import { mockMarketApi, requestsTo, type Route } from "../testing/api";
import { DEFAULT_WEIGHTS, FALLBACK_WEIGHT_PRESETS } from "@/shared/constants";
import { batch, makeDashboard, makeDashboardRow, REGIME, TICKERS, US_MARKET, US_TICKERS } from "../testing/fixtures";

jest.mock("expo-router", () => jest.requireActual("@/features/market/testing/expoRouterMock"));
jest.mock("@/charts", () => jest.requireActual("@/features/market/testing/chartsMock"));

beforeEach(() => jest.clearAllMocks());

async function renderDashboard(routesOverride: Record<string, Route> = {}) {
  const fetchMock = mockMarketApi(routesOverride);
  await renderWithProviders(<DashboardScreen />);
  const card = await screen.findByTestId("stockcard-COMI");
  await within(card).findByText("82.50"); // snapshot landed
  return fetchMock;
}

const cardOrder = () => screen.getAllByTestId(/^stockcard-[A-Z0-9]+$/).map((el) => el.props.testID);

it("shows the EGX30 grid from the snapshot", async () => {
  await renderDashboard();
  expect(screen.getByText("4 stocks")).toBeTruthy();
  expect(within(screen.getByTestId("stockcard-COMI")).getByText("72")).toBeTruthy();
  expect(screen.queryByTestId("stockcard-MEGM")).toBeNull();
});

it("moves listings without a feed below the grid, still findable", async () => {
  await renderDashboard();
  await fireEvent.press(screen.getByText("All"));
  expect(await screen.findByText("4 stocks · 2 without a price feed")).toBeTruthy();
  await fireEvent.press(screen.getByText(/^No feed data \(2\)/));
  expect(within(await screen.findByTestId("stockcard-MEGM")).getByText("No price feed")).toBeTruthy();
});

it("filters by search text", async () => {
  await renderDashboard();
  await fireEvent.changeText(screen.getByPlaceholderText("Filter by name or symbol..."), "telecom");
  await waitFor(() => expect(screen.queryByTestId("stockcard-COMI")).toBeNull());
  expect(screen.getByTestId("stockcard-ETEL")).toBeTruthy();
});

it("opens sorted by score and explains what the score is", async () => {
  await renderDashboard();
  await waitFor(() =>
    expect(cardOrder()).toEqual(["stockcard-COMI", "stockcard-ETEL", "stockcard-TMGH", "stockcard-ABUK"])
  );
  // The explanation sits in the Sort sheet.
  await fireEvent.press(screen.getByLabelText("Sort: Score"));
  expect(await screen.findByText(/does not predict price/)).toBeTruthy();
});

it("Default restores the ticker-file order", async () => {
  await renderDashboard();
  await fireEvent.press(screen.getByLabelText("Sort: Score"));
  await fireEvent.press(screen.getByLabelText("Default"));
  await waitFor(() =>
    expect(cardOrder()).toEqual(["stockcard-COMI", "stockcard-TMGH", "stockcard-ETEL", "stockcard-ABUK"])
  );
});

it("filters to dividend payers", async () => {
  await renderDashboard();
  await fireEvent.press(screen.getByLabelText("Filter: All sectors"));
  await fireEvent(screen.getByLabelText("Pays a dividend"), "valueChange", true);
  await waitFor(() => expect(cardOrder()).toEqual(["stockcard-COMI", "stockcard-ETEL"]));
});

it("turns scores off and shows the sector instead", async () => {
  await renderDashboard();
  await fireEvent.press(screen.getByLabelText("Score: On, Daily"));
  await fireEvent(screen.getByLabelText("Show scores on cards"), "valueChange", false);
  const card = screen.getByTestId("stockcard-COMI");
  expect(await within(card).findByText("Banking")).toBeTruthy();
  expect(within(card).queryByText("72")).toBeNull();
});

it("warns and re-scores on a non-daily interval", async () => {
  const fetchMock = await renderDashboard();
  await fireEvent.press(screen.getByLabelText("Score: On, Daily"));
  await fireEvent.press(screen.getByLabelText("Weekly"));
  expect(screen.getByText("Showing weekly scores — trend context, not entry timing")).toBeTruthy();
  await waitFor(() =>
    expect(requestsTo(fetchMock, "/analysis").some((u) => u.searchParams.get("interval") === "Weekly")).toBe(true)
  );
});

it("pull-to-refresh asks for fresh prices", async () => {
  const fetchMock = await renderDashboard();
  await userEvent.pullToRefresh(screen.getByTestId("dashboard-list"));
  await waitFor(() =>
    expect(requestsTo(fetchMock, "/dashboard").some((u) => u.searchParams.has("fresh"))).toBe(true)
  );
});

it("upgrades visible cards to live scores", async () => {
  // Renders directly: the live upgrade can replace the snapshot price before it is observed.
  mockMarketApi({
    "/analysis": (url: URL) =>
      (url.searchParams.get("symbols") ?? "").includes("COMI")
        ? batch({ COMI: { score: 81, signal: "Very Strong", price: 84 } })
        : batch({}),
  });
  await renderWithProviders(<DashboardScreen />);
  const card = await screen.findByTestId("stockcard-COMI");
  expect(await within(card).findByText("81")).toBeTruthy();
});

it("loads more cards from the footer", async () => {
  const many = Array.from({ length: 30 }, (_, i) => ({
    symbol: `S${String(i).padStart(2, "0")}`,
    name: `Stock ${i}`,
    sector: "Banking",
    index: "EGX30",
  }));
  mockMarketApi({
    "/tickers": many,
    "/dashboard": makeDashboard(many.map((t) => makeDashboardRow(t.symbol))),
  });
  await renderWithProviders(<DashboardScreen />);
  await fireEvent.press(await screen.findByText("Load more (6 remaining)"));
  await waitFor(() => expect(screen.queryByText(/Load more/)).toBeNull());
});

it("opens Compare and the dividend calendar from the header", async () => {
  await renderDashboard();
  await fireEvent.press(screen.getByLabelText("Compare stocks"));
  expect(router.push).toHaveBeenCalledWith(routes.compare);
  await fireEvent.press(screen.getByLabelText("Dividend calendar"));
  expect(router.push).toHaveBeenCalledWith(routes.dividends);
});

describe("market switch", () => {
  const US = { ...EG_FALLBACK, code: "US" as const, currency: "USD" };
  const EG_SYMBOLS = new Set(TICKERS.map((t) => t.symbol));

  function WithChanger() {
    const { setMarket } = useMarket();
    return (
      <>
        <Pressable testID="to-us" onPress={() => setMarket("US")} />
        <DashboardScreen />
      </>
    );
  }

  it("never live-scores the old market's symbols in the new one while its list loads", async () => {
    let releaseUsTickers: () => void = () => {};
    const usTickers = new Promise<void>((r) => (releaseUsTickers = r));
    const fetchMock = mockMarketApi({
      "/markets": { markets: [EG_FALLBACK, US], default: "EG" },
      "/tickers": async (url: URL) => {
        if (url.searchParams.get("market") !== "US") return TICKERS;
        await usTickers;
        return [{ symbol: "AAPL", name: "Apple", sector: "Technology", index: "EGX30" }];
      },
      "/watchlist": (url: URL) => ({ symbols: url.searchParams.get("market") === "US" ? ["AAPL"] : ["COMI"] }),
      "/dashboard": (url: URL) =>
        url.searchParams.get("market") === "US"
          ? makeDashboard([makeDashboardRow("AAPL", { score: 60, price: 230 })])
          : makeDashboard([makeDashboardRow("COMI", { score: 72, price: 82.5 })]),
    });
    await renderWithProviders(<WithChanger />);
    await screen.findByTestId("stockcard-COMI");
    await waitFor(() => expect(requestsTo(fetchMock, "/analysis").length).toBeGreaterThan(0));

    await fireEvent.press(screen.getByTestId("to-us"));
    // The US snapshot lands while the US ticker list is still loading.
    await waitFor(() =>
      expect(requestsTo(fetchMock, "/dashboard").some((u) => u.searchParams.get("market") === "US")).toBe(true)
    );
    await waitFor(() => expect(screen.queryByTestId("stockcard-COMI")).toBeNull());
    await act(async () => releaseUsTickers());
    await screen.findByTestId("stockcard-AAPL");
    await waitFor(() =>
      expect(requestsTo(fetchMock, "/analysis").some((u) => u.searchParams.get("market") === "US")).toBe(true)
    );

    const usSymbols = requestsTo(fetchMock, "/analysis")
      .filter((u) => u.searchParams.get("market") === "US")
      .flatMap((u) => (u.searchParams.get("symbols") ?? "").split(","));
    expect(usSymbols.filter((s) => EG_SYMBOLS.has(s))).toEqual([]);
    expect(usSymbols).toContain("AAPL");
  });
});

describe("per market", () => {
  // A previous test's market choice survives in AsyncStorage and the API module.
  beforeEach(async () => {
    await AsyncStorage.clear();
    setApiMarket("EG");
  });

  /** A user whose saved market preference is `code`, with EG and US enabled. */
  function marketRoutes(code: "EG" | "US"): Record<string, Route> {
    return {
      "/markets": { markets: [EG_FALLBACK, US_MARKET], default: "EG" },
      "/settings": (url: URL) =>
        url.searchParams.get("section") === "market"
          ? { market: code }
          : { weights: DEFAULT_WEIGHTS, raw: DEFAULT_WEIGHTS, presets: FALLBACK_WEIGHT_PRESETS },
      "/tickers": (url: URL) => (url.searchParams.get("market") === "US" ? US_TICKERS : TICKERS),
      "/dashboard": (url: URL) =>
        url.searchParams.get("market") === "US"
          ? makeDashboard(US_TICKERS.map((t) => makeDashboardRow(t.symbol)))
          : makeDashboard([makeDashboardRow("COMI", { score: 72, price: 82.5 })]),
      "/market_regime": (url: URL) =>
        url.searchParams.get("market") === "US" ? { ...REGIME, band: null, label: "No reading" } : REGIME,
    };
  }

  const tab = (label: string) => screen.getByRole("button", { name: label });

  it("titles the screen and offers the market's own index tabs", async () => {
    mockMarketApi(marketRoutes("US"));
    await renderWithProviders(<DashboardScreen />);
    expect(await screen.findByText("US Market Overview")).toBeTruthy();
    for (const label of ["S&P 500", "NASDAQ-100", "Dow 30", "All"]) expect(tab(label)).toBeTruthy();
    expect(tab("S&P 500")).toBeSelected();
    expect(screen.queryByText("EGX30")).toBeNull();
  });

  it("keeps the EGX title on EG", async () => {
    mockMarketApi(marketRoutes("EG"));
    await renderWithProviders(<DashboardScreen />);
    expect(await screen.findByText("EGX Market Overview")).toBeTruthy();
  });

  it("returns to the new market's first tab when the market changes", async () => {
    mockMarketApi(marketRoutes("EG"));
    function WithChanger() {
      const { setMarket } = useMarket();
      return (
        <>
          <Pressable testID="to-us" onPress={() => setMarket("US")} />
          <DashboardScreen />
        </>
      );
    }
    await renderWithProviders(<WithChanger />);
    await screen.findByTestId("stockcard-COMI");
    await fireEvent.press(tab("EGX70"));
    expect(tab("EGX70")).toBeSelected();

    await fireEvent.press(screen.getByTestId("to-us"));
    await waitFor(() => expect(tab("S&P 500")).toBeSelected());
    expect(await screen.findByTestId("stockcard-AAPL")).toBeTruthy();
  });

  it("never asks for the market-condition reading on US, and shows no skeleton for it", async () => {
    const fetchMock = mockMarketApi(marketRoutes("US"));
    await renderWithProviders(<DashboardScreen />);
    await screen.findByTestId("stockcard-AAPL");
    expect(screen.queryByTestId("regime-skeleton")).toBeNull();
    expect(screen.queryByText("Market Condition")).toBeNull();
    expect(requestsTo(fetchMock, "/market_regime").some((u) => u.searchParams.get("market") === "US")).toBe(false);
  });

  it("offers no dividend calendar on US, and its filter explanation names no Egyptian rate", async () => {
    mockMarketApi(marketRoutes("US"));
    await renderWithProviders(<DashboardScreen />);
    await screen.findByTestId("stockcard-AAPL");
    expect(screen.queryByLabelText("Dividend calendar")).toBeNull();
    expect(screen.getByLabelText("Compare stocks")).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("Filter: All sectors"));
    expect(
      screen.getByText(
        "Shows only stocks that currently pay a cash dividend (a yield above zero, from the fundamentals feed). A dividend is evidence a company generates real cash. Pair it with the 'Recently paid' sort to see who paid most recently."
      )
    ).toBeTruthy();
    expect(renderedText()).not.toMatch(EG_WORDING);
  });

  it("keeps the EG dividend filter explanation word for word", async () => {
    mockMarketApi(marketRoutes("EG"));
    await renderWithProviders(<DashboardScreen />);
    await screen.findByTestId("stockcard-COMI");
    expect(screen.getByLabelText("Dividend calendar")).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("Filter: All sectors"));
    expect(
      screen.getByText(
        "Shows only stocks that currently pay a cash dividend (a yield above zero, from the fundamentals feed). A dividend is evidence a company generates real cash — but with the policy rate near 19%, no EGX yield competes as income on its own. Pair it with the 'Recently paid' sort to see who paid most recently."
      )
    ).toBeTruthy();
  });

  it("never lists a universe stock from another tab under More US stocks", async () => {
    const NDX_ONLY = { symbol: "MRVL", name: "Marvell Technology", sector: "Electronic Technology", index: "NDX", indices: ["NDX"], exchange: "NASDAQ" };
    mockMarketApi({
      ...marketRoutes("US"),
      "/tickers": (url: URL) => (url.searchParams.get("market") === "US" ? [...US_TICKERS, NDX_ONLY] : TICKERS),
      "/tickers/search": [
        { symbol: "MRVL", name: "Marvell Technology", sector: "Electronic Technology", exchange: "NASDAQ", kind: "stock" },
        { symbol: "MARA", name: "MARA Holdings", sector: "Finance", exchange: "NASDAQ", kind: "stock" },
      ],
    });
    await renderWithProviders(<DashboardScreen />);
    await screen.findByTestId("stockcard-AAPL");
    expect(tab("S&P 500")).toBeSelected();
    await fireEvent.changeText(screen.getByTestId("dashboard-search"), "mar");
    const more = await screen.findByTestId("remote-search-results");
    expect(within(more).getByText("MARA")).toBeTruthy();
    expect(within(more).queryByText("MRVL")).toBeNull();
  });
});
