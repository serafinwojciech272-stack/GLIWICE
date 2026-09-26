/**
 * Single Allegro HTTP implementation.
 *
 * Shared by the deployed Vercel search function (api/allegro/search.js) and the
 * marketplace gateway Allegro adapter (via src/server/allegroGateway.ts). Only request
 * construction lives here; each consumer keeps its own response handling because the
 * Vercel function passes Allegro's status/body through verbatim while the gateway maps
 * the payload into the normalized Deal contract.
 */

export const ALLEGRO_ENDPOINTS = {
  sandbox: { api: 'https://api.allegro.pl.allegrosandbox.pl', auth: 'https://allegro.pl.allegrosandbox.pl/auth/oauth' },
  production: { api: 'https://api.allegro.pl', auth: 'https://allegro.pl/auth/oauth' },
};

/** Only an exact 'production' selects production; anything else is sandbox. */
export function allegroEnvironment(value) {
  return value === 'production' ? 'production' : 'sandbox';
}

export function endpointsFor(environment) {
  return ALLEGRO_ENDPOINTS[allegroEnvironment(environment)];
}

/** Allegro caps the listing page size at 100. */
export function clampLimit(value, fallback = 20) {
  const raw = value === undefined || value === null ? fallback : value;
  return Math.min(100, Math.max(1, Number(raw)));
}

export function offersListingUrl(environment, phrase, limit) {
  const url = new URL(endpointsFor(environment).api + '/offers/listing');
  url.searchParams.set('phrase', phrase);
  url.searchParams.set('limit', String(clampLimit(limit)));
  return url;
}

export function offerSearchHeaders(accessToken) {
  return {
    Authorization: 'Bearer ' + accessToken,
    Accept: 'application/vnd.allegro.public.v1+json',
    'Accept-Language': 'pl-PL',
  };
}

/** Returns the raw Response so callers decide how to treat non-2xx. */
export function fetchOffersListing({ environment, accessToken, phrase, limit, fetchImpl = fetch }) {
  return fetchImpl(offersListingUrl(environment, phrase, limit), { headers: offerSearchHeaders(accessToken) });
}
