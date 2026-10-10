import { View } from "react-native";
import { fetchPEFeedStatus } from "@/shared/api";
import { AppText } from "@/ui";
import { useKeyedFetch } from "./hooks/useKeyedFetch";
import { useNow } from "./hooks/useNow";
import { peStaleDays } from "./logic/freshness";

/** Best-effort: silent on failure, never blocks the page. */
export function PEFreshnessBanner() {
  const { data } = useKeyedFetch("pe-status", fetchPEFeedStatus);
  const now = useNow(60_000);
  const days = peStaleDays(data?.last_successful_fetch, now);
  if (days == null) return null;
  const attempt =
    data?.last_attempt_status && data.last_attempt_status !== "ok"
      ? ` Last attempt: ${data.last_attempt_status}.`
      : "";
  return (
    <View className="rounded-lg border border-amber-400/30 bg-amber-400/[0.06] px-3 py-2">
      <AppText className="text-xs text-amber-200/80">
        {`P/E data last updated ${days} day${days === 1 ? "" : "s"} ago — the EGX feed may be temporarily unavailable.${attempt}`}
      </AppText>
    </View>
  );
}
