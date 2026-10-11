import { render, screen } from "@testing-library/react-native";
import { TBILL_TITLE } from "@/shared/learnWidgets";
import { V } from "@/shared/learnVisuals";
import { LearnVisual } from "../LearnVisual";

jest.mock("@react-native-community/slider", () => jest.requireActual("@/test-utils/sliderMock"));
jest.mock("@/shared/api", () => ({ fetchAnalysis: jest.fn(() => new Promise(() => {})) }));

describe("LearnVisual", () => {
  it("renders a Stack's children in order", async () => {
    await render(
      <LearnVisual
        spec={{
          kind: "Stack",
          children: [
            { kind: "LedgerRows", rows: [{ left: "first", right: "1" }] },
            { kind: "TBillRace" },
          ],
        }}
      />
    );
    expect(screen.getByText("first")).toBeTruthy();
    expect(screen.getByText(TBILL_TITLE)).toBeTruthy();
  });

  it("renders a LiveChart's fallback spec while it is not armed", async () => {
    await render(
      <LearnVisual
        armed={false}
        spec={{
          kind: "LiveChart",
          variant: "trend",
          fallback: { kind: "BarCompare", bars: [{ label: "fallback bar", value: 5, color: V.accent }] },
        }}
      />
    );
    expect(screen.getByText("fallback bar")).toBeTruthy();
  });
});
