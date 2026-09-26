import assert from 'node:assert/strict';
import { sealSession } from '../server/allegroSession.mjs';

const results = [];
const record = async (name, fn) => {
  try { await fn(); results.push({ name, ok: true }); }
  catch (error) { results.push({ name, ok: false, error: error.message }); }
};

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
const PORT = 10023;

process.env.ALLEGRO_CLIENT_ID = 'test-client-id';
process.env.ALLEGRO_CLIENT_SECRET = 'test-client-secret';
process.env.ALLEGRO_REDIRECT_URI = 'https://example.test/api/allegro/oauth?action=callback';
process.env.ALLEGRO_SESSION_SECRET = 'test-session-secret';
process.env.ALLEGRO_ENVIRONMENT = 'sandbox';
process.env.PORT = String(PORT);
delete process.env.EBAY_ENABLED;

// Only the external Allegro HTTP call is stubbed; the gateway, registry, aggregator,
// adapter, session and mapper are the real code paths.
let mode = 'ok';
const upstream = [];
globalThis.fetch = async (url, init = {}) => {
  upstream.push({ url: String(url), authorization: init.headers?.Authorization ?? null });
  if (mode === 'throw') throw new Error('network unreachable');
  if (mode === 'auth-fail') return new Response('{"error":"unauthorized"}', { status: 401 });
  if (mode === 'server-error') return new Response('{"error":"boom"}', { status: 500 });
  return new Response(JSON.stringify({
    items: {
      regular: [
        { id: '111', name: 'Laptop Pro', sellingMode: { price: { amount: '3499.00' } }, url: 'https://allegro.pl/oferta/111', product: { id: 'p111', ean: '5901234567890' }, stock: { available: 4 } },
        { id: '222', name: 'Phone X', sellingMode: { price: { amount: '1299.50' } }, url: 'https://allegro.pl/oferta/222', product: { id: 'p222' }, stock: { available: 0 }, publication: { status: 'ACTIVE' } },
        { id: '', name: 'Broken row' },
      ],
    },
  }), { status: 200, headers: { 'content-type': 'application/json' } });
};

const validSession = sealSession(JSON.stringify({ accessToken: 'test-access-token', refreshToken: null, expiresAt: Date.now() + 3600_000 }));
const expiredSession = sealSession(JSON.stringify({ accessToken: 'expired-token', refreshToken: null, expiresAt: Date.now() - 1000 }));
const cookie = value => ({ Cookie: 'allegro_session=' + value });

const gateway = await import('../server/index.mjs');
const base = 'http://127.0.0.1:' + PORT;

const get = async (path, headers = {}) => {
  const response = await originalFetch(base + path, { headers });
  return { status: response.status, body: await response.json() };
};
const providerOf = (body, id) => (body.providers ?? []).find(p => p.id === id);
const sourceOf = (body, id) => (body.sources ?? []).find(s => s.id === id);

