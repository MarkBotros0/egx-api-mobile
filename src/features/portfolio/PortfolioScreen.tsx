import { useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { CorrelationHeatmap, MonteCarloChart } from "@/charts";
import { useScoreWeights } from "@/providers/scoreWeights";
import { useTickers } from "@/providers/tickers";
import type { HoldingAnalysis } from "@/shared/types";
import {
  AppText, Button, Card, ChartSkeleton, EmptyState, ErrorState, IconButton, Screen, Sheet, TableSkeleton,
} from "@/ui";
import { AddFab, useFabBottom } from "./AddFab";
import { AdvicePanel } from "./AdvicePanel";
import { HoldingsList } from "./HoldingsList";
import { MacroCard } from "./MacroCard";
import { PEFreshnessBanner } from "./PEFreshnessBanner";
import { PortfolioSummary } from "./PortfolioSummary";
import { RealizedSection } from "./RealizedSection";
import { RiskDashboard } from "./RiskDashboard";
import { AddDividendForm } from "./forms/AddDividendForm";
import { AddHoldingForm } from "./forms/AddHoldingForm";
import { SellHoldingForm } from "./forms/SellHoldingForm";
import { dividendSymbolOptions, type DividendPayload } from "./logic/dividend";
import { errorMessage } from "./logic/format";
import type { HoldingPayload } from "./logic/holdingForm";
import { contentSpacer, portfolioView } from "./logic/layout";
import { sellPositionFor, type SaleSubmit } from "./logic/sale";
import { usePortfolioData } from "./usePortfolioData";

export function PortfolioScreen() {
  const { tickers } = useTickers();
  const { version } = useScoreWeights();
  const data = usePortfolioData(version);

  const sceneRef = useRef<View>(null);
  const [sceneBottom, setSceneBottom] = useState<number | null>(null);
  const fabBottom = useFabBottom(sceneBottom);

  // null = closed; { editingId: null } = add; { editingId } = edit that lot.
  const [holdingSheet, setHoldingSheet] = useState<{ editingId: string | null } | null>(null);
  const [holdingError, setHoldingError] = useState<string | null>(null);
  const [sellingSymbol, setSellingSymbol] = useState<string | null>(null);
  const [sellError, setSellError] = useState<string | null>(null);
  // null = closed; "" = general entry (first symbol); "COMI" = preset.
  const [dividendFor, setDividendFor] = useState<string | null>(null);
  const [dividendError, setDividendError] = useState<string | null>(null);
  const [pulling, setPulling] = useState(false);

  const rows = data.portfolio?.portfolio;
  // The sell sheet's visibility and its form both come from THIS value.
  const sellingPosition = useMemo(() => sellPositionFor(rows, sellingSymbol), [rows, sellingSymbol]);
  const dividendSymbols = useMemo(() => dividendSymbolOptions(data.sales?.sales, rows), [data.sales, rows]);
  const editing = holdingSheet?.editingId ? rows?.find((h) => h.id === holdingSheet.editingId) ?? null : null;
  const view = portfolioView(data);
  const busy = data.analyzing || data.portfolioLoading;

  const openAdd = () => {
    setHoldingError(null);
    setHoldingSheet({ editingId: null });
  };
  const openEdit = (id: string) => {
    setHoldingError(null);
    setHoldingSheet({ editingId: id });
  };
  const openSell = (symbol: string) => {
    setSellError(null);
    setSellingSymbol(symbol);
  };
  const openDividend = (symbol: string) => {
    setDividendError(null);
    setDividendFor(symbol);
  };

  const submitHolding = async (payload: HoldingPayload) => {
    try {
      setHoldingError(null);
      if (holdingSheet?.editingId) await data.updateHolding(holdingSheet.editingId, payload);
      else await data.addHolding(payload);
      setHoldingSheet(null);
    } catch (e) {
      setHoldingError(errorMessage(e));
    }
  };

  const submitSale = async (sale: SaleSubmit) => {
    if (!sellingPosition) return;
    try {
      setSellError(null);
      await data.recordSale(sellingPosition, sale);
      setSellingSymbol(null);
    } catch (e) {
      setSellError(errorMessage(e));
    }
  };

  const submitDividend = async (payload: DividendPayload) => {
    try {
      setDividendError(null);
      await data.recordDividend(payload);
      setDividendFor(null);
    } catch (e) {
      // The 409 duplicate message lands here, inside the open sheet.
      setDividendError(errorMessage(e));
    }
  };

  const onPull = async () => {
    setPulling(true);
    try {
      await data.refresh();
    } finally {
      setPulling(false);
    }
  };

  const realized = data.sales ? (
    <RealizedSection
      summary={data.sales.summary}
      orders={data.sales.orders ?? []}
      dividends={data.sales.dividends ?? []}
      riskFreeRatePct={data.sales.risk_free_rate_pct}
      onDeleteSale={data.deleteSale}
      onDeleteDividend={data.deleteDividend}
    />
  ) : null;

  const a = data.analysis;
  const holdingCount = rows?.length ?? 0;

  return (
    <View
      ref={sceneRef}
      style={{ flex: 1 }}
      onLayout={() => sceneRef.current?.measureInWindow((_x, y, _w, h) => setSceneBottom(y + h))}
    >
      <Screen scroll edges={["top"]} refreshing={pulling} onRefresh={onPull} contentClassName="gap-6 px-4 pt-4">
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <AppText variant="title" className="font-sans-bold text-xl text-white">My Portfolio</AppText>
            <AppText className="mt-1 font-sans text-xs text-white/40">Track your holdings and get educational insights.</AppText>
          </View>
          <View className="flex-row gap-2">
            {dividendSymbols.length > 0 && (
              <IconButton icon="cash-outline" accessibilityLabel="Record a dividend" onPress={() => openDividend("")} />
            )}
            <IconButton
              icon="refresh"
              accessibilityLabel="Refresh analysis"
              onPress={() => {
                if (!busy) void data.refresh();
              }}
            />
          </View>
        </View>

        {data.error && <ErrorState message={data.error} onRetry={() => void data.analyze()} />}

        {data.salesError && (
          <View className="flex-row flex-wrap items-center gap-2 rounded-xl border border-loss/20 bg-loss/5 px-4 py-2">
            <AppText className="flex-1 font-sans text-xs text-loss">Couldn&apos;t load your closed positions.</AppText>
            <Button label="Retry" variant="ghost" onPress={() => void data.loadSales()} />
          </View>
        )}

        {view === "loading" && (
          <>
            <ChartSkeleton height={192} />
            <TableSkeleton rows={4} />
          </>
        )}

        {view === "empty" && (
          <View className="gap-4">
            <EmptyState
              title="No holdings yet"
              body="Add your first stock to start tracking your portfolio performance and getting educational insights."
            />
            <Button label="Add Your First Stock" onPress={openAdd} />
          </View>
        )}

        {view === "sold_out" && (
          <>
            {realized}
            <Card>
              <AppText className="text-center font-sans text-sm text-white/40">You have no open positions.</AppText>
              <View className="mt-3 gap-3">
                <Button label="Add a Stock" onPress={openAdd} />
                {/* A dividend on a stock sold last month has nowhere else to go. */}
                {dividendSymbols.length > 0 && (
                  <Button label="Record a Dividend" variant="secondary" onPress={() => openDividend("")} />
                )}
              </View>
            </Card>
          </>
        )}

        {view === "holdings" && (
          <>
            <PEFreshnessBanner />
            {a ? <PortfolioSummary metrics={a.portfolio_metrics} /> : !data.error && <ChartSkeleton height={192} />}
            {a ? (
              <HoldingsList
                holdings={a.holdings}
                onEdit={openEdit}
                onDelete={(id) => void data.deleteHolding(id)}
                onSell={openSell}
                onAddDividend={(h: HoldingAnalysis) => openDividend(h.symbol)}
              />
            ) : (
              !data.error && <TableSkeleton rows={Math.min(holdingCount, 6)} />
            )}
            {data.sales && (data.sales.sales.length > 0 || (data.sales.dividends ?? []).length > 0) && realized}
            {a && a.signals.length > 0 && <AdvicePanel signals={a.signals} />}
            {a?.portfolio_metrics.sharpe_ratio != null && <RiskDashboard metrics={a.portfolio_metrics} />}
            {a?.correlation_matrix && a.correlation_matrix.symbols.length >= 2 && (
              <CorrelationHeatmap data={a.correlation_matrix} />
            )}
            {a?.monte_carlo && <MonteCarloChart data={a.monte_carlo} />}
            {a?.macro && <MacroCard data={a.macro} />}
            {data.analyzing && a && (
              <AppText className="text-center font-sans text-xs text-white/30">Refreshing analysis...</AppText>
            )}
          </>
        )}

        <View style={{ height: contentSpacer(fabBottom) }} />
      </Screen>

      <AddFab bottom={fabBottom} onPress={openAdd} />

      <Sheet
        visible={holdingSheet !== null}
        onClose={() => setHoldingSheet(null)}
        title={holdingSheet?.editingId ? "Edit Holding" : "Add Stock"}
      >
        {holdingSheet && (
          <AddHoldingForm
            key={holdingSheet.editingId ?? "new"}
            tickers={tickers}
            initialValues={
              editing
                ? {
                    symbol: editing.symbol, name: editing.name, sector: editing.sector,
                    buy_price: editing.buy_price, buy_date: editing.buy_date, quantity: editing.quantity,
                    target_price: editing.target_price, stop_loss: editing.stop_loss, notes: editing.notes,
                  }
                : undefined
            }
            onSubmit={submitHolding}
            onCancel={() => setHoldingSheet(null)}
            error={holdingError}
            onDismissError={() => setHoldingError(null)}
          />
        )}
      </Sheet>

      <Sheet
        visible={sellingPosition !== null}
        onClose={() => setSellingSymbol(null)}
        title={sellingPosition ? `Sell ${sellingPosition.symbol}` : undefined}
      >
        {sellingPosition && (
          <SellHoldingForm
            key={sellingPosition.symbol}
            position={sellingPosition}
            onSubmit={submitSale}
            onCancel={() => setSellingSymbol(null)}
            error={sellError}
            onDismissError={() => setSellError(null)}
          />
        )}
      </Sheet>

      <Sheet visible={dividendFor !== null} onClose={() => setDividendFor(null)} title="Record a dividend">
        {dividendFor !== null && (
          <AddDividendForm
            key={dividendFor || "general"}
            symbols={dividendSymbols}
            presetSymbol={dividendFor || undefined}
            onSubmit={submitDividend}
            onCancel={() => setDividendFor(null)}
            error={dividendError}
            onDismissError={() => setDividendError(null)}
          />
        )}
      </Sheet>
    </View>
  );
}
