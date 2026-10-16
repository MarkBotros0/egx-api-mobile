import { Ionicons } from "@expo/vector-icons";
import { useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useMarket } from "@/providers/market";
import type { Market } from "@/shared/markets";
import type { Dividend, SaleOrder, SalesSummary } from "@/shared/types";
import { AppText, Button, Card, LearnTerm, Pill, SegmentedControl, confirm } from "@/ui";
import { formatMoney, formatPrice } from "@/shared/money";
import { egp, pnlTone, signed } from "./logic/format";
import {
  companyName,
  heldLine,
  initialRealizedTab,
  removeDividendMessage,
  tBillLine,
  undoSaleMessage,
  type RealizedTab,
} from "./logic/realized";

export interface RealizedSectionProps {
  summary: SalesSummary;
  orders: SaleOrder[];
  dividends: Dividend[];
  riskFreeRatePct: number;
  /** The market's currency code, from the sales response. */
  currency: string;
  onDeleteSale: (id: string) => void;
  onDeleteDividend: (id: string) => void;
}

function SymbolLine({ symbol, name, extra }: { symbol: string; name: string; extra?: string }) {
  const company = companyName(symbol, name);
  return (
    <View className="flex-row items-center gap-2">
      <AppText className="font-mono-semibold text-sm text-white">{symbol}</AppText>
      {company ? (
        <AppText numberOfLines={1} className="flex-shrink font-sans text-xs text-white/40">{company}</AppText>
      ) : null}
      {extra ? <Pill label={extra} tone="neutral" /> : null}
    </View>
  );
}

function SupportTile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="mb-3 w-1/2 pr-2">
      <View className="rounded-lg bg-white/5 p-3">
        <AppText className="font-sans text-[10px] uppercase tracking-wide text-white/30">{label}</AppText>
        {children}
      </View>
    </View>
  );
}

function OrderRow({ order: o, currency, onUndo }: { order: SaleOrder; currency: string; onUndo: (o: SaleOrder) => void }) {
  const [open, setOpen] = useState(false);
  const { market } = useMarket();
  const line = tBillLine(o, market.code);
  return (
    <View className="rounded-lg bg-white/5 p-3">
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <SymbolLine symbol={o.symbol} name={o.name} extra={o.lots_count > 1 ? `${o.lots_count} lots` : undefined} />
          <AppText className="mt-0.5 font-sans text-[10px] text-white/30">
            {`${o.quantity} shares sold @ ${formatPrice(o.sell_price, currency)} · ${o.sell_date}`}
          </AppText>
          <AppText className="mt-0.5 font-sans text-[10px] text-white/30">{heldLine(o)}</AppText>
          {line ? <AppText className="mt-0.5 font-sans text-[10px] text-white/40">{line}</AppText> : null}
        </View>
        <View className="items-end">
          <AppText className={`font-mono-semibold text-sm ${pnlTone(o.realized_pnl)}`}>{signed(o.realized_pnl)}</AppText>
          {o.realized_pnl_pct !== null ? (
            <AppText className="font-sans text-[10px] text-white/30">{`${signed(o.realized_pnl_pct, 1)}%`}</AppText>
          ) : null}
        </View>
      </View>

      {open && o.lots_count > 1 && (
        <View className="mt-2 gap-1.5 border-t border-white/5 pt-2">
          <AppText className="font-sans text-[10px] uppercase tracking-wide text-white/30">
            {`${o.lots_count} purchases sold, oldest first`}
          </AppText>
          {o.lots.map((lot) => (
            <View key={lot.id} className="flex-row items-center justify-between gap-3">
              <AppText className="font-sans text-[11px] text-white/50">
                {`${lot.quantity} bought ${lot.buy_date} @ ${lot.buy_price.toFixed(2)}`}
              </AppText>
              <AppText className={`font-mono text-[11px] ${pnlTone(lot.realized_pnl)}`}>
                {signed(lot.realized_pnl)}
                {lot.annualized_return_pct !== null ? `  ${signed(lot.annualized_return_pct, 1)}%/yr` : ""}
              </AppText>
            </View>
          ))}
        </View>
      )}

      <View className="mt-2 flex-row gap-2">
        {o.lots_count > 1 ? (
          <View className="flex-1">
            <Button label={open ? "Hide purchases" : "Show purchases"} variant="ghost" onPress={() => setOpen((v) => !v)} />
          </View>
        ) : null}
        <View className="flex-1">
          <Button label="Undo this sale" variant="secondary" onPress={() => onUndo(o)} />
        </View>
      </View>
    </View>
  );
}

