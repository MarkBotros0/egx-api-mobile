import { mergeTextClasses } from "../textClasses";

describe("mergeTextClasses", () => {
  const v = "font-sans text-sm text-white";

  it("override font replaces variant font", () => {
    expect(mergeTextClasses(v, "font-sans-semibold")).toBe("text-sm text-white font-sans-semibold");
    expect(mergeTextClasses("font-mono text-sm", "font-mono-semibold")).toBe("text-sm font-mono-semibold");
  });
  it("override colour replaces variant colour", () => {
    expect(mergeTextClasses(v, "text-charcoal-dark")).toBe("font-sans text-sm text-charcoal-dark");
  });
  it("override opacity colour replaces variant colour", () => {
    expect(mergeTextClasses(v, "text-white/50")).toBe("font-sans text-sm text-white/50");
  });
  it("override size replaces variant size", () => {
    expect(mergeTextClasses(v, "text-xs")).toBe("font-sans text-white text-xs");
    expect(mergeTextClasses(v, "text-[13px]")).toBe("font-sans text-white text-[13px]");
  });
  it("text-center does not remove variant colour or size", () => {
    expect(mergeTextClasses(v, "text-center")).toBe("font-sans text-sm text-white text-center");
  });
  it("keeps unrelated classes", () => {
    expect(mergeTextClasses(v, "mb-1 leading-5")).toBe("font-sans text-sm text-white mb-1 leading-5");
  });
  it("empty override returns the variant unchanged", () => {
    expect(mergeTextClasses(v, "")).toBe(v);
  });
});
