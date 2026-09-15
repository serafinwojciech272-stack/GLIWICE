import type { DealAnalysis } from '../../domain/deal';
import { simulationTruth } from './marketSimulator';

export type SimulationEvaluation = {
  totalOffers: number;
  plantedOpportunities: number;
  detectedBuySignals: number;
  truePositives: number;
  falsePositives: number;
  precisionPct: number;
  recallPct: number;
  trapBuySignals: number;
  averageConfidencePct: number;
  top10PrecisionPct: number;
};

export function evaluateSimulation(deals: DealAnalysis[]): SimulationEvaluation {
  const truths = deals.map(deal => ({ deal, truth: simulationTruth(deal) }));
  const opportunities = truths.filter(item => item.truth === 'opportunity').length;
  const buySignals = truths.filter(item => item.deal.verdict === 'BUY NOW' || item.deal.verdict === 'STRONG BUY');
  const truePositives = buySignals.filter(item => item.truth === 'opportunity').length;
  const falsePositives = buySignals.filter(item => item.truth !== 'opportunity').length;
  const traps = buySignals.filter(item => item.truth === 'trap').length;
  const top10 = [...deals].sort((a, b) => b.score - a.score).slice(0, 10);
  const top10Precision = top10.length ? top10.filter(deal => simulationTruth(deal) === 'opportunity').length / top10.length * 100 : 0;
  const avgConfidence = deals.length ? deals.reduce((sum, deal) => sum + deal.confidence, 0) / deals.length : 0;
  return {
    totalOffers: deals.length,
    plantedOpportunities: opportunities,
    detectedBuySignals: buySignals.length,
    truePositives,
    falsePositives,
    precisionPct: buySignals.length ? truePositives / buySignals.length * 100 : 0,
    recallPct: opportunities ? truePositives / opportunities * 100 : 0,
    trapBuySignals: traps,
    averageConfidencePct: avgConfidence,
    top10PrecisionPct: top10Precision,
  };
}
