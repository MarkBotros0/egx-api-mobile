import { fireEvent, render, screen } from "@testing-library/react-native";
import { SCORE_BAND_LABEL, STOP_LOSS_ATR_MULTIPLIER, T_BILL_RATE_PCT, scoreBand } from "@/shared/constants";
import {
  PositionSizer,
  RsiPlayground,
  ScoreBandExplorer,
  StopLossCalculator,
  TBillRace,
  snapToStep,
  splitHexAlpha,
} from "../widgets";

jest.mock("@react-native-community/slider", () => jest.requireActual("@/test-utils/sliderMock"));

async function drag(label: string, value: number) {
  await fireEvent(screen.getByLabelText(label), "valueChange", value);
}

describe("snapToStep", () => {
  it("removes native float noise", () => expect(snapToStep(30.000001, 0, 100, 1)).toBe(30));
  it("snaps to half steps from the minimum", () => expect(snapToStep(4.24, 0.5, 12, 0.5)).toBe(4));
  it("clamps to the range", () => {
    expect(snapToStep(-3, 0, 100, 1)).toBe(0);
    expect(snapToStep(140, 0, 100, 1)).toBe(100);
  });
});

describe("splitHexAlpha", () => {
  it("splits an 8-digit hex into colour and opacity", () => {
    expect(splitHexAlpha("#00ff8844")).toEqual({ color: "#00ff88", opacity: 0x44 / 255 });
  });
  it("leaves a 6-digit hex opaque", () => {
    expect(splitHexAlpha("#e8b04b")).toEqual({ color: "#e8b04b", opacity: 1 });
  });
});

describe("Learn calculators", () => {
  it("RSI: dragging into overbought changes the verdict", async () => {
    await render(<RsiPlayground />);
    expect(screen.getByText(/Neutral, leaning strong/)).toBeTruthy();
    await drag("RSI reading", 75.0000001);
    expect(screen.getByText(/Overbought\. Don't start a new position/)).toBeTruthy();
  });

  it("stop-loss: states the app's own multiplier and computes from support", async () => {
    await render(<StopLossCalculator />);
    expect(screen.getByText(`stop = support − ${STOP_LOSS_ATR_MULTIPLIER} × ATR`)).toBeTruthy();
    // defaults: support 98, ATR 4
    expect(screen.getByText(`${(98 - STOP_LOSS_ATR_MULTIPLIER * 4).toFixed(2)} EGP`)).toBeTruthy();
    await drag("Entry price you'd pay", 60);
    expect(screen.getByText(/There is no trade here/)).toBeTruthy();
  });

  it("position sizing: concentration is called out", async () => {
    await render(<PositionSizer />);
    expect(screen.getByText(/Inside the house limit/)).toBeTruthy();
    await drag("Put into this one stock", 30);
    expect(screen.getByText(/Concentrated\./)).toBeTruthy();
  });

  it("T-bill race: titled with the live rate, and a sub-rate return falls BEHIND", async () => {
    await render(<TBillRace />);
    expect(screen.getByText(`Your stock vs the ${T_BILL_RATE_PCT}% T-bill`)).toBeTruthy();
    await drag("Stock returns, per year", T_BILL_RATE_PCT - 5);
    expect(screen.getByText(/BEHIND simply leaving the money in T-bills/)).toBeTruthy();
  });

  it("score bands: labels come from SCORE_BAND_LABEL, never Buy/Sell", async () => {
    await render(<ScoreBandExplorer />);
    expect(screen.getByText(SCORE_BAND_LABEL[scoreBand(64)])).toBeTruthy();
    await drag("Score", 15);
    expect(screen.getByText(SCORE_BAND_LABEL[scoreBand(15)])).toBeTruthy();
    expect(screen.queryByText(/\bBuy\b|\bSell\b/)).toBeNull();
  });
});
