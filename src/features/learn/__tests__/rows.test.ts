import { ALL_CONCEPTS, CURRICULUM, TOTAL_CONCEPTS } from "@/shared/curriculum";
import { searchConcepts } from "@/shared/learn";
import { CONTROLS_INDEX, buildRows, resolveTarget, toggledSet, withOpen } from "../rows";

const none = new Set<string>();

describe("buildRows", () => {
  it("lays out hero, sticky controls, every module and concept, then the footer", () => {
    const rows = buildRows({ modules: CURRICULUM, collapsed: none, results: null });
    expect(rows[0].type).toBe("hero");
    expect(rows[CONTROLS_INDEX].type).toBe("controls");
    expect(rows[2].key).toBe("m-market-basics");
    expect(rows.filter((r) => r.type === "concept")).toHaveLength(TOTAL_CONCEPTS);
    expect(rows.filter((r) => r.type === "module")).toHaveLength(9);
    expect(rows.at(-1)?.type).toBe("footer");
  });

  it("drops a collapsed module's overview and concepts but keeps its header", () => {
    const rows = buildRows({ modules: CURRICULUM, collapsed: new Set(["decision-framework"]), results: null });
    const header = rows.find((r) => r.key === "m-decision-framework");
    expect(header && header.type === "module" && header.open).toBe(false);
    expect(rows.some((r) => r.key === "o-decision-framework")).toBe(false);
    expect(rows.some((r) => r.key === "c-decision_step_macro")).toBe(false);
  });

  it("shows the decision-framework overview when open", () => {
    const rows = buildRows({ modules: CURRICULUM, collapsed: none, results: null });
    expect(rows.some((r) => r.key === "o-decision-framework")).toBe(true);
  });

  it("in search mode lists only matches, with a count row and no footer", () => {
    const results = searchConcepts(ALL_CONCEPTS, "stop loss");
    const rows = buildRows({ modules: CURRICULUM, collapsed: none, results });
    const head = rows[2];
    expect(head.type === "results-head" && head.count).toBe(results!.length);
    expect(rows.filter((r) => r.type === "concept")).toHaveLength(results!.length);
    expect(rows.some((r) => r.type === "footer")).toBe(false);
  });

  it("adds an empty row when nothing matches", () => {
    const rows = buildRows({ modules: CURRICULUM, collapsed: none, results: [] });
    expect(rows.map((r) => r.type)).toEqual(["hero", "controls", "results-head", "empty"]);
  });

  it("never repeats a key", () => {
    const rows = buildRows({ modules: CURRICULUM, collapsed: none, results: null });
    expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length);
  });
});

describe("resolveTarget", () => {
  it("finds a concept id", () => {
    expect(resolveTarget(CURRICULUM, "dividend_yield")).toEqual({ moduleId: "macro-context", rowKey: "c-dividend_yield" });
  });
  it("finds a module id", () => {
    expect(resolveTarget(CURRICULUM, "risk-management")).toEqual({ moduleId: "risk-management", rowKey: "m-risk-management" });
  });
  it("finds an id-less concept by its title slug", () => {
    expect(resolveTarget(CURRICULUM, "what-is-a-stock")).toEqual({ moduleId: "market-basics", rowKey: "c-what-is-a-stock" });
  });
  it("returns null for an unknown id", () => {
    expect(resolveTarget(CURRICULUM, "from_a_newer_backend")).toBeNull();
  });
});

describe("set helpers", () => {
  it("withOpen removes the id, and returns the same set when already open", () => {
    const s = new Set(["a"]);
    expect(withOpen(s, "a").has("a")).toBe(false);
    expect(withOpen(s, "b")).toBe(s);
  });
  it("toggledSet flips membership", () => {
    expect(toggledSet(new Set(["a"]), "a").has("a")).toBe(false);
    expect(toggledSet(new Set<string>(), "a").has("a")).toBe(true);
  });
});
