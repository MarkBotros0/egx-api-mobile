/**
 * Real COMI data inside a Learn concept.
 *
 * 1. One fetch for the whole screen (liveData.ts).
 * 2. Nothing loads until the concept has been on screen: the Learn list arms
 *    it from FlatList viewability (the web uses an IntersectionObserver).
 * 3. It must degrade to the diagram: on any failure, or data too thin to
 *    draw, the caller's static diagram stays and no error is surfaced — a
 *    teaching page keeps teaching offline.
 */
import { useEffect, useState, type ReactNode } from "react";
import { View } from "react-native";
import { AppText } from "@/ui";
import { LIVE_SYMBOL, liveVisual } from "@/shared/learnLive";
import { V, specProps, type LiveVariant } from "@/shared/learnVisuals";
import type { AnalysisResponse } from "@/shared/types";
import { loadLiveAnalysis } from "./liveData";
import { MiniChart, ZoneScale } from "./visuals";

export function LiveChart({
  variant,
  caption,
  fallback,
  armed = true,
}: {
  variant: LiveVariant;
  caption?: string;
  /** Shown while loading, and permanently if the data never arrives. */
  fallback: ReactNode;
  armed?: boolean;
}) {
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!armed || data || failed) return;
    let alive = true;
    loadLiveAnalysis()
      .then((d) => {
        if (alive) setData(d);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [armed, data, failed]);

  const spec = data ? liveVisual(variant, data, caption) : null;
  if (!spec) return <>{fallback}</>;

  return (
    <View>
      {spec.kind === "MiniChart" ? <MiniChart {...specProps(spec)} /> : <ZoneScale {...specProps(spec)} />}
      <View className="mt-1.5 flex-row items-center gap-1.5">
        <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: V.up }} />
        <AppText className="font-mono text-[9px] uppercase tracking-[0.5px] text-white/30">
          {`Live · ${LIVE_SYMBOL} · daily`}
        </AppText>
      </View>
    </View>
  );
}
