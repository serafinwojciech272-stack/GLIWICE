const env = key => (process.env[key] || '').trim();

/**
 * Roadmap classification for every known marketplace/data provider.
 * Kept in sync with src/server/providerRoadmap.ts.
 */
export const ROADMAP = {
  AVAILABLE: 'available',
  CONFIGURED: 'configured',
  IMPLEMENTED: 'implemented',
  NOT_IMPLEMENTED: 'not-implemented',
  REQUIRES_API_ACCESS: 'requires-api-access',
  REQUIRES_PARTNERSHIP: 'requires-partnership',
  NOT_SUITABLE: 'not-suitable',
};

/**
 * Provider registry. This is the single source of truth for the gateway.
 * `adapter` names a live adapter implemented in this gateway (null = none here).
 * `enabledByDefault: false` providers are disabled unless explicitly switched on.
 */
export const PROVIDERS = [
  {
    id: 'allegro',
    name: 'Allegro',
    mode: 'account',
    keys: ['ALLEGRO_CLIENT_ID', 'ALLEGRO_CLIENT_SECRET', 'ALLEGRO_REDIRECT_URI', 'ALLEGRO_SESSION_SECRET'],
    adapter: 'allegro',
    enabledByDefault: true,
    message: 'Priority provider. Requires a user OAuth session created via /api/allegro/oauth.',
    roadmap: { state: ROADMAP.IMPLEMENTED, notes: 'Sandbox/production switch via ALLEGRO_ENVIRONMENT. Requires OAuth API access.' },
  },
  {
    id: 'ebay',
    name: 'eBay',
    mode: 'live-search',
    keys: ['EBAY_CLIENT_ID', 'EBAY_CLIENT_SECRET'],
    adapter: 'ebay',
    enabledByDefault: false,
    enableFlag: 'EBAY_ENABLED',
    message: 'eBay is disabled by product policy. It is optional and never required.',
    roadmap: { state: ROADMAP.NOT_SUITABLE, notes: 'Permanently removed from product strategy. Adapter and mapper retained for reuse only.' },
  },
  {
    id: 'olx',
    name: 'OLX',
    mode: 'account',
    keys: ['OLX_CLIENT_ID', 'OLX_CLIENT_SECRET'],
    adapter: null,
    enabledByDefault: true,
    message: 'Partner API connector.',
    roadmap: { state: ROADMAP.REQUIRES_PARTNERSHIP, notes: 'Public search API is not offered; requires partner agreement.' },
  },
  {
    id: 'ceneo',
    name: 'Ceneo',
    mode: 'benchmark',
    keys: ['CENEO_API_KEY'],
    adapter: null,
    enabledByDefault: true,
    message: 'Price benchmark connector.',
    roadmap: { state: ROADMAP.REQUIRES_API_ACCESS, notes: 'Useful as a price benchmark; requires commercial API access.' },
  },
  {
    id: 'amazon',
    name: 'Amazon',
    mode: 'account',
    keys: ['AMAZON_LWA_CLIENT_ID', 'AMAZON_LWA_CLIENT_SECRET'],
    adapter: null,
    enabledByDefault: true,
    message: 'SP-API connector.',
    roadmap: { state: ROADMAP.REQUIRES_PARTNERSHIP, notes: 'SP-API requires seller/program authorization.' },
  },
  {
    id: 'empik',
    name: 'Empik',
    mode: 'account',
    keys: ['EMPIK_API_KEY'],
    adapter: null,
    enabledByDefault: true,
    message: 'Seller API connector.',
    roadmap: { state: ROADMAP.REQUIRES_API_ACCESS, notes: 'Seller API access required.' },
  },
  {
    id: 'temu',
    name: 'Temu',
    mode: 'account',
    keys: ['TEMU_APP_KEY', 'TEMU_APP_SECRET'],
    adapter: null,
    enabledByDefault: true,
    message: 'Partner/Open API connector.',
    roadmap: { state: ROADMAP.REQUIRES_PARTNERSHIP, notes: 'Partner program required.' },
  },
  {
    id: 'erli',
    name: 'ERLI',
    mode: 'account',
    keys: ['ERLI_API_KEY'],
    adapter: null,
    enabledByDefault: true,
    message: 'Marketplace API connector.',
    roadmap: { state: ROADMAP.REQUIRES_API_ACCESS, notes: 'Marketplace API access required.' },
  },
  {
    id: 'kaufland',
    name: 'Kaufland',
    mode: 'account',
    keys: ['KAUFLAND_CLIENT_KEY', 'KAUFLAND_SECRET_KEY'],
    adapter: null,
    enabledByDefault: true,
    message: 'Seller API connector.',
    roadmap: { state: ROADMAP.REQUIRES_API_ACCESS, notes: 'Seller API access required.' },
  },
];

export const PROVIDER_IDS = new Set(PROVIDERS.map(p => p.id));

/** All environment keys that must never be echoed back to a client. */
export const SECRET_KEYS = [...new Set(PROVIDERS.flatMap(p => p.keys))];

export function providerCredentialsPresent(provider) {
  return provider.keys.length > 0 && provider.keys.every(env);
}

export function providerEnabled(provider) {
  if (!provider.enabledByDefault) return provider.enableFlag ? env(provider.enableFlag).toLowerCase() === 'true' : false;
  return true;
}

export function providerHealth(provider, auth = null) {
  const configured = providerCredentialsPresent(provider);
  const enabled = providerEnabled(provider);
  let status;
  if (!enabled) status = 'disabled';
  else if (!provider.adapter) status = 'not-implemented';
  else if (!configured) status = 'not-configured';
  else if (auth?.status === 'error') status = 'error';
  else status = 'configured';
  return {
    id: provider.id,
    name: provider.name,
    mode: provider.mode,
    enabled,
    configured,
    implemented: Boolean(provider.adapter),
    status,
    connection: auth?.connection ?? null,
    roadmap: provider.roadmap.state,
    message: status === 'error' ? 'Authentication failed: ' + (auth?.detail || 'provider rejected credentials.') : provider.message,
  };
}

export function marketplaceHealth(authById = {}) {
  return PROVIDERS.map(provider => providerHealth(provider, authById[provider.id] ?? null));
}

/** Providers that can actually serve a search request right now. */
export function activeProviders() {
  return PROVIDERS.filter(p => providerEnabled(p) && p.adapter);
}
