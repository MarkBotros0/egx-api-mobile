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
        <View className={`flex-1 px-4 ${contentClassName}`}>{children}</View>
      )}
    </SafeAreaView>
  );
}
