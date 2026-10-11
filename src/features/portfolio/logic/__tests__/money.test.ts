import { normalizeNumeric, parseMoney, parseShares } from "../money";

describe("parseMoney", () => {
  it("accepts EGX's three-decimal quotes", () => {
    expect(parseMoney("27.697")).toEqual({ ok: true, value: 27.697 });
    expect(parseMoney("52")).toEqual({ ok: true, value: 52 });
    expect(parseMoney(".5")).toEqual({ ok: true, value: 0.5 });
    expect(parseMoney(" 41. ")).toEqual({ ok: true, value: 41 });
  });

  it("rejects a fourth significant decimal but ignores trailing zeros", () => {
    expect(parseMoney("27.6971")).toEqual({ ok: false, error: "EGX prices go to 3 decimals at most" });
    expect(parseMoney("27.6970")).toEqual({ ok: true, value: 27.697 });
  });

  it("reports nothing for an empty field", () => {
    expect(parseMoney("")).toEqual({ ok: false, error: null });
    expect(parseMoney("   ")).toEqual({ ok: false, error: null });
  });

  it("rejects zero, negatives and words", () => {
    expect(parseMoney("0")).toEqual({ ok: false, error: "Must be more than 0" });
    expect(parseMoney("-3")).toEqual({ ok: false, error: "Enter a number, e.g. 27.697" });
    expect(parseMoney("abc")).toEqual({ ok: false, error: "Enter a number, e.g. 27.697" });
  });

  // Review Focus 1
  it("reads Arabic-Indic digits and the Arabic decimal separator", () => {
    expect(normalizeNumeric("٢٧٫٦٩٧")).toBe("27.697");
    expect(parseMoney("٢٧٫٦٩٧")).toEqual({ ok: true, value: 27.697 });
    expect(parseMoney("۱۲۰۰")).toEqual({ ok: true, value: 1200 });
  });

  it("refuses a comma rather than guessing whether it is a decimal or a thousands separator", () => {
    const err = { ok: false, error: "Use a dot for decimals and no thousands separators" };
    expect(parseMoney("1,200")).toEqual(err);
    expect(parseMoney("27,697")).toEqual(err);
    expect(parseMoney("١٬٢٠٠")).toEqual(err);
  });
});

describe("parseShares", () => {
  it("accepts whole shares only", () => {
    expect(parseShares("100")).toEqual({ ok: true, value: 100 });
    expect(parseShares("١٠٠")).toEqual({ ok: true, value: 100 });
    expect(parseShares("5.7")).toEqual({ ok: false, error: "Enter a whole number of shares" });
    expect(parseShares("1,000")).toEqual({ ok: false, error: "Enter a whole number of shares" });
    expect(parseShares("0")).toEqual({ ok: false, error: "Must be at least 1 share" });
    expect(parseShares("")).toEqual({ ok: false, error: null });
  });

  it("bounds a sell by the shares held", () => {
    expect(parseShares("300", 300)).toEqual({ ok: true, value: 300 });
    expect(parseShares("301", 300)).toEqual({ ok: false, error: "Enter between 1 and 300 shares" });
    expect(parseShares("0", 300)).toEqual({ ok: false, error: "Enter between 1 and 300 shares" });
  });
});
