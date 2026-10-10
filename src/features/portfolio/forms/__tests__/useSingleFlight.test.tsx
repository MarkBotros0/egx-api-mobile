import { act, renderHook } from "@testing-library/react-native";
import { useSingleFlight } from "../useSingleFlight";

describe("useSingleFlight", () => {
  it("ignores a second run while one is in flight, then allows another", async () => {
    const { result } = await renderHook(() => useSingleFlight());
    let release: () => void = () => {};
    const task = jest.fn(() => new Promise<void>((res) => { release = res; }));

    let first: Promise<void> = Promise.resolve();
    await act(async () => {
      first = result.current.run(task);
      void result.current.run(task);
    });
    expect(task).toHaveBeenCalledTimes(1);
    expect(result.current.pending).toBe(true);

    await act(async () => {
      release();
      await first;
    });
    expect(result.current.pending).toBe(false);

    await act(async () => {
      void result.current.run(async () => {});
    });
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("resets after a rejected task and passes the rejection on", async () => {
    const { result } = await renderHook(() => useSingleFlight());
    await act(async () => {
      await expect(result.current.run(() => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    });
    expect(result.current.pending).toBe(false);
    const task = jest.fn().mockResolvedValue(undefined);
    await act(async () => {
      await result.current.run(task);
    });
    expect(task).toHaveBeenCalledTimes(1);
  });
});
