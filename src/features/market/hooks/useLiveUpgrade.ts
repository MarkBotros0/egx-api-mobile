import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { fetchCompositeBatch } from "@/shared/api";
import { COMPOSITE_MAX_ATTEMPTS, COMPOSITE_RETRY_DELAY_MS } from "@/shared/constants";
import {
  applyBatchChunk,
  demoteLive,
  retryableSymbols,
  upgradeCandidates,
  type CardMap,
} from "../logic/cards";
import type { CompositeInterval } from "../logic/dashboardFilters";

interface LiveUpgradeOptions {
  /** Visible page + watched stocks, in order (see `upgradeQueue`). */
  symbols: string[];
  /** The "Score: On" toggle. */
  enabled: boolean;
  snapshotLoaded: boolean;
  noFeed: ReadonlySet<string>;
  interval: CompositeInterval;
  weightsVersion: number;
  refreshKey: number;
  setCards: Dispatch<SetStateAction<CardMap>>;
}

/**
 * Step 2 — upgrade the visible page (and the watchlist) to live figures in
 * the background, at the shared client's bounded concurrency, never for a
 * symbol the feed refuses. Port of the web dashboard's `upgrade` callback.
 *
 * `upgradedRef` is a ref, not `cards[sym].state === "live"`: the reset effect
 * only SCHEDULES the demotion, so reading state here would see every symbol
 * as still live in the same commit and fetch nothing (the dead-Refresh bug).
 */
export function useLiveUpgrade(o: LiveUpgradeOptions): { upgrade: (symbols: string[]) => void } {
  const { setCards, interval, noFeed } = o;
  const inFlightRef = useRef(new Set<string>());
  const attemptsRef = useRef(new Map<string, number>());
  const upgradedRef = useRef(new Set<string>());
  const runIdRef = useRef(0);
  // The retry timeout must call the latest `upgrade` without `upgrade`
  // referencing itself (react-hooks/immutability).
  const upgradeRef = useRef<(symbols: string[]) => void>(() => {});

  // Weights, interval and refresh change what a score MEANS: start a new run,
  // demote live → stale (never drop). Declared BEFORE the upgrade effect so it
  // runs first in the same commit.
  useEffect(() => {
    runIdRef.current += 1;
    inFlightRef.current = new Set();
    attemptsRef.current = new Map();
    upgradedRef.current = new Set();
    setCards(demoteLive);
  }, [o.weightsVersion, o.refreshKey, interval, setCards]);

  // Unmount cancels a pending retry timer and any in-flight batch.
  useEffect(
    () => () => {
      runIdRef.current += 1;
    },
    [],
  );

  const upgrade = useCallback(
    (symbols: string[]) => {
      const runId = runIdRef.current;
      const toFetch = upgradeCandidates(symbols, {
        noFeed,
        inFlight: inFlightRef.current,
        upgraded: upgradedRef.current,
        attempts: attemptsRef.current,
        maxAttempts: COMPOSITE_MAX_ATTEMPTS,
      });
      if (!toFetch.length) return;
      const inFlight = inFlightRef.current;

      for (const s of toFetch) {
        const sym = s.toUpperCase();
        inFlight.add(sym);
        attemptsRef.current.set(sym, (attemptsRef.current.get(sym) ?? 0) + 1);
      }

      fetchCompositeBatch(toFetch, interval, {
        isCancelled: () => runIdRef.current !== runId,
        onChunk: (partial) => {
          setCards((prev) => {
            const { cards, upgraded } = applyBatchChunk(prev, partial, Date.now());
            for (const sym of upgraded) upgradedRef.current.add(sym);
            return cards;
          });
        },
      })
        .then((res) => {
          if (runIdRef.current !== runId) return;
          // Upstream timeouts often self-cache moments later, so one delayed
          // retry usually lands — bounded by COMPOSITE_MAX_ATTEMPTS.
          const retry = retryableSymbols(res.errors, {
            noFeed,
            attempts: attemptsRef.current,
            maxAttempts: COMPOSITE_MAX_ATTEMPTS,
          });
          if (retry.length) {
            setTimeout(() => {
              if (runIdRef.current === runId) upgradeRef.current(retry);
            }, COMPOSITE_RETRY_DELAY_MS);
          }
        })
        .finally(() => {
          for (const s of toFetch) inFlight.delete(s.toUpperCase());
        });
    },
    [interval, noFeed, setCards]
  );

  useEffect(() => {
    upgradeRef.current = upgrade;
  }, [upgrade]);

  const symbolsKey = o.symbols.join(",");
  useEffect(() => {
    if (!o.enabled) return;
    // Wait for the snapshot so `noFeed` is known — otherwise the first pass
    // spends its budget on symbols the feed never answers.
    if (!o.snapshotLoaded) return;
    upgrade(o.symbols);
    // `upgrade` and `o.symbols` are read through `symbolsKey`/`interval`;
    // listing them would re-run this on every arriving chunk.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey, o.weightsVersion, o.refreshKey, o.enabled, interval, o.snapshotLoaded]);

  return { upgrade };
}
