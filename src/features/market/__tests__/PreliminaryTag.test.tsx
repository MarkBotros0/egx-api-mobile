import { fireEvent, render, screen } from "@testing-library/react-native";
import { useMarket } from "@/providers/market";
import { EG_FALLBACK, type Market } from "@/shared/markets";
import { TestSafeArea } from "@/test-utils/safeArea";
import { PreliminaryTag } from "../PreliminaryTag";
import { US_MARKET } from "../testing/fixtures";

jest.mock("@/providers/market", () => ({ useMarket: jest.fn() }));

const EXPLANATION = "US scores use bands calibrated on the Egyptian market. They will be recalibrated for US stocks.";

function onMarket(market: Market) {
  (useMarket as jest.Mock).mockReturnValue({ market, markets: [EG_FALLBACK, US_MARKET], setMarket: jest.fn(), loading: false });
}

it("renders nothing on a calibrated market", async () => {
  onMarket(EG_FALLBACK);
  await render(<PreliminaryTag />);
  expect(screen.toJSON()).toBeNull();
});

it("tags an uncalibrated score and explains it on press", async () => {
  onMarket(US_MARKET);
  await render(<PreliminaryTag />, { wrapper: TestSafeArea });
  expect(screen.queryByText(EXPLANATION)).toBeNull();
  await fireEvent.press(screen.getByText("Preliminary"));
  expect(screen.getByText(EXPLANATION)).toBeTruthy();
});

it("reads PRELIM in its compact form", async () => {
  onMarket(US_MARKET);
  await render(<PreliminaryTag compact />, { wrapper: TestSafeArea });
  expect(screen.getByText("PRELIM")).toBeTruthy();
  expect(screen.queryByText("Preliminary")).toBeNull();
});
