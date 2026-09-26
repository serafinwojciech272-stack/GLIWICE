import http from 'node:http';
import crypto from 'node:crypto';
import { PROVIDERS, PROVIDER_IDS, SECRET_KEYS, marketplaceHealth, providerCredentialsPresent, providerEnabled } from './providers.mjs';
import { getAdapter } from './adapters/index.mjs';
import { searchAllProviders as aggregateProviders } from './searchAggregator.mjs';

const PORT = Number(process.env.PORT || 10000);
const env = k => (process.env[k] || '').trim();

function redact(value) {
  let out = String(value == null ? '' : value);
  for (const key of SECRET_KEYS) {
    const secret = (process.env[key] || '').trim();
    if (secret) out = out.split(secret).join('[redacted]');
  }
  out = out.replace(/Basic\s+[A-Za-z0-9+/=]+/gi, 'Basic [redacted]');
  out = out.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]');
  return out.slice(0, 240);
}

const allowedOrigin = env('FRONTEND_ORIGIN') || '*';
const cors = { 'Access-Control-Allow-Origin': allowedOrigin, 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Max-Age': '600', 'Vary': 'Origin' };
const security = { 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', 'Cache-Control': 'no-store' };
const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8', ...cors, ...security };

const rateBuckets = new Map();
function rateLimited(req) {
  const now = Date.now();
  const key = req.socket.remoteAddress || 'unknown';
  const current = rateBuckets.get(key);
  if (!current || now - current.startedAt >= 60000) { rateBuckets.set(key, { startedAt: now, count: 1 }); return false; }
  current.count += 1;
  return current.count > 60;
}

function json(res, status, body) { res.writeHead(status, jsonHeaders); res.end(JSON.stringify(body)); }

/**
 * Reports each provider's status. Providers that expose an auth probe contribute their
 * real authentication state, so health never claims "configured" when auth is invalid.
 */
function healthFor(req) {
  const cookieHeader = req?.headers?.cookie;
  const authById = {};
  for (const provider of PROVIDERS) {
    const adapter = getAdapter(provider.id);
    if (!adapter || typeof adapter.authStatus !== 'function') continue;
    try {
      authById[provider.id] = adapter.authStatus(cookieHeader);
    } catch {
      authById[provider.id] = { status: 'error', connection: null, detail: 'auth probe failed' };
    }
  }
  return marketplaceHealth(authById);
}

/**
 * Queries every enabled provider that has a live adapter and aggregates normalized deals.
 * A failing provider contributes its own error entry and never fails the whole request.
 */
function searchAllProviders(query, limit, onlyProviderId, context) {
  return aggregateProviders({
    query,
    limit,
    onlyProviderId,
    context,
    providers: PROVIDERS.map(provider => ({
      id: provider.id,
      enabled: () => providerEnabled(provider),
      credentialsPresent: () => providerCredentialsPresent(provider),
    })),
    getAdapter,
    redact,
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('X-Request-Id', crypto.randomUUID());
  if (rateLimited(req)) return json(res, 429, { error: 'Rate limit exceeded', retryAfterSeconds: 60 });
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }

  const u = new URL(req.url || '/', 'http://' + (req.headers.host || 'localhost'));

  try {
    if (u.pathname === '/health') return json(res, 200, { ok: true, service: 'extra-szpieg-api', time: new Date().toISOString() });

    if (u.pathname === '/api/marketplaces/health') return json(res, 200, { sources: healthFor(req), generatedAt: new Date().toISOString() });

    if (u.pathname === '/api/marketplaces/search') {
      const q = (u.searchParams.get('q') || '').trim();
      if (!q) return json(res, 400, { error: 'q is required' });
      if (q.length > 200) return json(res, 400, { error: 'q is too long', maxLength: 200 });

      const requested = (u.searchParams.get('marketplace') || '').trim().toLowerCase();
      if (requested && !PROVIDER_IDS.has(requested)) return json(res, 400, { error: 'Unknown marketplace', marketplace: requested, allowed: [...PROVIDER_IDS] });

      const parsedLimit = Number(u.searchParams.get('limit') || 20);
      const limit = Number.isFinite(parsedLimit) ? Math.min(50, Math.max(1, Math.floor(parsedLimit))) : 20;

      const selectedProvider = requested || null;
      const context = { cookieHeader: req.headers.cookie };
      const { results, providers: providerResults, unavailable } = await searchAllProviders(q, limit, selectedProvider, context);

      const base = {
        query: q,
        results,
        sources: healthFor(req),
        selectedProvider,
        providers: providerResults,
        generatedAt: new Date().toISOString(),
      };

      if (results.length) return json(res, 200, base);

      // A provider that was actually attempted and failed is more relevant than an
      // unrelated provider that happens to be disabled.
      const errored = providerResults.find(x => x.status === 'error');
      const disabled = unavailable.find(x => x.reason === 'disabled');
      const message = errored
        ? 'Provider "' + errored.id + '" failed: ' + errored.error
        : disabled
          ? 'Provider "' + disabled.id + '" is disabled.'
          : 'No configured live-search provider for this request. Configure a provider to enable live results.';
      return json(res, 200, { ...base, message });
    }

    return json(res, 404, { error: 'Not found' });
  } catch (e) {
    return json(res, 502, { error: redact(e instanceof Error ? e.message : 'Marketplace gateway failed') });
  }
});

server.listen(PORT, () => console.log('Extra Szpieg API listening on ' + PORT));
