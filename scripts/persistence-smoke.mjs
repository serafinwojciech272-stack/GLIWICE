const store = new Map();

globalThis.localStorage = {
  getItem(key) { return store.has(key) ? store.get(key) : null; },
  setItem(key, value) { const serialized = String(value); store.set(key, serialized); this[key] = serialized; },
  removeItem(key) { store.delete(key); delete this[key]; },
  key(index) { return Array.from(store.keys())[index] ?? null; },
  get length() { return store.size; },
};

const { saveState, loadState, clearPersistedState, emptyState } = await import('../src/services/persistence/localState.ts');

const deal = {
  id: 'persistence-smoke-deal',
  title: 'Persistence smoke deal',
  store: 'Smoke Store',
};

const state = {
  ...emptyState,
  deals: [deal],
  watched: [deal.id],
  budget: 7777,
  minRoi: 27,
  savedAt: '2026-09-22T10:00:00.000Z',
};

saveState(state);
const restored = loadState();

if (restored.deals.length !== 1 || restored.deals[0].id !== deal.id) throw new Error('deals did not persist');
if (restored.watched.length !== 1 || restored.watched[0] !== deal.id) throw new Error('watchlist did not persist');
if (restored.budget !== 7777 || restored.minRoi !== 27) throw new Error('settings did not persist');
if (restored.savedAt !== state.savedAt) throw new Error('savedAt did not persist');

clearPersistedState();
const cleared = loadState();
if (cleared.deals.length !== 0 || cleared.watched.length !== 0 || cleared.budget !== 5000 || cleared.minRoi !== 15) {
  throw new Error('clearPersistedState did not restore defaults');
}

console.log('PERSISTENCE SMOKE PASS');
