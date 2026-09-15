export type DataQuality = 'high' | 'medium' | 'low';
export type ObservationKind = 'observed' | 'calculated' | 'estimated' | 'ai_inferred';
export type SourceHealth = 'healthy' | 'degraded' | 'offline';

export type PricePoint = {
  price: number;
  currency: string;
  observedAt: string;
  sourceId: string;
};

export type MarketSnapshot = {
  productId: string;
  median: number;
  minimum: number;
  maximum: number;
  sampleSize: number;
  historicalMedian90d?: number;
  volatilityPct?: number;
  trendPct?: number;
  dataQuality: DataQuality;
  observations: PricePoint[];
};

export type SourceHealthSnapshot = {
  sourceId: string;
  status: SourceHealth;
  lastSuccessAt?: string;
  latencyMs?: number;
  offersSeen: number;
  errorCount: number;
  message?: string;
};
