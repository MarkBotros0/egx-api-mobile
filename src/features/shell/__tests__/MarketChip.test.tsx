import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactElement } from "react";

import { EG_FALLBACK, type Market } from "@/shared/markets";
import { TestSafeArea } from "@/test-utils/safeArea";

import { MarketChip } from "../MarketChip";
import { MarketRow } from "../MarketSheet";

const US: Market = { ...EG_FALLBACK, code: "US", currency: "USD", name: "United States", flag: "🇺🇸" };

// jest.mock factories may only reference `mock`-prefixed variables.
const mockState = { markets: [] as Market[], loading: false, setMarket: jest.fn() };

jest.mock("@/providers/market", () => ({
  useMarket: () => ({
    market: mockState.markets[0],
    markets: mockState.markets,
    setMarket: mockState.setMarket,
    loading: mockState.loading,
  }),
}));

const show = (ui: ReactElement) => render(<TestSafeArea>{ui}</TestSafeArea>);

beforeEach(() => {
  mockState.markets = [EG_FALLBACK];
  mockState.loading = false;
  mockState.setMarket.mockClear();
});

describe("MarketChip", () => {
  it("is hidden with a single market", async () => {
    await show(<MarketChip />);
    expect(screen.queryByLabelText(/Market:/)).toBeNull();
  });

  it("is hidden while the market preference is loading", async () => {
    mockState.markets = [EG_FALLBACK, US];
    mockState.loading = true;
    await show(<MarketChip />);
    expect(screen.queryByLabelText(/Market:/)).toBeNull();
  });

  it("shows the current market and switches from the sheet", async () => {
    mockState.markets = [EG_FALLBACK, US];
    await show(<MarketChip />);
    await fireEvent.press(screen.getByLabelText("Market: Egypt, EGP. Change market"));
    expect(screen.getByLabelText("Egypt, EGP").props.accessibilityState).toMatchObject({ selected: true });
    await fireEvent.press(screen.getByLabelText("United States, USD"));
    expect(mockState.setMarket).toHaveBeenCalledWith("US");
  });
});

describe("MarketRow", () => {
  it("is hidden with a single market", async () => {
    await show(<MarketRow />);
    expect(screen.queryByLabelText(/Market:/)).toBeNull();
  });

  it("is hidden while the market preference is loading", async () => {
    mockState.markets = [EG_FALLBACK, US];
    mockState.loading = true;
    await show(<MarketRow />);
    expect(screen.queryByLabelText(/Market:/)).toBeNull();
  });

  it("shows the current market and switches from the sheet", async () => {
    mockState.markets = [EG_FALLBACK, US];
    await show(<MarketRow />);
    await fireEvent.press(screen.getByLabelText("Market: Egypt. Change market"));
    await fireEvent.press(screen.getByLabelText("United States, USD"));
    expect(mockState.setMarket).toHaveBeenCalledWith("US");
  });
});
