import type { DealAnalysis } from '../../domain/deal';
import type { MarketSnapshot, PricePoint } from '../../domain/market';

export function buildMarketSnapshot(productId: string, deals: DealAnalysis[], history: PricePoint[] = []): MarketSnapshot {
  const prices = deals.map(d => d.price).filter(Number.isFinite).sort((a,b)=>a-b);
  const median = prices.length ? prices[Math.floor(prices.length / 2)] : 0;
  return {
    productId,
    median,
    minimum: prices[0] ?? 0,
    maximum: prices[prices.length - 1] ?? 0,
    sampleSize: prices.length,
    historicalMedian90d: history.length ? history.map(x=>x.price).sort((a,b)=>a-b)[Math.floor(history.length/2)] : undefined,
    dataQuality: prices.length >= 5 ? 'high' : prices.length >= 2 ? 'medium' : 'low',
    observations: history,
  };
}
