export type DealAvailability = 'in_stock' | 'limited' | 'out_of_stock' | 'unknown';
export type ProductCondition = 'new' | 'used' | 'refurbished' | 'open_box' | 'unknown';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type Verdict = 'BUY NOW' | 'STRONG BUY' | 'WATCH' | 'WAIT' | 'PASS' | 'HIGH RISK';

export type Deal = {
  id: string;
  productId: string;
  ean?: string;
  sku?: string;
  title: string;
  brand?: string;
  model?: string;
  attributes?: Record<string, string | number | boolean>;
  store: string;
  category: string;
  price: number;
  previousPrice?: number;
  marketMedian?: number;
  historicalMedian90d?: number;
  estimatedResalePrice?: number;
  shippingIn?: number;
  condition: ProductCondition;
  availability: DealAvailability;
  sellerRating?: number;
  sourceId?: string;
  sourceUrl: string;
  observedAt: string;
};

export type DealAnalysis = Deal & {
  discountPct: number;
  marketAdvantagePct: number;
  historicalAdvantagePct: number;
  totalCost: number;
  potentialProfit: number;
  marginPct: number;
  roiPct: number;
  score: number;
  confidence: number;
  riskScore: number;
  risk: RiskLevel;
  verdict: Verdict;
  reasons: string[];
};
