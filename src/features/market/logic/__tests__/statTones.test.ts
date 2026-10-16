import { betaClass, dividendYieldClass, peClass, rsiClass, signedClass } from "../statTones";

it("colours RSI only at the extremes", () => {
  expect(rsiClass(75)).toBe("text-loss");
  expect(rsiClass(25)).toBe("text-gain");
  expect(rsiClass(50)).toBe("text-white");
});

it("colours beta by magnitude, so a big negative beta is not 'calm'", () => {
  expect(betaClass(-2.1)).toBe("text-loss");
  expect(betaClass(1.31)).toBe("text-loss");
  expect(betaClass(-0.5)).toBe("text-accent");
  expect(betaClass(0.5)).toBe("text-gain");
  expect(betaClass(1)).toBe("text-white");
});

it("uses the shared P/E bands and flags a suspicious yield", () => {
  expect(peClass(2)).toBe("text-white/60");
  expect(peClass(5)).toBe("text-gain");
  expect(peClass(10)).toBe("text-white");
  expect(peClass(30)).toBe("text-loss");
  expect(dividendYieldClass(15)).toBe("text-loss");
  expect(dividendYieldClass(3)).toBe("text-white");
});

it("colours a signed figure by its sign", () => {
  expect(signedClass(0)).toBe("text-gain");
  expect(signedClass(-0.01)).toBe("text-loss");
});

it("colours P/E and yield on the EGX scale on EG only — another market is uncoloured", () => {
  expect(peClass(5)).toBe("text-gain");
  expect(peClass(30)).toBe("text-loss");
  expect(dividendYieldClass(20)).toBe("text-loss");
  // A US stock at the US median (~24) is not "expensive", and 5 is not "cheap":
  // those cut-offs are the EGX median's.
  expect(peClass(30, "US")).toBe("text-white");
  expect(peClass(5, "US")).toBe("text-white");
  expect(peClass(2, "US")).toBe("text-white");
  expect(dividendYieldClass(20, "US")).toBe("text-white");
});
