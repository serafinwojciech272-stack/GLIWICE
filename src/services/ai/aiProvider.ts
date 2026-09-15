export type DealAIContext = {
  title: string;
  marketPrice: number;
  purchasePrice: number;
  potentialProfit: number;
  roiPct: number;
  score: number;
  risk: string;
  confidence: number;
};

export type DealAIResult = {
  verdict: 'BUY NOW' | 'STRONG BUY' | 'WATCH' | 'WAIT' | 'PASS' | 'HIGH RISK';
  explanation: string;
  confidence: number;
};

export interface AIProvider {
  analyzeDeal(context: DealAIContext): Promise<DealAIResult>;
}

export function createAIProvider(): AIProvider | null {
  // Intentionally returns null until a server-side AI provider is configured.
  // No fake AI result is generated in the frontend.
  return null;
}
