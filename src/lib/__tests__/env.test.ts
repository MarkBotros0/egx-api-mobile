import { apiBaseUrl } from "@/lib/env";

describe("apiBaseUrl", () => {
  const original = process.env.EXPO_PUBLIC_API_BASE_URL;
  afterEach(() => {
    process.env.EXPO_PUBLIC_API_BASE_URL = original;
  });

  it("returns the configured base", () => {
    expect(apiBaseUrl()).toBe("https://api.test/api");
  });

  it("strips trailing slashes so paths never double up", () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = "https://x.example/api//";
    expect(apiBaseUrl()).toBe("https://x.example/api");
  });

  it("names the variable when it is missing", () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    expect(() => apiBaseUrl()).toThrow(/EXPO_PUBLIC_API_BASE_URL/);
  });
});
