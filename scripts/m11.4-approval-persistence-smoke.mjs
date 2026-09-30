import { emptyState, loadState, saveState, createMissionRecord, approveMission, createApprovedMission } from '../src/services/persistence/localState.ts';

const storage = new Map();
globalThis.localStorage = {
  getItem: key => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key),
  get length(){ return storage.size; },
  key: index => [...storage.keys()][index] ?? null,
};

saveState(emptyState);
const input = {
  missionId: 'mission-m11-4-smoke',
  dealId: 'deal-m11-4',
  sourceId: 'amazon',
  sourceUrl: 'https://example.com/item',
  decision: 'BUY',
  confidence: 88,
  evidenceVersion: 'm11.2-evidence-package-v1',
  decisionVersion: 'm11.2-discovery-decision-bridge-v1',
};
const awaiting = createMissionRecord(input);
if (awaiting.state !== 'AWAITING_APPROVAL') throw new Error('mission not awaiting approval');
const duplicate = createMissionRecord(input);
if (duplicate.missionId !== awaiting.missionId || loadState().missions.length !== 1) throw new Error('mission idempotency failed');
const approved = approveMission(awaiting.missionId);
if (approved.state !== 'APPROVED' || !approved.approvedAt) throw new Error('approval persistence failed');
const created = createApprovedMission(awaiting.missionId);
if (created.state !== 'MISSION_CREATED' || !created.missionCreatedAt) throw new Error('mission creation failed');
if (loadState().missions[0].state !== 'MISSION_CREATED') throw new Error('final mission state not persisted');
console.log('M11.4 APPROVAL PERSISTENCE SMOKE PASS');
