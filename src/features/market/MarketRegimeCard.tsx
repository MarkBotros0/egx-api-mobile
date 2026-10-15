import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { learnHref } from "@/lib/links";
import { useMarket } from "@/providers/market";
import { fetchMarketRegime, type MarketBreadth } from "@/shared/api";
import { AppText, LearnTerm } from "@/ui";
import { useKeyedFetch } from "./hooks/useKeyedFetch";
import { pct } from "./logic/format";
import { breadthTone, positiveRateSplit, regimePosition } from "./logic/regime";

/**
 * The market-condition reading — the app's only forecast-shaped surface, every
 * claim read from the payload. Breadth sits INSIDE it (web `BreadthStrip`):
 * two competing market cards invite picking whichever agrees with you.
 */

const TONE: Record<string, { ring: string; text: string; bar: string }> = {
  weak: { ring: "border-loss/25", text: "text-loss", bar: "bg-loss" },
  mixed: { ring: "border-accent/25", text: "text-accent", bar: "bg-accent" },
  broad: { ring: "border-gain/25", text: "text-gain", bar: "bg-gain" },
};
const NEUTRAL = { ring: "border-white/10", text: "text-white/50", bar: "bg-white/20" };
const BREADTH_FILL = { gain: "bg-gain", loss: "bg-loss", neutral: "bg-white/30" } as const;

const REGIME_EXPLANATION =
  "The average composite score across EGX30 and EGX70 constituents — a reading of how broadly healthy the market is right now, NOT a call on any single stock. Its link to the market's next three months was measured and is weak enough that it does not pass a significance test, so read it as context about today, not as a forecast.";

const BREADTH_EXPLANATION =
  "How many shares are participating, rather than how the index looks. Measured from last night's risk snapshot, so it stays current even when nothing else has been refreshed. Its link to the next three months is weak and does not clear this app's evidence bar — read it as a description of today, not a forecast.";

function BreadthStrip({ breadth }: { breadth: MarketBreadth }) {
  const title = (
    <LearnTerm term="Market breadth" explanation={BREADTH_EXPLANATION}>
      Market breadth
    </LearnTerm>
  );

  if (!breadth.enough_data || breadth.pct_above_sma200 == null) {
    return (
      <View className="mt-3 border-t border-white/5 pt-3">
        {title}
        <AppText className="mt-1 text-[11px] leading-relaxed text-white/40">
          {`Needs at least 15 measured stocks; ${breadth.n_symbols} are in last night's snapshot so far. It fills in as the nightly risk job works through the market.`}
        </AppText>
      </View>
    );
  }

  const above = breadth.pct_above_sma200;
  const ev = breadth.evidence;
  return (
    <View className="mt-3 border-t border-white/5 pt-3">
      <View className="flex-row items-baseline justify-between gap-2">
        {title}
        <AppText className="text-[10px] text-white/30">{`${breadth.n_symbols} tradeable stocks`}</AppText>
      </View>
      <View className="relative mt-2 h-2 w-full overflow-hidden rounded-full bg-white/5">
        <View
          className={`absolute bottom-0 left-0 top-0 opacity-70 ${BREADTH_FILL[breadthTone(above)]}`}
          style={{ width: pct(Math.max(0, Math.min(100, above))) }}
        />
        <View className="absolute bottom-0 top-0 w-px bg-white/25" style={{ left: "50%" }} />
      </View>
      <View className="mt-1.5 flex-row items-baseline justify-between gap-2">
        <AppText className="text-xs text-white/70">{`${above}% above their 200-day average`}</AppText>
        {breadth.mean_rsi != null && (
          <AppText className="text-[10px] text-white/30">{`avg RSI ${breadth.mean_rsi}`}</AppText>
        )}
      </View>
      {breadth.pct_oversold != null && breadth.pct_oversold > 0 && (
        // Stated, never coloured: more oversold shares measured WORSE forward returns.
        <AppText className="mt-2 text-[10px] leading-relaxed text-white/40">
          {`${breadth.pct_oversold}% are oversold (RSI under 30). On EGX history that has leaned the wrong way — periods with more oversold shares were followed by weaker returns, not a bounce`}
          {ev
            ? ` (rank correlation ${ev.strongest_rho.toFixed(2)}, t ${ev.strongest_t.toFixed(2)}${ev.significant_at_project_bar === false ? ", still too weak to act on" : ""})`
            : ""}
          .
        </AppText>
      )}
    </View>
  );
}

