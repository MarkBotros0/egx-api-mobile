import { fireEvent, screen, userEvent, waitFor, within } from "@testing-library/react-native";
import { router } from "expo-router";
import { stockHref } from "@/lib/links";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setApiMarket } from "@/shared/api";
import { renderWithProviders } from "@/test-utils/render";
import { EG_WORDING, renderedText } from "@/test-utils/text";
import { DividendCalendarScreen } from "../DividendCalendarScreen";
import { fail, marketPrefRoutes, mockMarketApi, requestsTo } from "../testing/api";
import { CALENDAR } from "../testing/fixtures";

jest.mock("expo-router", () => jest.requireActual("@/features/market/testing/expoRouterMock"));

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  setApiMarket("EG");
});

const monthHeader = () => within(screen.getByTestId("calendar-month"));

async function renderCalendar() {
  const fetchMock = mockMarketApi({ "/dividend_calendar": CALENDAR });
  await renderWithProviders(<DividendCalendarScreen />);
  await screen.findByTestId("calendar-month");
  return fetchMock;
}

it("opens on the latest month with data and lists its payers", async () => {
  await renderCalendar();
  expect(monthHeader().getByText("April 2026")).toBeTruthy();
  expect(screen.getByText("4 EGX stocks with a dividend on record")).toBeTruthy();
  expect(screen.getByText("SWDY")).toBeTruthy();
  expect(screen.getByText("COMI")).toBeTruthy();
  expect(screen.getByText("Commercial International Bank")).toBeTruthy();
  expect(screen.getAllByText("ex-date 7 Apr 2026")).toHaveLength(2);
  expect(screen.getByText("6.00")).toBeTruthy();
  expect(screen.getByText("3.2%")).toBeTruthy();
  expect(within(screen.getByTestId("day-2026-04-07")).getByText("2")).toBeTruthy();
});

it("filters the list to a tapped day and back", async () => {
  await renderCalendar();
  await fireEvent.press(screen.getByTestId("day-2026-04-07"));
  expect(screen.getByText("7 Apr 2026")).toBeTruthy();
  expect(screen.queryByText("SWDY")).toBeNull();
  await fireEvent.press(screen.getByText("Show whole month"));
  expect(screen.getByText("SWDY")).toBeTruthy();
});

it("pages months and years", async () => {
  await renderCalendar();
  await fireEvent.press(screen.getByLabelText("Previous month"));
  expect(monthHeader().getByText("March 2026")).toBeTruthy();
  expect(screen.getByText("No dividends on record for March 2026.")).toBeTruthy();
  await fireEvent.press(screen.getByText("2025"));
  await fireEvent.press(screen.getByLabelText("Next month"));
  await fireEvent.press(screen.getByLabelText("Next month"));
  expect(monthHeader().getByText("May 2025")).toBeTruthy();
  // ABUK's stored name only echoes the symbol, so it is not repeated.
  expect(screen.getAllByText("ABUK")).toHaveLength(1);
  expect(screen.getByText("12.00")).toBeTruthy();
});

it("opens a payer's stock page", async () => {
  await renderCalendar();
  await fireEvent.press(screen.getByText("COMI"));
  expect(router.push).toHaveBeenCalledWith(stockHref("COMI"));
});

it("refetches the calendar on pull-to-refresh", async () => {
  const fetchMock = await renderCalendar();
  expect(requestsTo(fetchMock, "/dividend_calendar")).toHaveLength(1);
  await userEvent.pullToRefresh(screen.getByTestId("dividends-scroll"));
  await waitFor(() => expect(requestsTo(fetchMock, "/dividend_calendar")).toHaveLength(2));
});

it("says when the calendar did not load", async () => {
  mockMarketApi({ "/dividend_calendar": fail(500, "calendar down") });
  await renderWithProviders(<DividendCalendarScreen />);
  expect(await screen.findByText("The dividend calendar didn't load.")).toBeTruthy();
  expect(screen.getByText("calendar down")).toBeTruthy();
});

it("keeps the EG banner word for word", async () => {
  await renderCalendar();
  expect(
    screen.getByText(
      "These are the most recent coupons on record — their ex-dates (own the share before it to get the coupon). The EGX publishes no forward calendar, so future dates aren't shown; most companies pay once, around April–May."
    )
  ).toBeTruthy();
});

it("a deep link on US shows the empty state and never asks for a US calendar", async () => {
  const fetchMock = mockMarketApi({ ...marketPrefRoutes("US"), "/dividend_calendar": CALENDAR });
  await renderWithProviders(<DividendCalendarScreen />);
  await waitFor(() => expect(screen.queryByTestId("calendar-month")).toBeNull());
  expect(await screen.findByText("No dividends on record yet.")).toBeTruthy();
  // Settled on US: the EG calendar (if it mounted before the preference landed) is gone.
  await waitFor(() => expect(screen.queryByText(/with a dividend on record/)).toBeNull());
  expect(requestsTo(fetchMock, "/dividend_calendar").some((u) => u.searchParams.get("market") === "US")).toBe(false);
  expect(renderedText()).not.toMatch(EG_WORDING);
});
