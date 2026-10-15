import { useEffect, useState } from "react";
import { View } from "react-native";
import { useMarket } from "@/providers/market";
import { fetchPEFeedStatus } from "@/shared/api";
import { AppText } from "@/ui";
import { peStalenessMessage } from "./peFreshness";

/** Best-effort: a failed status fetch shows nothing and never blocks the page. */
export function PEFreshnessBanner() {
  const [message, setMessage] = useState<string | null>(null);
  const { market } = useMarket();

  useEffect(() => {
    let cancelled = false;
    fetchPEFeedStatus()
      .then((s) => {
        // Age is computed here, not in render: Date.now() is impure.
        if (!cancelled) setMessage(peStalenessMessage(s, Date.now()));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [market.code]);

  if (!message) return null;
  return (
    <View className="rounded-lg border border-amber-400/30 bg-amber-400/[0.06] px-3 py-2">
      <AppText className="text-xs text-amber-200/80">{message}</AppText>
    </View>
  );
}
