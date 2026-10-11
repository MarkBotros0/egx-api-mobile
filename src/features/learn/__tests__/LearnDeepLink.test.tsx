import { FlatList } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { CURRICULUM } from "@/shared/curriculum";
import { renderScreen } from "@/test-utils/renderScreen";
import { FLASH_MS } from "../ConceptCard";
import { LearnScreen } from "../LearnScreen";
import { buildRows } from "../rows";

jest.mock("@react-native-async-storage/async-storage", () => jest.requireActual("@/test-utils/asyncStorageMock"));
jest.mock("@react-native-community/slider", () => jest.requireActual("@/test-utils/sliderMock"));
jest.mock("@/shared/api", () => ({ fetchAnalysis: jest.fn(() => new Promise(() => {})) }));

const indexOf = (key: string) =>
  buildRows({ modules: CURRICULUM, collapsed: new Set(), results: null }).findIndex((r) => r.key === key);

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
let scrollSpy: jest.SpyInstance;
let offsetSpy: jest.SpyInstance;
beforeEach(() => {
  storage.getItem.mockResolvedValue(null);
  storage.setItem.mockResolvedValue(undefined);
  storage.removeItem.mockResolvedValue(undefined);
  jest.useFakeTimers();
  scrollSpy = jest.spyOn(FlatList.prototype, "scrollToIndex").mockImplementation(() => {});
  offsetSpy = jest.spyOn(FlatList.prototype, "scrollToOffset").mockImplementation(() => {});
});
afterEach(() => {
  scrollSpy.mockRestore();
  offsetSpy.mockRestore();
  jest.useRealTimers();
});

async function flushFrames() {
  await act(async () => {
    jest.advanceTimersByTime(50);
  });
}

