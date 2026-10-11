import type { ZoneConfidence } from "@/shared/types";

/**
 * Only high/medium zones take gain-green or loss-red. `low` is the leftover
 * bucket (nothing confirmed it), so it stays neutral on every screen.
 */
export function isStrongZone(confidence: ZoneConfidence | null | undefined): boolean {
  return confidence === "high" || confidence === "medium";
}
