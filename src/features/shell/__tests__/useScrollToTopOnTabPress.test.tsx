import { renderHook } from "@testing-library/react-native";
import { fireTabPress, navigation } from "@/features/market/testing/expoRouterMock";
import { useScrollToTopOnTabPress } from "../useScrollToTopOnTabPress";

jest.mock("expo-router", () => jest.requireActual("@/features/market/testing/expoRouterMock"));

const list = { scrollToOffset: jest.fn() };

beforeEach(() => jest.clearAllMocks());

it("tapping the tab you are already on scrolls its list to the top", async () => {
  navigation.isFocused.mockReturnValue(true);
  await renderHook(() => useScrollToTopOnTabPress({ current: list }));
  fireTabPress();
  expect(list.scrollToOffset).toHaveBeenCalledWith({ offset: 0, animated: true });
});

it("a tap that switches to the tab from elsewhere does not scroll", async () => {
  navigation.isFocused.mockReturnValue(false);
  await renderHook(() => useScrollToTopOnTabPress({ current: list }));
  fireTabPress();
  expect(list.scrollToOffset).not.toHaveBeenCalled();
});

it("stops listening when the screen unmounts", async () => {
  navigation.isFocused.mockReturnValue(true);
  const { unmount } = await renderHook(() => useScrollToTopOnTabPress({ current: list }));
  await unmount();
  fireTabPress();
  expect(list.scrollToOffset).not.toHaveBeenCalled();
});
