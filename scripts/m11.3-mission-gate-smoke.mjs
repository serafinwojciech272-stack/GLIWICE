import { buildMissionIntent, applyMissionGate, MISSION_GATE_VERSION } from '../server/discoveryMissionGate.mjs';

const assert = (condition, message) => {
  if (!condition) throw new Error('M11.3 MISSION GATE SMOKE FAILED: ' + message);
};

const base = {
  sourceId: 'amazon',
  sourceUrl: 'https://example.com/item/sony-xm5',
  discoveryQualityScore: 92,
  evidencePackage: { status: 'READY', confidence: 90 },
  decision: { decision: 'BUY', decisionReady: true, confidence: 88, score: 84 },
};

const ready = buildMissionIntent(base);
assert(MISSION_GATE_VERSION === 'm11.3-decision-mission-gate-v1', 'version');
assert(ready.eligible === true, 'eligible BUY becomes mission');
assert(ready.state === 'AWAITING_APPROVAL', 'mission waits for approval');
assert(ready.execution === 'BLOCKED_UNTIL_APPROVAL', 'execution is blocked');
assert(/^mission-[a-f0-9]{20}$/.test(ready.missionId), 'mission id is deterministic');

const watch = buildMissionIntent({ ...base, decision: { ...base.decision, decision: 'WATCH' } });
assert(watch.eligible === false, 'WATCH cannot create mission');
assert(watch.missionId === null, 'WATCH has no mission');

const weakEvidence = buildMissionIntent({
  ...base,
  evidencePackage: { status: 'INCOMPLETE', confidence: 90 },
});
assert(weakEvidence.eligible === false, 'incomplete evidence blocks mission');

const gated = applyMissionGate([base, { ...base, decision: { ...base.decision, decision: 'PASS' } }]);
assert(gated.length === 2 && gated[0].missionIntent.eligible && !gated[1].missionIntent.eligible, 'batch gate');

console.log('M11.3 DECISION MISSION GATE SMOKE PASS');
