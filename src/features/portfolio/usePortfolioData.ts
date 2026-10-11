import { useCallback, useEffect, useRef, useState } from "react";
import {
  addHolding as apiAddHolding,
  deleteDividend as apiDeleteDividend,
  deleteHolding as apiDeleteHolding,
  deleteSale as apiDeleteSale,
  fetchPortfolio,
  fetchPortfolioAnalysis,
  fetchSales,
  recordDividend as apiRecordDividend,
  recordSale as apiRecordSale,
  updateHolding as apiUpdateHolding,
} from "@/shared/api";
import type { Portfolio, PortfolioAnalysisResponse, SalesResponse } from "@/shared/types";
import type { DividendPayload } from "./logic/dividend";
import { errorMessage } from "./logic/format";
import type { HoldingPayload } from "./logic/holdingForm";
import type { SaleSubmit, SellPosition } from "./logic/sale";

export interface PortfolioData {
  portfolio: Portfolio | null;
  portfolioLoading: boolean;
  analysis: PortfolioAnalysisResponse | null;
  analyzing: boolean;
  error: string | null;
  sales: SalesResponse | null;
  salesLoaded: boolean;
  salesError: string | null;
  analyze(): Promise<void>;
  loadSales(): Promise<void>;
  refresh(): Promise<void>;
  addHolding(payload: HoldingPayload): Promise<void>;
  updateHolding(id: string, payload: HoldingPayload): Promise<void>;
  recordSale(position: SellPosition, data: SaleSubmit): Promise<void>;
  recordDividend(payload: DividendPayload): Promise<void>;
  deleteHolding(id: string): Promise<void>;
  deleteSale(id: string): Promise<void>;
  deleteDividend(id: string): Promise<void>;
}

