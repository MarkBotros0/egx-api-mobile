import { useEffect } from "react";
import { Text } from "react-native";

import { useAuth } from "@/auth/AuthProvider";
import { fetchMacro } from "@/shared/api";
import { fetchCalls, mockFetch } from "@/test-utils/fetch";
import { renderWithProviders } from "@/test-utils/render";

// Must stay the FIRST test in this file: it guards against module-level API
// config / token-cache state leaking in from earlier tests.
let renderedWhileLoading = false;

function Probe() {
  const { isLoading } = useAuth();
  useEffect(() => {
    if (isLoading) renderedWhileLoading = true;
    void fetchMacro().catch(() => {});
  }, [isLoading]);
  return <Text>probe</Text>;
}

describe("renderWithProviders", () => {
  it("configures the API and gates the screen behind auth loading", async () => {
    mockFetch("GET", "/macro", {});
    await renderWithProviders(<Probe />);
    const call = fetchCalls().find((c) => c.url.includes("/macro"));
    expect(call?.url.startsWith("https://api.test/api/")).toBe(true);
    expect(call?.headers.authorization).toBe("Bearer test-token");
    expect(renderedWhileLoading).toBe(false);
  });

  it("resolves signed out too", async () => {
    mockFetch("GET", "/macro", {});
    const r = await renderWithProviders(<Probe />, { user: null });
    expect(r.toJSON()).not.toBeNull();
  });
});
