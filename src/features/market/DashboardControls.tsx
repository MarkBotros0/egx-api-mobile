import { View } from "react-native";
import { AppText, LearnTerm, Pill, PillRow } from "@/ui";
import { IndexFilter } from "./IndexFilter";
import {
  COMPOSITE_INTERVALS,
  SORT_EXPLANATIONS,
  SORTS,
  type CompositeInterval,
  type SortKey,
} from "./logic/dashboardFilters";
import { SectorFilter } from "./SectorFilter";

const DIVIDEND_EXPLANATION =
  "Shows only stocks that currently pay a cash dividend (a yield above zero, from the fundamentals feed). A dividend is evidence a company generates real cash — but with the policy rate near 19%, no EGX yield competes as income on its own. Pair it with the 'Recently paid' sort to see who paid most recently.";

const SCORE_EXPLANATION =
  "Turns on the 0-100 composite score on each card. The number tells you more than a Buy/Hold word does: 61 and 79 are very different setups. Scores are computed on DAILY bars, the timeframe every entry zone, stop-loss and portfolio alert is built on, and they match the gauge on the stock page exactly. You can switch to Weekly or Monthly for trend context; that resets to Daily next time you open the app.";

export interface DashboardControlsProps {
  index: string;
  onIndex: (v: string) => void;
  sector: string;
  onSector: (v: string) => void;
  quotedCount: number;
  unquotedCount: number;
  sort: SortKey;
  onSort: (v: SortKey) => void;
  dividendOnly: boolean;
  onToggleDividend: () => void;
  showComposite: boolean;
  onToggleComposite: () => void;
  interval: CompositeInterval;
  onInterval: (v: CompositeInterval) => void;
}

export function DashboardControls(p: DashboardControlsProps) {
  const sortNote = SORT_EXPLANATIONS[p.sort];
  return (
    <View className="gap-3">
      <IndexFilter selected={p.index} onChange={p.onIndex} />
      <SectorFilter selected={p.sector} onChange={p.onSector} />
      {/* Truthful about what the feed covers rather than quietly shrinking. */}
      <AppText className="text-xs text-white/30">
        {`${p.quotedCount} stocks`}
        {p.unquotedCount > 0 ? (
          <AppText className="text-xs text-white/20">{` · ${p.unquotedCount} without a price feed`}</AppText>
        ) : null}
      </AppText>

      <View className="gap-1">
        <PillRow>
          {SORTS.map((s) => (
            <Pill key={s} label={s} active={p.sort === s} onPress={() => p.onSort(s)} />
          ))}
        </PillRow>
        {sortNote && <AppText className="text-[11px] leading-relaxed text-white/40">{sortNote}</AppText>}
      </View>

      <View className="flex-row flex-wrap items-center gap-2">
        <Pill label="Pays a dividend" active={p.dividendOnly} onPress={p.onToggleDividend} />
        <LearnTerm term="Pays a dividend" explanation={DIVIDEND_EXPLANATION}>
          What is this?
        </LearnTerm>
      </View>

      <View className="gap-1">
        <PillRow>
          <Pill label={`Score: ${p.showComposite ? "On" : "Off"}`} active={p.showComposite} onPress={p.onToggleComposite} />
          {p.showComposite &&
            COMPOSITE_INTERVALS.map((iv) => (
              <Pill key={iv} label={iv} active={p.interval === iv} onPress={() => p.onInterval(iv)} />
            ))}
        </PillRow>
        <LearnTerm term="Score" explanation={SCORE_EXPLANATION}>
          About the score
        </LearnTerm>
        {/* Say plainly when the grid is NOT on the primary view. */}
        {p.showComposite && p.interval !== "Daily" && (
          <AppText className="text-[11px] text-[#ffaa00]">
            {`Showing ${p.interval.toLowerCase()} scores — trend context, not entry timing`}
          </AppText>
        )}
      </View>
    </View>
  );
}
