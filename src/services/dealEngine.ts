import type { Deal, DealAnalysis, RiskLevel, Verdict } from '../domain/deal';
import { DEFAULT_PROFIT_ASSUMPTIONS } from '../config/profitAssumptions';
import { calculateProfit } from './profitEngine';

const clamp = (value: number) => Math.max(0, Math.min(100, value));

export function percentBelow(current: number, reference?: number): number {
  if (!reference || reference <= 0) return 0;
  return Math.max(0, ((reference - current) / reference) * 100);
}

function freshnessHours(observedAt: string): number {
  const timestamp = Date.parse(observedAt);
  return Number.isFinite(timestamp) ? Math.max(0, (Date.now() - timestamp) / 3600000) : Infinity;
}

function riskFor(deal: Deal, confidence: number, roi: number): { risk: RiskLevel; riskScore: number } {
  let riskScore = 0;
  const freshness = freshnessHours(deal.observedAt);
  if (confidence < 60) riskScore += 30; else if (confidence < 80) riskScore += 15;
  if (deal.condition !== 'new') riskScore += 20;
  if (deal.availability === 'limited') riskScore += 5;
  if (deal.availability === 'unknown') riskScore += 15;
  if (deal.availability === 'out_of_stock') riskScore += 35;
  if ((deal.sellerRating ?? 0) > 0 && (deal.sellerRating ?? 0) < 4.5) riskScore += 15;
  if (roi < 0) riskScore += 35; else if (roi < 10) riskScore += 15;
  if (freshness > 24 * 3) riskScore += 10;
  if (freshness > 24 * 7) riskScore += 20;
  const risk: RiskLevel = riskScore >= 70 ? 'critical' : riskScore >= 45 ? 'high' : riskScore >= 20 ? 'medium' : 'low';
  return { risk, riskScore: Math.min(100, riskScore) };
}

export function analyzeDeal(deal: Deal): DealAnalysis {
  const marketAdvantagePct = percentBelow(deal.price, deal.marketMedian);
  const historicalAdvantagePct = percentBelow(deal.price, deal.historicalMedian90d);
  const resale = deal.estimatedResalePrice ?? deal.marketMedian ?? deal.previousPrice ?? deal.price;
  const profit = calculateProfit({
    purchasePrice: deal.price,
    resalePrice: resale,
    shippingIn: deal.shippingIn ?? DEFAULT_PROFIT_ASSUMPTIONS.shippingIn,
    marketplaceFeePct: DEFAULT_PROFIT_ASSUMPTIONS.marketplaceFeePct,
    paymentFeePct: DEFAULT_PROFIT_ASSUMPTIONS.paymentFeePct,
    packagingCost: DEFAULT_PROFIT_ASSUMPTIONS.packagingCost,
    otherCosts: DEFAULT_PROFIT_ASSUMPTIONS.otherCosts,
  });
  const confidence = Math.round(Math.min(100,
    35 + (deal.ean ? 15 : 0) + (deal.sku ? 10 : 0) + (deal.marketMedian ? 15 : 0) +
    (deal.historicalMedian90d ? 10 : 0) + (deal.sellerRating ? 10 : 0) + (deal.estimatedResalePrice ? 10 : 0),
  ));
  const { risk, riskScore } = riskFor(deal, confidence, profit.roiPct);
  const discount = percentBelow(deal.price, deal.previousPrice);
  const stale = freshnessHours(deal.observedAt) > 24 * 3;

  const marketSignal = clamp(marketAdvantagePct * 2.5);
  const historicalSignal = clamp(historicalAdvantagePct * 2.2);
  const roiSignal = clamp(Math.max(0, profit.roiPct) * 3);
  const marginSignal = clamp(Math.max(0, profit.marginPct) * 2.2);
  const score = Math.round(clamp(
    marketSignal * 0.30 + historicalSignal * 0.15 + roiSignal * 0.25 +
    marginSignal * 0.10 + confidence * 0.15 + (100 - riskScore) * 0.05,
  ));

  let verdict: Verdict = 'PASS';
  if (risk === 'critical') verdict = 'HIGH RISK';
  else if (score >= 82 && profit.roiPct >= 20 && confidence >= 75 && !stale) verdict = 'BUY NOW';
  else if (score >= 70 && profit.roiPct >= 15 && confidence >= 70 && !stale) verdict = 'STRONG BUY';
  else if (score >= 58) verdict = 'WATCH';
  else if (score >= 45) verdict = 'WAIT';

  const reasons = [
    marketAdvantagePct > 0 ? `${marketAdvantagePct.toFixed(0)}% poniżej mediany rynku` : 'brak potwierdzonej przewagi nad medianą rynku',
    historicalAdvantagePct > 0 ? `${historicalAdvantagePct.toFixed(0)}% poniżej mediany 90d` : 'brak wystarczającej przewagi historycznej',
    profit.profit > 0 ? `potencjalny zysk ${Math.round(profit.profit).toLocaleString('pl-PL')} zł po kosztach modelu` : 'brak dodatniego potencjalnego zysku po kosztach',
    deal.ean ? 'produkt posiada EAN/GTIN' : deal.sku ? 'produkt posiada SKU' : 'brak twardego identyfikatora produktu',
    stale ? 'obserwacja jest stara: wymagany świeży skan' : 'świeżość danych akceptowalna',
  ];
  return {
    ...deal,
    sourceId: deal.sourceId ?? 'unknown',
    discountPct: discount,
    marketAdvantagePct,
    historicalAdvantagePct,
    totalCost: profit.totalCost,
    potentialProfit: profit.profit,
    marginPct: profit.marginPct,
    roiPct: profit.roiPct,
    score,
    confidence,
    riskScore,
    risk,
    verdict,
    reasons,
    evidence: [
      { kind: 'observed', label: 'Źródło', value: deal.store, sourceId: deal.sourceId },
      { kind: 'observed', label: 'Cena zakupu', value: `${deal.price.toFixed(2)} zł`, sourceId: deal.sourceId },
      ...(deal.marketMedian ? [{ kind: 'observed' as const, label: 'Mediana rynku', value: `${deal.marketMedian.toFixed(2)} zł`, sourceId: deal.sourceId }] : []),
      ...(deal.historicalMedian90d ? [{ kind: 'calculated' as const, label: 'Mediana 90d', value: `${deal.historicalMedian90d.toFixed(2)} zł`, sourceId: deal.sourceId }] : []),
      { kind: 'calculated', label: 'Profit / ROI', value: `${profit.profit.toFixed(2)} zł / ${profit.roiPct.toFixed(1)}%`, confidence },
      ...(deal.estimatedResalePrice ? [{ kind: 'estimated' as const, label: 'Szacowana odsprzedaż', value: `${deal.estimatedResalePrice.toFixed(2)} zł`, confidence }] : []),
    ],
  };
}

export function rankDeals(deals: Deal[]): DealAnalysis[] {
  return deals.map(analyzeDeal).sort((a, b) => b.score - a.score);
}
