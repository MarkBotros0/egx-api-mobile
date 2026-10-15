import type { ReactNode } from "react";

import { MarketProvider } from "./market";
import { ScoreWeightsProvider } from "./scoreWeights";
import { TickersProvider } from "./tickers";
import { WatchlistProvider } from "./watchlist";

/**
 * Same nesting order as the web layout.tsx. Must sit inside <AuthProvider>.
 * MarketProvider is outermost because every other provider's fetches carry
 * the selected market.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <MarketProvider>
      <ScoreWeightsProvider>
        <TickersProvider>
          <WatchlistProvider>{children}</WatchlistProvider>
        </TickersProvider>
      </ScoreWeightsProvider>
    </MarketProvider>
  );
}
