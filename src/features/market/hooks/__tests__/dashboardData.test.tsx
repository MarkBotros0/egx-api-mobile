import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Pressable, Text, View } from "react-native";
import { useMarket } from "@/providers/market";
import { COMPOSITE_RETRY_DELAY_MS } from "@/shared/constants";
import { EG_FALLBACK } from "@/shared/markets";
import type { DashboardResponse } from "@/shared/api";
import { renderWithProviders } from "@/test-utils/render";
import type { CompositeInterval } from "../../logic/dashboardFilters";
import { fail, mockMarketApi, requestsTo } from "../../testing/api";
import { batch, DASHBOARD, makeDashboard, makeDashboardRow } from "../../testing/fixtures";
import { useDashboardSnapshot } from "../useDashboardSnapshot";
import { useLiveUpgrade } from "../useLiveUpgrade";

function Harness({ symbols, interval = "Daily" }: { symbols: string[]; interval?: CompositeInterval }) {
  const snap = useDashboardSnapshot(0);
  const { upgrade } = useLiveUpgrade({
    symbols,
    enabled: true,
    snapshotLoaded: snap.snapshotLoaded,
    noFeed: snap.noFeed,
    interval,
    weightsVersion: 0,
    refreshKey: snap.refreshKey,
    setCards: snap.setCards,
  });
  return (
    <View>
      {Object.entries(snap.cards).map(([sym, c]) => (
        <Text key={sym} testID={`card-${sym}`}>{`${c.state}:${c.score ?? "-"}:${c.price ?? "-"}`}</Text>
      ))}
      <Text testID="refreshing">{String(snap.refreshing)}</Text>
      <Pressable testID="refresh" onPress={snap.refresh} />
      <Pressable testID="retry" onPress={() => upgrade(["COMI"])} />
    </View>
  );
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => (resolve = res));
  return { promise, resolve };
}

afterEach(() => jest.useRealTimers());

it("paints the snapshot as stale cards and marks no-feed symbols", async () => {
  mockMarketApi();
  await renderWithProviders(<Harness symbols={[]} />);
  expect((await screen.findByTestId("card-COMI")).props.children).toBe("stale:72:82.5");
  expect(screen.getByTestId("card-MEGM").props.children).toBe("unavailable:-:-");
});

it("upgrades symbols live and never requests a no-feed symbol", async () => {
  const fetchMock = mockMarketApi({
    "/analysis": batch({ COMI: { score: 80, signal: "Very Strong", price: 83 } }),
  });
  await renderWithProviders(<Harness symbols={["COMI", "MEGM", "TMGH"]} />);
  await waitFor(() => expect(screen.getByTestId("card-COMI").props.children).toBe("live:80:83"));
  const asked = requestsTo(fetchMock, "/analysis").flatMap((u) => (u.searchParams.get("symbols") ?? "").split(","));
  expect(asked).toEqual(expect.arrayContaining(["COMI", "TMGH"]));
  expect(asked).not.toContain("MEGM");
  expect(requestsTo(fetchMock, "/analysis")[0].searchParams.get("interval")).toBe("Daily");
});

it("fills cards from the live upgrade when the snapshot fails", async () => {
  mockMarketApi({
    "/dashboard": fail(500),
    "/analysis": batch({ COMI: { score: 66, signal: "Strong", price: 80 } }),
  });
  await renderWithProviders(<Harness symbols={["COMI"]} />);
  await waitFor(() => expect(screen.getByTestId("card-COMI").props.children).toBe("live:66:80"));
});

it("refresh asks for fresh data and keeps cards visible", async () => {
  const second = deferred<DashboardResponse>();
  let calls = 0;
  const fetchMock = mockMarketApi({
    "/dashboard": () => (++calls === 1 ? DASHBOARD : second.promise),
  });
  await renderWithProviders(<Harness symbols={[]} />);
  await screen.findByTestId("card-COMI");

  await fireEvent.press(screen.getByTestId("refresh"));
  expect(screen.getByTestId("refreshing").props.children).toBe("true");
  await waitFor(() => expect(requestsTo(fetchMock, "/dashboard")).toHaveLength(2));
  const [first, fresh] = requestsTo(fetchMock, "/dashboard");
  expect(first.searchParams.has("fresh")).toBe(false);
  expect(fresh.searchParams.has("fresh")).toBe(true);
  // Never blank: the old figures stay until the new ones land.
  expect(screen.getByTestId("card-COMI").props.children).toBe("stale:72:82.5");

  await act(async () => second.resolve(makeDashboard([makeDashboardRow("COMI", { price: 90, score: 70 })])));
  expect(screen.getByTestId("card-COMI").props.children).toBe("stale:70:90");
  expect(screen.getByTestId("refreshing").props.children).toBe("false");
});

