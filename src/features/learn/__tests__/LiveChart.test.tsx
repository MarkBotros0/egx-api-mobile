import { render, screen, waitFor } from "@testing-library/react-native";
import { AppText } from "@/ui";
import { fetchAnalysis } from "@/shared/api";
import { liveVisual } from "@/shared/learnLive";
import type { AnalysisResponse } from "@/shared/types";
import { LiveChart } from "../LiveChart";
import { resetLiveAnalysisForTests } from "../liveData";

jest.mock("@/shared/api", () => ({ fetchAnalysis: jest.fn() }));
const fetchMock = fetchAnalysis as jest.MockedFunction<typeof fetchAnalysis>;

const close = Array.from({ length: 150 }, (_, i) => 50 + i * 0.1);
const ANALYSIS = {
  ohlcv: { close, volume: close.map(() => 1000) },
  indicators: {
    sma_50: close.map((v) => v - 1),
    sma_200: close.map((v) => v - 2),
    rsi: close.map(() => 55),
    bollinger_upper: close.map((v) => v + 2),
    bollinger_lower: close.map((v) => v - 2),
    bollinger_middle: close,
  },
  support_resistance: { supports: [{ price: 48 }], resistances: [{ price: 70 }] },
  composite_score: { score: 64 },
  bb_squeeze: false,
} as unknown as AnalysisResponse;

const Fallback = () => <AppText>static diagram</AppText>;

beforeEach(() => {
  resetLiveAnalysisForTests();
  fetchMock.mockReset();
});

describe("LiveChart", () => {
  it("does not fetch until armed, and shows the static diagram meanwhile", async () => {
    fetchMock.mockResolvedValue(ANALYSIS);
    await render(<LiveChart variant="trend" fallback={<Fallback />} armed={false} />);
    expect(screen.getByText("static diagram")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shares ONE fetch between every armed instance", async () => {
    fetchMock.mockResolvedValue(ANALYSIS);
    await render(
      <>
        <LiveChart variant="trend" fallback={<Fallback />} />
        <LiveChart variant="rsi" fallback={<Fallback />} />
      </>
    );
    await waitFor(() => expect(screen.getAllByText("Live · COMI · daily")).toHaveLength(2));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("COMI", "Daily", 180, { market: "EG" });
  });

  it("degrades silently: on failure the diagram stays and no error is shown", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    await render(<LiveChart variant="trend" fallback={<Fallback />} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.getByText("static diagram")).toBeTruthy();
    expect(screen.queryByText(/offline|error|failed/i)).toBeNull();
  });

  it("lets a later instance retry after a failure", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(ANALYSIS);
    const first = await render(<LiveChart variant="trend" fallback={<Fallback />} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await first.unmount();
    await render(<LiveChart variant="trend" fallback={<Fallback />} />);
    await waitFor(() => expect(screen.getByText("Live · COMI · daily")).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("short data keeps the diagram", async () => {
    const short = { ...ANALYSIS, ohlcv: { close: close.slice(0, 10), volume: [] } } as unknown as AnalysisResponse;
    fetchMock.mockResolvedValue(short);
    await render(<LiveChart variant="trend" fallback={<Fallback />} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.getByText("static diagram")).toBeTruthy();
    expect(screen.queryByText("Live · COMI · daily")).toBeNull();
  });
});

describe("liveVisual (shared)", () => {
  it("puts COMI's composite on the band scale", () => {
    const spec = liveVisual("score", ANALYSIS);
    expect(spec?.kind).toBe("ZoneScale");
    expect(spec && "markers" in spec ? spec.markers?.[0]?.label : null).toBe("COMI 64");
  });
  it("returns null when the variant's series is empty", () => {
    const noSma = { ...ANALYSIS, indicators: { ...ANALYSIS.indicators, sma_50: close.map(() => null) } } as unknown as AnalysisResponse;
    expect(liveVisual("trend", noSma)).toBeNull();
  });
});
