import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils/render";
import { CompareScreen } from "../CompareScreen";
import { defaultCompareRange, rangeEndingAt } from "../logic/compare";
import { fail, mockMarketApi, requestsTo, type Route } from "../testing/api";
import { lastChartProps } from "../testing/chartsMock";
import { COMPARE } from "../testing/fixtures";

jest.mock("expo-router", () => jest.requireActual("@/features/market/testing/expoRouterMock"));
jest.mock("@/charts", () => jest.requireActual("@/features/market/testing/chartsMock"));

beforeEach(() => jest.clearAllMocks());

async function renderCompare(routes: Record<string, Route> = {}) {
  const fetchMock = mockMarketApi({ "/compare": COMPARE, ...routes });
  await renderWithProviders(<CompareScreen />);
  return fetchMock;
}

async function addSymbol(query: string, symbol: string) {
  await fireEvent.changeText(screen.getByPlaceholderText("Add symbol..."), query);
  await fireEvent.press(await screen.findByTestId(`suggestion-${symbol}`));
}

it("compares two stocks over the default six months", async () => {
  const fetchMock = await renderCompare();
  await addSymbol("comi", "COMI");
  await addSymbol("talaat", "TMGH");
  await fireEvent.press(screen.getByText("Compare"));

  expect(await screen.findByText("+12.34%")).toBeTruthy();
  expect(screen.getByText("-5.00%")).toBeTruthy();
  expect(screen.getByText("2.50%")).toBeTruthy();
  expect(screen.getByText("-8.20%")).toBeTruthy();

  const [req] = requestsTo(fetchMock, "/compare");
  const range = defaultCompareRange(new Date());
  expect(req.searchParams.get("symbols")).toBe("COMI,TMGH");
  expect(req.searchParams.get("interval")).toBe("Daily");
  expect(req.searchParams.get("start")).toBe(range.start);
  expect(req.searchParams.get("end")).toBe(range.end);
  expect(lastChartProps("CompareChart")).toMatchObject({
    dates: COMPARE.dates,
    series: [
      { symbol: "COMI", values: [100, 112.34] },
      { symbol: "TMGH", values: [100, 95] },
    ],
  });
});

it("needs at least two stocks", async () => {
  const fetchMock = await renderCompare();
  await addSymbol("comi", "COMI");
  await fireEvent.press(screen.getByText("Compare"));
  expect(requestsTo(fetchMock, "/compare")).toHaveLength(0);
  expect(screen.getByText("Select at least 2 stocks and tap Compare to see results.")).toBeTruthy();
});

it("does not request with an invalid range", async () => {
  const fetchMock = await renderCompare();
  await addSymbol("comi", "COMI");
  await addSymbol("talaat", "TMGH");
  await fireEvent.changeText(screen.getByTestId("compare-start"), "2026-1");
  expect(screen.getByText("Start date must be YYYY-MM-DD")).toBeTruthy();
  await fireEvent.press(screen.getByText("Compare"));
  await fireEvent.changeText(screen.getByTestId("compare-start"), "2026-02-30");
  await fireEvent.press(screen.getByText("Compare"));
  await fireEvent.changeText(screen.getByTestId("compare-start"), "2099-01-01");
  expect(screen.getByText("Start date must be on or before the end date")).toBeTruthy();
  await fireEvent.press(screen.getByText("Compare"));
  expect(requestsTo(fetchMock, "/compare")).toHaveLength(0);
});

it("fills the range from a preset", async () => {
  await renderCompare();
  await fireEvent.press(screen.getByText("1Y"));
  expect(screen.getByTestId("compare-start").props.value).toBe(rangeEndingAt(new Date(), 12).start);
});

it("removes a chip and hides the input at five stocks", async () => {
  await renderCompare();
  for (const [q, s] of [["comi", "COMI"], ["tmgh", "TMGH"], ["etel", "ETEL"], ["abuk", "ABUK"]]) {
    await addSymbol(q, s);
  }
  await fireEvent.press(screen.getByLabelText("Remove ETEL"));
  expect(screen.queryByLabelText("Remove ETEL")).toBeNull();
  await addSymbol("etel", "ETEL");
  await addSymbol("megm", "MEGM");
  expect(screen.queryByPlaceholderText("Add symbol...")).toBeNull();
});

it("shows the API error", async () => {
  await renderCompare({ "/compare": fail(500, "No data for range") });
  await addSymbol("comi", "COMI");
  await addSymbol("talaat", "TMGH");
  await fireEvent.press(screen.getByText("Compare"));
  expect(await screen.findByText("No data for range")).toBeTruthy();
  await waitFor(() => expect(screen.queryByTestId("chart-CompareChart")).toBeNull());
});

it("drops a removed stock's stat card", async () => {
  await renderCompare();
  await addSymbol("comi", "COMI");
  await addSymbol("talaat", "TMGH");
  await fireEvent.press(screen.getByText("Compare"));
  expect(await screen.findByText("-5.00%")).toBeTruthy();
  await fireEvent.press(screen.getByLabelText("Remove TMGH"));
  expect(screen.queryByText("-5.00%")).toBeNull();
  expect(screen.getByText("+12.34%")).toBeTruthy();
});
