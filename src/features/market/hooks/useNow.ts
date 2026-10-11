import { useEffect, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

/**
 * One clock for a whole screen (the dashboard's "14s ago" labels). Paused while
 * the app is in the background — a phone in a pocket should not re-render a
 * grid every second — and resynced the moment it returns, so the first frame
 * back is right. The web version listens to `visibilitychange`.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      setNow(Date.now());
      id ??= setInterval(() => setNow(Date.now()), intervalMs);
    };
    const stop = () => {
      if (id) clearInterval(id);
      id = null;
    };
    const onChange = (state: AppStateStatus) =>
      state === "background" || state === "inactive" ? stop() : start();

    onChange(AppState.currentState);
    const sub = AppState.addEventListener("change", onChange);
    return () => {
      stop();
      sub.remove();
    };
  }, [intervalMs]);

  return now;
}