try {
  // 1. Allegro provider registration
  await record('Allegro is registered as an implemented provider', async () => {
    const health = await get('/api/marketplaces/health');
    const allegro = sourceOf(health.body, 'allegro');
    assert.ok(allegro, 'Allegro missing from health');
    assert.equal(allegro.implemented, true, 'Allegro must report an implemented adapter');
    assert.equal(allegro.enabled, true);
    assert.equal(allegro.roadmap, 'implemented');
  });

  // 2. Unconfigured state
  await record('Allegro reports not-configured without credentials', async () => {
    const saved = { id: process.env.ALLEGRO_CLIENT_ID, secret: process.env.ALLEGRO_CLIENT_SECRET };
    delete process.env.ALLEGRO_CLIENT_ID;
    delete process.env.ALLEGRO_CLIENT_SECRET;
    const health = await get('/api/marketplaces/health');
    const allegro = sourceOf(health.body, 'allegro');
    assert.equal(allegro.status, 'not-configured');
    assert.equal(allegro.configured, false);
    process.env.ALLEGRO_CLIENT_ID = saved.id;
    process.env.ALLEGRO_CLIENT_SECRET = saved.secret;
  });

  // 3. Configuration detection + auth state
  await record('Allegro reports configured/not-connected with credentials but no session', async () => {
    const health = await get('/api/marketplaces/health');
    const allegro = sourceOf(health.body, 'allegro');
    assert.equal(allegro.status, 'configured');
    assert.equal(allegro.configured, true);
    assert.equal(allegro.connection, 'not-connected');
  });

  await record('Allegro reports connected when a valid session is presented', async () => {
    const health = await get('/api/marketplaces/health', cookie(validSession));
    assert.equal(sourceOf(health.body, 'allegro').connection, 'connected');
  });

  await record('Allegro reports error (not configured) when the session is expired', async () => {
    const health = await get('/api/marketplaces/health', cookie(expiredSession));
    const allegro = sourceOf(health.body, 'allegro');
    assert.equal(allegro.status, 'error', 'expired session must not report configured');
    assert.equal(allegro.connection, 'session-expired');
    assert.ok(!JSON.stringify(health.body).includes('expired-token'), 'session token leaked into health');
  });

  // 4. Authentication failure isolation (no session)
  await record('search without an Allegro session isolates the failure at HTTP 200', async () => {
    upstream.length = 0;
    const search = await get('/api/marketplaces/search?q=laptop&limit=5');
    assert.equal(search.status, 200, 'gateway must stay HTTP 200');
    assert.deepEqual(search.body.results, []);
    assert.equal(providerOf(search.body, 'allegro').status, 'error');
    assert.match(search.body.message, /allegro/i);
    assert.equal(upstream.length, 0, 'no upstream call may happen without a session');
    assert.ok(!JSON.stringify(search.body).includes('test-client-secret'), 'secret leaked');
  });

  // 5. Response mapping + 6. normalized Deal contract + 7. gateway search
  await record('search with a session returns normalized Allegro deals', async () => {
    mode = 'ok';
    upstream.length = 0;
    const search = await get('/api/marketplaces/search?q=laptop&limit=5', cookie(validSession));
    assert.equal(search.status, 200);
    assert.equal(search.body.results.length, 2, 'invalid rows must be dropped, valid ones kept');
    assert.equal(providerOf(search.body, 'allegro').status, 'ok');
    assert.equal(providerOf(search.body, 'allegro').resultCount, 2);

    const deal = search.body.results[0];
    for (const field of ['id', 'productId', 'title', 'store', 'category', 'price', 'condition', 'availability', 'sourceId', 'sourceUrl', 'observedAt']) {
      assert.ok(field in deal, 'Deal contract missing field ' + field);
    }
    assert.equal(deal.id, 'allegro:111');
    assert.equal(deal.sourceId, 'allegro');
    assert.equal(deal.price, 3499);
    assert.equal(deal.store, 'Allegro');
    assert.equal(deal.availability, 'in_stock');
    assert.equal(search.body.results[1].availability, 'unknown', 'ACTIVE with no stock maps to unknown');
    assert.ok(search.body.results.every(d => d.sourceUrl.startsWith('https://allegro.pl/')), 'source URL preserved');
  });

  await record('search calls the sandbox endpoint with a Bearer token, never Basic', async () => {
    assert.ok(upstream.length >= 1, 'upstream not called');
    assert.ok(upstream.every(c => c.url.includes('api.allegro.pl.allegrosandbox.pl')), 'sandbox endpoint not used');
    assert.ok(upstream.every(c => c.url.includes('/offers/listing')), 'listing endpoint not used');
    assert.ok(upstream.every(c => c.authorization === 'Bearer test-access-token'), 'Bearer token not used');
    assert.ok(!upstream.some(c => String(c.authorization).startsWith('Basic')), 'Basic auth leaked to search');
  });

  await record('production environment switches endpoints without hard-coded URLs', async () => {
    process.env.ALLEGRO_ENVIRONMENT = 'production';
    upstream.length = 0;
    await get('/api/marketplaces/search?q=laptop', cookie(validSession));
    assert.ok(upstream.every(c => c.url.startsWith('https://api.allegro.pl/')), 'production endpoint not used');
    process.env.ALLEGRO_ENVIRONMENT = 'sandbox';
  });

  // 8. Gateway behaviour when Allegro fails
  await record('Allegro auth failure is isolated and marked as an auth error', async () => {
    mode = 'auth-fail';
    const search = await get('/api/marketplaces/search?q=laptop&marketplace=allegro', cookie(validSession));
    assert.equal(search.status, 200, 'auth failure must not crash the gateway');
    assert.deepEqual(search.body.results, []);
    assert.equal(providerOf(search.body, 'allegro').status, 'error');
    assert.match(search.body.message, /allegro/i);

    const health = await get('/api/marketplaces/health', cookie(validSession));
    assert.equal(sourceOf(health.body, 'allegro').status, 'error', 'invalid auth must not report configured');
  });

  await record('Allegro upstream errors are isolated', async () => {
    mode = 'server-error';
    const search = await get('/api/marketplaces/search?q=laptop', cookie(validSession));
    assert.equal(search.status, 200);
    assert.equal(providerOf(search.body, 'allegro').status, 'error');
  });

  await record('Allegro network failure is isolated', async () => {
    mode = 'throw';
    const search = await get('/api/marketplaces/search?q=laptop', cookie(validSession));
    assert.equal(search.status, 200);
    assert.equal(providerOf(search.body, 'allegro').status, 'error');
  });

  await record('gateway recovers after a provider failure', async () => {
    mode = 'ok';
    const search = await get('/api/marketplaces/search?q=laptop', cookie(validSession));
    assert.equal(providerOf(search.body, 'allegro').status, 'ok');
    assert.equal(search.body.results.length, 2);
  });

  // 9. eBay remains disabled and irrelevant
  await record('eBay stays disabled and is never called', async () => {
    const health = await get('/api/marketplaces/health');
    assert.equal(sourceOf(health.body, 'ebay').status, 'disabled');
    upstream.length = 0;
    const search = await get('/api/marketplaces/search?q=laptop&marketplace=ebay', cookie(validSession));
    assert.equal(search.status, 200);
    assert.match(search.body.message, /disabled/i);
    assert.equal(upstream.length, 0, 'disabled eBay must not reach upstream');
  });

  // 10. Other providers stay isolated
  await record('providers without adapters never participate in a search', async () => {
    const search = await get('/api/marketplaces/search?q=laptop', cookie(validSession));
    const ids = (search.body.providers ?? []).map(p => p.id);
    assert.deepEqual(ids, ['allegro'], 'only Allegro has a live adapter: got ' + ids.join(','));
    const health = await get('/api/marketplaces/health');
    for (const id of ['amazon', 'olx', 'temu', 'ceneo', 'erli', 'empik', 'kaufland']) {
      assert.equal(sourceOf(health.body, id).status, 'not-implemented', id + ' must stay not-implemented');
    }
  });

  // 9/security: no secrets or tokens in any response
  await record('no secret or token appears in gateway responses', async () => {
    mode = 'ok';
    const search = await get('/api/marketplaces/search?q=laptop', cookie(validSession));
    const health = await get('/api/marketplaces/health', cookie(validSession));
    const serialized = JSON.stringify({ search: search.body, health: health.body });
    for (const secret of ['test-client-secret', 'test-session-secret', 'test-access-token', validSession]) {
      assert.ok(!serialized.includes(secret), 'leaked: ' + secret);
    }
    assert.ok(!/Basic\s+[A-Za-z0-9+/=]+/.test(serialized), 'Basic auth material leaked');
  });
} finally {
  globalThis.fetch = originalFetch;
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
  Object.assign(process.env, originalEnv);
}

for (const r of results) console.log((r.ok ? 'PASS  ' : 'FAIL  ') + r.name + (r.ok ? '' : ' :: ' + r.error));
const failed = results.filter(r => !r.ok);
console.log('ALLEGRO GATEWAY INTEGRATION: ' + (failed.length ? 'FAIL (' + failed.length + ')' : 'PASS'));
// Exits the in-process gateway listener; no server handle is exported on purpose.
process.exit(failed.length ? 1 : 0);
