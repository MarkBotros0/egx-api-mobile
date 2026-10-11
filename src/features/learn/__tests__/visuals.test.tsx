import { StyleSheet } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { V, walk } from "@/shared/learnVisuals";
import {
  AllocationDonut,
  BarCompare,
  CorrelationGrid,
  LedgerRows,
  MiniChart,
  StepFlow,
  ZoneScale,
  svgSafeId,
} from "../visuals";

type Json = { props?: Record<string, unknown>; children?: (Json | string)[] | null } | string | null;

/** Every prop value in the rendered tree, for geometry sanity checks. */
function allPropValues(node: Json | Json[]): unknown[] {
  if (!node || typeof node === "string") return [];
  if (Array.isArray(node)) return node.flatMap(allPropValues);
  const own = Object.values(node.props ?? {});
  return [...own, ...(node.children ?? []).flatMap((c) => allPropValues(c as Json))];
}

const SERIES = walk(40, 7, { start: 60, drift: 0.3, vol: 1 });

describe("Learn diagrams", () => {
  it("shows a chart's caption and legend", async () => {
    await render(
      <MiniChart
        series={SERIES}
        legend={[{ color: V.accent, label: "SMA 20" }]}
        caption="The averages lag on purpose."
      />
    );
    expect(screen.getByText("SMA 20")).toBeTruthy();
    expect(screen.getByText("The averages lag on purpose.")).toBeTruthy();
    expect(screen.getByLabelText("The averages lag on purpose.")).toBeTruthy();
  });

  it("gives two charts of the SAME series different gradient ids", async () => {
    await render(
      <>
        <MiniChart series={SERIES} priceColor={V.gold} />
        <MiniChart series={SERIES} priceColor={V.teal} />
      </>
    );
    const ids = screen.getAllByTestId("mini-chart").map((el) => el.props.nativeID as string);
    expect(ids).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
    for (const id of ids) expect(id).toMatch(/^mc[A-Za-z0-9]+$/);
  });

  it("no NaN reaches the SVG: null gaps, an off-series marker, a flat line", async () => {
    const { toJSON } = await render(
      <>
        <MiniChart
          series={[5, 5, 5, 5]}
          lines={[{ values: [null, null, 5, 6], color: V.accent }]}
          band={{ upper: [null, null, null, null], lower: [null, null, null, null], color: V.violet }}
          markers={[{ index: 99, color: V.up, label: "gone" }]}
          levels={[{ value: 5, color: V.down, label: "5" }]}
        />
        <MiniChart series={[]} />
      </>
    );
    const values = allPropValues(toJSON() as Json);
    for (const v of values) {
      if (typeof v === "number") expect(Number.isNaN(v)).toBe(false);
      if (typeof v === "string") expect(v).not.toContain("NaN");
    }
  });

  it("does not paint a neutral ledger row loss-red (paying is not a loss)", async () => {
    await render(
      <LedgerRows
        rows={[
          { left: "You paid", right: "41,000 EGP" },
          { left: "Market order fills at", right: "82.45 EGP", tone: "down" },
        ]}
      />
    );
    expect(StyleSheet.flatten(screen.getByText("41,000 EGP").props.style).color).toBe("rgba(255,255,255,0.75)");
    expect(StyleSheet.flatten(screen.getByText("82.45 EGP").props.style).color).toBe(V.down);
  });

  it("signs positive percentages in a bar comparison", async () => {
    await render(
      <BarCompare
        bars={[
          { label: "Stock", value: 12, color: V.down },
          { label: "Loss", value: -8, color: V.down },
        ]}
      />
    );
    expect(screen.getByText("+12%")).toBeTruthy();
    expect(screen.getByText("-8%")).toBeTruthy();
  });

  it("shows donut shares as whole percentages of the total", async () => {
    await render(
      <AllocationDonut
        centerLabel="3"
        slices={[
          { label: "Banks", value: 50, color: V.accent },
          { label: "Real estate", value: 30, color: V.gold },
          { label: "Telecom", value: 20, color: V.teal },
        ]}
      />
    );
    expect(screen.getByText("50%")).toBeTruthy();
    expect(screen.getByText("30%")).toBeTruthy();
    expect(screen.getByText("20%")).toBeTruthy();
  });

  it("renders an n×n correlation grid with headers", async () => {
    await render(
      <CorrelationGrid
        labels={["COMI", "HRHO"]}
        matrix={[
          [1, 0.8],
          [0.8, 1],
        ]}
      />
    );
    expect(screen.getAllByText("COMI")).toHaveLength(2);
    expect(screen.getAllByText("0.8")).toHaveLength(2);
    expect(screen.getAllByText("1.0")).toHaveLength(2);
  });

  it("numbers the steps of a flow in order", async () => {
    await render(
      <StepFlow
        steps={[
          { title: "Check the macro", text: "a" },
          { title: "Set the stop first", text: "b" },
        ]}
      />
    );
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("Set the stop first")).toBeTruthy();
  });

  it("labels a scale diagram for screen readers", async () => {
    await render(
      <ZoneScale
        zones={[{ from: 0, to: 30, color: V.up, label: "oversold" }]}
        markers={[{ value: 42, label: "now" }]}
        caption="RSI right now"
      />
    );
    expect(screen.getByLabelText("RSI right now")).toBeTruthy();
  });
});

describe("svgSafeId", () => {
  it.each(["«r1»", "_r_1_", ":R1a:"])("strips React's id punctuation from %s", (raw) => {
    expect(svgSafeId("mc", raw)).toMatch(/^mc[A-Za-z0-9]+$/);
  });
});
