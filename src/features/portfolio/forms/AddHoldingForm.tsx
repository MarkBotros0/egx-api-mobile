import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { FEW_LOCAL_MATCHES, useTickerSearch } from "@/features/market/hooks/useTickerSearch";
import { useMarket } from "@/providers/market";
import { validateTicker } from "@/shared/api";
import type { MarketCode } from "@/shared/markets";
import { TICKER_VALIDATION_DEBOUNCE_MS } from "@/shared/constants";
import type { Ticker } from "@/shared/types";
import { AppText, Button, DateField, TextField } from "@/ui";
import { todayIso } from "@/lib/dates";
import {
  buildHoldingPayload,
  filterTickers,
  findKnownTicker,
  initialTicker,
  type HoldingInitialValues,
  type HoldingPayload,
  type ResolvedTicker,
  type TickerValidation,
} from "@/features/portfolio/logic/holdingForm";
import { FormError } from "./FormError";
import { FormScroll } from "./FormScroll";
import { useSingleFlight } from "./useSingleFlight";

export interface AddHoldingFormProps {
  tickers: Ticker[];
  initialValues?: HoldingInitialValues;
  onSubmit: (payload: HoldingPayload) => Promise<void>;
  onCancel: () => void;
  error?: string | null;
  onDismissError?: () => void;
}

interface RemoteCheck {
  /** The symbol this answer is for — an answer for "ABU" never applies to "ABUK". */
  symbol: string;
  /** ...and the market: a symbol valid in EG says nothing about US. */
  market: MarketCode;
  state: "valid" | "invalid" | "error";
  name: string | null;
}

