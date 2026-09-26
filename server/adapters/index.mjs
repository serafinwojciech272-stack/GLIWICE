import * as ebay from './ebay.mjs';
import * as allegro from './allegro.mjs';

/** Adapter implementations keyed by provider id. Providers without an entry have no live adapter. */
const ADAPTERS = { ebay, allegro };

export function getAdapter(id) {
  return ADAPTERS[id] ?? null;
}
