import { useEffect } from "react";
import { act, waitFor } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils/render";
import { mockPortfolioApi, sent, type FetchMock } from "@/features/portfolio/testing/api";
import { TWO_LOT_ROWS, analysisResponse, portfolio } from "@/features/portfolio/testing/fixtures";
import { sellPositionFor } from "@/features/portfolio/logic/sale";
import { usePortfolioData, type PortfolioData } from "../usePortfolioData";

let api: PortfolioData;
function Probe({ version }: { version: number }) {
  const data = usePortfolioData(version);
  useEffect(() => {
    api = data;
  });
  return null;
}

/**
 * Holds the FIRST /portfolio_analysis request open (resolved by `release`),
 * answering every later one at once with `disclaimer: "newer"`.
 */
function holdFirstAnalysis(fetchMock: FetchMock) {
  const original = fetchMock.getMockImplementation()!;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let held = false;
  const requests = { count: 0 };
  fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const isAnalysis = String(input).split("?")[0].endsWith("/portfolio_analysis");
    if (!isAnalysis) return original(input, init);
    requests.count++;
    const reply = (disclaimer: string) =>
      ({ ok: true, status: 200, json: async () => analysisResponse({ disclaimer }) }) as Response;
    if (held) return reply("newer");
    held = true;
    await gate;
    return reply("older");
  });
  return { release, requests };
}

