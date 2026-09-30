import { buildApprovalEvent, transitionMission } from '../server/missionLifecycle.mjs';

const base = { missionId: 'mission-m11-6', state: 'AWAITING_APPROVAL', decision: 'BUY' };
const approval = buildApprovalEvent(base);
if (approval.type !== 'MISSION_APPROVED' || approval.execution !== 'BLOCKED_UNTIL_MISSION_CREATED') throw new Error('approval event contract failed');
const approved = transitionMission(base, 'APPROVED', { type: approval.type });
const created = transitionMission(approved, 'MISSION_CREATED');
const executing = transitionMission(created, 'EXECUTING');
const completed = transitionMission(executing, 'COMPLETED', { outcome: 'SUCCESS' });
if (completed.state !== 'COMPLETED' || !completed.completedAt) throw new Error('lifecycle completion failed');
let blocked = false;
try { transitionMission(base, 'EXECUTING'); } catch { blocked = true; }
if (!blocked) throw new Error('approval gate bypass detected');
console.log('M11.6 MISSION LIFECYCLE CONTRACT SMOKE PASS');
