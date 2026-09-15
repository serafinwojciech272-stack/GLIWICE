import type { DealAnalysis } from '../../domain/deal';

export type OpportunityDecision = {
  buyScore: number;
  marketabilityScore: number;
  evidenceScore: number;
  riskAdjustedScore: number;
  decision: 'BUY' | 'WATCH' | 'PASS';
  reasons: string[];
};

function clamp(value: number) { return Math.max(0, Math.min(100, Math.round(value))); }

export function decideOpportunity(deal: DealAnalysis): OpportunityDecision {
  const availability = deal.availability === 'in_stock' ? 100 : deal.availability === 'limited' ? 72 : deal.availability === 'unknown' ? 35 : 0;
  const seller = deal.sellerRating ? Math.min(100, deal.sellerRating / 5 * 100) : 45;
  const resaleEvidence = deal.estimatedResalePrice ? 80 : deal.marketMedian ? 60 : 30;
  const marketabilityScore = clamp(availability * 0.4 + seller * 0.25 + resaleEvidence * 0.35);
  const evidenceScore = deal.confidence;
  const riskAdjustedScore = clamp(deal.score * (1 - deal.riskScore / 130));
  const buyScore = clamp(riskAdjustedScore * 0.5 + marketabilityScore * 0.2 + evidenceScore * 0.3);
  const decision = deal.risk === 'critical' || deal.availability === 'out_of_stock' || buyScore < 58
    ? 'PASS'
    : buyScore >= 82 && deal.roiPct >= 15 && evidenceScore >= 70 ? 'BUY'
    : 'WATCH';
  const reasons = [
    `marketability ${marketabilityScore}/100`,
    `evidence ${evidenceScore}/100`,
    `risk-adjusted ${riskAdjustedScore}/100`,
    deal.availability === 'in_stock' ? 'produkt dostępny' : `dostępność: ${deal.availability}`,
  ];
  return { buyScore, marketabilityScore, evidenceScore, riskAdjustedScore, decision, reasons };
}
