import { useCallback, useRef, useState } from "react";

/**
 * Double-submit guard for sheet forms. `run(task)` starts the task unless one is
 * already in flight (a ref, so a second tap in the same frame is ignored before
 * state re-renders); `pending` drives the button's loading state. The task's
 * rejection propagates to the caller; the guard resets either way.
 */
export function useSingleFlight() {
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);

  const run = useCallback(async (task: () => Promise<void>): Promise<void> => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    try {
      await task();
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }, []);

  return { run, pending };
}
