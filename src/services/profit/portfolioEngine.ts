import type { DealAnalysis } from '../../domain/deal';

export type PortfolioCandidate = {
  deal: DealAnalysis;
  quantity: number;
  capital: number;
  expectedProfit: number;
};

export type PortfolioPlan = {
  budget: number;
  invested: number;
  remaining: number;
  expectedProfit: number;
  expectedRoiPct: number;
  candidates: PortfolioCandidate[];
};

export function buildPortfolioPlan(deals: DealAnalysis[], budget: number, maxItems = 10): PortfolioPlan {
  let remaining = Math.max(0, budget);
  const candidates: PortfolioCandidate[] = [];
  for (const deal of [...deals].sort((a, b) => (b.roiPct + b.score / 10) - (a.roiPct + a.score / 10))) {
    if (candidates.length >= maxItems || deal.price <= 0 || deal.potentialProfit <= 0 || deal.risk === 'critical') continue;
    const quantity = Math.min(Math.floor(remaining / deal.price), 3);
    if (quantity < 1) continue;
    const capital = quantity * deal.price;
    candidates.push({ deal, quantity, capital, expectedProfit: quantity * deal.potentialProfit });
    remaining -= capital;
  }
  const invested = budget - remaining;
  const expectedProfit = candidates.reduce((sum, c) => sum + c.expectedProfit, 0);
  return { budget, invested, remaining, expectedProfit, expectedRoiPct: invested ? (expectedProfit / invested) * 100 : 0, candidates };
}