export function AddHoldingForm({ tickers, initialValues, onSubmit, onCancel, error = null, onDismissError }: AddHoldingFormProps) {
  const editing = Boolean(initialValues);
  const [search, setSearch] = useState(initialValues?.symbol ?? "");
  const [picked, setPicked] = useState<ResolvedTicker | null>(() => initialTicker(tickers, initialValues));
  const [remote, setRemote] = useState<RemoteCheck | null>(null);
  const [showList, setShowList] = useState(false);
  const [quantityText, setQuantityText] = useState(initialValues?.quantity?.toString() ?? "");
  const [priceText, setPriceText] = useState(initialValues?.buy_price?.toString() ?? "");
  const [buyDate, setBuyDate] = useState(initialValues?.buy_date ?? todayIso());
  const { run, pending: submitting } = useSingleFlight();
  const { market } = useMarket();

  const sym = search.trim().toUpperCase();
  const known = picked ? undefined : findKnownTicker(tickers, sym);
  const knownSymbol = known?.symbol ?? null;
  const answer = remote && remote.symbol === sym && remote.market === market.code ? remote : null;

  // Only an unknown, non-empty, un-picked symbol goes to the server.
  useEffect(() => {
    if (picked || !sym || knownSymbol) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const data = await validateTicker(sym);
        if (cancelled) return;
        const state = data.valid === true ? "valid" : data.valid === false ? "invalid" : "error";
        setRemote({ symbol: sym, market: market.code, state, name: data.name });
      } catch {
        // Network inconclusive: let the user proceed; analysis will fail gracefully.
        if (!cancelled) setRemote({ symbol: sym, market: market.code, state: "error", name: null });
      }
    }, TICKER_VALIDATION_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sym, picked, knownSymbol, market.code]);

  const validation: TickerValidation = picked
    ? "valid"
    : !sym
      ? "idle"
      : known
        ? "valid"
        : answer
          ? answer.state
          : "validating";

  const effective: ResolvedTicker | null =
    picked ??
    (known
      ? { symbol: known.symbol, name: known.name, sector: known.sector }
      : answer && answer.state !== "invalid"
        ? { symbol: sym, name: answer.name || sym, sector: "Unknown" }
        : null);

  const local = useMemo(() => filterTickers(tickers, search), [tickers, search]);
  // Off EG the ticker list is the index universe; a few local matches widen
  // to the market's whole listing (an ETF, a stock in no index).
  const remoteFound = useTickerSearch(search, showList && !picked && local.length < FEW_LOCAL_MATCHES);
  const suggestions = useMemo(() => {
    if (!remoteFound) return local;
    const seen = new Set(local.map((t) => t.symbol.toUpperCase()));
    const extra = remoteFound
      .filter((r) => !seen.has(r.symbol.toUpperCase()))
      .map((r) => ({ symbol: r.symbol, name: r.name, sector: r.sector }));
    return [...local, ...extra];
  }, [local, remoteFound]);
  const result = buildHoldingPayload({ ticker: effective, quantityText, priceText, buyDate, initial: initialValues });
  const errors = result.ok ? null : result.errors;
  const canSubmit = result.ok && validation !== "validating" && validation !== "invalid" && !submitting;

  const edited = () => {
    if (error) onDismissError?.();
  };

  const submit = () => {
    if (!result.ok || !canSubmit) return;
    return run(() => onSubmit(result.payload));
  };

  return (
    <FormScroll>
      <View>
        <TextField
          label="Stock Symbol *"
          value={search}
          onChangeText={(t) => {
            setSearch(t);
            setPicked(null);
            setShowList(true);
            edited();
          }}
          onFocus={() => setShowList(true)}
          placeholder="Search by symbol or name..."
          autoCapitalize="characters"
          autoCorrect={false}
          error={validation === "invalid" ? "Symbol not found on EGX — check and try again" : null}
        />
        {showList && !picked && suggestions.length > 0 && (
          <View className="mt-1 overflow-hidden rounded-lg border border-white/10 bg-charcoal">
            {suggestions.map((t) => (
              <Pressable
                key={t.symbol}
                accessibilityRole="button"
                onPress={() => {
                  setPicked({ symbol: t.symbol, name: t.name, sector: t.sector });
                  setSearch(t.symbol);
                  setShowList(false);
                  edited();
                }}
                className="min-h-[44px] flex-row items-center gap-3 px-3"
              >
                <AppText className="font-mono-semibold text-xs text-white">{t.symbol}</AppText>
                <AppText numberOfLines={1} className="flex-1 font-sans text-xs text-white/40">{t.name}</AppText>
                <AppText className="font-sans text-[10px] text-accent">{t.sector}</AppText>
              </Pressable>
            ))}
          </View>
        )}
        {validation === "validating" && (
          <View className="mt-1 flex-row items-center gap-2">
            <ActivityIndicator size="small" />
            <AppText className="font-sans text-[10px] text-white/40">Checking…</AppText>
          </View>
        )}
        {validation === "valid" && effective && (
          <AppText className="mt-1 font-sans text-[10px] text-white/60">
            {`${effective.name}${effective.sector !== "Unknown" ? ` — ${effective.sector}` : ""}`}
          </AppText>
        )}
        {validation === "error" && (
          <AppText className="mt-1 font-sans text-[10px] text-white/30">Could not verify — will attempt to load data anyway</AppText>
        )}
      </View>

      <TextField
        label="Quantity *"
        value={quantityText}
        onChangeText={(t) => {
          setQuantityText(t);
          edited();
        }}
        keyboardType="number-pad"
        placeholder="100"
        error={errors?.quantity ?? null}
      />
      <TextField
        label={`Buy Price (${market.currency}) *`}
        value={priceText}
        onChangeText={(t) => {
          setPriceText(t);
          edited();
        }}
        keyboardType="decimal-pad"
        placeholder="85.50"
        error={errors?.price ?? null}
      />
      <DateField
        label="Buy Date"
        value={buyDate}
        maximumDate={todayIso()}
        onChange={(d) => {
          setBuyDate(d);
          edited();
        }}
        error={errors?.date ?? null}
      />

      {!result.ok && validation !== "invalid" ? (
        <AppText className="text-xs text-white/40">Enter a symbol, quantity and buy price to add this holding</AppText>
      ) : null}

      <FormError message={error} />

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Button
            label={editing ? "Update" : "Add to Portfolio"}
            onPress={submit}
            disabled={!canSubmit}
            loading={submitting}
          />
        </View>
        <View className="flex-1">
          <Button label="Cancel" variant="secondary" onPress={onCancel} />
        </View>
      </View>
    </FormScroll>
  );
}
