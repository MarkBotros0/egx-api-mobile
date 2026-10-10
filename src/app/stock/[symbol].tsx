import { Stack, useLocalSearchParams } from "expo-router";

import { ComingSoon } from "@/features/shell/ComingSoon";

export default function StockRoute() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  return (
    <>
      <Stack.Screen options={{ title: symbol ?? "" }} />
      <ComingSoon title={symbol ?? "Stock"} plan={3} />
    </>
  );
}
