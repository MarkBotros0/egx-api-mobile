/** Account (profile, log out, delete account) is a header button, not a tab. */
import { router } from "expo-router";

import { routes } from "@/lib/links";
import { IconButton } from "@/ui";

export function AccountHeaderButton() {
  return <IconButton icon="person-circle-outline" accessibilityLabel="Account" onPress={() => router.push(routes.account)} />;
}
