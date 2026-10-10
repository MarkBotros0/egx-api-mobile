import { useCallback, useEffect, useState } from "react";

interface Settled<T> {
  key: string;
  data: T | null;
  error: string | null;
}

export interface KeyedFetchState<T> {
  data: T | null;
  error: string | null;
  /** No result for the current inputs yet, and nothing to show meanwhile. */
  loading: boolean;
  /** A pull-to-refresh is running; `data` still holds the previous result. */
  refreshing: boolean;
  /** Pull-to-refresh: re-request, keep the old data on screen until the new lands. */
  refresh: () => void;
  /** Retry: re-request from a blank loading state. */
  reload: () => void;
}

/**
 * Fetch keyed by its inputs. The result remembers which key it answers, so a
 * response for old inputs can never paint over new ones, and "loading" is
 * derived rather than set inside an effect.
 *
 * `key` must name everything `fetcher` reads.
 */
export function useKeyedFetch<T>(baseKey: string, fetcher: () => Promise<T>): KeyedFetchState<T> {
  const [nonce, setNonce] = useState(0);
  const [pullKey, setPullKey] = useState<string | null>(null);
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const key = `${baseKey}#${nonce}`;

  useEffect(() => {
    let alive = true;
    fetcher()
      .then((data) => {
        if (alive) setSettled({ key, data, error: null });
      })
      .catch((e: unknown) => {
        if (alive) {
          setSettled({ key, data: null, error: e instanceof Error ? e.message : "Request failed" });
        }
      });
    return () => {
      alive = false;
    };
    // `key` names everything the fetcher reads; listing `fetcher` (a new
    // closure every render) would refetch on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = settled && settled.key === key ? settled : null;
  const pulling = !current && pullKey === key;

  const refresh = useCallback(() => {
    setPullKey(`${baseKey}#${nonce + 1}`);
    setNonce((n) => n + 1);
  }, [baseKey, nonce]);

  const reload = useCallback(() => {
    setPullKey(null);
    setNonce((n) => n + 1);
  }, []);

  return {
    data: current ? current.data : pulling ? (settled?.data ?? null) : null,
    error: current ? current.error : null,
    loading: !current && !pulling,
    refreshing: pulling,
    refresh,
    reload,
  };
}
