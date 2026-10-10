import { installFetchMock } from "./src/test-utils/fetch";
import { __resetSecureStore } from "./src/test-utils/secureStoreMock";

// Every test runs against a fake backend base URL; no test may reach the network.
process.env.EXPO_PUBLIC_API_BASE_URL = "https://api.test/api";

jest.mock("expo-secure-store", () => require("./src/test-utils/secureStoreMock"));

beforeEach(() => {
  installFetchMock();
  __resetSecureStore();
});
