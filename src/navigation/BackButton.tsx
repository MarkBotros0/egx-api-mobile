import { router } from "expo-router";

import { IconButton } from "@/ui";

/** A plain back chevron: no previous-screen label, no button chrome. */
export function BackButton() {
  return <IconButton icon="chevron-back" accessibilityLabel="Back" onPress={() => router.back()} />;
}
