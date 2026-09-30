import assert from 'node:assert/strict';
import { mapEbayItem, mapEbayItemSummaries } from '../server/ebayMapper.mjs';

const OBSERVED = '2026-09-24T11:00:00.000Z';
const results = [];
const record = (name, fn) => {
  try { fn(); results.push({ name, ok: true }); }
  catch (error) { results.push({ name, ok: false, error: error.message }); }
};

// Sanitized fixture shaped like the eBay Buy Browse itemSummary response. No credentials, no live data.
const fixture = {
  itemSummaries: [
    {
      itemId: 'v1|1234567890|0',
      epid: 'EPID-ABC',
      title: 'Apple iPhone 15 128GB',
      condition: 'New',
      price: { value: '2999.00', currency: 'PLN' },
      itemWebUrl: 'https://www.ebay.pl/itm/1234567890',
      categories: [{ categoryName: 'Smartphones' }],
      shippingOptions: [{ shippingCost: { value: '0.00', currency: 'PLN' } }],
      estimatedAvailabilities: [{ availabilityThresholdType: 'MORE_THAN', estimatedAvailabilityThreshold: 10 }],
    },
    { itemId: 'v1|missingprice|0', title: 'Broken price', itemWebUrl: 'https://www.ebay.pl/itm/bad' },
    { itemId: '', title: 'No id', price: { value: '10' }, itemWebUrl: 'https://www.ebay.pl/itm/noid' },
    { itemId: 'v1|nourl|0', title: 'No url', price: { value: '10' } },
    { itemId: 'v1|negative|0', title: 'Negative', price: { value: '-5' }, itemWebUrl: 'https://www.ebay.pl/itm/neg' },
    null,
  ],
};

record('maps a valid item into the Deal domain', () => {
  const deal = mapEbayItem(fixture.itemSummaries[0], OBSERVED);
  assert.equal(deal.id, 'ebay:v1|1234567890|0');
  assert.equal(deal.productId, 'EPID-ABC');
  assert.equal(deal.sourceId, 'ebay');
  assert.equal(deal.store, 'eBay');
  assert.equal(deal.category, 'Smartphones');
  assert.equal(deal.sourceUrl, 'https://www.ebay.pl/itm/1234567890');
  assert.equal(deal.observedAt, OBSERVED);
  assert.equal(typeof deal.price, 'number');
  assert.equal(deal.price, 2999);
  assert.equal(deal.shippingIn, 0);
});

record('condition and availability conform to the domain enum', () => {
  const deal = mapEbayItem(fixture.itemSummaries[0], OBSERVED);
  assert.equal(deal.condition, 'new');
  assert.equal(deal.availability, 'in_stock');
  const used = mapEbayItem({ ...fixture.itemSummaries[0], condition: 'Used' }, OBSERVED);
  assert.equal(used.condition, 'unknown');
  const noAvailability = mapEbayItem({ ...fixture.itemSummaries[0], estimatedAvailabilities: undefined }, OBSERVED);
  assert.equal(noAvailability.availability, 'unknown');
  const limited = mapEbayItem({ ...fixture.itemSummaries[0], estimatedAvailabilities: [{ availabilityThresholdType: 'LESS_THAN' }] }, OBSERVED);
  assert.equal(limited.availability, 'limited');
});

record('falls back to itemAffiliateWebUrl when itemWebUrl is absent', () => {
  const deal = mapEbayItem({ itemId: 'x', title: 'Affiliate', price: { value: '5' }, itemAffiliateWebUrl: 'https://www.ebay.pl/itm/aff' }, OBSERVED);
  assert.equal(deal.sourceUrl, 'https://www.ebay.pl/itm/aff');
});

record('skips malformed items instead of emitting fake deals', () => {
  const deals = mapEbayItemSummaries(fixture, OBSERVED);
  assert.equal(deals.length, 1, 'only the one valid item should survive, got ' + deals.length);
  assert.equal(deals[0].id, 'ebay:v1|1234567890|0');
});

record('malformed payload yields no deals (no fabricated data)', () => {
  assert.deepEqual(mapEbayItemSummaries(null, OBSERVED), []);
  assert.deepEqual(mapEbayItemSummaries({}, OBSERVED), []);
  assert.deepEqual(mapEbayItemSummaries({ itemSummaries: 'nope' }, OBSERVED), []);
});

record('observedAt defaults to a valid ISO timestamp when not supplied', () => {
  const deal = mapEbayItem(fixture.itemSummaries[0]);
  assert.ok(Number.isFinite(Date.parse(deal.observedAt)), 'observedAt must be ISO-parseable');
});

record('never emits undefined identity fields for valid items', () => {
  const deals = mapEbayItemSummaries({ itemSummaries: [fixture.itemSummaries[0]] }, OBSERVED);
  assert.equal(typeof deals[0].id, 'string');
  assert.equal(typeof deals[0].productId, 'string');
  assert.ok(deals[0].id.startsWith('ebay:'));
  assert.ok(deals[0].productId.length > 0);
});

for (const r of results) console.log((r.ok ? 'PASS  ' : 'FAIL  ') + r.name + (r.ok ? '' : ' :: ' + r.error));
const failed = results.filter(r => !r.ok);
console.log('EBAY MAPPER QA: ' + (failed.length ? 'FAIL (' + failed.length + ')' : 'PASS'));
if (failed.length) process.exit(1);
