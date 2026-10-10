import type { ReactNode } from "react";

/**
 * Stand-in for `expo-router` in feature tests (screens are rendered outside a
 * navigator). Use with:
 *   jest.mock("expo-router", () => jest.requireActual("@/features/market/testing/expoRouterMock"));
 */
export const router = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  navigate: jest.fn(),
  canGoBack: jest.fn(() => true),
};
export const useRouter = () => router;
export const useLocalSearchParams = jest.fn(() => ({}));
export const useGlobalSearchParams = jest.fn(() => ({}));
export const useSegments = () => [] as string[];
export const usePathname = () => "/";
export const useFocusEffect = () => undefined;

export function Link({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}
export function Redirect() {
  return null;
}
export function Slot() {
  return null;
}
export const Stack = Object.assign(() => null, {
  Screen: () => null,
  Protected: ({ children }: { children?: ReactNode }) => <>{children}</>,
});
export const Tabs = Object.assign(() => null, { Screen: () => null });
