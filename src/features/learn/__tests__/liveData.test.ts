import { setApiMarket } from "@/shared/api";
import { fetchCalls, mockFetch } from "@/test-utils/fetch";

import { loadLiveAnalysis, resetLiveAnalysisForTests } from "../liveData";

beforeEach(() => resetLiveAnalysisForTests());
afterEach(() => setApiMarket("EG"));

it("always asks for the EGX teaching stock in EG, even while the app shows US", async () => {
  setApiMarket("US");
  mockFetch("GET", /\/analysis\?/, { ohlcv: {} });
  await loadLiveAnalysis();
  const url = new URL(fetchCalls()[0].url, "https://x.test");
  expect(url.searchParams.get("symbol")).toBe("COMI");
  expect(url.searchParams.getAll("market")).toEqual(["EG"]);
  expect(url.searchParams.get("bars")).toBe("180");
});
