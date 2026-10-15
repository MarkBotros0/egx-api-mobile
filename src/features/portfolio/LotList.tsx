import { Pressable, View } from "react-native";
import type { Position } from "@/shared/positions";
import { formatPrice } from "@/shared/money";
import { AppText } from "@/ui";
import { pnlTone, signed, signedPct } from "@/features/portfolio/logic/format";

/**
 * The purchases behind one position. Each keeps its own P&L and annualized
 * return — the figures a position cannot honestly merge — and its own Edit
 * and Delete, because a purchase is a fact about one day.
 */
export function LotList({
  position,
  currency,
  onEdit,
  onRequestDelete,
}: {
  position: Position;
  currency: string;
  onEdit: (id: string) => void;
  onRequestDelete: (lot: { id: string; symbol: string }) => void;
}) {
  if (position.lots.length < 2) return null;
  return (
    <View className="mt-3 border-t border-white/5 pt-3">
      <AppText className="font-sans text-[10px] uppercase tracking-wide text-white/30">
        {`${position.lots.length} purchases · average ${formatPrice(position.avg_buy_price, currency)}`}
      </AppText>
      <View className="mt-2 gap-2">
        {position.lots.map((lot) => (
          <View
            key={lot.id ?? lot.buy_date}
            className="flex-row items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-1"
          >
            <View className="min-w-0 flex-1">
              <AppText className="font-mono text-xs text-white/80">{`${lot.quantity} × ${lot.buy_price.toFixed(2)}`}</AppText>
              <AppText className="font-sans text-[10px] text-white/30">
                {lot.buy_date}
                {lot.error ? " · no price data" : ` · ${lot.days_held}d`}
              </AppText>
            </View>
            {!lot.error && (
              <View className="items-end">
                <AppText className={`font-mono text-xs ${pnlTone(lot.pnl)}`}>
                  {`${signed(lot.pnl)} (${signedPct(lot.pnl_pct)})`}
                </AppText>
                {lot.annualized_return != null && (
                  <AppText className="font-sans text-[10px] text-white/30">
                    {`${lot.annualized_return.toFixed(0)}% annualized`}
                  </AppText>
                )}
              </View>
            )}
            <View className="flex-row">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Edit purchase of ${lot.buy_date}`}
                onPress={() => lot.id && onEdit(lot.id)}
                className="min-h-[44px] min-w-[44px] items-center justify-center"
              >
                <AppText className="font-sans text-xs text-accent">Change</AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Delete purchase of ${lot.buy_date}`}
                onPress={() => lot.id && onRequestDelete({ id: lot.id, symbol: lot.symbol })}
                className="min-h-[44px] min-w-[44px] items-center justify-center"
              >
                <AppText className="font-sans text-xs text-loss">Del</AppText>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
