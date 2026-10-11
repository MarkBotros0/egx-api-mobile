import { fireEvent, screen, userEvent, waitFor, within } from "@testing-library/react-native";
import { router } from "expo-router";
import { routes } from "@/lib/links";
import { renderWithProviders } from "@/test-utils/render";
import { DashboardScreen } from "../DashboardScreen";
import { mockMarketApi, requestsTo, type Route } from "../testing/api";
import { batch, makeDashboard, makeDashboardRow } from "../testing/fixtures";

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
  expect(screen.getByText(/does not predict price/)).toBeTruthy();
});

it("Default restores the ticker-file order", async () => {
  await renderDashboard();
  await fireEvent.press(screen.getByText("Default"));
  await waitFor(() =>
    expect(cardOrder()).toEqual(["stockcard-COMI", "stockcard-TMGH", "stockcard-ETEL", "stockcard-ABUK"])
  );
});

it("filters to dividend payers", async () => {
  await renderDashboard();
  await fireEvent.press(screen.getByText("Pays a dividend"));
  await waitFor(() => expect(cardOrder()).toEqual(["stockcard-COMI", "stockcard-ETEL"]));
});

it("turns scores off and shows the sector instead", async () => {
  await renderDashboard();
  await fireEvent.press(screen.getByText("Score: On"));
  const card = screen.getByTestId("stockcard-COMI");
  expect(await within(card).findByText("Banking")).toBeTruthy();
  expect(within(card).queryByText("72")).toBeNull();
});

it("warns and re-scores on a non-daily interval", async () => {
  const fetchMock = await renderDashboard();
  await fireEvent.press(screen.getByText("Weekly"));
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
