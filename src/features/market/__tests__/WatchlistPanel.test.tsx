import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { stockHref } from "@/lib/links";
import { renderWithProviders } from "@/test-utils/render";
import { mockMarketApi, requestsTo } from "../testing/api";
import { TICKERS } from "../testing/fixtures";
import { WatchlistPanel } from "../WatchlistPanel";

jest.mock("expo-router", () => jest.requireActual("@/features/market/testing/expoRouterMock"));
jest.mock("@/charts", () => jest.requireActual("@/features/market/testing/chartsMock"));

const watched = (init?: RequestInit) =>
  init?.method === "DELETE" ? { deleted: "COMI" } : { symbols: ["COMI"] };

beforeEach(() => jest.clearAllMocks());

it("lists watched stocks with their name and price", async () => {
  mockMarketApi({ "/watchlist": (_u: URL, init?: RequestInit) => watched(init) });
  await renderWithProviders(
    <WatchlistPanel
      tickers={TICKERS}
      priceData={{ COMI: { price: 82.5, change: 1.2, changePct: 1.48, sparkline: [80, 82.5] } }}
    />
  );
  expect(await screen.findByText("COMI")).toBeTruthy();
  expect(screen.getByText("Commercial International Bank")).toBeTruthy();
  expect(screen.getByText("82.50")).toBeTruthy();
  expect(screen.getByText("+1.48%")).toBeTruthy();
});

it("opens a watched stock", async () => {
  mockMarketApi({ "/watchlist": (_u: URL, init?: RequestInit) => watched(init) });
  await renderWithProviders(<WatchlistPanel tickers={TICKERS} />);
  await fireEvent.press(await screen.findByText("COMI"));
  expect(router.push).toHaveBeenCalledWith(stockHref("COMI"));
});

it("removes a stock and calls the API", async () => {
  const fetchMock = mockMarketApi({ "/watchlist": (_u: URL, init?: RequestInit) => watched(init) });
  await renderWithProviders(<WatchlistPanel tickers={TICKERS} />);
  await fireEvent.press(await screen.findByLabelText("Remove COMI from watchlist"));
  await waitFor(() => expect(requestsTo(fetchMock, "/watchlist", "DELETE")).toHaveLength(1));
  expect(requestsTo(fetchMock, "/watchlist", "DELETE")[0].searchParams.get("symbol")).toBe("COMI");
  expect(await screen.findByText(/Your watchlist is empty/)).toBeTruthy();
});
