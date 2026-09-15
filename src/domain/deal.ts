export type DealAvailability = 'in_stock' | 'limited' | 'out_of_stock' | 'unknown';
export type ProductCondition = 'new' | 'used' | 'refurbished' | 'open_box' | 'unknown';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type Verdict = 'BUY NOW' | 'STRONG BUY' | 'WATCH' | 'WAIT' | 'PASS' | 'HIGH RISK';

export type Deal = {
  id: string;
  productId: string;
  title: string;
  brand?: string;
  model?: string;
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
  sourceUrl: string;
  observedAt: string;
};

export type DealAnalysis = Deal & {
  discountPct: number;
  marketAdvantagePct: number;
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
