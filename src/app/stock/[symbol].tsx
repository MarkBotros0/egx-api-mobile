import { Stack, useLocalSearchParams } from "expo-router";
import { parseInterval } from "@/features/market/logic/stockDetail";
import { StockDetailScreen } from "@/features/market/StockDetailScreen";

export default function StockRoute() {
  const params = useLocalSearchParams<{ symbol: string; interval?: string }>();
  const symbol = String(params.symbol ?? "").toUpperCase();
  return (
    <>
      <Stack.Screen options={{ title: symbol }} />
      {/* Keyed so moving to another stock starts from fresh state (card expand state included). */}
      <StockDetailScreen key={symbol} symbol={symbol} initialInterval={parseInterval(params.interval)} />
    </>
  );
}
