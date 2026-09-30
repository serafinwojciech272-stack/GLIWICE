import crypto from 'node:crypto';

const clamp = value => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

export const MISSION_GATE_VERSION = 'm11.3-decision-mission-gate-v1';

export function buildMissionIntent(deal) {
  const decision = deal?.decision?.decision;
  const ready = deal?.decision?.decisionReady === true;
  const evidenceReady = deal?.evidencePackage?.status === 'READY';
  const confidence = clamp(Math.min(
    deal?.decision?.confidence ?? 0,
    deal?.evidencePackage?.confidence ?? 0,
    deal?.discoveryQualityScore ?? 0,
  ));

  const eligible = decision === 'BUY' && ready && evidenceReady && confidence >= 60;
  const missionId = eligible
    ? 'mission-' + crypto.createHash('sha256').update(String(deal.sourceId || '') + '|' + String(deal.sourceUrl || '')).digest('hex').slice(0, 20)
    : null;

  return {
    version: MISSION_GATE_VERSION,
    missionId,
    eligible,
    state: eligible ? 'AWAITING_APPROVAL' : 'NO_MISSION',
    execution: 'BLOCKED_UNTIL_APPROVAL',
    action: eligible ? 'REVIEW_BUY_OPPORTUNITY' : 'NO_ACTION',
    confidence,
    reasons: eligible
      ? ['BUY decision is evidence-backed and passed the action gate.', 'Mission execution is blocked until explicit user approval.']
      : [
          decision ? 'decision=' + decision : 'decision=MISSING',
          ready ? 'decisionReady=true' : 'decisionReady=false',
          evidenceReady ? 'evidence=READY' : 'evidence=INCOMPLETE',
          'confidence=' + confidence + '/100',
        ],
  };
}

export function applyMissionGate(deals) {
  return (Array.isArray(deals) ? deals : []).map(deal => ({
    ...deal,
    missionIntent: buildMissionIntent(deal),
  }));
}
