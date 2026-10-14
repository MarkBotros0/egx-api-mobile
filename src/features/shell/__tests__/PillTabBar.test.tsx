import { fireEvent, render, screen } from "@testing-library/react-native";
import type { BottomTabBarProps } from "expo-router/tabs";

import { TestSafeArea } from "@/test-utils/safeArea";

import { PillTabBar } from "../PillTabBar";

const ROUTES = ["index", "portfolio", "learn", "news"].map((name) => ({ key: `${name}-k`, name, params: undefined }));
const TITLES: Record<string, string> = { index: "Dashboard", portfolio: "Portfolio", learn: "Learn", news: "News" };

async function renderBar(index: number, defaultPrevented = false) {
  const navigate = jest.fn();
  const emit = jest.fn(() => ({ defaultPrevented }));
  const descriptors = Object.fromEntries(
    ROUTES.map((r) => [r.key, { options: { title: TITLES[r.name], tabBarIcon: () => null } }]),
  );
  const props = {
    state: { index, routes: ROUTES },
    descriptors,
    navigation: { navigate, emit },
    insets: { top: 0, bottom: 34, left: 0, right: 0 },
  } as unknown as BottomTabBarProps;
  await render(
    <TestSafeArea>
      <PillTabBar {...props} />
    </TestSafeArea>,
  );
  return { navigate, emit };
}

test("renders every tab and marks only the current one selected", async () => {
  await renderBar(1);
  const tabs = screen.getAllByRole("tab");
  expect(tabs.map((t) => t.props.accessibilityLabel)).toEqual(["Dashboard", "Portfolio", "Learn", "News"]);
  expect(tabs.map((t) => t.props.accessibilityState.selected)).toEqual([false, true, false, false]);
});

test("pressing another tab emits tabPress and navigates to it", async () => {
  const { navigate, emit } = await renderBar(0);
  await fireEvent.press(screen.getByLabelText("Learn"));
  expect(emit).toHaveBeenCalledWith({ type: "tabPress", target: "learn-k", canPreventDefault: true });
  expect(navigate).toHaveBeenCalledWith("learn", undefined);
});

test("pressing the current tab, or a prevented press, does not navigate", async () => {
  const first = await renderBar(0);
  await fireEvent.press(screen.getByLabelText("Dashboard"));
  expect(first.navigate).not.toHaveBeenCalled();
  await screen.unmount();

  const prevented = await renderBar(0, true);
  await fireEvent.press(screen.getByLabelText("News"));
  expect(prevented.navigate).not.toHaveBeenCalled();
});
