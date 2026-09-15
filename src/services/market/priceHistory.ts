import type { PricePoint } from '../../domain/market';

export type PriceHistoryStats = {
  sampleSize: number;
  median: number;
  minimum: number;
  maximum: number;
  volatilityPct: number;
  trendPct: number;
  lowestObservedAt?: string;
};

const median = (values: number[]) => {
  const sorted = [...values].filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

export function summarizePriceHistory(points: PricePoint[]): PriceHistoryStats {
  const clean = points.filter(point => Number.isFinite(point.price) && point.price > 0).sort((a, b) => a.observedAt.localeCompare(b.observedAt));
  if (!clean.length) return { sampleSize: 0, median: 0, minimum: 0, maximum: 0, volatilityPct: 0, trendPct: 0 };
  const prices = clean.map(point => point.price);
  const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const variance = prices.reduce((sum, price) => sum + Math.pow(price - avg, 2), 0) / prices.length;
  const first = prices[0];
  const last = prices[prices.length - 1];
  const lowIndex = prices.indexOf(Math.min(...prices));
  return {
    sampleSize: prices.length,
    median: median(prices),
    minimum: Math.min(...prices),
    maximum: Math.max(...prices),
    volatilityPct: avg > 0 ? (Math.sqrt(variance) / avg) * 100 : 0,
    trendPct: first > 0 ? ((last - first) / first) * 100 : 0,
    lowestObservedAt: clean[lowIndex]?.observedAt,
  };
}

export function isAuthenticDiscount(currentPrice: number, history: PricePoint[], minimumSamples = 3): boolean {
  if (currentPrice <= 0 || history.length < minimumSamples) return false;
  const stats = summarizePriceHistory(history);
  return stats.median > 0 && currentPrice < stats.median * 0.9 && currentPrice <= stats.maximum * 0.85;
}
