import fs from 'node:fs';

const required = [
  'src/server/marketplaceTypes.ts',
  'src/server/marketplaceConfig.ts',
  'src/server/marketplaceSearch.ts',
  'src/server/providerRoadmap.ts',
  'server/index.mjs',
  'server/providers.mjs',
  'server/adapters/index.mjs',
  'server/searchAggregator.mjs',
];
for (const f of required) { if (!fs.existsSync(f)) throw new Error('Missing ' + f); }

const text = fs.readFileSync('src/server/marketplaceConfig.ts', 'utf8');
for (const key of ['ALLEGRO_CLIENT_ID', 'EBAY_CLIENT_ID', 'AMAZON_LWA_CLIENT_ID', 'OLX_CLIENT_ID', 'TEMU_APP_KEY', 'CENEO_API_KEY', 'ERLI_API_KEY', 'EMPIK_API_KEY', 'KAUFLAND_CLIENT_KEY']) {
  if (!text.includes(key)) throw new Error('Missing env mapping ' + key);
}

// eBay must be optional/disabled, never required.
if (!text.includes("status: 'disabled'")) throw new Error('eBay must be reported as disabled');

const registry = fs.readFileSync('server/providers.mjs', 'utf8');
if (!/id: 'ebay'[\s\S]*?enabledByDefault: false/.test(registry)) throw new Error('eBay must not be enabled by default');
if (!registry.includes("enableFlag: 'EBAY_ENABLED'")) throw new Error('eBay enable flag missing');

const api = fs.readFileSync('server/index.mjs', 'utf8');
for (const route of ['/health', '/api/marketplaces/health', '/api/marketplaces/search']) {
  if (!api.includes(route)) throw new Error('Missing route ' + route);
}
// No eBay-specific gating may remain in the gateway request path.
if (api.includes("selectedProvider==='ebay'")) throw new Error('Gateway still special-cases eBay');
if (!api.includes('searchAllProviders')) throw new Error('Gateway must aggregate providers');

console.log('MARKETPLACE CONFIG SMOKE: PASS');
