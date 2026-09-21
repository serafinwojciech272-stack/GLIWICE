import type { DealAnalysis } from '../../domain/deal';

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

export type SzpiegState = { deals: DealAnalysis[]; watched: string[]; budget: number; minRoi: number; savedAt: string; };
export const emptyState: SzpiegState = { deals: [], watched: [], budget: 5000, minRoi: 15, savedAt: '' };

export function loadState(): SzpiegState {
  return {
    deals: read('deals', [], isDeals),
    watched: read('watched', [], isStrings),
    budget: read('budget', emptyState.budget, isNumber),
    minRoi: read('minRoi', emptyState.minRoi, isRoi),
    savedAt: read('savedAt', ''),
  };
}
export function saveState(state: SzpiegState): void {
  write('deals', state.deals); write('watched', state.watched);
  write('budget', state.budget); write('minRoi', state.minRoi); write('savedAt', state.savedAt);
}
export function clearPersistedState(): void {
  try { Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).forEach(k => localStorage.removeItem(k)); } catch {}
}
