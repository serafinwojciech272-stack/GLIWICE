export const MISSION_LIFECYCLE_VERSION = 'm11.6-mission-lifecycle-contract-v1';

export const MISSION_STATES = Object.freeze([
  'AWAITING_APPROVAL','APPROVED','MISSION_CREATED','EXECUTING','COMPLETED','FAILED','REJECTED',
]);

const transitions = Object.freeze({
  AWAITING_APPROVAL: ['APPROVED','REJECTED'],
  APPROVED: ['MISSION_CREATED'],
  MISSION_CREATED: ['EXECUTING'],
  EXECUTING: ['COMPLETED','FAILED'],
  COMPLETED: [],
  FAILED: [],
  REJECTED: [],
});

export function canTransition(from, to) {
  return Array.isArray(transitions[from]) && transitions[from].includes(to);
}

export function transitionMission(mission, nextState, metadata = {}) {
  if (!mission || typeof mission !== 'object') throw new Error('Mission is required.');
  if (!MISSION_STATES.includes(mission.state)) throw new Error('Unknown mission state: ' + mission.state);
  if (!canTransition(mission.state, nextState)) throw new Error(`Invalid mission transition: ${mission.state} -> ${nextState}`);
  const now = new Date().toISOString();
  const next = { ...mission, state: nextState, updatedAt: now };
  if (nextState === 'APPROVED') next.approvedAt = now;
  if (nextState === 'MISSION_CREATED') next.missionCreatedAt = now;
  if (nextState === 'EXECUTING') next.startedAt = now;
  if (nextState === 'COMPLETED') next.completedAt = now;
  if (nextState === 'FAILED') next.failedAt = now;
  if (metadata && typeof metadata === 'object') next.lastEvent = { ...metadata, at: now };
  return next;
}

export function buildApprovalEvent(mission, approvedBy = 'human') {
  if (!mission?.missionId) throw new Error('missionId is required.');
  if (mission.state !== 'AWAITING_APPROVAL') throw new Error('Mission is not awaiting approval.');
  return {
    version: MISSION_LIFECYCLE_VERSION,
    eventId: 'approval-' + mission.missionId + '-' + Date.now().toString(36),
    type: 'MISSION_APPROVED',
    missionId: mission.missionId,
    approvedBy,
    at: new Date().toISOString(),
    execution: 'BLOCKED_UNTIL_MISSION_CREATED',
  };
}
