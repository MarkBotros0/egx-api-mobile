import { NO_SALES, portfolio, salesResponse } from "@/features/portfolio/testing/fixtures";
import { FAB_GAP, FAB_SIZE, contentSpacer, fabBottomOffset, portfolioView } from "../layout";

// iPhone-class screen with a 34pt home indicator; default tab bar 49 + 34.
const WINDOW = 852;
const INSET = 34;
const BAR = 83;

describe("fabBottomOffset", () => {
  it("in-flow tab bar: the scene already ends above it", () => {
    expect(fabBottomOffset({ windowHeight: WINDOW, sceneBottom: WINDOW - BAR, tabBarHeight: BAR, insetBottom: INSET })).toBe(FAB_GAP);
  });

  it("floating tab bar: clears the whole bar, inset included", () => {
    expect(fabBottomOffset({ windowHeight: WINDOW, sceneBottom: WINDOW, tabBarHeight: BAR, insetBottom: INSET })).toBe(BAR + FAB_GAP);
    // Web-style pill: 52 tall + 8 float + 34 inset.
    expect(fabBottomOffset({ windowHeight: WINDOW, sceneBottom: WINDOW, tabBarHeight: 94, insetBottom: INSET })).toBe(106);
  });

  // Review Focus 4 — the web shipped 18px of the + button behind the nav on a
  // phone with a home indicator. The FAB's bottom edge must sit at least
  // FAB_GAP above the bar's top edge in both layouts.
  it("never puts the FAB under the tab bar on a phone with a home indicator", () => {
    for (const sceneBottom of [WINDOW, WINDOW - BAR]) {
      const bottom = fabBottomOffset({ windowHeight: WINDOW, sceneBottom, tabBarHeight: BAR, insetBottom: INSET });
      const fabBottomEdgeY = sceneBottom - bottom;
      const barTopY = WINDOW - BAR;
      expect(barTopY - fabBottomEdgeY).toBeGreaterThanOrEqual(FAB_GAP);
    }
  });

  it("clears the home indicator when there is no tab bar height", () => {
    expect(fabBottomOffset({ windowHeight: WINDOW, sceneBottom: WINDOW, tabBarHeight: 0, insetBottom: INSET })).toBe(INSET + FAB_GAP);
  });

  it("reserves scroll space for the FAB", () => {
    expect(contentSpacer(95)).toBe(95 + FAB_SIZE + 8);
  });
});

describe("portfolioView", () => {
  const base = { portfolioLoading: false, portfolio: portfolio(), salesLoaded: true, salesError: null, sales: salesResponse() };

  it("shows skeletons only before the first portfolio arrives", () => {
    expect(portfolioView({ ...base, portfolioLoading: true, portfolio: null })).toBe("loading");
    expect(portfolioView({ ...base, portfolioLoading: true })).toBe("holdings");
  });

  it("shows the never-traded state only when sales are KNOWN to be empty", () => {
    const empty = { ...base, portfolio: portfolio([]) };
    expect(portfolioView({ ...empty, sales: NO_SALES })).toBe("empty");
    // Slow or failing /api/sales must never paint "No holdings yet" over a real history.
    expect(portfolioView({ ...empty, salesLoaded: false, sales: null })).toBe("sold_out");
    expect(portfolioView({ ...empty, salesError: "boom", sales: null })).toBe("sold_out");
    expect(portfolioView({ ...empty })).toBe("sold_out");
  });
});
