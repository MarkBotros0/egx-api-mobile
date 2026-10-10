import { SIGNALS } from "@/features/portfolio/testing/fixtures";
import type { Signal } from "@/shared/types";
import { severityCounts, tierOf } from "../signals";

describe("severityCounts", () => {
  it("counts per severity, loudest first, with singular/plural labels", () => {
    expect(severityCounts(SIGNALS)).toEqual([
      { severity: "action_required", count: 1, label: "1 urgent", tone: "loss" },
      { severity: "warning", count: 2, label: "2 warnings", tone: "loss" },
      { severity: "info", count: 1, label: "1 note", tone: "accent" },
    ]);
  });

  it("files an unknown severity under info so the pills always sum to the total", () => {
    const odd = { ...SIGNALS[0], severity: "mystery" } as unknown as Signal;
    expect(tierOf(odd)).toBe("info");
    const counts = severityCounts([...SIGNALS, odd]);
    expect(counts.reduce((n, c) => n + c.count, 0)).toBe(SIGNALS.length + 1);
    expect(counts.find((c) => c.severity === "info")?.label).toBe("2 notes");
  });

  it("is empty for no signals", () => {
    expect(severityCounts([])).toEqual([]);
  });
});
