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

export type SzpiegState = { deals: DealAnalysis[]; watched: string[]; actions: Record<string, DealActionState>; outcomes: DecisionOutcome[]; budget: number; minRoi: number; savedAt: string; };
const isOutcomes = (v: unknown): v is DecisionOutcome[] => Array.isArray(v) && v.every(x => x && typeof x === 'object' && typeof (x as DecisionOutcome).id === 'string' && typeof (x as DecisionOutcome).dealId === 'string');
export const emptyState: SzpiegState = { deals: [], watched: [], actions: {}, outcomes: [], budget: 5000, minRoi: 15, savedAt: '' };

export function loadState(): SzpiegState {
  return {
    deals: read('deals', [], isDeals),
    watched: read('watched', [], isStrings),
    actions: read('actions', {}, isActionMap),
    outcomes: read('outcomes', [], isOutcomes),
    budget: read('budget', emptyState.budget, isNumber),
    minRoi: read('minRoi', emptyState.minRoi, isRoi),
    savedAt: read('savedAt', ''),
  };
}
export function saveState(state: SzpiegState): void {
  write('deals', state.deals); write('watched', state.watched); write('actions', state.actions); write('outcomes', state.outcomes);
  write('budget', state.budget); write('minRoi', state.minRoi); write('savedAt', state.savedAt);
}
export function clearPersistedState(): void {
  try { Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).forEach(k => localStorage.removeItem(k)); } catch {}
}
