import { __resetTokenCache } from "./src/auth/tokenStore";
import { installFetchMock } from "./src/test-utils/fetch";
import { __resetSecureStore } from "./src/test-utils/secureStoreMock";

// Every test runs against a fake backend base URL; no test may reach the network.
process.env.EXPO_PUBLIC_API_BASE_URL = "https://api.test/api";

jest.mock("expo-secure-store", () => require("./src/test-utils/secureStoreMock"));
jest.mock("expo-notifications", () => require("./src/test-utils/notificationsMock"));
jest.mock("expo-device", () => ({ isDevice: true }));

beforeEach(() => {
  installFetchMock();
  __resetSecureStore();
  __resetTokenCache();
});

// Reanimated under Jest (worklets must be mocked before setUpTests runs).
jest.mock("react-native-worklets", () => require("react-native-worklets/src/mock"));
require("react-native-reanimated").setUpTests();
