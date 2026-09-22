const base = (process.env.MARKETPLACE_GATEWAY_URL || 'https://extra-szpieg-api.onrender.com').replace(/\/$/, '');
const requireEbay = process.env.REQUIRE_LIVE_EBAY === 'true';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function get(path) {
  const response = await fetch(base + path, { headers: { Accept: 'application/json' } });
  let body;
  try { body = await response.json(); } catch { body = null; }
  return { status: response.status, body };
}

const health = await get('/health');
assert(health.status === 200, 'health HTTP ' + health.status);
assert(health.body?.ok === true, 'health ok=false');

const providers = await get('/api/marketplaces/health');
assert(providers.status === 200, 'marketplace health HTTP ' + providers.status);
assert(Array.isArray(providers.body?.sources), 'marketplace health sources missing');
assert(providers.body.sources.length === 9, 'expected 9 marketplace providers');

const search = await get('/api/marketplaces/search?q=iphone&limit=5');
assert(search.status === 200, 'search HTTP ' + search.status);
assert(search.body?.query === 'iphone', 'search query mismatch');
assert(Array.isArray(search.body?.results), 'search results missing');

const selected = await get('/api/marketplaces/search?q=iphone&limit=5&marketplace=ebay');
assert(selected.status === 200, 'provider selection HTTP ' + selected.status);
assert(selected.body?.query === 'iphone', 'provider selection query mismatch');
assert(selected.body?.selectedProvider === 'ebay', 'selected provider mismatch');
assert(Array.isArray(selected.body?.results), 'provider selection results missing');

const ebay = providers.body.sources.find(x => x.id === 'ebay');
if (requireEbay) {
  assert(ebay?.configured === true, 'eBay credentials are not configured');
  assert(selected.body.results.length > 0, 'eBay live search returned zero results');
  console.log('PRODUCTION EBAY CONNECTOR: PASS');
} else if (ebay?.configured === true) {
  assert(selected.body.results.length > 0, 'configured eBay connector returned zero results');
  console.log('PRODUCTION EBAY CONNECTOR: PASS');
} else {
  console.log('PRODUCTION EBAY CONNECTOR: BLOCKED — credentials not configured');
}

console.log('PRODUCTION MARKETPLACE GATEWAY SMOKE: PASS');
console.log(JSON.stringify({
  gateway: base,
  health: true,
  providers: providers.body.sources.map(x => ({ id: x.id, configured: x.configured, status: x.status })),
  searchResults: search.body.results.length,
  selectedProvider: selected.body.selectedProvider,
  selectedProviderResults: selected.body.results.length
}, null, 2));
