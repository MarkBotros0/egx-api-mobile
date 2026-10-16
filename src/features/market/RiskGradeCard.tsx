import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { learnHref } from "@/lib/links";
import { useMarket } from "@/providers/market";
import { fetchRisk, type RiskResponse, type RiskRow } from "@/shared/api";
import type { MarketCode } from "@/shared/markets";
import { RISK_BAND_COLOR, RISK_BAND_ORDER, riskBandBlurbs } from "@/shared/riskBands";
import { COLORS } from "@/shared/theme";
import { AppText, LearnTerm } from "@/ui";
import { useKeyedFetch } from "./hooks/useKeyedFetch";
import { useNow } from "./hooks/useNow";
import { riskAgoLabel } from "./logic/freshness";

/**
 * The per-stock risk grade — the strongest measured surface in the app. It
 * must never imply a return: every figure is about MOVEMENT and DRAWDOWN, in
 * the past tense. Colour is the shared cool→hot ramp, never gain/loss.
 */

function Tile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <View className="flex-1 rounded-lg bg-white/[0.03] px-2.5 py-2">
      <AppText className="text-[9px] leading-tight text-white/40">{label}</AppText>
      <AppText className="mt-0.5 font-mono-semibold text-sm text-white">{value}</AppText>
      <AppText className="mt-0.5 text-[9px] leading-tight text-white/30">{note}</AppText>
    </View>
  );
}

function Graded({
  row,
  res,
  band,
  now,
  shortName,
}: {
  row: RiskRow;
  res: RiskResponse;
  band: NonNullable<RiskRow["band"]>;
  now: number;
  shortName: string;
}) {
  const color = RISK_BAND_COLOR[band] ?? COLORS.accent;
  const label = row.band_label ?? band;
  const hist = row.historical;
  const ago = riskAgoLabel(res.oldest_measurement ?? row.measured_at, now);
  return (
    <>
      <View className="flex-row items-center gap-3">
        <View className="rounded-lg px-3 py-1.5" style={{ backgroundColor: `${color}22` }}>
          <AppText className="font-sans-bold text-sm uppercase tracking-wide" style={{ color }}>
            {label}
          </AppText>
        </View>
        <View className="flex-1">
          <AppText className="text-[11px] leading-tight text-white/50">{riskBandBlurbs(shortName)[band]}</AppText>
          {res.n_ranked ? (
            <AppText className="text-[11px] leading-tight text-white/30">
              {`${Math.round(row.pct_rank ?? 0)}th percentile of ${res.n_ranked} tradeable stocks`}
            </AppText>
          ) : null}
        </View>
      </View>

      <View className="mt-4">
        <View className="flex-row gap-1">
          {RISK_BAND_ORDER.map((b) => (
            <View
              key={b}
              className="h-1.5 flex-1 rounded-full"
              style={{ backgroundColor: b === band ? RISK_BAND_COLOR[b] : "rgba(255,255,255,0.07)" }}
            />
          ))}
        </View>
        <View className="mt-1 flex-row justify-between">
          <AppText className="text-[9px] text-white/25">Calm</AppText>
          <AppText className="text-[9px] text-white/25">Wild</AppText>
        </View>
      </View>

      {hist && (
        <>
          <AppText className="mt-4 text-[11px] text-white/50">
            {`Stocks this ${label.toLowerCase()} have, over the following six months, historically:`}
          </AppText>
          <View className="mt-2 flex-row gap-2">
            <Tile label="Swung about" value={`${hist.future_vol_ann_pct.toFixed(0)}%`} note="a year" />
            <Tile label="Usual worst dip" value={`−${hist.median_max_drawdown_pct.toFixed(0)}%`} note="half were worse" />
            <Tile label="Rough-patch dip" value={`−${hist.p90_max_drawdown_pct.toFixed(0)}%`} note="1 in 10 were worse" />
          </View>
        </>
      )}

      <View className="mt-3 flex-row flex-wrap gap-x-3 gap-y-1">
        {row.sigma_63_ann_pct != null && (
          <AppText className="text-[10px] text-white/30">{`Its own swing: ${row.sigma_63_ann_pct.toFixed(0)}%/yr`}</AppText>
        )}
        {row.beta != null && <AppText className="text-[10px] text-white/30">{`Beta ${row.beta.toFixed(2)}`}</AppText>}
        {ago && <AppText className="text-[10px] text-white/30">{`Measured ${ago}`}</AppText>}
      </View>

      <AppText className="mt-2 text-[10px] leading-relaxed text-white/30">
        {`${res.calibration ? `Measured on ${res.calibration.n_observations.toLocaleString("en-US")} past checks across ${res.calibration.n_symbols} ${shortName} stocks. ` : ""}These are past outcomes for stocks that moved like this one — not a promise about this one, and nothing here says whether the price goes up or down.`}
      </AppText>
    </>
  );
}

