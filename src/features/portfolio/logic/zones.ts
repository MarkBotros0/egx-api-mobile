/**
 * Entry/exit zones are graded by confidence. `low` is the leftover bucket —
 * nothing disqualified the zone and nothing confirmed it — so it must not
 * borrow gain-green or loss-red. Both entry AND exit go neutral at low.
 */
import type { EntryExit, ZoneConfidence } from "@/shared/types";

export interface ZonePill {
  kind: "Entry" | "Exit";
  confidence: ZoneConfidence | null;
  direction: "gain" | "loss";
}

export function zonePill(entryExit: EntryExit | null | undefined): ZonePill | null {
  if (!entryExit) return null;
  if (entryExit.entry_zone.active) {
    return { kind: "Entry", confidence: entryExit.entry_zone.confidence, direction: "gain" };
  }
  if (entryExit.exit_zone.active) {
    return { kind: "Exit", confidence: entryExit.exit_zone.confidence, direction: "loss" };
  }
  return null;
}

export function isStrong(confidence: ZoneConfidence | null | undefined): boolean {
  return confidence === "high" || confidence === "medium";
}

export function zoneTone(pill: ZonePill): "neutral" | "gain" | "loss" {
  return isStrong(pill.confidence) ? pill.direction : "neutral";
}

export function zoneLabel(pill: ZonePill): string {
  return `${pill.kind} zone${pill.confidence ? ` · ${pill.confidence}` : ""}`;
}
