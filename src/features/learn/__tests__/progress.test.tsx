import { act, renderHook, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LEARN_PROGRESS_KEY } from "@/shared/learn";
import { parseProgress, useLearnProgress } from "../progress";

jest.mock("@react-native-async-storage/async-storage", () => jest.requireActual("@/test-utils/asyncStorageMock"));
const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

beforeEach(() => {
  jest.clearAllMocks();
  storage.getItem.mockResolvedValue(null);
  storage.setItem.mockResolvedValue(undefined);
  storage.removeItem.mockResolvedValue(undefined);
});

describe("parseProgress", () => {
  it.each([
    [null, []],
    ["", []],
    ["not json", []],
    ['{"a":1}', []],
    ['["rsi",3,"sma"]', ["rsi", "sma"]],
  ])("parses %p", (raw, expected) => {
    expect([...parseProgress(raw as string | null)]).toEqual(expected);
  });
});

describe("useLearnProgress", () => {
  it("hydrates from storage under the shared key", async () => {
    storage.getItem.mockResolvedValue('["rsi"]');
    const { result } = await renderHook(() => useLearnProgress());
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(storage.getItem).toHaveBeenCalledWith(LEARN_PROGRESS_KEY);
    expect(result.current.read.has("rsi")).toBe(true);
  });

  it("persists a toggle", async () => {
    const { result } = await renderHook(() => useLearnProgress());
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(async () => result.current.toggle("sma"));
    expect(result.current.read.has("sma")).toBe(true);
    expect(storage.setItem).toHaveBeenLastCalledWith(LEARN_PROGRESS_KEY, '["sma"]');
  });

  it("a toggle made before hydration is merged, not lost", async () => {
    let resolve: (v: string | null) => void = () => {};
    storage.getItem.mockReturnValue(new Promise((r) => (resolve = r)));
    const { result } = await renderHook(() => useLearnProgress());
    await act(async () => result.current.toggle("sma"));
    await act(async () => resolve('["rsi"]'));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect([...result.current.read].sort()).toEqual(["rsi", "sma"]);
    expect(JSON.parse(storage.setItem.mock.calls.at(-1)![1]).sort()).toEqual(["rsi", "sma"]);
  });

  it("a failed read still yields a working, empty tracker", async () => {
    storage.getItem.mockRejectedValue(new Error("disk"));
    const { result } = await renderHook(() => useLearnProgress());
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(async () => result.current.toggle("rsi"));
    expect(result.current.read.has("rsi")).toBe(true);
  });

  it("a failed write (sync throw or rejection) never breaks the toggle", async () => {
    storage.setItem.mockImplementationOnce(() => {
      throw new Error("quota");
    });
    storage.setItem.mockRejectedValueOnce(new Error("quota"));
    const { result } = await renderHook(() => useLearnProgress());
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(async () => result.current.toggle("rsi"));
    await act(async () => result.current.toggle("sma"));
    expect([...result.current.read].sort()).toEqual(["rsi", "sma"]);
  });

  it("reset clears memory and storage", async () => {
    storage.getItem.mockResolvedValue('["rsi"]');
    const { result } = await renderHook(() => useLearnProgress());
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(async () => result.current.reset());
    expect(result.current.read.size).toBe(0);
    expect(storage.removeItem).toHaveBeenCalledWith(LEARN_PROGRESS_KEY);
  });
});
