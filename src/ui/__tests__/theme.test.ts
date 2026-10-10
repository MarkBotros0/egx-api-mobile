import { COLORS } from "@/shared/theme";
import { APP_FONTS } from "@/ui/fonts";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const tailwind = require("../../../tailwind.config.js");

describe("theme", () => {
  it("registers exactly the shared brand colours", () => {
    expect(tailwind.theme.extend.colors).toEqual(COLORS);
  });

  it("only names font families that the app actually loads", () => {
    const families = Object.values(tailwind.theme.extend.fontFamily as Record<string, string[]>).flat();
    for (const family of families) {
      expect(Object.keys(APP_FONTS)).toContain(family);
    }
  });

  it("has one family per weight the UI uses", () => {
    expect(Object.keys(tailwind.theme.extend.fontFamily).sort()).toEqual(
      ["mono", "mono-semibold", "sans", "sans-bold", "sans-medium", "sans-semibold"]
    );
  });
});
