/**
 * The one /api/analysis call behind every Learn LiveChart.
 *
 * Module-level, so six live concepts cost one request. A failure clears the
 * promise so a concept scrolled to later can retry.
 */
import { fetchAnalysis } from "@/shared/api";
import { LIVE_BARS, LIVE_SYMBOL } from "@/shared/learnLive";
import type { AnalysisResponse } from "@/shared/types";

let inflight: Promise<AnalysisResponse> | null = null;

export function loadLiveAnalysis(): Promise<AnalysisResponse> {
  if (!inflight) {
    // LIVE_SYMBOL is an EGX stock, so this is always EG, whichever market the app shows.
    inflight = fetchAnalysis(LIVE_SYMBOL, "Daily", LIVE_BARS, { market: "EG" }).catch((err: unknown) => {
      inflight = null;
      throw err;
    });
  }
  return inflight;
}

export function resetLiveAnalysisForTests(): void {
  inflight = null;
}