describe("Learn deep links", () => {
  it("scrolls to a concept in the last module and reports it handled", async () => {
    const handled = jest.fn();
    await renderScreen(<LearnScreen concept="dividend_yield" onConceptHandled={handled} />);
    await flushFrames();
    expect(scrollSpy).toHaveBeenCalledWith(expect.objectContaining({ index: indexOf("c-dividend_yield") }));
    expect(handled).toHaveBeenCalledTimes(1);
  });

  it("scrolls to a MODULE id (risk-management)", async () => {
    await renderScreen(<LearnScreen concept="risk-management" />);
    await flushFrames();
    expect(scrollSpy).toHaveBeenCalledWith(expect.objectContaining({ index: indexOf("m-risk-management") }));
  });

  it("clears an active search and reopens a collapsed module", async () => {
    const view = await renderScreen(<LearnScreen />);
    await fireEvent.press(screen.getByTestId("module-market-basics"));
    expect(screen.queryByText("What is a Stock?")).toBeNull();
    await fireEvent.changeText(screen.getByLabelText("Search all concepts"), "volume");
    await view.rerender(<LearnScreen concept="what-is-a-stock" />);
    await flushFrames();
    expect(screen.getByLabelText("Search all concepts").props.value).toBe("");
    expect(screen.getByText("What is a Stock?")).toBeTruthy();
  });

  it("flashes the target, then stops", async () => {
    await renderScreen(<LearnScreen concept="what-is-a-stock" />);
    await flushFrames();
    expect(screen.getByTestId("learn-flash")).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(FLASH_MS + 50);
    });
    expect(screen.queryByTestId("learn-flash")).toBeNull();
  });

  it("the same concept twice scrolls twice", async () => {
    const view = await renderScreen(<LearnScreen concept="rsi" />);
    await flushFrames();
    await view.rerender(<LearnScreen concept={undefined} />);
    await view.rerender(<LearnScreen concept="rsi" />);
    await flushFrames();
    const calls = scrollSpy.mock.calls.filter(([arg]) => arg.index === indexOf("c-rsi"));
    expect(calls).toHaveLength(2);
  });

  it("ignores an id it does not know, without crashing", async () => {
    const handled = jest.fn();
    await renderScreen(<LearnScreen concept="from_a_newer_backend" onConceptHandled={handled} />);
    await flushFrames();
    expect(scrollSpy).not.toHaveBeenCalled();
    expect(handled).toHaveBeenCalledTimes(1);
    expect(screen.getByText("What is a Stock?")).toBeTruthy();
  });

  it("a module pill jumps without flashing", async () => {
    await renderScreen(<LearnScreen />);
    await fireEvent.press(screen.getByLabelText(/^Module 7: /));
    await flushFrames();
    expect(scrollSpy).toHaveBeenCalledWith(expect.objectContaining({ index: indexOf(`m-${CURRICULUM[6].id}`) }));
    expect(screen.queryByTestId("learn-flash")).toBeNull();
  });

  it("an off-window jump is retried via onScrollToIndexFailed (pills and deep links), bounded", async () => {
    let list: { props: { onScrollToIndexFailed?: (info: object) => void } } | undefined;
    const render = FlatList.prototype.render;
    const renderSpy = jest.spyOn(FlatList.prototype, "render").mockImplementation(function (this: typeof list) {
      list = this;
      return render.call(this as never);
    });
    await renderScreen(<LearnScreen />);
    await fireEvent.press(screen.getByLabelText(/^Module 7: /));
    await flushFrames();
    renderSpy.mockRestore();
    if (!list) throw new Error("FlatList never rendered");
    const onFailed = list.props.onScrollToIndexFailed;
    expect(typeof onFailed).toBe("function");
    const index = indexOf(`m-${CURRICULUM[6].id}`);
    scrollSpy.mockClear();
    for (let i = 0; i < 5; i++) {
      await act(async () => onFailed?.({ index, averageItemLength: 200, highestMeasuredFrameIndex: 3 }));
      await act(async () => {
        jest.advanceTimersByTime(150);
      });
    }
    expect(offsetSpy).toHaveBeenCalledWith(expect.objectContaining({ animated: false }));
    expect(scrollSpy).toHaveBeenCalledTimes(3);
    expect(scrollSpy).toHaveBeenCalledWith(expect.objectContaining({ index }));
  });

  describe("onScrollToIndexFailed retry safety", () => {
    async function mountAndGetFailed() {
      let list: { props: { onScrollToIndexFailed?: (info: object) => void } } | undefined;
      const render = FlatList.prototype.render;
      const renderSpy = jest.spyOn(FlatList.prototype, "render").mockImplementation(function (this: typeof list) {
        list = this;
        return render.call(this as never);
      });
      const view = await renderScreen(<LearnScreen />);
      const failed = () => list?.props.onScrollToIndexFailed;
      return { view, failed, restore: () => renderSpy.mockRestore() };
    }

    it("drops a pending retry whose row vanished (rows shrank after a search)", async () => {
      const { failed, restore } = await mountAndGetFailed();
      await fireEvent.press(screen.getByLabelText(/^Module 7: /));
      await flushFrames();
      scrollSpy.mockClear();
      await act(async () => failed()?.({ index: indexOf(`m-${CURRICULUM[6].id}`), averageItemLength: 200 }));
      await fireEvent.changeText(screen.getByLabelText("Search all concepts"), "volume");
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      restore();
      expect(scrollSpy).not.toHaveBeenCalled();
    });

    it("retries with the CURRENT index of the current jump, not the stale one", async () => {
      const { failed, restore } = await mountAndGetFailed();
      await fireEvent.press(screen.getByLabelText(/^Module 7: /));
      await flushFrames();
      await act(async () => failed()?.({ index: 9999, averageItemLength: 200 }));
      scrollSpy.mockClear();
      await act(async () => {
        jest.advanceTimersByTime(150);
      });
      restore();
      expect(scrollSpy).toHaveBeenCalledTimes(1);
      expect(scrollSpy).toHaveBeenCalledWith(expect.objectContaining({ index: indexOf(`m-${CURRICULUM[6].id}`) }));
    });

    it("a newer jump cancels the older retry", async () => {
      const { failed, restore } = await mountAndGetFailed();
      await fireEvent.press(screen.getByLabelText(/^Module 7: /));
      await flushFrames();
      await act(async () => failed()?.({ index: indexOf(`m-${CURRICULUM[6].id}`), averageItemLength: 200 }));
      scrollSpy.mockClear();
      await fireEvent.press(screen.getByLabelText(/^Module 2: /));
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      restore();
      const idx = scrollSpy.mock.calls.map((c) => c[0].index);
      expect(idx).toEqual([indexOf(`m-${CURRICULUM[1].id}`)]);
    });

    it("does not retry after unmount", async () => {
      const { view, failed, restore } = await mountAndGetFailed();
      await fireEvent.press(screen.getByLabelText(/^Module 7: /));
      await flushFrames();
      await act(async () => failed()?.({ index: indexOf(`m-${CURRICULUM[6].id}`), averageItemLength: 200 }));
      scrollSpy.mockClear();
      await view.unmount();
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      restore();
      expect(scrollSpy).not.toHaveBeenCalled();
    });
  });
});