export function MarketRegimeCard() {
  const { market } = useMarket();
  const { data, error, loading } = useKeyedFetch(`market-regime:${market.code}`, fetchMarketRegime);

  if (error) return null;
  if (loading || !data) {
    return (
      <View testID="regime-skeleton" className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <View className="h-3 w-32 rounded bg-white/10" />
        <View className="mt-3 h-6 w-40 rounded bg-white/10" />
      </View>
    );
  }

  const tone = (data.band && TONE[data.band]) || NEUTRAL;
  const pos = regimePosition(data.mean_score);
  const split = data.hist_positive_rate != null ? positiveRateSplit(data.hist_positive_rate) : null;

  return (
    <View className={`rounded-xl border bg-white/[0.02] p-4 ${tone.ring}`}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <LearnTerm term="Market Condition" explanation={REGIME_EXPLANATION}>
            Market Condition
          </LearnTerm>
          <AppText className={`mt-1 font-sans-semibold text-lg ${tone.text}`}>{data.label}</AppText>
        </View>
        {data.mean_score != null && (
          <View className="items-end">
            <AppText className="font-mono-semibold text-2xl text-white">{data.mean_score.toFixed(1)}</AppText>
            <AppText className="text-[10px] text-white/30">
              {`avg of ${data.n_symbols}${data.universe_size ? ` / ${data.universe_size}` : ""}`}
            </AppText>
          </View>
        )}
      </View>

      {pos != null && (
        <View className="mt-3">
          <View className="relative h-1.5 w-full rounded-full bg-white/5">
            <View
              className={`absolute top-0 h-1.5 w-1.5 rounded-full ${tone.bar}`}
              style={{ left: pct(pos), marginLeft: -3 }}
            />
          </View>
          <View className="mt-1 flex-row justify-between">
            <AppText className="text-[9px] text-white/25">weak</AppText>
            <AppText className="text-[9px] text-white/25">broad</AppText>
          </View>
        </View>
      )}

      <AppText className="mt-3 text-xs leading-relaxed text-white/60">{data.summary}</AppText>

      {data.band && split && (
        <AppText className="mt-2 text-[10px] leading-relaxed text-white/35">
          {`Historically, from this level the EGX30's next ${data.horizon_days} trading days had a median of ${data.hist_median_3m_pct != null && data.hist_median_3m_pct > 0 ? "+" : ""}${data.hist_median_3m_pct}% and were positive ${split.positive}% of the time — and negative or flat the other ${split.other}%${data.observations ? ` (${data.observations} readings)` : ""}.`}
          {data.association_rho != null
            ? ` The link behind this is weak: rank correlation +${data.association_rho.toFixed(2)}${data.association_t != null ? `, t ${data.association_t.toFixed(2)}` : ""} across ${data.association_n} overlapping readings${data.association_significant === false ? ", which does not clear the usual significance bar" : ""}. Treat it as context, never a prediction.`
            : ""}
        </AppText>
      )}

      {data.stale && (
        <AppText className="mt-2 text-[10px] text-white/30">
          {`Showing the last complete reading${data.observed_at ? ` from ${data.observed_at.slice(0, 10)}` : ""}. Only ${data.n_symbols_now ?? 0} stocks are scored right now — browse the dashboard to refresh it.`}
        </AppText>
      )}

      {data.breadth && <BreadthStrip breadth={data.breadth} />}

      <Pressable
        accessibilityRole="link"
        onPress={() => router.push(learnHref("market_condition"))}
        className="mt-1 min-h-[44px] justify-center"
      >
        <AppText className="text-[11px] text-accent/70">What does this mean? →</AppText>
      </Pressable>
    </View>
  );
}
