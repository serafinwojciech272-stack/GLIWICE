import type { Deal, DealAnalysis, RiskLevel, Verdict } from '../domain/deal';
import { calculateProfit } from './profitEngine';

export function percentBelow(current: number, reference?: number): number {
  if (!reference || reference <= 0) return 0;
  return Math.max(0, ((reference - current) / reference) * 100);
}

function riskFor(deal: Deal, confidence: number, roi: number): { risk: RiskLevel; riskScore: number } {
  let riskScore = 0;
  if (confidence < 60) riskScore += 30;
  else if (confidence < 80) riskScore += 15;
  if (deal.condition !== 'new') riskScore += 20;
  if (deal.availability === 'limited') riskScore += 5;
  if (deal.availability === 'unknown') riskScore += 15;
  if ((deal.sellerRating ?? 0) > 0 && (deal.sellerRating ?? 0) < 4.5) riskScore += 15;
  if (roi < 0) riskScore += 35;
  else if (roi < 10) riskScore += 15;
  const risk: RiskLevel = riskScore >= 70 ? 'critical' : riskScore >= 45 ? 'high' : riskScore >= 20 ? 'medium' : 'low';
  return { risk, riskScore: Math.min(100, riskScore) };
}

export function analyzeDeal(deal: Deal): DealAnalysis {
  const marketAdvantagePct = percentBelow(deal.price, deal.marketMedian);
  const historicalAdvantagePct = percentBelow(deal.price, deal.historicalMedian90d);
  const resale = deal.estimatedResalePrice ?? deal.marketMedian ?? deal.previousPrice ?? deal.price;
  const profit = calculateProfit({ purchasePrice: deal.price, resalePrice: resale, shippingIn: deal.shippingIn });
  const confidence = Math.round(Math.min(100, 45 + (deal.marketMedian ? 20 : 0) + (deal.historicalMedian90d ? 15 : 0) + (deal.sellerRating ? 10 : 0) + (deal.estimatedResalePrice ? 10 : 0)));
  const { risk, riskScore } = riskFor(deal, confidence, profit.roiPct);
  const discount = percentBelow(deal.price, deal.previousPrice);
  const score = Math.max(0, Math.min(100, Math.round(
    marketAdvantagePct * 0.30 + historicalAdvantagePct * 0.20 + Math.max(0, profit.roiPct) * 0.20 + Math.max(0, profit.marginPct) * 0.10 + confidence * 0.10 + (100 - riskScore) * 0.10,
  )));
  let verdict: Verdict = 'PASS';
  if (risk === 'critical') verdict = 'HIGH RISK';
  else if (score >= 90 && profit.roiPct >= 25 && confidence >= 75) verdict = 'BUY NOW';
  else if (score >= 80 && profit.roiPct >= 15) verdict = 'STRONG BUY';
  else if (score >= 65) verdict = 'WATCH';
  else if (score >= 50) verdict = 'WAIT';

  const reasons = [
    marketAdvantagePct > 0 ? `${marketAdvantagePct.toFixed(0)}% poniżej mediany rynku` : 'brak potwierdzonej przewagi nad medianą rynku',
    historicalAdvantagePct > 0 ? `${historicalAdvantagePct.toFixed(0)}% poniżej mediany 90d` : 'brak wystarczającej przewagi historycznej',
    profit.profit > 0 ? `potencjalny zysk ${Math.round(profit.profit).toLocaleString('pl-PL')} zł` : 'brak dodatniego potencjalnego zysku',
  ];
  return { ...deal, discountPct: discount, marketAdvantagePct, totalCost: profit.totalCost, potentialProfit: profit.profit, marginPct: profit.marginPct, roiPct: profit.roiPct, score, confidence, riskScore, risk, verdict, reasons };
}

export function rankDeals(deals: Deal[]): DealAnalysis[] {
  return deals.map(analyzeDeal).sort((a, b) => b.score - a.score);
}
