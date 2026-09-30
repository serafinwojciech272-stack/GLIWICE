import type { DealAnalysis } from '../../domain/deal';
import type { DealActionState } from '../decision/actionState.js';
import { isDealActionState } from '../decision/actionState.js';
import type { DecisionOutcome } from '../learning/decisionPolicyLearning';

const PREFIX = 'extra-szpieg:v2:';

function read<T>(key: string, fallback: T, validate?: (value: unknown) => value is T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    const value: unknown = JSON.parse(raw);
    return validate && !validate(value) ? fallback : value as T;
  } catch { return fallback; }
}
function write<T>(key: string, value: T): void {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* best effort */ }
}
const isDeals = (v: unknown): v is DealAnalysis[] =>
  Array.isArray(v) && v.every(x => x && typeof x === 'object' && typeof (x as DealAnalysis).id === 'string');
const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === 'string');
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const isRoi = (v: unknown): v is number => isNumber(v) && v <= 1000;
const isActionMap = (v: unknown): v is Record<string, DealActionState> =>
  !!v && typeof v === 'object' && !Array.isArray(v) && Object.entries(v).every(([key, value]) => typeof key === 'string' && isDealActionState(value));

export type SzpiegState = { deals: DealAnalysis[]; watched: string[]; actions: Record<string, DealActionState>; outcomes: DecisionOutcome[]; missions: MissionRecord[]; budget: number; minRoi: number; savedAt: string; };
const isOutcomes = (v: unknown): v is DecisionOutcome[] => Array.isArray(v) && v.every(x => x && typeof x === 'object' && typeof (x as DecisionOutcome).id === 'string' && typeof (x as DecisionOutcome).dealId === 'string');
export const emptyState: SzpiegState = { deals: [], watched: [], actions: {}, outcomes: [], missions: [], budget: 5000, minRoi: 15, savedAt: '' };

export function loadState(): SzpiegState {
  return {
    deals: read('deals', [], isDeals),
    watched: read('watched', [], isStrings),
    actions: read('actions', {}, isActionMap),
    outcomes: read('outcomes', [], isOutcomes),
    missions: read('missions', [], isMissions),
    budget: read('budget', emptyState.budget, isNumber),
    minRoi: read('minRoi', emptyState.minRoi, isRoi),
    savedAt: read('savedAt', ''),
  };
}
export function saveState(state: SzpiegState): void {
  write('deals', state.deals); write('watched', state.watched); write('actions', state.actions); write('outcomes', state.outcomes); write('missions', state.missions);
  write('budget', state.budget); write('minRoi', state.minRoi); write('savedAt', state.savedAt);
}
export function clearPersistedState(): void {
  try { Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).forEach(k => localStorage.removeItem(k)); } catch {}
}


export type MissionState = 'AWAITING_APPROVAL' | 'APPROVED' | 'MISSION_CREATED' | 'REJECTED';
export type MissionRecord = {
  missionId: string;
  dealId: string;
  sourceId: string;
  sourceUrl: string;
  decision: 'BUY';
  state: MissionState;
  createdAt: string;
  approvedAt?: string;
  missionCreatedAt?: string;
  evidenceVersion?: string;
  decisionVersion?: string;
  confidence: number;
};

const isMissionState = (v: unknown): v is MissionState =>
  v === 'AWAITING_APPROVAL' || v === 'APPROVED' || v === 'MISSION_CREATED' || v === 'REJECTED';
const isMissionRecord = (v: unknown): v is MissionRecord =>
  !!v && typeof v === 'object' && typeof (v as MissionRecord).missionId === 'string' &&
  typeof (v as MissionRecord).dealId === 'string' && typeof (v as MissionRecord).sourceUrl === 'string' &&
  (v as MissionRecord).decision === 'BUY' && isMissionState((v as MissionRecord).state) &&
  typeof (v as MissionRecord).createdAt === 'string';
const isMissions = (v: unknown): v is MissionRecord[] => Array.isArray(v) && v.every(isMissionRecord);

export function createMissionRecord(input: Omit<MissionRecord, 'state' | 'createdAt'> & { createdAt?: string }): MissionRecord {
  const existing = loadState().missions.find(m => m.missionId === input.missionId);
  if (existing) return existing;
  const record: MissionRecord = {
    ...input,
    state: 'AWAITING_APPROVAL',
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
  const state = loadState();
  saveState({ ...state, missions: [...state.missions, record], savedAt: new Date().toISOString() });
  return record;
}

export function approveMission(missionId: string): MissionRecord {
  const state = loadState();
  const mission = state.missions.find(m => m.missionId === missionId);
  if (!mission) throw new Error('Mission not found: ' + missionId);
  if (mission.state !== 'AWAITING_APPROVAL') throw new Error('Mission is not awaiting approval: ' + mission.state);
  const updated = { ...mission, state: 'APPROVED' as const, approvedAt: new Date().toISOString() };
  saveState({ ...state, missions: state.missions.map(m => m.missionId === missionId ? updated : m), savedAt: new Date().toISOString() });
  return updated;
}

export function createApprovedMission(missionId: string): MissionRecord {
  const state = loadState();
  const mission = state.missions.find(m => m.missionId === missionId);
  if (!mission) throw new Error('Mission not found: ' + missionId);
  if (mission.state !== 'APPROVED') throw new Error('Mission must be APPROVED before creation: ' + mission.state);
  const updated = { ...mission, state: 'MISSION_CREATED' as const, missionCreatedAt: new Date().toISOString() };
  saveState({ ...state, missions: state.missions.map(m => m.missionId === missionId ? updated : m), savedAt: new Date().toISOString() });
  return updated;
}

export function listMissions(): MissionRecord[] { return loadState().missions; }