/** The hurdle closed trades are graded against; "highest of any major market" is an EG fact. */
export function versusCashExplanation(market: Market, riskFreeRatePct: number): string {
  const rate =
    market.code === "EG"
      ? `Egypt's T-bill rate is about ${riskFreeRatePct.toFixed(0)}% — the highest risk-free rate of any major market.`
      : `Trades are graded against the ${market.short_name} 3-month T-bill (~${riskFreeRatePct.toFixed(1)}%).`;
  return `${rate} A gain that took years to earn can still be worth less than leaving the money in T-bills over the same period. Trades held under 30 days are excluded, because annualizing a few days of return produces nonsense.`;
}

export function RealizedSection({
  summary, orders, dividends, riskFreeRatePct, currency, onDeleteSale, onDeleteDividend,
}: RealizedSectionProps) {
  const { market } = useMarket();
  const money = (v: number) => formatMoney(v, currency, { digits: 0 });
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<RealizedTab>(initialRealizedTab(orders, dividends));

  if (!orders.length && !dividends.length) {
    return (
      <Card>
        <AppText className="text-center font-sans text-sm text-white/40">Nothing banked yet</AppText>
        <AppText className="mt-1 text-center font-sans text-xs text-white/30">
          Sell a holding or record a dividend and it will be tracked here.
        </AppText>
      </Card>
    );
  }

  const dividendTotal = dividends.reduce((n, d) => n + d.amount, 0);

  const undo = async (o: SaleOrder) => {
    const ok = await confirm({
      title: "Undo this sale?",
      message: undoSaleMessage(o.symbol, o.lots_count),
      confirmLabel: "Undo",
      destructive: true,
    });
    if (ok) onDeleteSale(o.id);
  };

  const removeDividend = async (d: Dividend) => {
    const ok = await confirm({
      title: "Remove this dividend?",
      message: removeDividendMessage(d.symbol),
      confirmLabel: "Remove",
      destructive: true,
    });
    if (ok) onDeleteDividend(d.id);
  };

  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        className="min-h-[44px] flex-row items-center justify-between gap-3"
      >
        <View className="min-w-0 flex-1">
          <AppText className="font-sans-medium text-sm text-white/70">Realized Winnings</AppText>
          <AppText className={`mt-1 font-mono-semibold text-3xl ${pnlTone(summary.total_winnings)}`}>
            {`${summary.total_winnings >= 0 ? "+" : ""}${money(summary.total_winnings)}`}
          </AppText>
          {summary.total_dividends > 0 && (
            <AppText className="mt-1 font-mono text-xs text-white/50">
              {`${signed(summary.total_realized_pnl)} from sales · `}
              <AppText className="font-mono text-xs text-white">{egp(summary.total_dividends)}</AppText>
              {` in dividends (${summary.dividend_count})`}
            </AppText>
          )}
        </View>
        <Ionicons
          name="chevron-down"
          size={20}
          color="rgba(255,255,255,0.3)"
          style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}
        />
      </Pressable>

      {open && (
        <View className="mt-4">
          {summary.total_realized_pnl_pct !== null && (
            <AppText className="mb-4 font-sans text-sm text-white/40">
              {`${signed(summary.total_realized_pnl_pct, 2)}% on ${money(summary.total_cost)} invested in closed trades`}
            </AppText>
          )}

          <View className="flex-row flex-wrap">
            <SupportTile label="Record">
              <AppText className="mt-1 font-mono text-sm text-white">
                <AppText className="font-mono text-sm text-gain">{`${summary.win_count}W`}</AppText>
                {" / "}
                <AppText className="font-mono text-sm text-loss">{`${summary.loss_count}L`}</AppText>
              </AppText>
            </SupportTile>
            <SupportTile label="Proceeds">
              <AppText className="mt-1 font-mono text-sm text-white">{egp(summary.total_proceeds)}</AppText>
            </SupportTile>
            {summary.best_trade && (
              <SupportTile label="Best">
                <AppText className="mt-1 font-mono text-sm text-gain">
                  {`${summary.best_trade.symbol} ${signed(summary.best_trade.realized_pnl)}`}
                </AppText>
              </SupportTile>
            )}
            {summary.worst_trade && summary.worst_trade.id !== summary.best_trade?.id && (
              <SupportTile label="Worst">
                <AppText className="mt-1 font-mono text-sm text-loss">
                  {`${summary.worst_trade.symbol} ${signed(summary.worst_trade.realized_pnl)}`}
                </AppText>
              </SupportTile>
            )}
          </View>

          {/* A count, never an average: annualized returns over different windows cannot be averaged. */}
          {summary.annualizable_count > 0 && (
            <View className="mb-4 flex-row flex-wrap items-center">
              <LearnTerm
                term="Versus risk-free cash"
                explanation={versusCashExplanation(market, riskFreeRatePct)}
              >
                <AppText className="font-sans text-xs text-white/40">{`${summary.beat_t_bill_count} of ${summary.annualizable_count}`}</AppText>
              </LearnTerm>
              <AppText className="font-sans text-xs text-white/40"> closed trades beat the T-bill over the period you held them.</AppText>
            </View>
          )}

          <SegmentedControl<RealizedTab>
            options={[
              { value: "sales", label: `Closed ${orders.length}` },
              { value: "dividends", label: `Dividends ${dividends.length}` },
              { value: "by_symbol", label: "By stock" },
            ]}
            value={tab}
            onChange={setTab}
          />

          <View className="mt-4 gap-2">
            {tab === "sales" &&
              (orders.length ? (
                orders.map((o) => <OrderRow key={o.id} order={o} currency={currency} onUndo={undo} />)
              ) : (
                <AppText className="py-4 text-center font-sans text-xs text-white/30">No sales recorded yet.</AppText>
              ))}

            {tab === "dividends" &&
              (dividends.length ? (
                <>
                  <AppText className="font-sans text-[10px] text-white/30">
                    {`${dividends.length} payment${dividends.length === 1 ? "" : "s"} · ${money(dividendTotal)} received`}
                  </AppText>
                  {dividends.map((d) => (
                    <View key={d.id} className="rounded-lg bg-white/5 p-3">
                      <View className="flex-row items-start justify-between gap-3">
                        <View className="min-w-0 flex-1">
                          <SymbolLine symbol={d.symbol} name={d.name} />
                          <AppText className="mt-0.5 font-sans text-[10px] text-white/30">
                            {`Paid ${d.pay_date}${d.amount_per_share !== null ? ` · ${formatPrice(d.amount_per_share, currency)}/share` : ""}`}
                          </AppText>
                          {d.notes ? (
                            <AppText numberOfLines={1} className="mt-1 font-sans text-[10px] text-white/30">{d.notes}</AppText>
                          ) : null}
                        </View>
                        {/* Neutral: a dividend amount carries no direction. */}
                        <AppText className="font-mono-semibold text-sm text-white">{egp(d.amount)}</AppText>
                      </View>
                      <View className="mt-2">
                        <Button label="Remove" variant="ghost" onPress={() => removeDividend(d)} />
                      </View>
                    </View>
                  ))}
                </>
              ) : (
                <AppText className="py-4 text-center font-sans text-xs text-white/30">No dividends recorded yet.</AppText>
              ))}

            {tab === "by_symbol" &&
              summary.by_symbol.map((s) => (
                <View key={s.symbol} className="flex-row items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2.5">
                  <View className="min-w-0 flex-1">
                    <SymbolLine symbol={s.symbol} name={s.name} />
                    <AppText numberOfLines={1} className="font-sans text-[10px] text-white/30">
                      {s.sales_count === 0
                        ? "Dividends only — not sold"
                        : `${s.quantity} shares · ${s.sales_count} ${s.sales_count === 1 ? "sale" : "sales"}`}
                    </AppText>
                  </View>
                  <View className="items-end">
                    <AppText className={`font-mono-semibold text-sm ${pnlTone(s.total_winnings)}`}>{signed(s.total_winnings)}</AppText>
                    {s.dividends > 0 ? (
                      <AppText className="font-sans text-[10px] text-white/40">{`incl. ${egp(s.dividends)} dividends`}</AppText>
                    ) : s.realized_pnl_pct !== null ? (
                      <AppText className="font-sans text-[10px] text-white/30">{`${signed(s.realized_pnl_pct, 1)}%`}</AppText>
                    ) : null}
                  </View>
                </View>
              ))}
          </View>
        </View>
      )}
    </Card>
  );
}
