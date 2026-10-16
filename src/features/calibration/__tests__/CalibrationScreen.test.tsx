import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { fetchCalibration, type CalibrationResponse } from "@/shared/api";
import { learnHref } from "@/lib/links";
import { renderScreen } from "@/test-utils/renderScreen";
import { CalibrationScreen } from "../CalibrationScreen";
import * as marketProvider from "@/providers/market";
import { EG_FALLBACK } from "@/shared/markets";

jest.mock("@/shared/api", () => ({ fetchCalibration: jest.fn() }));
jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
const fetchMock = fetchCalibration as jest.MockedFunction<typeof fetchCalibration>;

const DATA: CalibrationResponse = {
  forecast: {
    fitted_at: "2026-09-30",
    n_observations: 41234,
    universe: "EGX30 + EGX70",
    bands: [{ claim: "90% range, 60 days", promised_pct: 90, delivered_pct: 89, note: "Close enough." }],
    sharpness: { median_width_pct_of_spot: 88, p25: 72, p75: 110, note: "Wide on purpose." },
    z_table: {},
  },
  risk_grade: {
    fitted_at: "2026-09-30",
    n_observations: 9000,
    claims: [{ claim: "Orders future volatility", ic: 0.41, t_non_overlapping: 6.2, verdict: "holds" }],
  },
  what_failed: [{ claim: "Composite ranks stocks", measured: "IC ≈ 0", outcome: "Retracted." }],
};

beforeEach(() => fetchMock.mockReset());

describe("CalibrationScreen", () => {
  it("shows promised vs delivered, the band width, and what failed", async () => {
    fetchMock.mockResolvedValue(DATA);
    await renderScreen(<CalibrationScreen />);
    await waitFor(() => expect(screen.getByText("Checking our work")).toBeTruthy());
    expect(screen.getByText("said 90%")).toBeTruthy();
    expect(screen.getByText("was 89%")).toBeTruthy();
    expect(screen.getByText("88% of the share price")).toBeTruthy();
    expect(screen.getByText("0.41")).toBeTruthy();
    expect(screen.getByText("What we tested and dropped")).toBeTruthy();
    expect(screen.getByText("Composite ranks stocks")).toBeTruthy();
    expect(screen.getByText((41234).toLocaleString())).toBeTruthy();
  });

  it("links to the risk-management module", async () => {
    fetchMock.mockResolvedValue(DATA);
    await renderScreen(<CalibrationScreen />);
    await waitFor(() => expect(screen.getByText("Learn how to read these →")).toBeTruthy());
    await fireEvent.press(screen.getByText("Learn how to read these →"));
    expect(router.push).toHaveBeenCalledWith(learnHref("risk-management"));
  });

  it("says it could not load, and retries on request", async () => {
    fetchMock.mockRejectedValueOnce(new Error("500")).mockResolvedValueOnce(DATA);
    await renderScreen(<CalibrationScreen />);
    await waitFor(() => expect(screen.getByText("Could not load the accuracy record.")).toBeTruthy());
    await fireEvent.press(screen.getByText("Try again"));
    await waitFor(() => expect(screen.getByText("Checking our work")).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

it("names the market and its universe", async () => {
  jest.spyOn(marketProvider, "useMarket").mockReturnValue({
    market: { ...EG_FALLBACK, code: "US", short_name: "US", adjective: "US" },
    markets: [EG_FALLBACK],
    setMarket: jest.fn(),
    loading: false,
  } as any);
  fetchMock.mockResolvedValue({
    ...DATA,
    forecast: { ...DATA.forecast, universe: "current S&P 500 / NASDAQ-100 / Dow 30 members, 2006–2026" },
  });
  await renderScreen(<CalibrationScreen />);
  await waitFor(() => expect(screen.getByText("Checking our work")).toBeTruthy());
  expect(screen.getByText(/real US market history/)).toBeTruthy();
  expect(screen.getByText("Universe: current S&P 500 / NASDAQ-100 / Dow 30 members, 2006–2026")).toBeTruthy();
  jest.restoreAllMocks();
});
