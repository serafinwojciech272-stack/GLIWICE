import assert from 'node:assert/strict';
import { calculateProfit } from '../src/services/profitEngine.ts';
import { analyzeDeal } from '../src/services/dealEngine.ts';
import { decideOpportunity } from '../src/services/decision/opportunityEngine.ts';
import { summarizeEvidence, isActionableEvidence } from '../src/services/evidence/provenance.ts';
import { matchProduct } from '../src/services/matching/productMatcher.ts';
import { buildPortfolioPlan } from '../src/services/profit/portfolioEngine.ts';

const base = {
  id: 'qa-1', productId: 'qa-product', ean: '5901234567890', sku: 'QA-001',
  title: 'Sony WH-1000XM5', brand: 'Sony', model: 'WH-1000XM5',
  store: 'QA Store', category: 'Audio', price: 600, previousPrice: 900,
  marketMedian: 900, historicalMedian90d: 880, estimatedResalePrice: 820,
  shippingIn: 0, condition: 'new', availability: 'in_stock', sellerRating: 4.9,
  sourceId: 'qa-source', sourceUrl: 'https://example.com/qa', observedAt: new Date().toISOString(),
};

const profit = calculateProfit({ purchasePrice: 600, resalePrice: 820, marketplaceFeePct: 8, paymentFeePct: 1.5, packagingCost: 8 });
assert.equal(profit.totalCost, 686);
assert.equal(Math.round(profit.profit), 134);
assert.ok(profit.roiPct > 19);

const deal = analyzeDeal(base);
assert.ok(deal.score >= 0 && deal.score <= 100);
assert.ok(deal.confidence >= 75);
assert.ok(deal.evidence.length >= 4);
assert.ok(Number.isFinite(deal.roiPct));

const decision = decideOpportunity(deal);
assert.ok(['BUY','WATCH','PASS'].includes(decision.decision));
assert.ok(decision.buyScore >= 0 && decision.buyScore <= 100);

const evidence = summarizeEvidence(deal);
assert.equal(evidence.missingSourceCount, 0);
assert.ok(evidence.observedCount >= 2);
assert.ok(isActionableEvidence(deal));

const candidate = { ...base, id: 'qa-2', title: 'Sony WH-1000XM5 czarne', sourceId: 'qa-source-2' };
const match = matchProduct(base, candidate);
assert.equal(match.method, 'ean_exact');
assert.ok(match.confidence >= 90);
assert.equal(match.needsReview, false);

const portfolio = buildPortfolioPlan([deal], 2000);
assert.ok(portfolio.invested > 0);
assert.ok(portfolio.expectedProfit > 0);
assert.ok(portfolio.expectedRoiPct > 0);

console.log('CORE ENGINE QA PASS');
console.log(JSON.stringify({
  score: deal.score,
  roiPct: Number(deal.roiPct.toFixed(1)),
  confidence: deal.confidence,
  decision: decision.decision,
  buyScore: decision.buyScore,
  evidence: evidence.status,
  match: match.method,
  portfolioRoiPct: Number(portfolio.expectedRoiPct.toFixed(1)),
}, null, 2));
