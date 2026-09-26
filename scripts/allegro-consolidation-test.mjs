import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sealSession } from '../server/allegroSession.mjs';
import { offersListingUrl, offerSearchHeaders, endpointsFor, clampLimit, fetchOffersListing } from '../server/allegroApi.mjs';

const results = [];
const record = async (name, fn) => {
  try { await fn(); results.push({ name, ok: true }); }
  catch (error) { results.push({ name, ok: false, error: error.message }); }
};

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

process.env.ALLEGRO_SESSION_SECRET = 'test-session-secret';
process.env.ALLEGRO_ENVIRONMENT = 'sandbox';

const upstream = [];
let upstreamStatus = 200;
let upstreamBody = '{"items":{"regular":[]}}';
globalThis.fetch = async (url, init = {}) => {
  upstream.push({ url: String(url), headers: init.headers ?? {} });
  return new Response(upstreamBody, { status: upstreamStatus, headers: { 'content-type': 'application/json' } });
};

const validSession = sealSession(JSON.stringify({ accessToken: 'test-access-token', refreshToken: null, expiresAt: Date.now() + 3600_000 }));
const expiredSession = sealSession(JSON.stringify({ accessToken: 'expired-token', refreshToken: null, expiresAt: Date.now() - 1000 }));

const fakeRes = () => {
  const state = { statusCode: null, headers: {}, body: null, jsonBody: null };
  const res = {
    state,
    status(code) { state.statusCode = code; return res; },
    setHeader(k, v) { state.headers[k] = v; return res; },
    send(body) { state.body = body; return res; },
    json(body) { state.jsonBody = body; return res; },
  };
  return res;
};

const handler = (await import('../api/allegro/search.js')).default;

