import { fireEvent, screen, userEvent, waitFor } from "@testing-library/react-native";
import { Linking } from "react-native";
import { router } from "expo-router";
import { stockHref } from "@/lib/links";
import { renderWithProviders } from "@/test-utils/render";
import { NewsScreen } from "../NewsScreen";
import { fail, mockMarketApi, requestsTo } from "../testing/api";
import { NEWS } from "../testing/fixtures";

jest.mock("expo-router", () => jest.requireActual("@/features/market/testing/expoRouterMock"));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Linking, "openURL").mockResolvedValue(true);
});

it("shows your stocks and the market, with sources, ages and caveats", async () => {
  mockMarketApi({ "/news": NEWS });
  await renderWithProviders(<NewsScreen />);
  expect(await screen.findByText("CIB posts record quarterly profit")).toBeTruthy();
  expect(screen.getByText("Your holdings and the market, last 30 days")).toBeTruthy();
  expect(screen.getByText("2 of your 5 stocks had no news (ESRS, EKHO) · some sources timed out")).toBeTruthy();
  expect(screen.getByText("Reuters")).toBeTruthy();
  expect(screen.getByText("LSE")).toBeTruthy();
  expect(screen.getByText("2h ago")).toBeTruthy();
  expect(screen.getByText("3d ago")).toBeTruthy();
  expect(screen.getByText("EGX30 closes higher")).toBeTruthy();
});

it("opens a headline off-app and a ticker in-app", async () => {
  mockMarketApi({ "/news": NEWS });
  await renderWithProviders(<NewsScreen />);
  await fireEvent.press(await screen.findByText("CIB posts record quarterly profit"));
  expect(Linking.openURL).toHaveBeenCalledWith("https://www.tradingview.com/news/n1");
  await fireEvent.press(screen.getByText("OCDI"));
  expect(router.push).toHaveBeenCalledWith(stockHref("OCDI"));
});

it("explains an empty section", async () => {
  mockMarketApi({
    "/news": { ...NEWS, your_stocks: [], coverage: { ...NEWS.coverage, symbols_requested: 0, symbols_without_news: [] }, status: "ok" },
  });
  await renderWithProviders(<NewsScreen />);
  expect(await screen.findByText("Add a holding or watch a stock, and news about it shows up here.")).toBeTruthy();
});

it("says when the feed did not load", async () => {
  mockMarketApi({ "/news": fail(502, "upstream down") });
  await renderWithProviders(<NewsScreen />);
  expect(await screen.findByText("The news feed didn't load.")).toBeTruthy();
  expect(screen.getByText("upstream down")).toBeTruthy();
});

it("pull-to-refresh fetches again", async () => {
  const fetchMock = mockMarketApi({ "/news": NEWS });
  await renderWithProviders(<NewsScreen />);
  await screen.findByText("CIB posts record quarterly profit");
  await userEvent.pullToRefresh(screen.getByTestId("news-scroll"));
  await waitFor(() => expect(requestsTo(fetchMock, "/news")).toHaveLength(2));
});
