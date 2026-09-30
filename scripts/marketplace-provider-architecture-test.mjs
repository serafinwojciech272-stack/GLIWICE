import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PROVIDERS, PROVIDER_IDS, SECRET_KEYS, marketplaceHealth, providerEnabled, providerCredentialsPresent } from '../server/providers.mjs';
import { searchAllProviders } from '../server/searchAggregator.mjs';

const results = [];
const record = (name, fn) => {
  try { fn(); results.push({ name, ok: true }); }
  catch (error) { results.push({ name, ok: false, error: error.message }); }
};
const recordAsync = async (name, fn) => {
  try { await fn(); results.push({ name, ok: true }); }
  catch (error) { results.push({ name, ok: false, error: error.message }); }
};

const noRedact = value => String(value == null ? '' : value);
const providerById = id => PROVIDERS.find(p => p.id === id);

// --- eBay removal ---

record('eBay is registered but disabled by default', () => {
  const ebay = providerById('ebay');
  assert.ok(ebay, 'eBay provider entry missing');
  assert.equal(ebay.enabledByDefault, false);
  assert.equal(providerEnabled(ebay), false, 'eBay must be disabled without EBAY_ENABLED=true');
});

record('eBay reports status "disabled"', () => {
  const health = marketplaceHealth().find(x => x.id === 'ebay');
  assert.equal(health.status, 'disabled');
  assert.equal(health.enabled, false);
});

record('no eBay credential is required for the provider set', () => {
  // With a clean environment, every provider resolves without throwing.
  assert.doesNotThrow(() => marketplaceHealth());
  assert.equal(providerCredentialsPresent(providerById('ebay')), false);
});

record('eBay is classified not-suitable in the roadmap', () => {
  const ebay = providerById('ebay');
  assert.equal(ebay.roadmap.state, 'not-suitable');
});

// --- Gateway works without eBay ---

await recordAsync('search fan-out excludes disabled eBay and does not throw', async () => {
  const calls = [];
  const result = await searchAllProviders({
    query: 'iphone',
    limit: 5,
    onlyProviderId: null,
    providers: PROVIDERS.map(p => ({ id: p.id, enabled: () => providerEnabled(p), credentialsPresent: () => providerCredentialsPresent(p) })),
    getAdapter: id => ({ search: async () => { calls.push(id); return []; } }),
    redact: noRedact,
  });
  assert.ok(!calls.includes('ebay'), 'eBay adapter must not be called while disabled');
  assert.ok(Array.isArray(result.results));
  assert.ok(result.unavailable.some(x => x.id === 'ebay' && x.reason === 'disabled'), 'eBay must be reported unavailable');
});

// --- Allegro remains independent ---

record('Allegro stays registered, enabled and independent of eBay', () => {
  const allegro = providerById('allegro');
  assert.equal(providerEnabled(allegro), true);
  assert.equal(allegro.enabledByDefault, true);
  assert.equal(allegro.roadmap.state, 'implemented');
});

// --- Provider failure isolation ---

await recordAsync('a failing provider does not crash the aggregate', async () => {
  const result = await searchAllProviders({
    query: 'iphone',
    limit: 5,
    onlyProviderId: null,
    providers: [
      { id: 'allegro', enabled: () => true, credentialsPresent: () => true },
      { id: 'olx', enabled: () => true, credentialsPresent: () => true },
    ],
    getAdapter: id => ({
      search: async () => {
        if (id === 'olx') throw new Error('boom');
        return [{ id: 'allegro:1', title: 'ok', price: 1, currency: 'PLN', url: 'u', source: 'allegro', condition: 'unknown', location: null, image: null, timestamp: 't' }];
      },
    }),
    redact: noRedact,
  });
  assert.equal(result.results.length, 1, 'healthy provider results must survive');
  const failed = result.providers.find(p => p.id === 'olx');
  assert.equal(failed.status, 'error');
  assert.match(failed.error, /boom/);
  const ok = result.providers.find(p => p.id === 'allegro');
  assert.equal(ok.status, 'ok');
});

await recordAsync('all providers failing still returns a valid envelope', async () => {
  const result = await searchAllProviders({
    query: 'iphone',
    limit: 5,
    onlyProviderId: null,
    providers: [{ id: 'olx', enabled: () => true, credentialsPresent: () => true }],
    getAdapter: () => ({ search: async () => { throw new Error('down'); } }),
    redact: noRedact,
  });
  assert.deepEqual(result.results, []);
  assert.equal(result.providers[0].status, 'error');
});

// --- Normalized result contract ---

await recordAsync('provider results use the existing Deal contract', async () => {
  // Shape produced by the existing mappers (mapEbayItemSummaries / mapAllegroListing).
  const deal = {
    id: 'allegro:1', productId: 'p1', title: 'X', store: 'Allegro', category: 'Allegro',
    price: 10, condition: 'unknown', availability: 'unknown', sourceId: 'allegro',
    sourceUrl: 'https://allegro.pl/oferta/1', observedAt: '2026-09-26T00:00:00.000Z',
  };
  const result = await searchAllProviders({
    query: 'x',
    limit: 1,
    onlyProviderId: null,
    providers: [{ id: 'allegro', enabled: () => true, credentialsPresent: () => true }],
    getAdapter: () => ({ search: async () => [deal] }),
    redact: noRedact,
  });
  const out = result.results[0];
  for (const field of ['id', 'productId', 'title', 'store', 'category', 'price', 'condition', 'availability', 'sourceId', 'sourceUrl', 'observedAt']) {
    assert.ok(field in out, 'Deal contract missing field ' + field);
  }
  assert.equal(out.sourceId, 'allegro', 'sourceId identifies the provider');
});

record('adapters return the same contract regardless of provider', () => {
  // Both mappers must emit the shared Deal shape, not provider-specific models.
  const ebayMapper = fs.readFileSync('server/ebayMapper.mjs', 'utf8');
  const allegroMapper = fs.readFileSync('src/server/allegroMapper.ts', 'utf8');
  for (const field of ['productId', 'sourceId', 'sourceUrl', 'observedAt']) {
    assert.ok(ebayMapper.includes(field), 'ebay mapper missing ' + field);
    assert.ok(allegroMapper.includes(field), 'allegro mapper missing ' + field);
  }
});

record('provider registry exposes no duplicate ids and known secret keys', () => {
  const ids = PROVIDERS.map(p => p.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate provider id');
  assert.equal(PROVIDER_IDS.size, ids.length);
  assert.ok(SECRET_KEYS.includes('EBAY_CLIENT_SECRET'));
  assert.ok(SECRET_KEYS.includes('ALLEGRO_CLIENT_SECRET'));
});

for (const r of results) console.log((r.ok ? 'PASS  ' : 'FAIL  ') + r.name + (r.ok ? '' : ' :: ' + r.error));
const failed = results.filter(r => !r.ok);
console.log('MARKETPLACE PROVIDER ARCHITECTURE: ' + (failed.length ? 'FAIL (' + failed.length + ')' : 'PASS'));
if (failed.length) process.exit(1);
