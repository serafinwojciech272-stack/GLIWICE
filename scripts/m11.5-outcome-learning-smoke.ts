import { emptyState, saveState, createMissionRecord, approveMission, createApprovedMission, startMission, loadState } from '../src/services/persistence/localState';
import { executeOutcomeLearning } from '../src/services/learning/missionOutcomeLoop';

const store = new Map<string, string>();
(globalThis as any).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k), key: (i: number) => [...store.keys()][i] ?? null };
saveState(emptyState);

const deal: any = {
  id: 'deal-m11-5', productId: 'sony-xm5', title: 'Sony WH-1000XM5', store: 'Amazon', category: 'electronics', price: 600,
  sourceId: 'amazon', sourceUrl: 'https://example.com/item', observedAt: new Date().toISOString(), condition: 'new', availability: 'in_stock',
  discountPct: 20, marketAdvantagePct: 20, historicalAdvantagePct: 15, totalCost: 600, potentialProfit: 150, marginPct: 20,
  roiPct: 25, score: 88, confidence: 90, riskScore: 10, risk: 'low', verdict: 'STRONG BUY', reasons: [], evidence: []
};
const mission = createMissionRecord({ missionId: 'mission-m11-5', dealId: deal.id, sourceId: 'amazon', sourceUrl: deal.sourceUrl, decision: 'BUY', confidence: 90 });
approveMission(mission.missionId); createApprovedMission(mission.missionId); startMission(mission.missionId);
const result = executeOutcomeLearning({ missionId: mission.missionId, deal, outcome: 'SUCCESS', realizedRoiPct: 25, reason: 'Smoke test: completed successfully.' });
if (result.mission.state !== 'COMPLETED') throw new Error('mission did not complete');
if (result.outcome.outcome !== 'SUCCESS') throw new Error('outcome not persisted');
if (result.policy.sampleSize !== 1 || result.policy.successRate !== 1) throw new Error('learning policy not updated');
if (loadState().outcomes.length !== 1) throw new Error('outcome persistence failed');
if (loadState().missions[0].learningSampleSize !== 1) throw new Error('learning snapshot missing');
console.log('M11.5 OUTCOME LEARNING SMOKE PASS');
