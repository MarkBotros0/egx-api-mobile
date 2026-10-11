/**
 * Administering accounts is an account action, not a place — so it is a
 * button beside Log out, never a tab. The tab bar is the same for everyone.
 */
import { router } from "expo-router";
import { IconButton } from "@/ui";
import { useAuth } from "@/auth/AuthProvider";
import { routes } from "@/lib/links";

export function AdminHeaderButton() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return null;
  return <IconButton icon="people-outline" accessibilityLabel="Users" onPress={() => router.push(routes.admin)} />;
}
