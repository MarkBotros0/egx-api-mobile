import { act, screen, waitFor } from "@testing-library/react-native";
import { useEffect } from "react";
import { Text } from "react-native";

import { useScoreWeights } from "@/providers/scoreWeights";
import { useTickers } from "@/providers/tickers";
import { useWatchlist } from "@/providers/watchlist";
import { fetchCalls, mockFetch, mockFetchHandler } from "@/test-utils/fetch";
import { renderWithProviders } from "@/test-utils/render";

let wl: ReturnType<typeof useWatchlist>;
let sw: ReturnType<typeof useScoreWeights>;

function Probe() {
  const watchlist = useWatchlist();
  const scoreWeights = useScoreWeights();
  const { tickers } = useTickers();
  // Publish from an effect: reassigning module variables during render is forbidden by lint.
  useEffect(() => {
    wl = watchlist;
    sw = scoreWeights;
  });
  return (
    <Text testID="probe">
      {`${tickers.length}|${watchlist.symbols.join(",")}|${scoreWeights.weights.trend}|v${scoreWeights.version}`}
    </Text>
  );
}

const weights = { trend: 18, momentum: 15, volume: 12, volatility: 10, divergence: 8, quality: 12, risk_adjusted: 13, relative_strength: 12 };

describe("data providers", () => {
  beforeEach(() => {
    mockFetch("GET", "/tickers", [{ symbol: "COMI", name: "CIB" }, { symbol: "SWDY", name: "Elsewedy" }]);
    mockFetch("GET", "/watchlist", { symbols: ["COMI"] });
    mockFetch("GET", "/settings", { weights, raw: weights, presets: { balanced: weights } });
  });

  it("loads tickers, watchlist and weights once signed in", async () => {
    await renderWithProviders(<Probe />);
    await waitFor(() => expect(screen.getByTestId("probe")).toHaveTextContent("2|COMI|18|v0"));
  });

  it("adds to the watchlist optimistically and rolls back on failure", async () => {
    await renderWithProviders(<Probe />);
    await waitFor(() => expect(screen.getByTestId("probe")).toHaveTextContent("|COMI|", { exact: false }));

    // Hold the POST open so the optimistic state is observable before the 500 lands.
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    mockFetchHandler("POST", "/watchlist", async () => {
      await gate;
      return { status: 500, body: { detail: "boom" } };
    });
    await act(async () => wl.add("swdy"));
    expect(screen.getByTestId("probe")).toHaveTextContent("|COMI,SWDY|", { exact: false });
    await act(async () => release());
    await waitFor(() => expect(screen.getByTestId("probe")).toHaveTextContent("|COMI|", { exact: false }));
  });

  it("removes from the watchlist and restores it if the delete fails", async () => {
    await renderWithProviders(<Probe />);
    await waitFor(() => expect(wl.has("comi")).toBe(true));
    mockFetch("DELETE", "/watchlist", { detail: "boom" }, 500);
    await act(async () => wl.remove("COMI"));
    await waitFor(() => expect(screen.getByTestId("probe")).toHaveTextContent("|COMI|", { exact: false }));
  });

  it("bumps the weights version after a save so screens refetch", async () => {
    await renderWithProviders(<Probe />);
    await waitFor(() => expect(screen.getByTestId("probe")).toHaveTextContent("v0", { exact: false }));
    mockFetch("PUT", "/settings", { weights: { ...weights, trend: 20 }, raw: { ...weights, trend: 20 } });
    await act(async () => sw.updateDraftField("trend", 20));
    await act(async () => {
      await sw.save();
    });
    expect(screen.getByTestId("probe")).toHaveTextContent("|20|v1", { exact: false });
    expect(fetchCalls().some((c) => c.method === "PUT")).toBe(true);
  });

  it("loads nothing while signed out", async () => {
    await renderWithProviders(<Probe />, { user: null });
    expect(screen.getByTestId("probe")).toHaveTextContent("0||", { exact: false });
    expect(fetchCalls().filter((c) => c.url.includes("/tickers"))).toHaveLength(0);
  });
});
