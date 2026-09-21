import type { DealAnalysis } from '../../domain/deal';

const PREFIX = 'extra-szpieg:v1:';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Persistence is best-effort; the in-memory application must continue to work.
  }
}

export type SzpiegState = {
  deals: DealAnalysis[];
  watched: string[];
  budget: number;
  minRoi: number;
  savedAt: string;
};

export const emptyState: SzpiegState = {
  deals: [],
  watched: [],
  budget: 5000,
  minRoi: 15,
  savedAt: '',
};

export function loadState(): SzpiegState {
  return {
    ...emptyState,
    deals: read<DealAnalysis[]>('deals', []),
    watched: read<string[]>('watched', []),
    budget: read<number>('budget', 5000),
    minRoi: read<number>('minRoi', 15),
    savedAt: read<string>('savedAt', ''),
  };
}

export function saveState(state: SzpiegState): void {
  write('deals', state.deals);
  write('watched', state.watched);
  write('budget', state.budget);
  write('minRoi', state.minRoi);
  write('savedAt', state.savedAt);
}

export function clearPersistedState(): void {
  try {
    Object.keys(localStorage)
      .filter(key => key.startsWith(PREFIX))
      .forEach(key => localStorage.removeItem(key));
  } catch {
    // Ignore storage failures.
  }
}
