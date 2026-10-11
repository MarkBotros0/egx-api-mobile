import type { PEFeedStatus } from "@/shared/api";

export const PE_STALE_AFTER_HOURS = 48;

/** The banner text once the P/E feed is 48h+ stale, else null (web PEFreshnessBanner). */
export function peStalenessMessage(status: PEFeedStatus | null, nowMs: number): string | null {
  if (!status?.last_successful_fetch) return null;
  const last = Date.parse(status.last_successful_fetch);
  if (Number.isNaN(last)) return null;
  const ageHours = (nowMs - last) / 36e5;
  if (ageHours < PE_STALE_AFTER_HOURS) return null;
  const days = Math.floor(ageHours / 24);
  const attempt =
    status.last_attempt_status && status.last_attempt_status !== "ok"
      ? ` Last attempt: ${status.last_attempt_status}.`
      : "";
  return `P/E data last updated ${days} day${days === 1 ? "" : "s"} ago — the EGX feed may be temporarily unavailable.${attempt}`;
}
