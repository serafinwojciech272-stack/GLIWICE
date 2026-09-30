import assert from 'node:assert/strict';
import { analyzeDeal } from '../src/services/dealEngine.ts';
import { decideOpportunity } from '../src/services/decision/opportunityEngine.ts';
import {
  arbitratePolicyContext,
  buildAdaptivePolicy,
  evaluateDecisionOutcome,
} from '../src/services/learning/decisionPolicyLearning.ts';

const storage = new Map();
globalThis.localStorage = {
  getItem(key) { return storage.has(key) ? storage.get(key) : null; },
  setItem(key, value) { storage.set(key, String(value)); },
  removeItem(key) { storage.delete(key); },
};

const { loadState, saveState, clearPersistedState, emptyState } =
  await import('../src/services/persistence/localState.ts');

clearPersistedState();

const sourceDeal = {
  id: 'm10-1-runtime-deal',
  productId: 'm10-1-product',
  ean: '5901234567890',
  sku: 'M10.1-001',
  title: 'Sony WH-1000XM5',
  brand: 'Sony',
  model: 'WH-1000XM5',
  store: 'Runtime QA Store',
  category: 'Audio',
  price: 600,
  previousPrice: 900,
  marketMedian: 900,
  historicalMedian90d: 880,
  estimatedResalePrice: 820,
  shippingIn: 0,
  condition: 'new',
  availability: 'in_stock',
  sellerRating: 4.9,
  sourceId: 'runtime-qa-source',
  sourceUrl: 'https://example.com/m10-1',
  observedAt: new Date().toISOString(),
};

const deal = analyzeDeal(sourceDeal);
assert.equal(deal.id, sourceDeal.id);
assert.ok(Number.isFinite(deal.roiPct));
assert.ok(deal.confidence >= 0 && deal.confidence <= 100);

const seedDecision = decideOpportunity(deal);
const outcomes = Array.from({ length: 6 }, (_, i) => ({
  ...evaluateDecisionOutcome({
    deal,
    decision: seedDecision.decision,
    realizedRoiPct: i < 5 ? 22 : -5,
    reason: 'M10.1 runtime seed outcome',
  }),
  id: `m10-1-outcome-${i}`,
  category: 'Audio',
  sourceId: 'runtime-qa-source',
  outcome: i < 5 ? 'SUCCESS' : 'FAILURE',
}));

const policy = buildAdaptivePolicy(outcomes);
const arbitration = arbitratePolicyContext({ deal, outcomes, memory: policy.memory });

assert.equal(arbitration.version, 'm10.0-contextual-policy-arbitration-v1');
assert.ok(arbitration.cohorts.includes('Audio'));
assert.ok(arbitration.cohorts.includes('runtime-qa-source'));
assert.ok(arbitration.sampleSize >= 6);

const decision = decideOpportunity(deal, policy);
assert.ok(['BUY', 'WATCH', 'PASS'].includes(decision.decision));
assert.ok(decision.reasons.some((reason) => reason.startsWith('context ')));

const state = { ...emptyState, deals: [deal], outcomes, savedAt: new Date().toISOString() };
saveState(state);
const reloaded = loadState();

assert.equal(reloaded.deals.length, 1);
assert.equal(reloaded.deals[0].id, deal.id);
assert.equal(reloaded.outcomes.length, 6);
assert.equal(reloaded.outcomes[0].category, 'Audio');
assert.equal(reloaded.outcomes[0].sourceId, 'runtime-qa-source');

const reloadedPolicy = buildAdaptivePolicy(reloaded.outcomes);
const reloadedArbitration = arbitratePolicyContext({
  deal: reloaded.deals[0],
  outcomes: reloaded.outcomes,
  memory: reloadedPolicy.memory,
});
const reloadedDecision = decideOpportunity(reloaded.deals[0], reloadedPolicy);

assert.deepEqual(
  {
    cohorts: reloadedArbitration.cohorts,
    sampleSize: reloadedArbitration.sampleSize,
    score: reloadedArbitration.score,
    confidence: reloadedArbitration.confidence,
    actionDelta: reloadedArbitration.actionDelta,
    riskDelta: reloadedArbitration.riskDelta,
  },
  {
    cohorts: arbitration.cohorts,
    sampleSize: arbitration.sampleSize,
    score: arbitration.score,
    confidence: arbitration.confidence,
    actionDelta: arbitration.actionDelta,
    riskDelta: arbitration.riskDelta,
  },
);
assert.equal(reloadedDecision.decision, decision.decision);
assert.ok(reloadedDecision.reasons.some((reason) => reason.startsWith('context ')));

console.log('M10.1 RUNTIME INTEGRATION PASS');
console.log(JSON.stringify({
  dealId: deal.id,
  policyVersion: policy.version,
  memoryVersion: policy.memory?.version,
  arbitrationVersion: arbitration.version,
  cohorts: arbitration.cohorts,
  sampleSize: arbitration.sampleSize,
  contextScore: arbitration.score,
  contextConfidence: arbitration.confidence,
  decision: decision.decision,
  persistedOutcomes: reloaded.outcomes.length,
}, null, 2));
