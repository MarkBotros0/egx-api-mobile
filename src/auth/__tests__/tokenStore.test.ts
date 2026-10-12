import { clearSession, currentToken, loadSession, saveSession } from "@/auth/tokenStore";
import * as SecureStore from "expo-secure-store";

const alice = { id: "u1", email: "alice@example.com", name: "Alice", role: "user" as const };

describe("tokenStore", () => {
  it("round-trips a session and exposes the token synchronously", async () => {
    await saveSession("tok-1", alice);
    expect(currentToken()).toBe("tok-1");
    await expect(loadSession()).resolves.toEqual({ token: "tok-1", user: alice });
  });

  it("clears both keys", async () => {
    await saveSession("tok-1", alice);
    await clearSession();
    expect(currentToken()).toBeNull();
    await expect(loadSession()).resolves.toEqual({ token: null, user: null });
  });

  it("treats a corrupted cached user as absent but keeps the token", async () => {
    await SecureStore.setItemAsync("egx.auth.token", "tok-2");
    await SecureStore.setItemAsync("egx.auth.user", "{not json");
    await expect(loadSession()).resolves.toEqual({ token: "tok-2", user: null });
  });

  it("treats a pre-email cached user (username only) as absent", async () => {
    await SecureStore.setItemAsync("egx.auth.token", "tok-4");
    await SecureStore.setItemAsync("egx.auth.user", JSON.stringify({ id: "u3", username: "old", role: "user" }));
    await expect(loadSession()).resolves.toEqual({ token: "tok-4", user: null });
  });

  it("normalises an unknown role to user", async () => {
    await SecureStore.setItemAsync("egx.auth.token", "tok-3");
    await SecureStore.setItemAsync("egx.auth.user", JSON.stringify({ id: "u2", email: "bob@example.com", name: "Bob", role: "root" }));
    const { user } = await loadSession();
    expect(user?.role).toBe("user");
  });
});
