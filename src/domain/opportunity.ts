export type OpportunityDecision = 'BUY' | 'WATCH' | 'PASS';

export type Opportunity = {
  dealId: string;
  buyScore: number;
  marketabilityScore: number;
  evidenceScore: number;
  riskAdjustedScore: number;
  decision: OpportunityDecision;
  generatedAt: string;
  reasons: string[];
};
