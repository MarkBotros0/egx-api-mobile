/**
 * Per-concept read state, per device, under the same key the web uses.
 *
 * A reading aid, not user data: no backend, no sync, and losing it costs
 * nothing — so every storage call is wrapped and a failure only means the
 * state is not remembered. AsyncStorage is asynchronous (the web's
 * localStorage is not), so a tap can land before the stored set arrives;
 * such taps are queued and replayed on top of it instead of being lost.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LEARN_PROGRESS_KEY } from "@/shared/learn";

export function parseProgress(raw: string | null): Set<string> {
  if (!raw) return new Set();
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? new Set(v.filter((x): x is string => typeof x === "string")) : new Set();
  } catch {
    return new Set();
  }
}

function toggled(set: ReadonlySet<string>, key: string): Set<string> {
  const next = new Set(set);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

/** Fire-and-forget; swallows both synchronous throws and rejections. */
function safely(op: () => Promise<unknown>): void {
  try {
    op().catch(() => {});
  } catch {
    /* storage unavailable — the in-memory state still works */
  }
}

function persist(set: ReadonlySet<string>): void {
  if (set.size === 0) safely(() => AsyncStorage.removeItem(LEARN_PROGRESS_KEY));
  else safely(() => AsyncStorage.setItem(LEARN_PROGRESS_KEY, JSON.stringify(Array.from(set))));
}

async function readStored(): Promise<Set<string>> {
  try {
    return parseProgress(await AsyncStorage.getItem(LEARN_PROGRESS_KEY));
  } catch {
    return new Set();
  }
}

type PendingOp = { type: "toggle"; key: string } | { type: "reset" };

export function useLearnProgress() {
  const [read, setRead] = useState<ReadonlySet<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);
  const pending = useRef<PendingOp[]>([]);

  useEffect(() => {
    let alive = true;
    readStored().then((stored) => {
      if (!alive) return;
      let next: Set<string> = stored;
      for (const op of pending.current) next = op.type === "reset" ? new Set() : toggled(next, op.key);
      const replayed = pending.current.length > 0;
      pending.current = [];
      hydratedRef.current = true;
      setRead(next);
      setHydrated(true);
      if (replayed) persist(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  const toggle = useCallback((key: string) => {
    if (!hydratedRef.current) pending.current.push({ type: "toggle", key });
    setRead((prev) => {
      const next = toggled(prev, key);
      if (hydratedRef.current) persist(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    if (!hydratedRef.current) pending.current.push({ type: "reset" });
    setRead(new Set());
    if (hydratedRef.current) persist(new Set());
  }, []);

  return { read, toggle, reset, hydrated };
}