it("retries a timed-out symbol once after the delay", async () => {
  jest.useFakeTimers();
  let calls = 0;
  mockMarketApi({
    "/dashboard": makeDashboard([]),
    "/analysis": () =>
      ++calls === 1
        ? batch({}, [{ symbol: "COMI", error: "upstream timeout" }])
        : batch({ COMI: { score: 61, signal: "Strong", price: 70 } }),
  });
  await renderWithProviders(<Harness symbols={["COMI"]} />);
  await waitFor(() => expect(screen.getByTestId("card-COMI").props.children).toBe("failed:-:-"));
  await act(async () => {
    jest.advanceTimersByTime(COMPOSITE_RETRY_DELAY_MS);
  });
  await waitFor(() => expect(screen.getByTestId("card-COMI").props.children).toBe("live:61:70"));
});

it("cancels a pending retry when unmounted", async () => {
  jest.useFakeTimers();
  const fetchMock = mockMarketApi({
    "/dashboard": makeDashboard([]),
    "/analysis": batch({}, [{ symbol: "COMI", error: "upstream timeout" }]),
  });
  const view = await renderWithProviders(<Harness symbols={["COMI"]} />);
  await waitFor(() => expect(screen.getByTestId("card-COMI").props.children).toBe("failed:-:-"));
  const before = requestsTo(fetchMock, "/analysis").length;
  await view.unmount();
  await act(async () => {
    jest.advanceTimersByTime(COMPOSITE_RETRY_DELAY_MS * 2);
  });
  expect(requestsTo(fetchMock, "/analysis")).toHaveLength(before);
});

it("asks for the selected interval", async () => {
  const fetchMock = mockMarketApi();
  await renderWithProviders(<Harness symbols={["COMI"]} interval="Weekly" />);
  await waitFor(() => expect(requestsTo(fetchMock, "/analysis").length).toBeGreaterThan(0));
  expect(requestsTo(fetchMock, "/analysis")[0].searchParams.get("interval")).toBe("Weekly");
});

describe("market switch", () => {
  const US = { ...EG_FALLBACK, code: "US" as const, currency: "USD" };

  function MarketHarness() {
    const { setMarket } = useMarket();
    return (
      <View>
        <Harness symbols={["COMI", "AAPL"]} />
        <Pressable testID="to-us" onPress={() => setMarket("US")} />
      </View>
    );
  }

  it("starts the cards over for the new market and never keeps the old market's", async () => {
    const fetchMock = mockMarketApi({
      "/markets": { markets: [EG_FALLBACK, US], default: "EG" },
      "/dashboard": (url: URL) =>
        url.searchParams.get("market") === "US"
          ? makeDashboard([makeDashboardRow("AAPL", { score: 60, price: 230 })])
          : DASHBOARD,
    });
    await renderWithProviders(<MarketHarness />);
    await screen.findByTestId("card-COMI");
    const analysisBefore = requestsTo(fetchMock, "/analysis").length;
    await fireEvent.press(screen.getByTestId("to-us"));
    expect((await screen.findByTestId("card-AAPL")).props.children).toMatch(/^(stale|live):/);
    expect(screen.queryByTestId("card-COMI")).toBeNull();
    const dash = requestsTo(fetchMock, "/dashboard");
    expect(dash.map((u) => u.searchParams.get("market"))).toEqual(["EG", "US"]);
    // The live upgrade after the switch asks in US only.
    await waitFor(() =>
      expect(requestsTo(fetchMock, "/analysis").some((u) => u.searchParams.get("market") === "US")).toBe(true)
    );
    const after = requestsTo(fetchMock, "/analysis").slice(analysisBefore);
    expect(after.filter((u) => u.searchParams.get("market") !== "US")).toEqual([]);
  });
});
