import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { learnHref } from "@/lib/links";
import { renderWithProviders } from "@/test-utils/render";
import { MarketRegimeCard } from "../MarketRegimeCard";
import { fail, mockMarketApi } from "../testing/api";
import { REGIME } from "../testing/fixtures";

jest.mock("expo-router", () => jest.requireActual("@/features/market/testing/expoRouterMock"));

beforeEach(() => jest.clearAllMocks());

it("shows the reading, its history and breadth", async () => {
  mockMarketApi();
  await renderWithProviders(<MarketRegimeCard />);
  expect(await screen.findByText("Mixed")).toBeTruthy();
  expect(screen.getByText("52.3")).toBeTruthy();
  expect(screen.getByText("avg of 61 / 79")).toBeTruthy();
  expect(screen.getByText(/were positive 58% of the time — and negative or flat the other 42%/)).toBeTruthy();
  expect(screen.getByText(/does not clear the usual significance bar/)).toBeTruthy();
  expect(screen.getByText("62% above their 200-day average")).toBeTruthy();
  expect(screen.getByText(/On EGX history that has leaned the wrong way/)).toBeTruthy();
});

it("says breadth is still filling in when there are too few stocks", async () => {
  mockMarketApi({
    "/market_regime": { ...REGIME, breadth: { n_symbols: 9, enough_data: false } },
  });
  await renderWithProviders(<MarketRegimeCard />);
  expect(await screen.findByText(/Needs at least 15 measured stocks; 9 are in/)).toBeTruthy();
});

it("links to the Learn concept", async () => {
  mockMarketApi();
  await renderWithProviders(<MarketRegimeCard />);
  await fireEvent.press(await screen.findByText("What does this mean? →"));
  expect(router.push).toHaveBeenCalledWith(learnHref("market_condition"));
});

it("renders nothing when the reading fails", async () => {
  mockMarketApi({ "/market_regime": fail(500) });
  await renderWithProviders(<MarketRegimeCard />);
  await waitFor(() => expect(screen.queryByTestId("regime-skeleton")).toBeNull());
  expect(screen.queryByText("Market Condition")).toBeNull();
});
