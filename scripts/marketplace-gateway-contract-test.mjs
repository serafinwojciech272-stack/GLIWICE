import assert from 'node:assert/strict';
import { MarketplaceContractError, parseMarketplaceSearchResponse } from '../src/sources/marketplaceGatewayContract.ts';
import { createMarketplaceApiSource } from '../src/sources/marketplaceApiSource.ts';
import { runScan } from '../src/services/scanEngine.ts';

const validDeal = {
  id: 'ebay:123',
  productId: '123',
  title: 'Sony WH-1000XM5',
  store: 'eBay',
  category: 'Audio',
  condition: 'new',
  availability: 'in_stock',
  price: 599.99,
  sourceId: 'ebay',
  sourceUrl: 'https://www.ebay.pl/itm/123',
  observedAt: new Date().toISOString(),
};

const results = [];
const record = (name, fn) => { try { fn(); results.push({ name, ok: true }); } catch (e) { results.push({ name, ok: false, error: e.message }); } };

function expectContractError(fn, kind) {
  try { fn(); } catch (error) {
    assert.ok(error instanceof MarketplaceContractError, 'expected MarketplaceContractError, got ' + error);
    assert.equal(error.kind, kind, 'expected kind ' + kind + ', got ' + error.kind);
    return;
  }
  throw new Error('expected a MarketplaceContractError but none was thrown');
}

// CASE 1: valid response with zero results
record('CASE 1 valid empty results -> []', () => {
  const parsed = parseMarketplaceSearchResponse({ query: 'iphone', results: [], sources: [], generatedAt: 'x' });
  assert.deepEqual(parsed.results, []);
  assert.equal(parsed.query, 'iphone');
});

// CASE 2: valid response with one valid deal
record('CASE 2 valid single deal', () => {
  const parsed = parseMarketplaceSearchResponse({ query: 'iphone', results: [validDeal] });
  assert.equal(parsed.results.length, 1);
  assert.equal(parsed.results[0].id, 'ebay:123');
  assert.equal(parsed.results[0].price, 599.99);
  assert.equal(parsed.results[0].availability, 'in_stock');
  assert.equal(parsed.results[0].condition, 'new');
});

// CASE 3: missing results
record('CASE 3 missing results -> fail', () => {
  expectContractError(() => parseMarketplaceSearchResponse({ query: 'iphone' }), 'schema');
  expectContractError(() => parseMarketplaceSearchResponse({}), 'schema');
});

// CASE 4: results not an array
record('CASE 4 non-array results -> fail', () => {
  expectContractError(() => parseMarketplaceSearchResponse({ results: {} }), 'schema');
  expectContractError(() => parseMarketplaceSearchResponse({ results: 'nope' }), 'schema');
});

// CASE 4b: non-object response
record('CASE 4b non-object response -> fail', () => {
  expectContractError(() => parseMarketplaceSearchResponse(null), 'schema');
  expectContractError(() => parseMarketplaceSearchResponse('string'), 'schema');
  expectContractError(() => parseMarketplaceSearchResponse([validDeal]), 'schema');
});

// CASE 5: malformed deal entries
record('CASE 5 malformed deal -> fail', () => {
  expectContractError(() => parseMarketplaceSearchResponse({ results: [null] }), 'deal');
  expectContractError(() => parseMarketplaceSearchResponse({ results: [{}] }), 'deal');
  expectContractError(() => parseMarketplaceSearchResponse({ results: [{ ...validDeal, id: '' }] }), 'deal');
  expectContractError(() => parseMarketplaceSearchResponse({ results: [{ ...validDeal, sourceUrl: undefined }] }), 'deal');
  expectContractError(() => parseMarketplaceSearchResponse({ results: [{ ...validDeal, observedAt: 5 }] }), 'deal');
  expectContractError(() => parseMarketplaceSearchResponse({ results: [{ ...validDeal, availability: 'nope' }] }), 'deal');
  expectContractError(() => parseMarketplaceSearchResponse({ results: [{ ...validDeal, condition: 'broken' }] }), 'deal');
});

// CASE 6: invalid numeric values
record('CASE 6 invalid numeric -> fail', () => {
  expectContractError(() => parseMarketplaceSearchResponse({ results: [{ ...validDeal, price: 'free' }] }), 'deal');
  expectContractError(() => parseMarketplaceSearchResponse({ results: [{ ...validDeal, price: -1 }] }), 'deal');
  expectContractError(() => parseMarketplaceSearchResponse({ results: [{ ...validDeal, marketMedian: 'x' }] }), 'deal');
  expectContractError(() => parseMarketplaceSearchResponse({ results: [{ ...validDeal, shippingIn: Number.NaN }] }), 'deal');
});

