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
