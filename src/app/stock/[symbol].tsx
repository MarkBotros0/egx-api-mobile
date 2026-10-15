import { Stack, useLocalSearchParams } from "expo-router";
import { parseInterval } from "@/features/market/logic/stockDetail";
import { StockDetailScreen } from "@/features/market/StockDetailScreen";
import type { MarketCode } from "@/shared/markets";

export default function StockRoute() {
  const params = useLocalSearchParams<{ symbol: string; interval?: string; market?: string }>();
  const symbol = String(params.symbol ?? "").toUpperCase();
  // `?market=` deep-links into a market without switching the app's (unknown codes are ignored).
  const linked = String(params.market ?? "").toUpperCase();
  const market: MarketCode | undefined = linked === "EG" || linked === "US" ? linked : undefined;
  return (
    <>
      <Stack.Screen options={{ title: symbol }} />
      {/* Keyed so moving to another stock starts from fresh state (card expand state included). */}
      <StockDetailScreen
        key={`${market ?? ""}:${symbol}`}
        symbol={symbol}
        initialInterval={parseInterval(params.interval)}
        market={market}
      />
    </>
  );
}
