import { currentToken } from "@/auth/tokenStore";
import { configureApi } from "@/shared/apiConfig";

import { apiBaseUrl } from "./env";

/** Point the shared API client at the backend, the secure token, and our 401 handler. */
export function setupApi(onUnauthorized: () => void): void {
  configureApi({ baseUrl: apiBaseUrl(), getToken: currentToken, onUnauthorized });
}
