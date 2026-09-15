import type { DealAnalysis } from '../../domain/deal';
import type { MarketSnapshot, PricePoint } from '../../domain/market';
import { summarizePriceHistory } from './priceHistory';

const median = (values: number[]) => {
  const sorted = [...values].filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

export function buildMarketSnapshot(productId: string, deals: DealAnalysis[], history: PricePoint[] = []): MarketSnapshot {
  const prices = deals.map(d => d.price).filter(price => Number.isFinite(price) && price > 0);
  const historyStats = summarizePriceHistory(history);
  return {
    productId,
    median: median(prices),
    minimum: prices.length ? Math.min(...prices) : 0,
    maximum: prices.length ? Math.max(...prices) : 0,
    sampleSize: prices.length,
    historicalMedian90d: historyStats.median || undefined,
    volatilityPct: historyStats.volatilityPct,
    trendPct: historyStats.trendPct,
    dataQuality: prices.length >= 5 ? 'high' : prices.length >= 2 ? 'medium' : 'low',
    observations: history,
  };
}
