import { screen, waitFor } from "@testing-library/react-native";
import { fetchCalls, mockFetch } from "@/test-utils/fetch";
import { renderWithProviders } from "@/test-utils/render";
import { US_MARKET } from "@/features/market/testing/fixtures";
import { EG_FALLBACK } from "@/shared/markets";
import { PEFreshnessBanner } from "../PEFreshnessBanner";

const peCalls = () => fetchCalls().filter((c) => c.method === "GET" && c.url.split("?")[0].endsWith("/pe"));

describe("PEFreshnessBanner", () => {
  it("warns when the P/E feed is stale", async () => {
    mockFetch("GET", "/pe", {
      data: [],
      last_successful_fetch: new Date(Date.now() - 84 * 3_600_000).toISOString(),
      last_attempt_status: "timeout",
    });
    await renderWithProviders(<PEFreshnessBanner />);
    expect(
      await screen.findByText(
        "P/E data last updated 3 days ago — the EGX feed may be temporarily unavailable. Last attempt: timeout."
      )
    ).toBeTruthy();
  });

  it("stays silent when the feed is fresh", async () => {
    mockFetch("GET", "/pe", { data: [], last_successful_fetch: new Date().toISOString(), last_attempt_status: "ok" });
    await renderWithProviders(<PEFreshnessBanner />);
    await waitFor(() => expect(peCalls()).toHaveLength(1));
    expect(screen.queryByText(/P\/E data last updated/)).toBeNull();
  });

  it("stays silent when the status call fails", async () => {
    mockFetch("GET", "/pe", { detail: "Service unavailable" }, 503);
    await renderWithProviders(<PEFreshnessBanner />);
    await waitFor(() => expect(peCalls()).toHaveLength(1));
    expect(screen.queryByText(/P\/E data last updated/)).toBeNull();
  });

  it("names the US feed on the US market", async () => {
    mockFetch("GET", "/markets", { markets: [EG_FALLBACK, US_MARKET], default: "EG" });
    mockFetch("GET", /\/settings\?section=market/, { market: "US" });
    mockFetch("GET", "/pe", {
      data: [],
      last_successful_fetch: new Date(Date.now() - 84 * 3_600_000).toISOString(),
      last_attempt_status: "ok",
    });
    await renderWithProviders(<PEFreshnessBanner />);
    const banner = await screen.findByText("P/E data last updated 3 days ago — the US feed may be temporarily unavailable.");
    expect(banner).toBeTruthy();
    expect(screen.queryByText(/EGX/)).toBeNull();
  });
});
