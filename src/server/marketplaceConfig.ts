import type { MarketplaceHealth } from './marketplaceTypes';
import type { ProviderRoadmapEntry } from './providerRoadmap';
import { PROVIDER_ROADMAP } from './providerRoadmap';

const env = (key: string) => Boolean((globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[key]?.trim());

/**
 * Mirror of server/providers.mjs. The gateway is authoritative at runtime; this module
 * keeps the server-side contract typed and testable without starting the gateway.
 * eBay is disabled by product policy: it is optional and never required.
 */
export function marketplaceHealth(): MarketplaceHealth[] {
  return [
    { id: 'allegro', name: 'Allegro', mode: 'account', status: env('ALLEGRO_CLIENT_ID') && env('ALLEGRO_CLIENT_SECRET') && env('ALLEGRO_REDIRECT_URI') && env('ALLEGRO_SESSION_SECRET') ? 'configured' : 'not-configured', configured: env('ALLEGRO_CLIENT_ID') && env('ALLEGRO_CLIENT_SECRET') && env('ALLEGRO_REDIRECT_URI') && env('ALLEGRO_SESSION_SECRET'), enabled: true, implemented: true, roadmap: 'implemented', message: 'Priority provider. Requires a user OAuth session created via /api/allegro/oauth.' },
    { id: 'ebay', name: 'eBay', mode: 'live-search', status: 'disabled', configured: env('EBAY_CLIENT_ID') && env('EBAY_CLIENT_SECRET'), enabled: false, implemented: true, roadmap: 'not-suitable', message: 'eBay is disabled by product policy. It is optional and never required.' },
    { id: 'amazon', name: 'Amazon', mode: 'account', status: env('AMAZON_LWA_CLIENT_ID') && env('AMAZON_LWA_CLIENT_SECRET') ? 'configured' : 'not-configured', configured: env('AMAZON_LWA_CLIENT_ID') && env('AMAZON_LWA_CLIENT_SECRET'), enabled: true, implemented: false, roadmap: 'requires-partnership', message: 'SP-API connector; access depends on Amazon authorization/program.' },
    { id: 'olx', name: 'OLX', mode: 'account', status: env('OLX_CLIENT_ID') && env('OLX_CLIENT_SECRET') ? 'configured' : 'not-configured', configured: env('OLX_CLIENT_ID') && env('OLX_CLIENT_SECRET'), enabled: true, implemented: false, roadmap: 'requires-partnership', message: 'Partner API connector.' },
    { id: 'temu', name: 'Temu', mode: 'account', status: env('TEMU_APP_KEY') && env('TEMU_APP_SECRET') ? 'configured' : 'not-configured', configured: env('TEMU_APP_KEY') && env('TEMU_APP_SECRET'), enabled: true, implemented: false, roadmap: 'requires-partnership', message: 'Partner/Open API connector.' },
    { id: 'ceneo', name: 'Ceneo', mode: 'benchmark', status: env('CENEO_API_KEY') ? 'configured' : 'not-configured', configured: env('CENEO_API_KEY'), enabled: true, implemented: false, roadmap: 'requires-api-access', message: 'Price benchmark connector.' },
    { id: 'erli', name: 'ERLI', mode: 'account', status: env('ERLI_API_KEY') ? 'configured' : 'not-configured', configured: env('ERLI_API_KEY'), enabled: true, implemented: false, roadmap: 'requires-api-access', message: 'Marketplace API connector.' },
    { id: 'empik', name: 'Empik', mode: 'account', status: env('EMPIK_API_KEY') ? 'configured' : 'not-configured', configured: env('EMPIK_API_KEY'), enabled: true, implemented: false, roadmap: 'requires-api-access', message: 'Seller API connector.' },
    { id: 'kaufland', name: 'Kaufland', mode: 'account', status: env('KAUFLAND_CLIENT_KEY') && env('KAUFLAND_SECRET_KEY') ? 'configured' : 'not-configured', configured: env('KAUFLAND_CLIENT_KEY') && env('KAUFLAND_SECRET_KEY'), enabled: true, implemented: false, roadmap: 'requires-api-access', message: 'Seller API connector.' },
  ];
}

export function providerRoadmap(): ProviderRoadmapEntry[] {
  return PROVIDER_ROADMAP;
}
