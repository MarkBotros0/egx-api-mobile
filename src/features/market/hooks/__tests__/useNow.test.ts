import { act, renderHook } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";
import { useNow } from "../useNow";

describe("useNow", () => {
  let listener: ((s: AppStateStatus) => void) | null = null;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type, fn) => {
      listener = fn as (s: AppStateStatus) => void;
      return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    listener = null;
  });

  it("ticks once a second while active", async () => {
    const { result } = await renderHook(() => useNow(1000));
    const start = result.current;
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(result.current - start).toBe(3000);
  });

  it("stops in the background and resyncs on return", async () => {
    const { result } = await renderHook(() => useNow(1000));
    await act(async () => {
      listener?.("background");
    });
    const paused = result.current;
    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });
    expect(result.current).toBe(paused);
    await act(async () => {
      listener?.("active");
    });
    expect(result.current - paused).toBe(10_000);
  });
});
