/**
 * Administering accounts is an account action, not a place — so it lives on
 * the Account screen (admins only), not in the top bar, which keeps just the
 * alerts bell and the account button.
 */
import { router } from "expo-router";

import { useAuth } from "@/auth/AuthProvider";
import { routes } from "@/lib/links";
import { Button } from "@/ui";

export function ManageUsersButton() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return null;
  return (
    <Button
      variant="secondary"
      icon="people-outline"
      label="Manage users"
      accessibilityLabel="Users"
      onPress={() => router.push(routes.admin)}
    />
  );
}