try {
  // --- Shared implementation semantics ---

  await record('shared module selects sandbox and production API endpoints', () => {
    assert.equal(endpointsFor('sandbox').api, 'https://api.allegro.pl.allegrosandbox.pl');
    assert.equal(endpointsFor('production').api, 'https://api.allegro.pl');
    assert.equal(endpointsFor(undefined).api, 'https://api.allegro.pl.allegrosandbox.pl', 'default must be sandbox');
    assert.equal(endpointsFor('anything-else').api, 'https://api.allegro.pl.allegrosandbox.pl');
  });

  await record('shared module builds identical query semantics', () => {
    const url = offersListingUrl('sandbox', 'laptop', 5);
    assert.equal(url.pathname, '/offers/listing');
    assert.equal(url.searchParams.get('phrase'), 'laptop');
    assert.equal(url.searchParams.get('limit'), '5');
  });

  await record('shared module clamps the limit exactly as before', () => {
    assert.equal(clampLimit(999), 100);
    assert.equal(clampLimit(0), 1);
    assert.equal(clampLimit(undefined), 20);
    assert.equal(clampLimit('7'), 7);
  });

  await record('shared module sends Bearer auth and the Allegro Accept header', () => {
    const headers = offerSearchHeaders('test-access-token');
    assert.equal(headers.Authorization, 'Bearer test-access-token');
    assert.equal(headers.Accept, 'application/vnd.allegro.public.v1+json');
    assert.equal(headers['Accept-Language'], 'pl-PL');
    assert.ok(!String(headers.Authorization).startsWith('Basic'), 'search must not use Basic auth');
  });

  // --- Vercel handler: preserved external behaviour ---

  await record('Vercel handler rejects non-GET with 405', async () => {
    const res = fakeRes();
    await handler({ method: 'POST', query: {}, headers: {} }, res);
    assert.equal(res.state.statusCode, 405);
    assert.deepEqual(res.state.jsonBody, { error: 'method_not_allowed' });
  });

  await record('Vercel handler returns 401 without a session', async () => {
    const res = fakeRes();
    await handler({ method: 'GET', query: { phrase: 'laptop' }, headers: {} }, res);
    assert.equal(res.state.statusCode, 401);
    assert.deepEqual(res.state.jsonBody, { error: 'allegro_not_connected' });
  });

  await record('Vercel handler returns 401 for an expired session', async () => {
    const res = fakeRes();
    await handler({ method: 'GET', query: { phrase: 'laptop' }, headers: { cookie: 'allegro_session=' + expiredSession } }, res);
    assert.equal(res.state.statusCode, 401);
    assert.deepEqual(res.state.jsonBody, { error: 'allegro_session_expired' });
  });

  await record('Vercel handler returns 400 when phrase is missing', async () => {
    const res = fakeRes();
    await handler({ method: 'GET', query: {}, headers: { cookie: 'allegro_session=' + validSession } }, res);
    assert.equal(res.state.statusCode, 400);
    assert.deepEqual(res.state.jsonBody, { error: 'phrase_required' });
  });

  await record('Vercel handler passes Allegro status and body through verbatim', async () => {
    upstream.length = 0;
    upstreamStatus = 200;
    upstreamBody = '{"items":{"regular":[{"id":"1"}]}}';
    const res = fakeRes();
    await handler({ method: 'GET', query: { phrase: 'laptop', limit: '5' }, headers: { cookie: 'allegro_session=' + validSession } }, res);
    assert.equal(res.state.statusCode, 200);
    assert.equal(res.state.body, upstreamBody, 'body must be forwarded unchanged');
    assert.equal(res.state.headers['Content-Type'], 'application/json');
    assert.equal(upstream.length, 1);
    assert.ok(upstream[0].url.includes('/offers/listing?phrase=laptop&limit=5'), 'unexpected upstream URL: ' + upstream[0].url);
    assert.equal(upstream[0].headers.Authorization, 'Bearer test-access-token');
  });

  await record('Vercel handler forwards Allegro error status unchanged', async () => {
    upstreamStatus = 429;
    upstreamBody = '{"error":"rate_limited"}';
    const res = fakeRes();
    await handler({ method: 'GET', query: { phrase: 'laptop' }, headers: { cookie: 'allegro_session=' + validSession } }, res);
    assert.equal(res.state.statusCode, 429, 'upstream status must pass through');
    assert.equal(res.state.body, upstreamBody);
  });

  await record('Vercel handler honours the production environment switch', async () => {
    process.env.ALLEGRO_ENVIRONMENT = 'production';
    upstream.length = 0;
    const res = fakeRes();
    await handler({ method: 'GET', query: { phrase: 'laptop' }, headers: { cookie: 'allegro_session=' + validSession } }, res);
    assert.ok(upstream[0].url.startsWith('https://api.allegro.pl/offers/listing'), 'production endpoint not used: ' + upstream[0].url);
    process.env.ALLEGRO_ENVIRONMENT = 'sandbox';
  });

  // --- Single implementation across both consumers ---

  await record('only one /offers/listing construction exists', () => {
    const files = ['server/allegroApi.mjs', 'src/server/allegroGateway.ts', 'api/allegro/search.js', 'server/adapters/allegro.mjs'];
    const offenders = files.filter(f => fs.readFileSync(f, 'utf8').includes('/offers/listing'));
    assert.deepEqual(offenders, ['server/allegroApi.mjs'], 'duplicated request construction in: ' + offenders.join(','));
  });

  await record('both consumers import the shared implementation', () => {
    assert.match(fs.readFileSync('api/allegro/search.js', 'utf8'), /from '\.\.\/\.\.\/server\/allegroApi\.mjs'/);
    assert.match(fs.readFileSync('src/server/allegroGateway.ts', 'utf8'), /from '\.\.\/\.\.\/server\/allegroApi\.mjs'/);
  });

  await record('shared implementation is server-only (absent from the client bundle)', () => {
    const bundle = fs.readdirSync('dist/assets').filter(f => f.endsWith('.js')).map(f => fs.readFileSync('dist/assets/' + f, 'utf8')).join('');
    for (const needle of ['allegroApi', 'fetchOffersListing', 'api.allegro.pl', 'Bearer ']) {
      assert.ok(!bundle.includes(needle), 'client bundle contains ' + needle);
    }
  });

  await record('no secret appears in handler responses or upstream calls', async () => {
    upstreamStatus = 200;
    const res = fakeRes();
    await handler({ method: 'GET', query: { phrase: 'laptop' }, headers: { cookie: 'allegro_session=' + validSession } }, res);
    const serialized = JSON.stringify({ body: res.state.body, headers: res.state.headers, upstream });
    for (const secret of ['test-session-secret', validSession]) assert.ok(!serialized.includes(secret), 'leaked ' + secret);
  });
} finally {
  globalThis.fetch = originalFetch;
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
  Object.assign(process.env, originalEnv);
}

for (const r of results) console.log((r.ok ? 'PASS  ' : 'FAIL  ') + r.name + (r.ok ? '' : ' :: ' + r.error));
const failed = results.filter(r => !r.ok);
console.log('ALLEGRO CONSOLIDATION: ' + (failed.length ? 'FAIL (' + failed.length + ')' : 'PASS'));
if (failed.length) process.exit(1);
