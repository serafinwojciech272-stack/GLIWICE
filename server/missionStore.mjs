import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const VERSION = 'm12-server-mission-store-v1';
const dataDir = process.env.EXTRA_SZPIEG_DATA_DIR || '/tmp/extra-szpieg-data';
const filePath = join(dataDir, 'missions.json');
let cache = null;
let writeQueue = Promise.resolve();

async function loadStore() {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(await readFile(filePath, 'utf8'));
    cache = parsed && parsed.version === VERSION && Array.isArray(parsed.missions) && Array.isArray(parsed.events)
      ? parsed : { version: VERSION, missions: [], events: [] };
  } catch {
    cache = { version: VERSION, missions: [], events: [] };
  }
  return cache;
}

async function persist() {
  const snapshot = JSON.stringify(cache, null, 2);
  await mkdir(dirname(filePath), { recursive: true });
  const temp = filePath + '.tmp';
  await writeFile(temp, snapshot, 'utf8');
  await rename(temp, filePath);
}

async function mutate(fn) {
  const run = writeQueue.then(async () => { const store = await loadStore(); const result = await fn(store); await persist(); return result; });
  writeQueue = run.catch(() => {});
  return run;
}

export async function listMissions() { const store = await loadStore(); return store.missions.map(x => ({ ...x })); }
export async function getMission(missionId) { const store = await loadStore(); const found = store.missions.find(x => x.missionId === missionId); return found ? { ...found } : null; }

export async function createMission(input) {
  return mutate(store => {
    const existing = store.missions.find(x => x.missionId === input.missionId);
    if (existing) return { ...existing, idempotent: true };
    const now = new Date().toISOString();
    const mission = { ...input, state: 'AWAITING_APPROVAL', createdAt: input.createdAt || now, updatedAt: now };
    store.missions.push(mission);
    store.events.push({ eventId: 'mission-created-' + input.missionId + '-' + Date.now().toString(36), type: 'MISSION_CREATED_RECORD', missionId: input.missionId, at: now, version: VERSION });
    return { ...mission, idempotent: false };
  });
}

const transitions = Object.freeze({ AWAITING_APPROVAL: ['APPROVED','REJECTED'], APPROVED: ['MISSION_CREATED'], MISSION_CREATED: ['EXECUTING'], EXECUTING: ['COMPLETED','FAILED'], COMPLETED: [], FAILED: [], REJECTED: [] });

export async function transitionMission(missionId, nextState, metadata = {}) {
  return mutate(store => {
    const mission = store.missions.find(x => x.missionId === missionId);
    if (!mission) throw new Error('Mission not found: ' + missionId);
    if (!transitions[mission.state]?.includes(nextState)) throw new Error('Invalid mission transition: ' + mission.state + ' -> ' + nextState);
    const now = new Date().toISOString();
    mission.state = nextState; mission.updatedAt = now;
    if (nextState === 'APPROVED') mission.approvedAt = now;
    if (nextState === 'MISSION_CREATED') mission.missionCreatedAt = now;
    if (nextState === 'EXECUTING') mission.startedAt = now;
    if (nextState === 'COMPLETED' || nextState === 'FAILED') mission.completedAt = now;
    mission.lastEvent = { ...metadata, at: now };
    store.events.push({ eventId: 'mission-event-' + missionId + '-' + Date.now().toString(36), type: 'MISSION_' + nextState, missionId, at: now, metadata, version: VERSION });
    return { ...mission };
  });
}

export async function recordOutcome(missionId, input) {
  return mutate(store => {
    const mission = store.missions.find(x => x.missionId === missionId);
    if (!mission) throw new Error('Mission not found: ' + missionId);
    if (!['EXECUTING','MISSION_CREATED'].includes(mission.state)) throw new Error('Mission is not executable: ' + mission.state);
    if (!['SUCCESS','FAILURE','UNRESOLVED'].includes(input.outcome)) throw new Error('Invalid outcome.');
    const now = new Date().toISOString();
    mission.outcome = input.outcome;
    mission.realizedRoiPct = input.realizedRoiPct ?? null;
    mission.outcomeReason = String(input.reason || 'Outcome recorded.').slice(0, 500);
    mission.outcomeRecordedAt = now;
    if (input.learning && typeof input.learning === 'object') {
      mission.learningVersion = String(input.learning.version || '');
      mission.learningSampleSize = Number(input.learning.sampleSize) || 0;
      mission.learningSuccessRate = input.learning.successRate == null ? null : Number(input.learning.successRate);
    }
    if (input.outcome === 'SUCCESS') { mission.state = 'COMPLETED'; mission.completedAt = now; }
    else if (input.outcome === 'FAILURE') { mission.state = 'FAILED'; mission.completedAt = now; }
    mission.updatedAt = now;
    store.events.push({ eventId: 'mission-outcome-' + missionId + '-' + Date.now().toString(36), type: 'MISSION_OUTCOME_RECORDED', missionId, outcome: input.outcome, realizedRoiPct: input.realizedRoiPct ?? null, at: now, version: VERSION });
    return { ...mission };
  });
}

export async function storeHealth() {
  const store = await loadStore();
  return { version: VERSION, mode: 'SERVER_FILE', dataDir, filePath, missions: store.missions.length, events: store.events.length };
}
