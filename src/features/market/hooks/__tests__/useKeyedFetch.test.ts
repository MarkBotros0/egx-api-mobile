import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useKeyedFetch } from "../useKeyedFetch";

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useKeyedFetch", () => {
  it("loads, then shows the data", async () => {
    const gate = deferred<number>();
    const { result } = await renderHook(() => useKeyedFetch("a", () => gate.promise));
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    await act(async () => gate.resolve(42));
    await waitFor(() => expect(result.current.data).toBe(42));
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("reports the error message", async () => {
    const { result } = await renderHook(() =>
      useKeyedFetch("a", () => Promise.reject(new Error("Request failed: 500"))),
    );
    await waitFor(() => expect(result.current.error).toBe("Request failed: 500"));
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
  });

  it("goes back to loading when the key changes", async () => {
    const weekly = deferred<string>();
    const fetcher = jest.fn((k: string) => (k === "Daily" ? Promise.resolve(k) : weekly.promise));
    const { result, rerender } = await renderHook(
      ({ k }: { k: string }) => useKeyedFetch(k, () => fetcher(k)),
      { initialProps: { k: "Daily" } },
    );
    await waitFor(() => expect(result.current.data).toBe("Daily"));
    await rerender({ k: "Weekly" });
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    await act(async () => weekly.resolve("Weekly"));
    await waitFor(() => expect(result.current.data).toBe("Weekly"));
  });

  it("keeps the old data on screen while a refresh runs", async () => {
    const second = deferred<number>();
    const fetcher = jest.fn().mockResolvedValueOnce(1).mockReturnValueOnce(second.promise);
    const { result } = await renderHook(() => useKeyedFetch("a", fetcher));
    await waitFor(() => expect(result.current.data).toBe(1));
    await act(async () => result.current.refresh());
    expect(result.current.refreshing).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe(1);
    await act(async () => second.resolve(2));
    expect(result.current.data).toBe(2);
    expect(result.current.refreshing).toBe(false);
  });

  it("reload starts from a blank loading state", async () => {
    const retry = deferred<number>();
    const fetcher = jest.fn().mockRejectedValueOnce(new Error("boom")).mockReturnValueOnce(retry.promise);
    const { result } = await renderHook(() => useKeyedFetch("a", fetcher));
    await waitFor(() => expect(result.current.error).toBe("boom"));
    await act(async () => result.current.reload());
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
    await act(async () => retry.resolve(7));
    await waitFor(() => expect(result.current.data).toBe(7));
  });
});
