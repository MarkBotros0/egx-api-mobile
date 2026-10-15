import { useEffect, useState } from "react";
import { View } from "react-native";
import { useMarket } from "@/providers/market";
import { fetchPEFeedStatus } from "@/shared/api";
import type { MarketCode } from "@/shared/markets";
import { AppText } from "@/ui";
import { peStalenessMessage } from "./peFreshness";

/**
 * Best-effort: a failed status fetch shows nothing and never blocks the page.
 * `market`: a deep link's market, read without switching the app's; omitted, the app's.
 */
export function PEFreshnessBanner({ market: linked }: { market?: MarketCode } = {}) {
  const [message, setMessage] = useState<string | null>(null);
  const { market, markets } = useMarket();
  const dataMarket = linked ?? market.code;
  const feedName = (markets.find((m) => m.code === dataMarket) ?? market).short_name;
  // Another market's staleness says nothing about this one.
  const [messageMarket, setMessageMarket] = useState(dataMarket);
  if (messageMarket !== dataMarket) {
    setMessageMarket(dataMarket);
    setMessage(null);
  }

  useEffect(() => {
    let cancelled = false;
    fetchPEFeedStatus({ market: dataMarket })
      .then((s) => {
        // Age is computed here, not in render: Date.now() is impure.
        if (!cancelled) setMessage(peStalenessMessage(s, Date.now(), feedName));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [dataMarket, feedName]);

  if (!message) return null;
  return (
    <View className="rounded-lg border border-amber-400/30 bg-amber-400/[0.06] px-3 py-2">
      <AppText className="text-xs text-amber-200/80">{message}</AppText>
    </View>
  );
}
