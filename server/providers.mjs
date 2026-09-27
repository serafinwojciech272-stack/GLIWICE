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
    mode: 'public-web-discovery',
    keys: [],
    adapter: 'allegro',
    enabledByDefault: true,
    message: 'Public marketplace discovery. No Allegro seller account or user OAuth is required by Extra Szpieg.',
    roadmap: { state: ROADMAP.IMPLEMENTED, notes: 'Uses the public Allegro search surface for discovery; it does not create, edit, or manage seller offers.' },
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
    mode: 'public-web-discovery',
    keys: [],
    adapter: 'olx',
    enabledByDefault: true,
    message: 'Public marketplace discovery. No OLX seller account is used by Extra Szpieg.',
    roadmap: { state: ROADMAP.IMPLEMENTED, notes: 'Discovery adapter reads public search pages only; no listing creation or seller management.' },
  },
  {
    id: 'ceneo',
    name: 'Ceneo',
    mode: 'public-web-discovery',
    keys: [],
    adapter: 'ceneo',
    enabledByDefault: true,
    message: 'Public price discovery and benchmark.',
    roadmap: { state: ROADMAP.IMPLEMENTED, notes: 'Discovery adapter uses the public search surface; no merchant account is connected.' },
  },
  {
    id: 'amazon',
    name: 'Amazon',
    mode: 'public-web-discovery',
    keys: [],
    adapter: 'amazon',
    enabledByDefault: true,
    message: 'Public product discovery only. No seller account is connected.',
    roadmap: { state: ROADMAP.IMPLEMENTED, notes: 'Discovery adapter is read-only and does not manage Amazon seller resources.' },
  },
  {
    id: 'empik',
    name: 'Empik',
    mode: 'public-web-discovery',
    keys: [],
    adapter: 'empik',
    enabledByDefault: true,
    message: 'Public product discovery only.',
    roadmap: { state: ROADMAP.IMPLEMENTED, notes: 'Read-only public discovery; no seller account connection.' },
  },
  {
    id: 'temu',
    name: 'Temu',
    mode: 'public-web-discovery',
    keys: [],
    adapter: 'temu',
    enabledByDefault: true,
    message: 'Public product discovery only.',
    roadmap: { state: ROADMAP.IMPLEMENTED, notes: 'Read-only discovery layer; no merchant account connection.' },
  },
  {
    id: 'erli',
    name: 'ERLI',
    mode: 'public-web-discovery',
    keys: [],
    adapter: 'erli',
    enabledByDefault: true,
    message: 'Public marketplace discovery only.',
    roadmap: { state: ROADMAP.IMPLEMENTED, notes: 'Read-only public discovery; API partnership remains optional for deeper data.' },
  },
  {
    id: 'kaufland',
    name: 'Kaufland',
    mode: 'public-web-discovery',
    keys: [],
    adapter: 'kaufland',
    enabledByDefault: true,
    message: 'Public product discovery only.',
    roadmap: { state: ROADMAP.IMPLEMENTED, notes: 'Read-only discovery layer; seller API is not used.' },
  },
];

export const PROVIDER_IDS = new Set(PROVIDERS.map(p => p.id));

/** All environment keys that must never be echoed back to a client. */
export const SECRET_KEYS = [...new Set(PROVIDERS.flatMap(p => p.keys))];

export function providerCredentialsPresent(provider) {
  return provider.keys.length === 0 || provider.keys.every(env);
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
