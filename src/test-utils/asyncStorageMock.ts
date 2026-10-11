/**
 * A stand-in for @react-native-async-storage/async-storage with bare jest.fn()s,
 * so a test chooses each call's outcome. Use it with
 *   jest.mock("@react-native-async-storage/async-storage", () => jest.requireActual("@/test-utils/asyncStorageMock"));
 */
export default {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