/** A symbol that failed the tradeable gate: raw measurement, NO band. */
function Ungraded({ row }: { row: RiskRow }) {
  return (
    <View className="rounded-lg bg-white/[0.03] px-3 py-3">
      <AppText className="font-sans-medium text-[11px] text-white/60">Too thinly traded to grade</AppText>
      <AppText className="mt-1 text-[10px] leading-relaxed text-white/35">
        This stock does not trade often or heavily enough to compare fairly against the rest of the market, so it gets no grade rather than a misleading one. Thin stocks are also the hardest to sell when you want to.
      </AppText>
      {row.sigma_63_ann_pct != null && (
        <AppText className="mt-2 font-mono text-[11px] text-white/50">
          {`Its own recent swing: ${row.sigma_63_ann_pct.toFixed(0)}%/yr`}
        </AppText>
      )}
    </View>
  );
}

/**
 * `market`: a deep link's market, read without switching the app's; omitted,
 * the app's.
 *
 * Renders nothing on a market whose score is not calibrated
 * (`score_calibrated === false`, future markets): it has no fitted liquidity
 * floors, so no stock is tradeable and every one would read "too thinly
 * traded". Decided from the market's `score_calibrated` before any fetch; a
 * market the app's list does not describe yet falls through to the response's
 * null `liquidity_floor`. Copy names the STOCK's market (`short_name`), so a
 * deep-linked US stock reads "US stocks" while the app is on EG.
 */
export function RiskGradeCard({ symbol, market: linked }: { symbol: string; market?: MarketCode }) {
  const { market, markets } = useMarket();
  const dataMarket = linked ?? market.code;
  const info = dataMarket === market.code ? market : markets.find((m) => m.code === dataMarket);
  if (info?.score_calibrated === false) return null;
  return <RiskGrade symbol={symbol} market={dataMarket} shortName={info?.short_name ?? dataMarket} />;
}

function RiskGrade({ symbol, market: dataMarket, shortName }: { symbol: string; market: MarketCode; shortName: string }) {
  const { data: res, error, loading } = useKeyedFetch(`risk:${dataMarket}:${symbol}`, () =>
    fetchRisk(symbol, { market: dataMarket })
  );
  const now = useNow(60_000);

  // A 404 means "not measured yet" — normal while the snapshot walks the
  // universe, not an error worth a red box.
  if (error) return null;
  if (loading || !res) {
    return (
      <View testID="risk-skeleton" className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <View className="h-4 w-28 rounded bg-white/10" />
        <View className="mt-4 h-16 rounded bg-white/5" />
      </View>
    );
  }
  // Guard for a market list that has not named the stock's market yet: the
  // server reports a null floor for a market it cannot grade.
  if (res.liquidity_floor === null) return null;
  // Match on symbol, never position: an unfiltered response is sorted by rank.
  const wanted = symbol.trim().toUpperCase();
  const row = res.data?.find((r) => r.symbol === wanted);
  if (!row) return null;

  return (
    <View className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <View className="mb-3 flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <LearnTerm
            term="Risk grade"
            explanation={`Where this stock sits against every tradeable ${shortName} stock on how much it moves. Built from the last 63 days of price swings, which historically predicted the next six months' swings and drawdowns well. It says nothing about direction.`}
          >
            Risk grade
          </LearnTerm>
          <AppText className="mt-0.5 text-[11px] text-white/40">How much this moves — not which way.</AppText>
        </View>
        <Pressable accessibilityRole="link" onPress={() => router.push(learnHref("risk-management"))} className="min-h-[44px] justify-center">
          <AppText className="text-[11px] text-accent/70">Learn →</AppText>
        </Pressable>
      </View>
      {row.band ? <Graded row={row} res={res} band={row.band} now={now} shortName={shortName} /> : <Ungraded row={row} />}
    </View>
  );
}
