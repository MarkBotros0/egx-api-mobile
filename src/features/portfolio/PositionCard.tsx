import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { CompositeGauge } from "@/charts";
import { peColor } from "@/shared/constants";
import type { Position } from "@/shared/positions";
import type { HoldingAnalysis } from "@/shared/types";
import { AppText, Button, Card } from "@/ui";
import { LotList } from "./LotList";
import { ZoneBadge, ZoneDetail } from "./ZoneBadge";
import { egp, fmtExDate, pnlTone, signed, signedPct } from "@/features/portfolio/logic/format";

export interface PositionCardProps {
  position: Position;
  expanded: boolean;
  onToggle: () => void;
  onEdit: (id: string) => void;
  onRequestDelete: (lot: { id: string; symbol: string }) => void;
  onSell: (symbol: string) => void;
  onAddDividend: (holding: HoldingAnalysis) => void;
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="mb-3 w-1/2 pr-2">
      <AppText className="font-sans text-xs text-white/40">{label}</AppText>
      {children}
    </View>
  );
}

const mono = (text: string, tone = "text-white/70") => <AppText className={`font-mono text-xs ${tone}`}>{text}</AppText>;

export function PositionCard({ position: h, expanded, onToggle, onEdit, onRequestDelete, onSell, onAddDividend }: PositionCardProps) {
  // A position whose price feed is down must stay sellable — recording a sale
  // or a dividend needs no price.
  if (h.error) {
    const errorLot = h.lots.length === 1 ? h.lots[0] : null;
    return (
      <Card>
        <AppText className="font-mono-semibold text-xs text-white">{h.symbol}</AppText>
        <AppText className="mt-1 font-sans text-xs text-loss">{h.error}</AppText>
        {/* Several lots: per-lot Edit/Delete. One lot: the same pair as the priced card. */}
        <LotList position={h} onEdit={onEdit} onRequestDelete={onRequestDelete} />
        <View className="mt-3 flex-row flex-wrap gap-2 border-t border-white/5 pt-3">
          {errorLot?.id ? (
            <View className="min-w-[70px] flex-1"><Button label="Edit" variant="secondary" onPress={() => onEdit(errorLot.id as string)} /></View>
          ) : null}
          <View className="min-w-[70px] flex-1"><Button label="Sell" variant="secondary" onPress={() => onSell(h.symbol)} /></View>
          <View className="min-w-[70px] flex-1"><Button label="Dividend" variant="ghost" onPress={() => onAddDividend(h)} /></View>
          {errorLot?.id ? (
            <View className="min-w-[70px] flex-1">
              <Button label="Delete" variant="danger" onPress={() => onRequestDelete({ id: errorLot.id as string, symbol: h.symbol })} />
            </View>
          ) : null}
        </View>
      </Card>
    );
  }

  const multi = h.lots.length > 1;
  const tone = pnlTone(h.pnl);
  const single = h.lots.length === 1 ? h.lots[0] : null;

  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityHint="Shows details and actions"
        onPress={onToggle}
        className="min-h-[44px] flex-row items-center gap-3"
      >
        {h.composite_score != null && (
          <CompositeGauge score={h.composite_score} signal={h.composite_signal ?? null} size="sm" />
        )}
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-2">
            <AppText className="font-mono-semibold text-sm text-white">{h.symbol}</AppText>
            <AppText numberOfLines={1} className="flex-1 font-sans text-xs text-white/30">{h.name}</AppText>
          </View>
          <View className="mt-1.5 flex-row items-baseline gap-2">
            <AppText className="font-sans text-xs text-white/50">
              {`${h.quantity} x ${h.avg_buy_price.toFixed(2)}`}
              {multi ? <AppText className="font-sans text-xs text-white/30"> avg</AppText> : null}
            </AppText>
            <AppText className="font-sans text-xs text-white/30">=</AppText>
            <AppText className="font-mono text-xs text-white">{`${egp(h.current_value)} EGP`}</AppText>
          </View>
          {h.buy_date ? (
            <AppText className="mt-0.5 font-sans text-[10px] text-white/30">
              {multi ? `First bought ${h.buy_date}` : `Lot from ${h.buy_date}`}
            </AppText>
          ) : null}
          <View className="mt-1.5 flex-row">
            <ZoneBadge entryExit={h.entry_exit} />
          </View>
        </View>
        <View className="items-end">
          <AppText className={`font-mono-semibold text-sm ${tone}`}>{signed(h.pnl)}</AppText>
          <AppText className={`font-mono text-xs ${tone}`}>{signedPct(h.pnl_pct)}</AppText>
        </View>
      </Pressable>

      {expanded && (
        <View className="mt-3 border-t border-white/5 pt-3">
          <View className="flex-row flex-wrap">
            {h.composite_score != null && (
              <Stat label="Score">
                <View className="mt-0.5 flex-row items-center gap-1.5">
                  <CompositeGauge score={h.composite_score} signal={h.composite_signal ?? null} size="sm" />
                  {mono(h.composite_signal ?? "--")}
                </View>
              </Stat>
            )}
            <Stat label="Current Price">{mono(h.current_price.toFixed(2), "text-white")}</Stat>
            <Stat label="Days Held">{mono(String(h.days_held))}</Stat>
            {/* Never aggregated across lots: different windows describe neither. */}
            <Stat label="Annualized">
              {multi
                ? mono("per lot", "text-white/40")
                : mono(single?.annualized_return != null ? signedPct(single.annualized_return) : "--")}
            </Stat>
            <Stat label="RSI">
              {mono(
                h.rsi != null ? h.rsi.toFixed(0) : "--",
                h.rsi == null ? "text-white/30" : h.rsi > 70 ? "text-loss" : h.rsi < 30 ? "text-gain" : "text-white/60",
              )}
            </Stat>
            <Stat label="vs SMA 50">
              {mono(
                h.above_sma == null ? "--" : h.above_sma ? "Above" : "Below",
                h.above_sma == null ? "text-white/30" : h.above_sma ? "text-gain" : "text-loss",
              )}
            </Stat>
            <Stat label="Volatility">{mono(h.volatility != null ? `${(h.volatility * 100).toFixed(2)}%` : "--")}</Stat>
            <Stat label="Volume Trend">{mono(h.volume_trend)}</Stat>
            {h.pe?.pe_ratio != null && (
              <Stat label="P/E">{mono(h.pe.pe_ratio.toFixed(1), peColor(h.pe.pe_ratio) ?? "text-white/60")}</Stat>
            )}
            {h.target_price != null && (
              <Stat label="To Target">
                {mono(`${h.dist_to_target != null ? `${h.dist_to_target.toFixed(1)}%` : "--"} (${h.target_price.toFixed(2)})`, "text-accent")}
              </Stat>
            )}
            {h.stop_loss != null && (
              <Stat label="To Stop Loss">
                {mono(`${h.dist_to_stop != null ? `${h.dist_to_stop.toFixed(1)}%` : "--"} (${h.stop_loss.toFixed(2)})`, "text-loss")}
              </Stat>
            )}
            {h.key_levels?.nearest_support && (
              <Stat label="Nearest Support">{mono(h.key_levels.nearest_support.price.toFixed(2), "text-gain")}</Stat>
            )}
            {h.key_levels?.nearest_resistance && (
              <Stat label="Nearest Resistance">{mono(h.key_levels.nearest_resistance.price.toFixed(2), "text-loss")}</Stat>
            )}
            {/* Dividend amounts carry no direction: neutral, per the roadmap. */}
            {(h.dividends_collected ?? 0) > 0 && (
              <Stat label="Dividends collected">{mono(`${egp(h.dividends_collected ?? 0)} EGP`, "text-white")}</Stat>
            )}
            {h.last_dividend_amount != null && h.last_dividend_ex_date ? (
              <Stat label="Last market dividend">
                {mono(`${h.last_dividend_amount.toFixed(2)} EGP · ${fmtExDate(h.last_dividend_ex_date)}`, "text-white/80")}
              </Stat>
            ) : null}
          </View>

          <LotList position={h} onEdit={onEdit} onRequestDelete={onRequestDelete} />
          <ZoneDetail entryExit={h.entry_exit} />

          <View className="mt-3 flex-row flex-wrap gap-2 border-t border-white/5 pt-3">
            {single?.id ? (
              <View className="min-w-[70px] flex-1"><Button label="Edit" variant="secondary" onPress={() => onEdit(single.id as string)} /></View>
            ) : null}
            <View className="min-w-[70px] flex-1"><Button label="Sell" variant="secondary" onPress={() => onSell(h.symbol)} /></View>
            <View className="min-w-[70px] flex-1"><Button label="Dividend" variant="ghost" onPress={() => onAddDividend(h)} /></View>
            {single?.id ? (
              <View className="min-w-[70px] flex-1">
                <Button label="Delete" variant="danger" onPress={() => onRequestDelete({ id: single.id as string, symbol: h.symbol })} />
              </View>
            ) : null}
          </View>
        </View>
      )}
    </Card>
  );
}
