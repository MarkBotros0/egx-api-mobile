import type { ReactNode } from "react";

import { ScoreWeightsProvider } from "./scoreWeights";
import { TickersProvider } from "./tickers";
import { WatchlistProvider } from "./watchlist";

/** Same nesting order as the web layout.tsx. Must sit inside <AuthProvider>. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ScoreWeightsProvider>
      <TickersProvider>
        <WatchlistProvider>{children}</WatchlistProvider>
      </TickersProvider>
    </ScoreWeightsProvider>
  );
}
