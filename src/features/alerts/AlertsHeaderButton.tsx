/** Alerts are an account setting, like Users and Log out — a header button, not a tab. */
import { router } from "expo-router";

import { routes } from "@/lib/links";
import { IconButton } from "@/ui";

export function AlertsHeaderButton() {
  return <IconButton icon="notifications-outline" accessibilityLabel="Score alerts" onPress={() => router.push(routes.alerts)} />;
}
