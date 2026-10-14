import { Ionicons } from "@expo/vector-icons";
import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, Switch, View } from "react-native";

import { COLORS } from "@/shared/theme";
import { AppText, Sheet, type IoniconName } from "@/ui";
import { IndexFilter } from "./IndexFilter";
import {
  ALL_SECTORS,
  COMPOSITE_INTERVALS,
  SECTORS,
  SORT_EXPLANATIONS,
  SORTS,
  type CompositeInterval,
  type SortKey,
} from "./logic/dashboardFilters";

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

type Open = "filter" | "sort" | "score" | null;

/**
 * Two rows: the index chips, then three dropdown chips — Filter (sector +
 * dividend payers), Sort, Score — each opening a sheet that holds the choices
 * AND their explanation. This replaced five stacked chip rows.
 */
export function DashboardControls(p: DashboardControlsProps) {
  const [open, setOpen] = useState<Open>(null);
  const close = () => setOpen(null);

  const filterLabel =
    [p.sector === ALL_SECTORS ? null : p.sector, p.dividendOnly ? "Dividend" : null].filter(Boolean).join(" · ") ||
    "All sectors";
  const filtered = p.sector !== ALL_SECTORS || p.dividendOnly;
  const sortNote = SORT_EXPLANATIONS[p.sort];

  return (
    <View className="gap-2">
      <IndexFilter selected={p.index} onChange={p.onIndex} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 py-1">
        <DropChip
          icon="funnel-outline"
          label={filterLabel}
          active={filtered}
          accessibilityLabel={`Filter: ${filterLabel}`}
          onPress={() => setOpen("filter")}
        />
        <DropChip
          icon="swap-vertical"
          label={`Sort: ${p.sort}`}
          accessibilityLabel={`Sort: ${p.sort}`}
          onPress={() => setOpen("sort")}
        />
        <DropChip
          icon="speedometer-outline"
          label={p.showComposite ? `Score · ${p.interval}` : "Score off"}
          active={p.showComposite && p.interval !== "Daily"}
          accessibilityLabel={`Score: ${p.showComposite ? `On, ${p.interval}` : "Off"}`}
          onPress={() => setOpen("score")}
        />
      </ScrollView>

      {/* Truthful about what the feed covers rather than quietly shrinking. */}
      <AppText className="text-xs text-white/30">
        {`${p.quotedCount} stocks`}
        {p.unquotedCount > 0 ? (
          <AppText className="text-xs text-white/20">{` · ${p.unquotedCount} without a price feed`}</AppText>
        ) : null}
      </AppText>
      {/* Say plainly when the grid is NOT on the primary view. */}
      {p.showComposite && p.interval !== "Daily" ? (
        <AppText className="text-[11px] text-[#ffaa00]">
          {`Showing ${p.interval.toLowerCase()} scores — trend context, not entry timing`}
        </AppText>
      ) : null}

      {open === "filter" ? (
      <Sheet visible onClose={close} title="Filter">
        <SwitchRow label="Pays a dividend" value={p.dividendOnly} onToggle={p.onToggleDividend} />
        <Note>{DIVIDEND_EXPLANATION}</Note>
        <SectionLabel>Sector</SectionLabel>
        {SECTORS.map((s) => (
          <OptionRow
            key={s}
            label={s}
            selected={p.sector === s}
            onPress={() => {
              p.onSector(s);
              close();
            }}
          />
        ))}
      </Sheet>
      ) : null}

      {open === "sort" ? (
      <Sheet visible onClose={close} title="Sort">
        {SORTS.map((s) => (
          <OptionRow
            key={s}
            label={s}
            selected={p.sort === s}
            onPress={() => {
              p.onSort(s);
              close();
            }}
          />
        ))}
        {sortNote ? <Note>{sortNote}</Note> : null}
      </Sheet>
      ) : null}

      {open === "score" ? (
      <Sheet visible onClose={close} title="Score">
        <SwitchRow label="Show scores on cards" value={p.showComposite} onToggle={p.onToggleComposite} />
        {p.showComposite ? (
          <>
            <SectionLabel>Timeframe</SectionLabel>
            {COMPOSITE_INTERVALS.map((iv) => (
              <OptionRow key={iv} label={iv} selected={p.interval === iv} onPress={() => p.onInterval(iv)} />
            ))}
          </>
        ) : null}
        <Note>{SCORE_EXPLANATION}</Note>
      </Sheet>
      ) : null}
    </View>
  );
}

/** A chip that opens a sheet: icon, current value, a down chevron. */
function DropChip({
  icon,
  label,
  active = false,
  accessibilityLabel,
  onPress,
}: {
  icon: IoniconName;
  label: string;
  active?: boolean;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const color = active ? COLORS.accent : "rgba(255,255,255,0.7)";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Opens the options"
      hitSlop={{ top: 4, bottom: 4 }}
      onPress={onPress}
      className={`min-h-[36px] flex-row items-center gap-1.5 rounded-full border px-3 active:opacity-70 ${
        active ? "border-accent/50 bg-accent/15" : "border-white/10 bg-white/5"
      }`}
    >
      <Ionicons name={icon} size={14} color={color} />
      <AppText numberOfLines={1} className="max-w-[160px] font-sans-medium text-xs" style={{ color }}>
        {label}
      </AppText>
      <Ionicons name="chevron-down" size={12} color={color} />
    </Pressable>
  );
}

function OptionRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      className="min-h-[44px] flex-row items-center justify-between border-b border-white/5 active:opacity-70"
    >
      <AppText className={`text-sm ${selected ? "font-sans-semibold text-accent" : "text-white/80"}`}>{label}</AppText>
      {selected ? <Ionicons name="checkmark" size={18} color={COLORS.accent} /> : null}
    </Pressable>
  );
}

function SwitchRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <View className="min-h-[44px] flex-row items-center justify-between">
      <AppText className="text-sm text-white/90">{label}</AppText>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onToggle}
        trackColor={{ true: COLORS.accent, false: "rgba(255,255,255,0.15)" }}
      />
    </View>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <AppText className="mt-4 font-sans-medium text-[10px] uppercase tracking-[1px] text-white/30">{children}</AppText>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <AppText className="mt-2 text-xs leading-5 text-white/45">{children}</AppText>;
}
