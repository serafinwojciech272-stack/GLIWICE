import { createAllegroGateway } from '../../src/server/allegroGateway.ts';
import { mapAllegroListing } from '../../src/server/allegroMapper.ts';
import { openSession, parseCookies } from '../allegroSession.mjs';

const env = key => (process.env[key] || '').trim();

// Set only when Allegro itself rejects our credentials. Never contains tokens or secrets.
let lastAuthError = null;

export const id = 'allegro';

export function credentials() {
  return {
    clientId: env('ALLEGRO_CLIENT_ID'),
    clientSecret: env('ALLEGRO_CLIENT_SECRET'),
    redirectUri: env('ALLEGRO_REDIRECT_URI'),
    sessionSecret: env('ALLEGRO_SESSION_SECRET'),
    environment: env('ALLEGRO_ENVIRONMENT') === 'production' ? 'production' : 'sandbox',
  };
}

export function configured() {
  const c = credentials();
  return Boolean(c.clientId && c.clientSecret && c.redirectUri && c.sessionSecret);
}

/**
 * Allegro requires a user OAuth session (an encrypted HttpOnly cookie created by
 * api/allegro/oauth.js). The gateway reuses that exact session — there is no second
 * OAuth flow and no separate token store.
 */
export function currentSession(cookieHeader) {
  if (!configured()) return { session: null, reason: 'not-configured' };
  const session = openSession(parseCookies(cookieHeader).allegro_session);
  if (!session?.accessToken) return { session: null, reason: 'not-connected' };
  if (session.expiresAt && Date.now() >= session.expiresAt) return { session: null, reason: 'session-expired' };
  return { session, reason: null };
}

const isAuthFailure = error => /\b(401|403)\b/.test(String(error?.message ?? ''));

/**
 * Health probe. No network call, but it never reports "configured" when authentication
 * is known to be invalid (expired session, or credentials Allegro has already rejected).
 */
export function authStatus(cookieHeader) {
  if (!configured()) return { status: 'not-configured', connection: null, detail: null };
  const { session, reason } = currentSession(cookieHeader);
  if (reason === 'session-expired') return { status: 'error', connection: reason, detail: 'Allegro session expired; reconnect via /api/allegro/oauth.' };
  if (lastAuthError) return { status: 'error', connection: reason || 'connected', detail: lastAuthError };
  if (!session) return { status: 'configured', connection: reason || 'not-connected', detail: null };
  return { status: 'configured', connection: 'connected', detail: null };
}

export async function search(query, limit, redactFn, context = {}) {
  const c = credentials();
  if (!c.clientId || !c.clientSecret || !c.redirectUri) throw new Error('Allegro is not configured.');

  const { session, reason } = currentSession(context.cookieHeader);
  if (!session) throw new Error('Allegro session ' + (reason || 'unavailable') + '; connect Allegro via /api/allegro/oauth.');

  const gateway = createAllegroGateway({
    environment: c.environment,
    clientId: c.clientId,
    clientSecret: c.clientSecret,
    redirectUri: c.redirectUri,
  });

  try {
    const payload = await gateway.searchOffers(session.accessToken, query, limit);
    lastAuthError = null;
    return mapAllegroListing(payload);
  } catch (error) {
    if (isAuthFailure(error)) lastAuthError = 'Allegro rejected the session or client credentials.';
    throw error;
  }
}
