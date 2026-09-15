import type { PricePoint } from '../../domain/market';

export type PriceHistoryStats = {
  sampleSize: number;
  median: number;
  minimum: number;
  maximum: number;
  volatilityPct: number;
  trendPct: number;
  median7d: number;
  median30d: number;
  median90d: number;
  freshnessHours: number;
  lowestObservedAt?: string;
};

const median = (values: number[]) => {
  const sorted = [...values].filter(value => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const windowMedian = (points: PricePoint[], days: number, now: number) => {
  const cutoff = now - days * 86400000;
  return median(points.filter(point => Date.parse(point.observedAt) >= cutoff).map(point => point.price));
};

export function summarizePriceHistory(points: PricePoint[], now = Date.now()): PriceHistoryStats {
  const clean = points
    .filter(point => Number.isFinite(point.price) && point.price > 0 && Number.isFinite(Date.parse(point.observedAt)))
    .sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));
  if (!clean.length) return { sampleSize: 0, median: 0, minimum: 0, maximum: 0, volatilityPct: 0, trendPct: 0, median7d: 0, median30d: 0, median90d: 0, freshnessHours: Infinity };
  const prices = clean.map(point => point.price);
  const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const variance = prices.reduce((sum, price) => sum + Math.pow(price - avg, 2), 0) / prices.length;
  const first = prices[0];
  const last = prices[prices.length - 1];
  const lowest = Math.min(...prices);
  const lowestIndex = prices.indexOf(lowest);
  const latestAt = Date.parse(clean[clean.length - 1].observedAt);
  return {
    sampleSize: prices.length,
    median: median(prices),
    minimum: lowest,
    maximum: Math.max(...prices),
    volatilityPct: avg > 0 ? (Math.sqrt(variance) / avg) * 100 : 0,
    trendPct: first > 0 ? ((last - first) / first) * 100 : 0,
    median7d: windowMedian(clean, 7, now),
    median30d: windowMedian(clean, 30, now),
    median90d: windowMedian(clean, 90, now),
    freshnessHours: Math.max(0, (now - latestAt) / 3600000),
    lowestObservedAt: clean[lowestIndex]?.observedAt,
  };
}

export function isAuthenticDiscount(currentPrice: number, history: PricePoint[], minimumSamples = 5): boolean {
  if (!Number.isFinite(currentPrice) || currentPrice <= 0 || history.length < minimumSamples) return false;
  const stats = summarizePriceHistory(history);
  const baseline = stats.median30d || stats.median90d || stats.median;
  if (!baseline || stats.freshnessHours > 24 * 14) return false;
  return currentPrice < baseline * 0.9 && currentPrice <= stats.maximum * 0.88;
}
