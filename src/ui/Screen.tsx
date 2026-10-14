import type { ReactNode } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { COLORS } from "@/shared/theme";

interface Props {
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: Edge[];
  contentClassName?: string;
}

export function Screen({ children, scroll = true, refreshing = false, onRefresh, edges = [], contentClassName = "" }: Props) {
  return (
    <SafeAreaView edges={edges} className="flex-1 bg-charcoal-dark">
      {scroll ? (
        <ScrollView
          contentContainerClassName={`px-4 pb-8 ${contentClassName}`}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} /> : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        // No side padding here: a non-scrolling screen hosts its own list or
        // scroll view, which pads itself. Padding both doubled the margin.
        <View className={`flex-1 ${contentClassName}`}>{children}</View>
      )}
    </SafeAreaView>
  );
}