describe("usePortfolioData", () => {
  it("loads holdings and sales, then analyses once", async () => {
    const fetchMock = mockPortfolioApi();
    await renderWithProviders(<Probe version={0} />);
    await waitFor(() => expect(api.analysis).not.toBeNull());
    expect(api.portfolio?.portfolio).toHaveLength(2);
    expect(api.salesLoaded).toBe(true);
    expect(sent(fetchMock, "GET", "/portfolio_analysis")).toHaveLength(1);
  });

  it("does not analyse an empty portfolio", async () => {
    const fetchMock = mockPortfolioApi({ portfolio: portfolio([]) });
    await renderWithProviders(<Probe version={0} />);
    await waitFor(() => expect(api.portfolioLoading).toBe(false));
    expect(api.analyzing).toBe(false);
    expect(sent(fetchMock, "GET", "/portfolio_analysis")).toHaveLength(0);
  });

  it("re-runs the analysis when the score weights change", async () => {
    const fetchMock = mockPortfolioApi();
    const utils = await renderWithProviders(<Probe version={0} />);
    await waitFor(() => expect(api.analysis).not.toBeNull());
    await utils.rerender(<Probe version={1} />);
    await waitFor(() => expect(sent(fetchMock, "GET", "/portfolio_analysis")).toHaveLength(2));
  });

  it("records a sale against the oldest lot and refreshes holdings and sales", async () => {
    const fetchMock = mockPortfolioApi();
    await renderWithProviders(<Probe version={0} />);
    await waitFor(() => expect(api.analysis).not.toBeNull());
    const position = sellPositionFor(TWO_LOT_ROWS, "COMI")!;
    await act(async () => {
      await api.recordSale(position, { quantity: 250, sell_price: 52, sell_date: "2026-10-10", notes: "" });
    });
    expect(sent(fetchMock, "POST", "/sales")[0].body).toEqual({
      holding_id: "lotA", quantity: 250, sell_price: 52, sell_date: "2026-10-10", notes: "",
    });
    expect(sent(fetchMock, "GET", "/portfolio").length).toBeGreaterThanOrEqual(2);
    expect(sent(fetchMock, "GET", "/sales").length).toBeGreaterThanOrEqual(2);
  });

  it("throws the backend's 409 message from recordDividend", async () => {
    const message = "You already recorded a dividend of 1200.00 EGP for COMI on 2026-04-07.";
    mockPortfolioApi({ extra: [{ method: "POST", path: "/dividends", status: 409, body: { detail: message } }] });
    await renderWithProviders(<Probe version={0} />);
    await waitFor(() => expect(api.salesLoaded).toBe(true));
    await act(async () => {
      await expect(
        api.recordDividend({
          symbol: "COMI", name: "Commercial International Bank", sector: "Banking",
          amount: 1200, pay_date: "2026-04-07", shares: 300, notes: "",
        }),
      ).rejects.toThrow(message);
    });
  });

  it("undoes a sale by order id and reports a failed undo on the page", async () => {
    const fetchMock = mockPortfolioApi({
      extra: [{ method: "DELETE", path: "/sales", status: 404, body: { detail: "Sale not found: o9" } }],
    });
    await renderWithProviders(<Probe version={0} />);
    await waitFor(() => expect(api.analysis).not.toBeNull());
    await act(async () => {
      await api.deleteSale("o9");
    });
    expect(sent(fetchMock, "DELETE", "/sales")[0].url).toContain("id=o9");
    expect(api.error).toBe("Sale not found: o9");
  });

  it("keeps a sales failure off the page-wide error", async () => {
    mockPortfolioApi({ extra: [{ method: "GET", path: "/sales", status: 500, body: { detail: "db down" } }] });
    await renderWithProviders(<Probe version={0} />);
    await waitFor(() => expect(api.salesLoaded).toBe(true));
    expect(api.salesError).toBe("db down");
    expect(api.error).toBeNull();
  });

  it("ignores a slow analysis that returns after a newer one", async () => {
    const fetchMock = mockPortfolioApi();
    const { release, requests } = holdFirstAnalysis(fetchMock);
    const utils = await renderWithProviders(<Probe version={0} />);
    await waitFor(() => expect(requests.count).toBe(1));
    await utils.rerender(<Probe version={1} />);
    await waitFor(() => expect(api.analysis?.disclaimer).toBe("newer"));
    await act(async () => {
      release();
    });
    expect(api.analysis?.disclaimer).toBe("newer");
    expect(api.analyzing).toBe(false);
  });

  it("does not let an analysis requested before a mutation reappear after it", async () => {
    const fetchMock = mockPortfolioApi();
    await renderWithProviders(<Probe version={0} />);
    await waitFor(() => expect(api.analysis).not.toBeNull());
    const { release, requests } = holdFirstAnalysis(fetchMock);
    await act(async () => {
      void api.refresh();
      expect(api.analyzing).toBe(false);
  });
    await waitFor(() => expect(requests.count).toBe(1));
    await act(async () => {
      await api.deleteHolding("lotA");
    });
    await waitFor(() => expect(api.analysis?.disclaimer).toBe("newer"));
    await act(async () => {
      release();
    });
    expect(api.analysis?.disclaimer).toBe("newer");
  });

  it("keeps the current analysis on screen while a refresh loads the next one", async () => {
    const fetchMock = mockPortfolioApi();
    await renderWithProviders(<Probe version={0} />);
    await waitFor(() => expect(api.analysis).not.toBeNull());
    const before = api.analysis;
    expect(before?.disclaimer).not.toBe("older");
    const { release } = holdFirstAnalysis(fetchMock);
    let refreshing!: Promise<void>;
    await act(async () => {
      refreshing = api.refresh();
    });
    await waitFor(() => expect(api.analyzing).toBe(true));
    expect(api.analysis).toBe(before);
    await act(async () => {
      release();
      await refreshing;
    });
    expect(api.analyzing).toBe(false);
    expect(api.analysis?.disclaimer).toBe("older");
  });

  it("does not stay analysing when the reload after a mutation fails", async () => {
    const fetchMock = mockPortfolioApi({
      extra: [{ method: "GET", path: "/portfolio", status: 200, body: portfolio() }],
    });
    const { release, requests } = holdFirstAnalysis(fetchMock);
    await renderWithProviders(<Probe version={0} />);
    await waitFor(() => expect(requests.count).toBe(1));
    const original = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) =>
      String(input).split("?")[0].endsWith("/portfolio") && (init?.method ?? "GET") === "GET"
        ? ({ ok: false, status: 500, json: async () => ({ detail: "db down" }) } as Response)
        : original(input, init),
    );
    await act(async () => {
      await api.deleteHolding("lotA");
    });
    expect(api.error).toBe("db down");
    expect(api.analyzing).toBe(false);
    await act(async () => {
      release();
    });
    expect(api.analyzing).toBe(false);
  });

  it("clears a portfolio load error once a later load succeeds", async () => {
    mockPortfolioApi({ extra: [{ method: "GET", path: "/portfolio", status: 500, body: { detail: "db down" } }] });
    await renderWithProviders(<Probe version={0} />);
    await waitFor(() => expect(api.error).toBe("db down"));
    mockPortfolioApi();
    await act(async () => {
      await api.refresh();
    });
    expect(api.error).toBeNull();
    expect(api.portfolio).not.toBeNull();
  });
});