export function usePortfolioData(weightsVersion: number): PortfolioData {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(true);
  const [analysis, setAnalysis] = useState<PortfolioAnalysisResponse | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sales, setSales] = useState<SalesResponse | null>(null);
  const [salesLoaded, setSalesLoaded] = useState(false);
  const [salesError, setSalesError] = useState<string | null>(null);

  // Each loader numbers its requests; only the newest one may write state, so a
  // slow earlier response can never overwrite a newer one (or a mutation's reset).
  const portfolioSeq = useRef(0);
  const salesSeq = useRef(0);
  const analysisSeq = useRef(0);

  // The message of the last failed portfolio load, so a later successful load
  // clears exactly that error and not an analysis/delete error still on screen.
  const loadError = useRef<string | null>(null);

  /** Resolves true when this call's result was applied. */
  const loadPortfolio = useCallback(async () => {
    const seq = ++portfolioSeq.current;
    setPortfolioLoading(true);
    try {
      const p = await fetchPortfolio();
      if (seq !== portfolioSeq.current) return false;
      setPortfolio(p);
      const failed = loadError.current;
      loadError.current = null;
      if (failed !== null) setError((prev) => (prev === failed ? null : prev));
      return true;
    } catch (e) {
      if (seq === portfolioSeq.current) {
        loadError.current = errorMessage(e, "Could not load your portfolio");
        setError(loadError.current);
      }
      return false;
    } finally {
      if (seq === portfolioSeq.current) setPortfolioLoading(false);
    }
  }, []);

  // Separate from analysis: realized gains need no price fetch, and a sales
  // outage must not take the page down — it gets its own retry line.
  const loadSales = useCallback(async () => {
    const seq = ++salesSeq.current;
    try {
      const s = await fetchSales();
      if (seq !== salesSeq.current) return;
      setSales(s);
      setSalesError(null);
    } catch (e) {
      if (seq === salesSeq.current) setSalesError(errorMessage(e, "Could not load closed positions"));
    } finally {
      if (seq === salesSeq.current) setSalesLoaded(true);
    }
  }, []);

  const analyze = useCallback(async () => {
    const seq = ++analysisSeq.current;
    setAnalyzing(true);
    setError(null);
    try {
      const a = await fetchPortfolioAnalysis();
      if (seq !== analysisSeq.current) return;
      setAnalysis(a);
    } catch (e) {
      if (seq === analysisSeq.current) setError(errorMessage(e, "Could not analyse your portfolio"));
    } finally {
      if (seq === analysisSeq.current) setAnalyzing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch: the loader raises its loading flag before awaiting
    void loadPortfolio();
    void loadSales();
  }, [loadPortfolio, loadSales]);

  // Analyse whenever the analysis has been cleared (first load, or after a
  // mutation) and there is something to analyse.
  useEffect(() => {
    if (portfolio && portfolio.portfolio.length > 0 && analysis === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- re-analysis is triggered by the cleared analysis; the flag is raised before awaiting
      void analyze();
    }
  }, [portfolio, analysis, analyze]);

  // A mutation raises `analyzing` before the portfolio reloads. If it reloads
  // EMPTY (sold out) no analysis will run to lower it, so the flag is only
  // reported while there is something to analyse — otherwise a stuck spinner
  // and a dead refresh button are all the sold-out page would show. Derived
  // rather than reset inside an effect.
  const hasHoldings = (portfolio?.portfolio.length ?? 0) > 0;

  // New score weights => new scores. Skips the mount (handled above).
  const seenVersion = useRef(weightsVersion);
  useEffect(() => {
    if (seenVersion.current === weightsVersion) return;
    seenVersion.current = weightsVersion;
    if (portfolio && portfolio.portfolio.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- weights changed: re-analyse, flag raised before awaiting
      void analyze();
    }
  }, [weightsVersion, portfolio, analyze]);

  const refreshAfterMutation = useCallback(async () => {
    // The old analysis describes holdings that just changed: drop it, and
    // invalidate any in-flight analysis so it cannot put it back.
    const seq = ++analysisSeq.current;
    setAnalysis(null);
    setAnalyzing(true);
    const ok = await loadPortfolio();
    // A failed reload leaves `portfolio` unchanged, so the analysis effect may
    // never run to lower the flag; do it here unless a newer analysis owns it.
    if (!ok && seq === analysisSeq.current) setAnalyzing(false);
  }, [loadPortfolio]);

  // Pull-to-refresh: unlike a mutation the holdings are not known to be stale,
  // so the current analysis stays on screen while the new one loads. If the
  // analysis was already cleared (earlier failure), reloading the portfolio
  // lets the analysis effect run.
  const refresh = useCallback(async () => {
    if (analysis !== null) await Promise.all([loadPortfolio(), analyze(), loadSales()]);
    else await Promise.all([loadPortfolio(), loadSales()]);
  }, [analysis, analyze, loadPortfolio, loadSales]);

  const addHolding = useCallback(
    async (payload: HoldingPayload) => {
      await apiAddHolding(payload);
      await refreshAfterMutation();
    },
    [refreshAfterMutation],
  );

  const updateHolding = useCallback(
    async (id: string, payload: HoldingPayload) => {
      await apiUpdateHolding(id, payload);
      await refreshAfterMutation();
    },
    [refreshAfterMutation],
  );

  const recordSale = useCallback(
    async (position: SellPosition, data: SaleSubmit) => {
      await apiRecordSale({ holding_id: position.lots[0].id, ...data });
      await Promise.all([refreshAfterMutation(), loadSales()]);
    },
    [refreshAfterMutation, loadSales],
  );

  const recordDividend = useCallback(
    async (payload: DividendPayload) => {
      await apiRecordDividend(payload);
      await Promise.all([refreshAfterMutation(), loadSales()]);
    },
    [refreshAfterMutation, loadSales],
  );

  const deleteHolding = useCallback(
    async (id: string) => {
      try {
        await apiDeleteHolding(id);
        await refreshAfterMutation();
      } catch (e) {
        setError(errorMessage(e));
      }
    },
    [refreshAfterMutation],
  );

  const deleteSale = useCallback(
    async (id: string) => {
      try {
        await apiDeleteSale(id);
        await Promise.all([refreshAfterMutation(), loadSales()]);
      } catch (e) {
        setError(errorMessage(e));
      }
    },
    [refreshAfterMutation, loadSales],
  );

  const deleteDividend = useCallback(
    async (id: string) => {
      try {
        await apiDeleteDividend(id);
        await Promise.all([refreshAfterMutation(), loadSales()]);
      } catch (e) {
        setError(errorMessage(e));
      }
    },
    [refreshAfterMutation, loadSales],
  );

  return {
    portfolio, portfolioLoading, analysis, analyzing: analyzing && hasHoldings, error, sales, salesLoaded, salesError,
    analyze, loadSales, refresh, addHolding, updateHolding, recordSale, recordDividend,
    deleteHolding, deleteSale, deleteDividend,
  };
}
