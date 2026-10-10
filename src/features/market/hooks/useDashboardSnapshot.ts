import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { fetchDashboard } from "@/shared/api";
import { cardsFromSnapshot, mergeSnapshot, type CardMap } from "../logic/cards";

export interface DashboardSnapshot {
  cards: CardMap;
  setCards: Dispatch<SetStateAction<CardMap>>;
  noFeed: ReadonlySet<string>;
  snapshotLoaded: boolean;
  refreshKey: number;
  refreshing: boolean;
  refresh: () => void;
}

/**
 * Step 1 — the snapshot: one request for the whole universe, no upstream fetch.
 * It is an accelerator, not a dependency: if it fails (or the nightly job has
 * never run) `snapshotLoaded` still turns true and the live upgrade fills the
 * grid on its own.
 *
 * `refresh()` is pull-to-refresh. `refreshKey > 0` sends `fresh`, exactly like
 * the web Refresh button, so the request bypasses any cached copy.
 */
export function useDashboardSnapshot(weightsVersion: number): DashboardSnapshot {
  const [cards, setCards] = useState<CardMap>({});
  const [noFeed, setNoFeed] = useState<ReadonlySet<string>>(() => new Set<string>());
  const [snapshotLoaded, setSnapshotLoaded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchDashboard({ fresh: refreshKey > 0 })
      .then((res) => {
        if (cancelled) return;
        const { cards: next, noFeed: dead } = cardsFromSnapshot(res.rows);
        setCards((prev) => mergeSnapshot(prev, next));
        setNoFeed(dead);
      })
      .catch(() => {
        // Accelerator, not dependency — the live path still fills the grid.
      })
      .finally(() => {
        if (!cancelled) {
          setSnapshotLoaded(true);
          setRefreshing(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [weightsVersion, refreshKey]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
  }, []);

  return { cards, setCards, noFeed, snapshotLoaded, refreshKey, refreshing, refresh };
}
