import { useCallback, useEffect, useRef, useState } from "react";

interface Settled<T> {
  key: string;
  data: T | null;
  error: string | null;
  refreshError: string | null;
}

export interface KeyedFetchState<T> {
  data: T | null;
  error: string | null;
  /** A pull-to-refresh failed; `data` still holds the earlier result. */
  refreshError: string | null;
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
  const pullKeyRef = useRef<string | null>(null);
  const lastGoodRef = useRef<{ baseKey: string; data: T } | null>(null);

  useEffect(() => {
    let alive = true;
    fetcher()
      .then((data) => {
        if (!alive) return;
        lastGoodRef.current = { baseKey, data };
        setSettled({ key, data, error: null, refreshError: null });
      })
      .catch((e: unknown) => {
        if (!alive) return;
        const message = e instanceof Error ? e.message : "Request failed";
        const prev = lastGoodRef.current;
        if (pullKeyRef.current === key && prev && prev.baseKey === baseKey) {
          setSettled({ key, data: prev.data, error: null, refreshError: message });
        } else {
          setSettled({ key, data: null, error: message, refreshError: null });
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
    pullKeyRef.current = `${baseKey}#${nonce + 1}`;
    setPullKey(`${baseKey}#${nonce + 1}`);
    setNonce((n) => n + 1);
  }, [baseKey, nonce]);

  const reload = useCallback(() => {
    pullKeyRef.current = null;
    setPullKey(null);
    setNonce((n) => n + 1);
  }, []);

  return {
    data: current ? current.data : pulling ? (settled?.data ?? null) : null,
    error: current ? current.error : null,
    refreshError: current ? current.refreshError : null,
    loading: !current && (!pulling || !settled?.data),
    refreshing: pulling,
    refresh,
    reload,
  };
}
