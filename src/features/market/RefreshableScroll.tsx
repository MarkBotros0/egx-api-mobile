import type { ReactNode } from "react";
import { RefreshControl, ScrollView } from "react-native";
import { COLORS } from "@/shared/theme";

/** A ScrollView with optional pull-to-refresh; its RefreshControl is `<testID>-refresh`. */
export function RefreshableScroll({
  testID,
  refreshing = false,
  onRefresh,
  contentClassName,
  children,
}: {
  testID?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentClassName?: string;
  children: ReactNode;
}) {
  return (
    <ScrollView
      testID={testID}
      contentContainerClassName={contentClassName}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            testID={testID ? `${testID}-refresh` : undefined}
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
            colors={[COLORS.accent]}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}