// CASE 2b: optional fields allowed and preserved
record('CASE 2b optional fields preserved', () => {
  const parsed = parseMarketplaceSearchResponse({ results: [{ ...validDeal, ean: '5901234567890', previousPrice: 799, sellerRating: 4.8 }] });
  assert.equal(parsed.results[0].ean, '5901234567890');
  assert.equal(parsed.results[0].previousPrice, 799);
  assert.equal(parsed.results[0].sellerRating, 4.8);
});

async function adapterCases() {
  const originalFetch = globalThis.fetch;
  const adapter = createMarketplaceApiSource();

  // CASE 1 (adapter): valid empty
  globalThis.fetch = async () => new Response(JSON.stringify({ query: 'iphone', results: [], message: 'no live provider' }), { status: 200, headers: { 'content-type': 'application/json' } });
  let scan = await adapter.scan('iphone');
  assert.deepEqual(scan.deals, [], 'adapter must return [] for valid empty');
  assert.equal(scan.source.health, 'degraded');
  assert.equal(scan.errors.length, 1, 'empty results should carry a message');

  // CASE 2 (adapter): valid deal
  globalThis.fetch = async () => new Response(JSON.stringify({ query: 'iphone', results: [validDeal] }), { status: 200, headers: { 'content-type': 'application/json' } });
  scan = await adapter.scan('iphone');
  assert.equal(scan.deals.length, 1, 'adapter must return the valid deal');
  assert.equal(scan.source.health, 'healthy');
  assert.deepEqual(scan.errors, []);

  // CASE 3/4/5 (adapter): schema + deal violations must not silently become []
  for (const bad of [{ query: 'x' }, { results: {} }, { results: [{}] }, { results: [{ ...validDeal, price: 'x' }] }]) {
    globalThis.fetch = async () => new Response(JSON.stringify(bad), { status: 200, headers: { 'content-type': 'application/json' } });
    const badScan = await adapter.scan('iphone');
    assert.deepEqual(badScan.deals, []);
    assert.equal(badScan.source.health, 'offline');
    assert.equal(badScan.errors.length, 1);
    assert.match(badScan.errors[0], /contract violation/, 'must report a contract violation, not a silent empty: ' + badScan.errors[0]);
  }

  // CASE 7: HTTP 502
  globalThis.fetch = async () => new Response('bad gateway', { status: 502 });
  scan = await adapter.scan('iphone');
  assert.deepEqual(scan.deals, []);
  assert.equal(scan.source.health, 'offline');
  assert.match(scan.errors[0], /HTTP 502/);

  // CASE 7b: malformed JSON
  globalThis.fetch = async () => new Response('<html>not json</html>', { status: 200, headers: { 'content-type': 'application/json' } });
  scan = await adapter.scan('iphone');
  assert.deepEqual(scan.deals, []);
  assert.match(scan.errors[0], /malformed JSON/, 'must differentiate malformed JSON');

  // CASE 8: full scan pipeline handles a valid gateway response
  globalThis.fetch = async () => new Response(JSON.stringify({ query: 'iphone', results: [{ ...validDeal, marketMedian: 899, estimatedResalePrice: 820 }] }), { status: 200, headers: { 'content-type': 'application/json' } });
  const summary = await runScan([adapter], 'iphone');
  assert.equal(summary.offersFound, 1, 'scan pipeline must normalize the valid gateway deal');
  assert.equal(summary.deals.length, 1);
  assert.ok(Number.isFinite(summary.deals[0].score), 'analysis must run on gateway deal');
  assert.ok(Number.isFinite(summary.deals[0].roiPct), 'profit must be calculated');

  globalThis.fetch = originalFetch;
}

try {
  await adapterCases();
  results.push({ name: 'CASE 1-8 adapter + scan pipeline', ok: true });
} catch (error) {
  results.push({ name: 'CASE 1-8 adapter + scan pipeline', ok: false, error: error.message });
}

for (const r of results) console.log((r.ok ? 'PASS  ' : 'FAIL  ') + r.name + (r.ok ? '' : ' :: ' + r.error));
const failed = results.filter(r => !r.ok);
console.log('MARKETPLACE GATEWAY CONTRACT TEST: ' + (failed.length ? 'FAIL (' + failed.length + ')' : 'PASS'));
if (failed.length) process.exit(1);
