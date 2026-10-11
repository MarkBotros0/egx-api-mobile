import { normalizeBaseUrl } from "@/lib/env";
import { buildCredentialMessage, formatAdded, validateNewUser } from "../credentials";

describe("buildCredentialMessage", () => {
  it("puts link, username and password on three lines", () => {
    expect(buildCredentialMessage("https://egx.example", "sara.b", "pw123")).toBe(
      "Link: https://egx.example\nUsername: sara.b\nPassword: pw123"
    );
  });
  it("omits the link line when no link is configured", () => {
    expect(buildCredentialMessage("", "sara.b", "pw123")).toBe("Username: sara.b\nPassword: pw123");
  });
});

describe("validateNewUser", () => {
  it("requires a username", () => expect(validateNewUser("  ", false, "")).toBe("Enter a username."));
  it("requires 8 characters when setting the password yourself", () =>
    expect(validateNewUser("sara", true, "short")).toBe("The password needs at least 8 characters."));
  it("accepts a generated-password request", () => expect(validateNewUser("sara", false, "")).toBeNull());
});

describe("normalizeBaseUrl", () => {
  it.each([
    [undefined, ""],
    ["", ""],
    ["  https://egx.example/// ", "https://egx.example"],
  ])("%p → %p", (raw, expected) => expect(normalizeBaseUrl(raw)).toBe(expected));
});

describe("formatAdded", () => {
  it("falls back to a dash for an unparseable date", () => expect(formatAdded("nope")).toBe("—"));
  it("formats a real date", () => expect(formatAdded("2026-10-01T10:00:00Z")).toMatch(/2026/));
});
